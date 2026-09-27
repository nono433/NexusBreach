// Verifie que la page d'apercu des robots et le jeu portent bien les memes
// proportions.
//
// L'apercu est genere par tests\generer-apercu-robots.cjs, qui extrait le code
// du robot de game.js. Ce test reste necessaire malgre cela : le generateur
// pourrait extraire un bloc trop court, ou unobserver une constante, et
// l'apercu afficherait alors un robot différent de ce que le joueur voit sans
// que rien ne le signale.
//
// Il compare aussi ce que l'apercu ne peut pas reproduire : les gabarits
// d'ennemis y sont declares en dur, et une divergence de couleur ou
// d'echelle passerait inapercue.
const fs = require('node:fs');
const path = require('node:path');

const WWW = path.join(__dirname, '..', 'wwwroot');
const APERCU = path.join(__dirname, 'apercu-robots.html');
const jeu = fs.readFileSync(path.join(WWW, 'game.js'), 'utf8');

// L'apercu est regenere s'il manque. Il ne doit pas pouvoir disparaitre : il
// s'etait fait supprimer par le nettoyage d'avant push, et ce test echouait
// alors sur un fichier absent en ne disant rien du robot.
if (!fs.existsSync(APERCU)) {
  console.log('  apercu absent, generation...');
  require('node:child_process').execFileSync(process.execPath,
    [path.join(__dirname, 'generer-apercu-robots.cjs')], { stdio: 'ignore' });
}
const apercu = fs.readFileSync(APERCU, 'utf8');

// Constantes de proportion du robot, telles qu'ecrites dans buildHumanoid.
const PROPORTIONS = [
  'const LISERE = 0.024;',
  'const BRAS_ARME = 1.35;',
  'busteL = lourd ? 0.66 : leger ? 0.5 : 0.57',
  'busteH = lourd ? 0.68 : leger ? 0.46 : 0.58',
  'busteD = lourd ? 0.46 : leger ? 0.36 : 0.41',
  'brasLong = lourd ? 0.4 : 0.36',
  'avantBrasLong = lourd ? 0.38 : 0.34',
  'cuisseLong = lourd ? 0.5 : 0.46',
  'tibiaLong = lourd ? 0.46 : 0.42',
  'const piedH = 0.1;',
  'isAlpha ? 0.38 : 0.3'
];

// Couleurs et echelles : on les LIT dans les deux fichiers et on les compare.
// Comparer des chaines formees a la main ne prouverait rien, et l'apercu est
// desormais genere : ses valeurs viennent du jeu, donc la seule question qui
// reste est de savoir si le generateur les a bien recopiees.
const GABARITS = [
  { nom: 'crawler', libelle: 'Rôdeur' },
  { nom: 'hunter', libelle: 'Chasseur' },
  { nom: 'brute', libelle: 'Brute' },
  { nom: 'titan', libelle: 'Alpha' },
  { nom: 'foundryAlpha', libelle: 'Forge-Monarque' }
];

// Valeurs declarees dans le jeu, lues telles quelles.
const ANCRE = /^  (\w+): avecTir\(\{/gm;
const positions = [...jeu.matchAll(ANCRE)].map((m) => ({ nom: m[1], debut: m.index }));
for (let i = 0; i < positions.length; i += 1) {
  positions[i].fin = i + 1 < positions.length ? positions[i + 1].debut : jeu.length;
}
const dansJeu = (nom) => {
  const p = positions.find((x) => x.nom === nom);
  if (!p) return null;
  const bloc = jeu.slice(p.debut, p.fin);
  const couleur = (bloc.match(/color:\s*(0x[0-9a-fA-F]+)/) || [])[1];
  const scale = (bloc.match(/scale:\s*([\d.]+)/) || [])[1];
  return couleur && scale ? { couleur, scale } : null;
};

// Valeurs reprises par l'apercu, lues dans son tableau JSON.
const apercuGabarits = {};
const debutJson = apercu.indexOf('const GABARITS = ');
const finJson = apercu.indexOf(';', debutJson);
if (debutJson > 0) {
  for (const g of JSON.parse(apercu.slice(debutJson + 'const GABARITS = '.length, finJson))) {
    apercuGabarits[g.nom] = { couleur: g.couleur, scale: g.scale };
  }
}

let ecarts = 0;

console.log('=== PROPORTIONS DU ROBOT ===');
for (const proportion of PROPORTIONS) {
  const present = jeu.includes(proportion);
  const copie = apercu.includes(proportion);
  const ok = present && copie;
  if (!ok) ecarts += 1;
  const etat = present && copie ? 'identique'
    : present ? 'MANQUANT DANS L APERCU' : 'MANQUANT DANS LE JEU';
  console.log(`  ${ok ? 'OK  ' : 'ECART'} ${proportion.padEnd(44)} ${etat}`);
}

console.log('\n=== COULEURS ET ECHELLES ===');
for (const gabarit of GABARITS) {
  const jeuValeurs = dansJeu(gabarit.nom);
  const apercuValeurs = apercuGabarits[gabarit.nom] || null;
  const ok = jeuValeurs && apercuValeurs
    && jeuValeurs.couleur === apercuValeurs.couleur
    && jeuValeurs.scale === apercuValeurs.scale;
  if (!ok) ecarts += 1;
  const etat = ok ? 'identique'
    : !jeuValeurs ? 'ABSENT DU JEU'
      : !apercuValeurs ? 'ABSENT DE L APERCU'
        : `${apercuValeurs.couleur} x${apercuValeurs.scale} au lieu de ${jeuValeurs.couleur} x${jeuValeurs.scale}`;
  const affiches = jeuValeurs || { couleur: '?', scale: '?' };
  console.log(`  ${ok ? 'OK  ' : 'ECART'} ${gabarit.libelle.padEnd(18)}`
    + ` ${affiches.couleur.padEnd(10)} x${affiches.scale.padEnd(5)} ${etat}`);
}

// La couleur de chaque type est un signal de lecture : si l'apercu la change,
// on juge une lisibilite qui n'est pas celle du jeu.
console.log('\n=== VISION DE LA TETE ===');
const viseeJeu = /0x9ffcff/.test(jeu);
const viseeApercu = /0x9ffcff/.test(apercu);
const memeVisee = viseeJeu && viseeApercu;
if (!memeVisee) ecarts += 1;
console.log(`  ${memeVisee ? 'OK  ' : 'ECART'} visee 9ffcff  jeu ${viseeJeu}  apercu ${viseeApercu}`);

console.log(`\n  ${ecarts === 0
  ? 'L APERCU REPRODUIT BIEN LE JEU.'
  : ecarts + ' ECART(S) : l apercu ne montre plus ce que le joueur voit.'}`);
process.exit(ecarts === 0 ? 0 : 1);
