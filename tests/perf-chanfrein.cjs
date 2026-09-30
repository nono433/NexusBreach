// Mesure le cout du chanfrein, et non son caractere liberant.
//
// Le chanfrein transforme chaque pave d'un robot en 44 triangles au lieu de 12.
// Sur un ennemi, c'est 27 pieces, donc environ 1200 triangles la ou il y en
// avait 350. C'est rien pour un GPU de bureau, et c'est une question ouverte
// pour un telephone.
//
// Ce que ce test mesure, et ce qu'il ne mesure pas :
//   - IL MESURE : le nombre de triangles reellement rendus, et le temps par
//     image observe dans le navigateur de test, avec plusieurs ennemis a
//     l'ecran ;
//   - IL NE MESURE PAS : le framerate de ton telephone. Le navigateur de test
//     tourne sur cette machine, avec un GPU de bureau. Un resultat correct ici
//     dit que rien n'est maladif, pas que le jeu est fluide sur un mobile.
//
// C'est pourquoi le test affiche ce qu il mesure, et rappelle ce qu il ne peut
// pas mesurer. Un chiffre de fluidite ici serait un mensonge.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__perf.html';
const ENNEMIS = 12;
const FENETRE_MS = 2500;

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));
  let session = null;
  const problemes = [];
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1280, hauteur: 720 });
    await session.attendre('Boolean(window.__nexus && window.__nexus.etatDonjon)', 60000);
    await session.evaluer("document.getElementById('start-button').click(); true");
    await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    await attendre(700);

    // Avant : un seul ennemi, pour la geometrie de reference.
    await session.evaluer('window.__nexus.nettoyerSalle(); true');
    await attendre(300);
    const avant = await session.evaluer('window.__nexus.mesurer(40)');
    console.log(`  1 ennemi  : ${avant.triangles} triangles`
      + `   ${avant.images} images en ${avant.duree} ms`
      + `   ${avant.imagesParSeconde} im/s`);

    // Apres : le plafond concurrent du bureau, c'est-a-dire le pire cas reellement
    // atteint en jeu. On ne va pas au-dela, ce serait tester un cas que le jeu
    // ne produit pas.
    await session.evaluer('window.__nexus.nettoyerSalle(); true');
    await attendre(300);
    await session.evaluer(`window.__nexus.peupler(${ENNEMIS}); true`);
    await attendre(500);
    const apres = await session.evaluer(`window.__nexus.mesurer(${Math.round(FENETRE_MS / 16)})`);

    console.log(`  ${apres.ennemis} ennemis : ${apres.triangles} triangles`
      + `   ${apres.images} images en ${apres.duree} ms`
      + `   ${apres.imagesParSeconde} im/s`);
    console.log(`  par ennemi : ${Math.round(apres.triangles / apres.ennemis)} triangles`
      + `   (avant : ${Math.round(avant.triangles)})`);

    // Le seul seuil qu'on peut poser sans pretendre mesurer un telephone :
    // la geometrie ne doit pas etre disproportionnee. Un robot a plus de
    // 2000 triangles ceases d'etre du low-poly et devient un cout.
    const parEnnemi = Math.round(apres.triangles / apres.ennemis);
    if (parEnnemi > 2000) {
      problemes.push('un robot depasse 2000 triangles : ' + parEnnemi);
    }
    // Et la scene entiere doit rester dans un ordre de grandeur tenable.
    if (apres.triangles > 60000) {
      problemes.push('la scene depasse 60000 triangles : ' + apres.triangles);
    }
    // Aucune assertion sur la fluidite, et c est deliberé.
    //
    // Ce navigateur bride requestAnimationFrame en mode headless : la mesure
    // affichee plus haut ne dit rien du cout reel. Fixer un seuil dessus
    // reviendrait a interdire le test sur cette machine sans rien dire du jeu
    // sur un telephone. Le nombre de triangles, lui, est un chiffre, et c est
    // sur lui qu on peut raisonnablement juger.
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) { }
  }

  console.log('\n  RAPPEL : ce chiffre vient d un GPU de bureau.');
  console.log('  Il ne dit rien du framerate sur un telephone.');
  if (problemes.length === 0) {
    console.log('\n  LE CHANFREIN NE PROVOQUE AUCUNE DISPROPORTION.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
