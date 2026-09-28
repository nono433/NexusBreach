// Capture un projectile ennemi en vol, et mesure combien de pixels il occupe.
//
// Pourquoi ce test existe : la plainte "on ne voit pas bien les projectiles" est
// visuelle, et les captures precedentes ne prouvaient rien. Elles photographiaient
// un numero d'image fixe, sans savoir si un projectile existait : elles
// produisaient donc des images vides en ayant le droit de passer.
//
// Il repose sur tests\_cdp.cjs, donc sur le protocole DevTools. Tout ce qui
// precedait passait par --virtual-time-budget, et ce drapeau empeche rAF de
// tourner : deux images en douze secondes de temps virtuel. Le jeu ne peut pas
// jouer dans ces conditions, et aucune capture de jeu n etait donc possible.
// Ici le navigateur tourne en temps reel, et c est le test qui decide quand lire
// la page et quand photographier.
//
// Le deroulement :
//   1. on saute a la vague 6, ou les Chasseurs (Tireurs) sont frequents ;
//   2. on attend qu un projectile existe reellement, confirme par la sonde ;
//   3. on met le jeu en pause, ce qui le fige sur place, puisque
//      updateProjectiles ne tourne qu en jeu ;
//   4. on retire l'ecran de pause, pour que seule la vue 3D reste ;
//   5. on capture, et on compare la taille mesuree a un seuil pose.
//
// Controle negatif : --stub remplace la sonde par une fonction qui ne voit
// jamais rien. Le test doit alors ECHOUER. S il passe, il ne teste rien.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__projete.html';
const SHOT = path.join(__dirname, 'capture-projectile.png');
const STUB = process.argv.includes('--stub');
const VAGUE = Number((process.argv.find((a) => a.startsWith('--vague=')) || '').split('=')[1]) || 6;

// Seuil de lisibilite. Un pave lumineux se distingue quand il fait au moins
// 6 pixels de cote : en dessous, c est un point dans le bruit de la scene.
const SEUIL = 6;

(async () => {
  const index = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(RACINE, PAGE), index);

  let session = null;
  const problemes = [];
  try {
    // 420x320 et le profil tactile : la plainte vient d un telephone, et une
    // fenetre de telephone est la seule occasion de juger si un projectile se
    // voit dans ces conditions. Le mode tactile est aussi ce qui installe le
    // bouton de pause, sans lequel le gel est impossible.
    session = await ouvrir(PAGE, RACINE, { largeur: 420, hauteur: 320, query: 'tactile=1' });
    console.log('  session ouverte.');

    const pret = await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    if (!pret) throw new Error("le jeu ne s'initialise pas");
    console.log('  jeu initialise.');

    if (STUB) {
      // Controle negatif : la sonde devient aveugle. Tout le reste du test
      // tourne a l identique, seul le resultat doit changer.
      await session.evaluer('window.__nexus.sonderProjectiles = function () { return []; };');
    }

    await session.evaluer("document.getElementById('start-button').click(); true");
    const enJeu = await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    if (!enJeu) throw new Error("la partie ne demarre pas");
    console.log('  partie lancee.');

    // Sans ce saut, aucun projectile n existe jamais : la vague 1 ne contient
    // que des Radeurs, et un Radeur ne tire pas.
    //
    // Le joueur ne bouge pas et ne tire pas : il meurt, et c est normal. La
    // capture ne doit pas dependre de sa chance. On relance donc la partie et
    // on recommence, jusqu a voir un projectile ou epuiser le temps.
    const ECRAN_FIN = "document.getElementById('gameover-screen').classList.contains('active')";
    const limite = Date.now() + 180000;
    let trouve = null;
    let tentatives = 0;
    let morts = 0;
    while (Date.now() < limite && !trouve) {
      if (tentatives > 0) {
        await session.evaluer("document.getElementById('retry-button').click(); true");
        await attendre(600);
      }
      const vague = await session.evaluer(`window.__nexus.allerVague(${VAGUE})`);
      tentatives += 1;
      console.log(`  tentative ${tentatives} : vague ${vague}`
        + `${morts ? ' (joueur mort ' + morts + ' fois avant)' : ''}`);
      trouve = await session.attendre(
        `(() => {
          if (${ECRAN_FIN}) return 'mort';
          const v = window.__nexus.sonderProjectiles().filter(p => p.devant);
          return v.length ? v : null;
        })()`, 40000, 90);
      if (trouve === 'mort') {
        trouve = null;
        morts += 1;
      }
    }
    if (!trouve) {
      throw new Error(`aucun projectile en vol apres ${tentatives} tentatives`
        + ` (${morts} morts du joueur)`);
    }
    console.log(`  projectile vu a la tentative ${tentatives}`);

    const vus = trouve.slice(0, 8);
    console.log('  projectiles en vol :');
    for (const p of vus) {
      console.log(`    ${String(p.distance).padStart(5)} u   ${String(p.pixels).padStart(3)} px`
        + `   a l ecran ${p.x},${p.y}`);
    }

    // Figer : la pause est la seule chose qui arrete updateProjectiles sans
    // retirer les maillages de la scene.
    await session.evaluer(`
      (() => {
        document.getElementById('touch-pause')
          .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        document.getElementById('pause-screen').style.display = 'none';
        document.getElementById('touch-layer').style.display = 'none';
        document.documentElement.classList.remove('touche-en-jeu');
        return true;
      })()`);
    // Une image de plus pour que la pause soit prise en compte et rendue.
    await attendre(400);

    const gele = await session.evaluer("document.getElementById('pause-screen')"
      + ".classList.contains('active')");
    const apresPause = await session.evaluer(
      "window.__nexus.sonderProjectiles().filter(p => p.devant).length");
    console.log(`  pause active : ${gele}   projectiles toujours en vol : ${apresPause}`);
    if (apresPause === 0) problemes.push('la pause a vide la scene au lieu de figer les projectiles');

    const octets = await session.capturer(SHOT);
    console.log(`  capture : tests\\capture-projectile.png, ${octets} octets`);
    if (octets < 4000) problemes.push('capture trop petite, elle est probablement vide');

    const plusGrand = Math.max(...vus.map((p) => p.pixels));
    console.log(`  plus gros projectile : ${plusGrand} px (seuil : ${SEUIL} px)`);
    if (plusGrand < SEUIL) {
      problemes.push(`le plus gros projectile ne fait que ${plusGrand} px, sous le seuil de ${SEUIL}`);
    }
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) {}
  }

  if (problemes.length === 0) {
    console.log('\n  UN PROJECTILE A ETE CAPTURE, FIGE, ET IL EST ASSEZ GROS POUR ETRE VU.');
    process.exit(STUB ? 1 : 0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  if (STUB) {
    console.log('\n  (controle negatif : le test echoue bien quand la sonde est aveugle)');
    process.exit(0);
  }
  process.exit(1);
})();
