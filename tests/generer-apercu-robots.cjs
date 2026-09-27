// Genere la page d'apercu des robots, a partir du VRAI game.js.
//
// Pourquoi un generateur : la page d'apercu sert a regarder les robots isoles.
// Elle doit reproduire exactement ce que le jeu dessine, donc son code est
// extrait de game.js plutot que recopie a la main. Une recopie derive un jour,
// et l'apercu ment alors qu'on le croyait fidele.
//
// Le fichier est ecrit dans tests\, pas dans wwwroot\, pour deux raisons : il ne
// doit pas etre publie sur le site, et il ne doit pas pouvoir disparaitre au
// nettoyage d avant push. Il a deja disparu une fois, et le test
// coherence-robots.cjs echouait alors sur un fichier absent, sans rien dire du
// robot.
const fs = require('node:fs');
const path = require('node:path');

const WWW = path.join(__dirname, '..', 'wwwroot');
const SORTIE = path.join(__dirname, 'apercu-robots.html');

const source = fs.readFileSync(path.join(WWW, 'game.js'), 'utf8');
const lignes = source.split(/\r?\n/);

// Le bloc du robot va de la fonction box() jusqu'a la fin d animerBras(), la
// ligne juste avant createEnemyMaterials(). Ces reperes sont explicites plutot
// que magiques : si le jeu change, une seule ligne du generateur est a
// corriger, et le test de coherence le dira aussitot.
function indexDe(ligne) {
  const i = lignes.findIndex((l) => l.trim() === ligne);
  if (i < 0) throw new Error('reper introuvable dans game.js : ' + ligne);
  return i;
}

const debut = indexDe('const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);');
const fin = indexDe('function makeHealthBar(color) {');
if (fin <= debut) throw new Error('ordre inattendu : makeHealthBar avant unitBoxGeometry');
const bloc = lignes.slice(debut, fin).join('\n');

// La taille de la tete est calculee dans createEnemy, pas dans buildHumanoid :
// on ne peut donc pas se contenter du bloc precedent, sinon l'apercu montre
// une tete d'une autre taille que celle du jeu. Cette ligne est extraite
// elle aussi, pour la meme raison.
const ligneTete = source.split(/\r?\n/).find((l) => l.includes('const headSize ='));
if (!ligneTete) throw new Error('taille de tete introuvable dans game.js');

// Les gabarits sont lus dans le jeu, eux aussi, plutot que reecrits : c est la
// seule facon d avoir les vraies couleurs et les vraies echelles. Chaque type
// commence par "nom: avecTir({", et son bloc s arrete au type suivant.
//
// La fin de bloc est calculee AVANT tout filtrage. Sinon on indexe la liste
// filtree avec un indice de la liste complete, et le dernier gabarit se fait
// couper par un type qu on ne voulait pas : il disparaissait, silencieusement.
const ANCRE = /^  (\w+): avecTir\(\{/gm;
const wanted = ['crawler', 'hunter', 'brute', 'titan', 'foundryAlpha'];
const positions = [...source.matchAll(ANCRE)].map((m) => ({
  nom: m[1],
  debut: m.index,
  fin: -1
}));
for (let i = 0; i < positions.length; i += 1) {
  positions[i].fin = i + 1 < positions.length ? positions[i + 1].debut : source.length;
}

const gabarits = positions
  .filter((p) => wanted.includes(p.nom))
  .map((p) => {
    const blocType = source.slice(p.debut, p.fin);
    const m = blocType.match(/color:\s*(0x[0-9a-fA-F]+)/);
    const echelle = blocType.match(/scale:\s*([\d.]+)/);
    return {
      nom: p.nom,
      couleur: m && m[1],
      scale: echelle && echelle[1],
      // Le jeu deduit "elite" du gabarit, et c'est ce qui change la tete. Il
      // faut donc le lire aussi, sinon l'apercu montre une tete surdimensionnee
      // sur les Alpha.
      elite: /elite:\s*true/.test(blocType)
    };
  });

const incomplets = gabarits.filter((g) => !g.couleur || !g.scale);
if (gabarits.length !== 5 || incomplets.length) {
  throw new Error('gabarits lus : ' + gabarits.length + ' sur 5, incomplets : '
    + incomplets.map((g) => g.nom).join(', '));
}

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Apercu des robots // Nexus Breach</title>
<style>
  html,body{margin:0;height:100%;background:#070d13;color:#9fb6c4;
    font:12px/1.5 ui-monospace,Consolas,monospace;overflow:hidden}
  #etiquette{position:fixed;left:10px;top:8px;z-index:2;letter-spacing:.08em}
  #note{position:fixed;left:10px;bottom:8px;z-index:2;color:#5d7382;max-width:640px}
  canvas{display:block}
</style>
</head>
<body>
<div id="etiquette">APERCU // robots isoles, code extrait de game.js</div>
<div id="note">Genere par tests/generer-apercu-robots.cjs. Sert uniquement a l'inspection
visuelle : ce fichier n'est pas publie sur le site.</div>
<script type="module">
// La page vit dans tests\, donc three.js se cherche dans wwwroot\. Le chemin
// est relatif au document, pas au serveur : d'ou les deux niveaux.
// Les erreurs sont notees dans la page : le pilote DevTools sait les lire, et
// une page qui echoue en silence ne laisserait qu'une capture noire.
window.__erreursApercu = [];
window.addEventListener('error', (e) => window.__erreursApercu.push(e.message || String(e)));
import * as THREE from '../wwwroot/vendor/three.module.min.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070d13);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 60);
camera.position.set(0, 2.8, 16.5);
camera.lookAt(0, 1, 0);
scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x0a1016, 0.7));
const clef = new THREE.DirectionalLight(0xffffff, 1.5);
clef.position.set(4, 7, 6);
scene.add(clef);
scene.add(new THREE.GridHelper(24, 24, 0x1d3a4a, 0x14262f));

