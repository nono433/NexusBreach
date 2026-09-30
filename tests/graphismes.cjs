// Verifie les graphismes, et surtout qu'ils ne coutent pas de memoire.
//
// Le risque de ce travail n'est pas le rendu : c'est la fuite. Les textures sont
// des objets GPU. Si la plaque de blindage etait regeneree a chaque ennemi
// elle mourrait a chaque apparition, le pilote GPU s'enflerait, et le jeu
// saccaderait au bout de quelques minutes sans qu'aucune erreur ne soit levee.
//
// C'est le genre de defaut qu on ne voit pas sur une capture. On le voit au
// compteur.
//
// Ce qui est verifie :
//   1. les materiaux d'ennemi portent bien une carte et une carte de normales ;
//   2. les textures sont partagees : deux images pour tout le jeu, quel que
//      soit le nombre d'ennemis crees ;
//   3. le sol et le decor portent eux aussi leur relief ;
//   4. les ombres sont en 2048 sur un bureau, et toujours Coupees sur mobile.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__graphismes.html';

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));
  let session = null;
  const problemes = [];
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1100, hauteur: 700 });
    await session.attendre('Boolean(window.__nexus && window.__nexus.etatDonjon)', 60000);
    await session.evaluer("document.getElementById('start-button').click(); true");
    await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    await attendre(700);

    // On cree beaucoup d'ennemis : c'est ce qui ferait grossir une texture
    // mal partagee. Le controle est donc fait sur le nombre d'images, apres
    // une rafale, pas avant et apres.
    await session.evaluer('window.__nexus.nettoyerSalle(); true');
    await attendre(300);
    const avant = await session.evaluer('window.__nexus.comptageTextures()');
    await session.evaluer('window.__nexus.peupler(20); true');
    await attendre(900);
    const apres = await session.evaluer('window.__nexus.comptageTextures()');

    const mats = await session.evaluer('window.__nexus.materiauxEnnemi()');
    console.log(`  ${apres.ennemis} ennemis crees`);
    console.log(`  images en memoire : ${avant.textures} -> ${apres.textures}`
      + `   geometries : ${avant.geometries} -> ${apres.geometries}`);
    console.log(`  materiau d un ennemi : couleur ${mats.carte ? 'oui' : 'NON'}`
      + `   normales ${mats.normale ? 'oui' : 'NON'}`);

    if (!mats.carte) problemes.push("les ennemis n ont pas de carte de couleur");
    if (!mats.normale) problemes.push("les ennemis n ont pas de carte de normales");
    if (!mats.memoirePartagee) {
      problemes.push('la plaque de blindage n est pas partagee : une image par ennemi');
    }
    if (apres.textures !== avant.textures) {
      problemes.push('creer des ennemis alloue de nouvelles images : '
        + avant.textures + ' -> ' + apres.textures);
    }

    const decor = await session.evaluer('window.__nexus.materiauxDecor()');
    console.log(`  sol : relief ${decor.solNormale ? 'oui' : 'NON'}`
      + `   murs : relief ${decor.murNormale ? 'oui' : 'NON'}`
      + `   couverture : relief ${decor.coverNormale ? 'oui' : 'NON'}`);
    if (!decor.solNormale) problemes.push('le sol n a pas de relief');
    if (!decor.murNormale) problemes.push('les murs n ont pas de relief');
    if (!decor.coverNormale) problemes.push('les couvertures n ont pas de relief');

    const ombres = await session.evaluer('window.__nexus.tailleOmbres()');
    console.log(`  ombres : ${ombres.taille} (mobile : ${ombres.mobile})`);
    if (!ombres.mobile && ombres.taille < 2048) {
      problemes.push('les ombres restent a ' + ombres.taille
        + ' sur un bureau, alors que le gain ne coute rien');
    }
    if (ombres.mobile && ombres.taille > 512) {
      problemes.push('les ombres restent elevees sur mobile : ' + ombres.taille);
    }
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) { }
  }

  if (problemes.length === 0) {
    console.log('\n  LES GRAPHISMES SONT LA ET NE COUTENT PAS DE MEMOIRE.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
