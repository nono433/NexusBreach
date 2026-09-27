// Verifie que la capacite de classe de l'Assassin s'AJOUTE a son dash, au lieu
// de le remplacer.
//
// Le defaut : l'Assassin n'a qu'une touche (Espace) pour deux ressources. La
// touche appartenait entierement a la capacite des qu'une capacite etait
// achetee, et pendant sa recharge l'appui ne faisait RIEN. Le dash etait donc
// injoignable pendant 12 a 26 secondes d'affilee selon la capacite. Le PAS
// OMBRE promettait un dash libre pendant 6 s : il remettait le compteur a zero,
// puis bloquait la touche qui sert a s'en servir.
//
// La regle attendue : la capacite part quand elle est prete, le dash prend le
// relais quand elle recharge. Les appuis passent par le vrai gestionnaire de
// clavier, pas par un appel direct, pour que le test mesure ce que Presser
// ESPACE donne reellement.
//
// Controle negatif, dans le meme passage : on compte les appuis faits pendant
// que la capacite recharge. L'ancien code en refusait la totalite. S il n y en
// a aucun, ce test ne distingue pas l'ancien code du nouveau, et il echoue.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__dash.html';
const APPUIS = 8;

const ETAT = 'window.__nexus.etatAction()';

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));

  let session = null;
  const problemes = [];
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 900, hauteur: 520, query: 'tactile=1' });

    // Le profil se prepare avant que le jeu ne le lise : passer par le menu
    // pour acheter une classe et une capacité testerait l'interface, pas le
    // comportement qu'on cherche a verifier. Il faut posseder ET equiper :
    // "equipe" seul est ecarte au chargement si la capacite n'est pas achetee.
    await session.evaluer(`localStorage.setItem('nexus-breach-classes', '{"assassin":true}');
      localStorage.setItem('nexus-breach-equipped-class', 'assassin');
      localStorage.setItem('nexus-breach-abilities', '{"shadowStep":true}');
      localStorage.setItem('nexus-breach-equipped-ability', 'shadowStep');
      localStorage.setItem('nexus-breach-credits', '999999');
      true`);
    await session.envoyer('Page.reload');
    const pret = await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    if (!pret) throw new Error("le jeu ne s'initialise pas");

    await session.evaluer("document.getElementById('start-button').click(); true");
    const enJeu = await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    if (!enJeu) throw new Error('la partie ne demarre pas');

    const etat0 = await session.evaluer(ETAT);
    console.log(`  classe : ${etat0.classe}   capacite : ${etat0.capacite}`
      + `   capacite prete : ${etat0.pretCapacite}   dash pret : ${etat0.pretDash}`);
    if (etat0.classe !== 'assassin') throw new Error("la classe n'est pas l'Assassin");
    if (!etat0.capacite) throw new Error('aucune capacite equipee : le test ne mesurerait rien');

    const journal = [];
    for (let i = 0; i < APPUIS; i += 1) {
      // Entre deux appuis, on attend que le dash redevienne pret. Sans cela on
      // ne verrait qu'un seul dash pour huit appuis, et on ne pourrait pas
      // distinguer "le dash est bloque" de "le dash recharge".
      if (i > 0) {
        await session.attendre(
          'window.__nexus.etatAction().pretDash || window.__nexus.etatAction().pretCapacite',
          5000, 100);
        await attendre(120);
      }
      const avant = await session.evaluer(ETAT);
      // Les vrais evenements clavier : c'est par eux que passe activateAbility.
      await session.envoyer('Input.dispatchKeyEvent', {
        type: 'keyDown', code: 'Space', key: ' ', windowsVirtualKeyCode: 32
      });
      await session.envoyer('Input.dispatchKeyEvent', {
        type: 'keyUp', code: 'Space', key: ' ', windowsVirtualKeyCode: 32
      });
      await attendre(140);
      const apres = await session.evaluer(ETAT);
      journal.push({
        capaciteEnRecharge: avant.cdCapacite > 0,
        // Un appui ne doit rien lancer QUE si les deux ressources etaient
        // realmente en recharge. Sinon c est un refus injustifie.
        uneDisponible: avant.pretCapacite || avant.pretDash,
        capacitePartie: apres.cdCapacite > avant.cdCapacite + 0.01,
        dashParti: apres.cdDash > avant.cdDash + 0.01
      });
    }

    const capacites = journal.filter((j) => j.capacitePartie).length;
    const daps = journal.filter((j) => j.dashParti).length;
    // Le cas qui prouve la correction : un dash declenche alors que la capacite
    // etait en recharge. L'ancien code rendait la main sans rien lancer.
    const dapsPendantRecharge = journal
      .filter((j) => j.dashParti && j.capaciteEnRecharge).length;
    // Un refus n'est legitime que si rien n'etait disponible.
    const refusInjustifie = journal
      .filter((j) => !j.capacitePartie && !j.dashParti && j.uneDisponible).length;
    const refusLegitime = journal
      .filter((j) => !j.capacitePartie && !j.dashParti && !j.uneDisponible).length;

    console.log(`  ${APPUIS} appuis sur ESPACE :`);
    console.log(`    capacite lancee            : ${capacites}`);
    console.log(`    dash lance                 : ${daps}`);
    console.log(`    dash pendant une recharge  : ${dapsPendantRecharge}`);
    console.log(`    refus alors qu une chose etait prete : ${refusInjustifie}`);
    console.log(`    refus legitime (les deux en recharge) : ${refusLegitime}`);

    if (capacites === 0) problemes.push('la capacite ne se declenche jamais');
    if (daps === 0) problemes.push('le dash ne se declenche jamais, alors qu il est equipe');
    if (refusInjustifie > 0) {
      problemes.push(`${refusInjustifie} appuis n ont rien fait alors qu'une ressource etait prete`);
    }
    if (dapsPendantRecharge === 0) {
      problemes.push("aucun dash n'a ete declenche pendant que la capacite rechargeait :"
        + " le test ne distingue pas l'ancien code du nouveau");
    }
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) {}
  }

  if (problemes.length === 0) {
    console.log('\n  LA CAPACITE S AJOUTE AU DASH : les deux restent accessibles sur la meme touche.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