// ---------------------------------------------------------------- jeu.js
${bloc}
// ---------------------------------------------------------------- gabarits

const GABARITS = ${JSON.stringify(gabarits, null, 2)};

const robotier = (nom, couleur, scale, elite, x) => {
  const template = { color: couleur, accentColor: couleur, visorColor: 0x9ffcff, scale };
  const materials = createEnemyMaterials(template);
  // La ligne ci-dessous est celle du jeu, mot pour mot. Elle ne peut pas
  // remonter d'un cran : elle lit isAlpha, qui n existe qu'ici.
  const isAlpha = elite;
  ${ligneTete}
  const robot = buildHumanoid(THREE, template, materials, { isAlpha, headSize, shadows: false });
  const root = new THREE.Group();
  root.position.x = x;
  root.add(robot.structureMesh, robot.neckMesh, robot.trimMesh, robot.head, robot.visor);
  robot.armPivots.forEach(({ pivot }) => root.add(pivot));
  robot.legPivots.forEach(({ pivot }) => root.add(pivot));
  // L echelle du gabarit est ce que le joueur voit : sans elle, les cinq
  // robots(make) paraissent identiques et l apercu ne sert plus a rien.
  root.scale.setScalar(Number(scale));
  scene.add(root);
  const plaque = document.createElement('div');
  plaque.textContent = nom + '  x' + scale;
  plaque.style.cssText = 'position:fixed;left:0;top:0;color:#cfe6f2;z-index:1;'
    + 'transform:translate(' + ((x + 7.75) / 15.5 * innerWidth - 30) + 'px,'
    + (innerHeight / 2 + 8) + 'px)';
  document.body.appendChild(plaque);
  return { root, robot };
};

const bras = GABARITS.map((g, i) => {
  // L ecartement suit l echelle : sinon le Forge-Monarque, le plus grand,
  // recouvre son voisin et l apercu ment sur les tailles relatives.
  const x = (i - (GABARITS.length - 1) / 2) * 3.1;
  return robotier(g.nom, Number(g.couleur), Number(g.scale), g.elite, x);
});

// Le geste de preparation : on le declenche en boucle, sinon on ne voit pas ce
// qui se passe quand un ennemi arme son coup.
let t = 0;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setAnimationLoop(() => {
  t += 0.016;
  for (const item of bras) animerBras(item.robot.armPivots, Math.sin(t * 2) * 0.5 + 0.5);
  renderer.render(scene, camera);
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
</script>
</body>
</html>
`;

fs.writeFileSync(SORTIE, html);
console.log('  ecrit :', path.relative(path.join(__dirname, '..'), SORTIE),
  fs.statSync(SORTIE).size, 'octets');
console.log('  bloc extrait :', bloc.split('\n').length, 'lignes,',
  gabarits.length, 'gabarits');
