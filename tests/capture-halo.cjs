// Photographie les ennemis EN JEU, avec leur halo.
//
// L'apercu robots montre les robots, mais il extrait le code entre la creation
// du pave et makeHealthBar : createEnemy n est pas dedans, et le halo est
// justement cree par createEnemy. La seule facon de juger le halo est donc de
// le voir dans le jeu, avec la lumiere, le brouillard et le sol reels.
//
// Ce que la capture doit permettre de trancher, et qu aucun nombre ne dit :
//   1. le halo se voit-il, ou est-il invisible a 0,24 d opacite ?
//   2. noie-t-il la silhouette du robot, qui est ce qu on vient shooter ?
//   3. les robots se voient-ils les uns par rapport aux autres, ou le halo
//      empile-t-il des disques lumineux les uns sur les autres ?
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__halo-capture.html';

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));
  let session = null;
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1100, hauteur: 720 });
    await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    await session.evaluer("document.getElementById('start-button').click(); true");
    await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    await attendre(1200);

    // Le filet evite que les ennemis ne cassent la mise en scene. Sans lui, ce
    // que photographie le test est la position du joueur au moment de la
    // capture, pas le rendu.
    await session.evaluer('window.__nexus.filet(true); true');

    // On laisse disparaitre la banniere et l'effet d'arrivee : ils occupent le
    // centre de l'image et masquent precisement ce qu on cherche a juger.
    await attendre(2600);

    for (const [nom, nombre, distance] of [
      ['halo-groupe.png', 6, 9],
      ['halo-proche.png', 3, 4.5]
    ]) {
      await session.evaluer(`window.__nexus.peupler(${nombre}); true`);

      // La camera du jeu est reacdee a chaque image : la placer une fois ne
      // tient pas, la boucle la reprend aussitot. La premiere version de ce
      // test faisait cela, et la capture montrait le spawn du joueur.
      //
      // On ne bouge donc pas la camera : on oriente le joueur. La camera suit
      // le joueur, donc le cadrage tient tout seul.
      //
      // Et on ne se teleporte pas non plus. Le teleport est tentant, mais il
      // place le joueur a une position calculee, qui tombe regulierement dans
      // un bloc : on photographiait alors un mur. Les ennemis, eux, viennent a
      // nous. Il suffit de les attendre.
      const vise = await (async () => {
        const limite = Date.now() + 12000;
        let etat = null;
        while (Date.now() < limite) {
          etat = await session.evaluer(`(() => {
            const liste = window.__nexus.distancesEnnemis();
            if (!liste.length) return null;
            liste.sort((a, b) => a.d - b.d);
            const cible = liste[0];
            window.__nexus.orienterVers(cible.x, cible.z);
            return { x: Math.round(cible.x), z: Math.round(cible.z), d: cible.d };
          })()`);
          if (etat && etat.d < distance) break;
          await attendre(400);
        }
        return etat;
      })();
      await attendre(700);
      const octets = await session.capturer(path.join(__dirname, nom));
      console.log('  ' + nom.padEnd(18) + octets + ' octets'
        + (vise ? '   ennemi le plus proche a ' + vise.d.toFixed(1) + ' unites'
          + '   visee a ' + distance : '   AUCUN ENNEMI'));
    }

    const memoire = await session.evaluer('window.__nexus.comptageTextures()');
    console.log('  textures ' + memoire.textures + '   geometries ' + memoire.geometries
      + '   ennemis ' + memoire.ennemis);
  } catch (e) {
    console.log('  ERREUR : ' + e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) { }
  }
})();
