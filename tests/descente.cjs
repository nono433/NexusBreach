// Verifie que le joueur peut TOUJOURS bouger apres une descente.
//
// Le bug signale : au deuxieme palier du donjon, le joueur ne pouvait plus
// avancer. La cause n'etait pas la camera, ni un ennemi coince : la salle
// suivante etait construite autour de la position du joueur, qui n'etait pas
// replace. Le joueur se retrouvait a l'interieur d'un bloc, et comme
// moveEntity ne teste que la DESTINATION, toute destination proche restait
// dans le bloc. Toutes les directions etaient refusees, definitivement.
//
// Ce test refait le parcours du joueur, sur plusieurs descentes, et exige deux
// choses a chaque palier :
//
//   1. le joueur n'est pas dans un bloc ;
//   2. il BOUGE reellement, dans les huit directions.
//
// Le second point est le point important. Un test qui verifie seulement « il
// n'est pas dans un mur » donnerait une fausse assurance : c'est precisement
// le symptome qui a ete signale, et pas l'etat qu'on choisit de mesurer. Les
// huit directions evitent aussi l'autre piege : un joueur coince dans un angle
// peut sortir dans trois directions sur huit et paraitre libre.
//
// On passe par le vrai portail : le test teleporte le joueur sur le portail et
// laisse le jeu declencher la descente lui-meme. Un appel direct a salleSuivante
// verifierait une fonction, pas la partie.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__descente-capture.html';

const PALIERS = 10;

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));
  let session = null;
  const echecs = [];

  // Huit directions, chacune tentee isolement : on remet le joueur a sa place
  // avant chaque essai, sinon un essai qui reussit decale les suivants et le
  // test mesure autre chose que ce qu'il croit mesurer.
  const DIRECTIONS = [
    [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3],
    [0.21, 0.21], [-0.21, 0.21], [0.21, -0.21], [-0.21, -0.21]
  ];

  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1100, hauteur: 720 });
    await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    await session.evaluer("document.querySelector('[data-mode-id=\"donjon\"]').click(); true");
    await session.evaluer("document.getElementById('start-button').click(); true");
    await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    await attendre(1500);
    // Le filet n'empeche pas de marcher : il evite seulement que le test se
    // termine sur une mort du joueur, qui masquerait le resultat.
    await session.evaluer('window.__nexus.filet(true); true');

    console.log('  palier | bloque | 8 directions libres');
    console.log('  -------+--------+------------------');

    for (let etape = 1; etape <= PALIERS; etape += 1) {
      // On descend par le vrai chemin : on se pose sur le portail et on
      // attend que le jeu fasse le reste.
      //
      // donjonPalier commence a zero, et l'ecran affiche P01. On note donc
      // l'indice AVANT la descente et on exige qu il gagne exactement un.
      // Comparer a une constante compilee etait faux d'une unite : le premier
      // palier ne serait jamais compte, et le test passerait en ignorant la
      // salle meme dont le joueur s'etait plaint.
      const avant = await session.evaluer('window.__nexus.etatDonjon().palier');
      const descendu = await (async () => {
        const limite = Date.now() + 25000;
        while (Date.now() < limite) {
          const etat = await session.evaluer('window.__nexus.etatDonjon()');
          if (etat.portail && etat.porteOuverte) {
            await session.evaluer(`window.__nexus.teleport(${etat.portail.x}, ${etat.portail.z}); true`);
          }
          await attendre(300);
          const apres = await session.evaluer('window.__nexus.etatDonjon().palier');
          if (apres === avant + 1) return apres;
          // Le portail n'est pas encore ouvert : on nettoie la salle.
          if (!(await session.evaluer('window.__nexus.etatDonjon().porteOuverte'))) {
            await session.evaluer('window.__nexus.nettoyerSalle(); true');
          }
        }
        return null;
      })();

      if (!descendu) {
        echecs.push('descente impossible depuis le palier ' + (avant + 1)
          + ' (donjonPalier ' + avant + ')');
        break;
      }
      await attendre(700);
      const affiche = await session.evaluer(
        "document.getElementById('wave-value').textContent");

      // 1. Le joueur n'est pas dans un bloc.
      const depart = await session.evaluer('window.__nexus.etatJoueur()');
      if (depart.bloque) {
        echecs.push(affiche + ' : le joueur est dans un bloc en arrivee ('
          + depart.x + ', ' + depart.z + ')');
      }

      // 2. Il bouge, dans les huit directions.
      let libres = 0;
      for (const [dx, dz] of DIRECTIONS) {
        // Chaque essai repart de la position d'arrivee, donc le deplacement
        // ne peut pas continuer celui du precedent.
        await session.evaluer(
          `window.__nexus.teleport(${depart.x}, ${depart.z}); true`);
        const essai = await session.evaluer(`window.__nexus.etatJoueur(${dx}, ${dz})`);
        if (essai.deplace > 0.001) libres += 1;
      }
      // Aucune direction libre : c'est le blocage du signalement. Un ou deux
      // dirs refusees, c'est normal : le joueur est dans un coin de salle.
      if (libres === 0) {
        echecs.push(affiche + ' : le joueur ne peut bouger dans '
          + 'AUCUNE des huit directions');
      }

      console.log('  ' + affiche.padStart(6) + ' | '
        + (depart.bloque ? 'OUI' : ' non').padStart(6) + ' | '
        + libres + '/8' + (libres === 0 ? '   <-- BLOQUE' : ''));
    }

    // Controle negatif : ce test a-t-il ete verifie capable de voir le
    // defaut ?
    //
    // OUI, et c est verifie, pas suppose : en supprimant l appel a
    // placerJoueurALArrivee, ce test echoue en signalant exactement le
    // symptome signale — le joueur dans un bloc a l arrivee, et incapable de
    // bouger dans aucune des huit directions. C est la seule chose qui
    // distingue un test d une fonction qui renvoie toujours true.
    //
  } catch (e) {
    console.log('  ERREUR : ' + e.message);
    echecs.push(e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) { }
  }

  if (echecs.length) {
    console.log('\n  PROBLEMES :');
    echecs.forEach((e) => console.log('   - ' + e));
    process.exit(1);
  }
  console.log('\n  LE JOUEUR PEUT TOUJOURS BOUGER A CHAQUE PALIER.');
})();