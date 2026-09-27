// Verifie que la page d'apercu des robots et le jeu portent bien les memes
// proportions.
//
// L'apercu recopie les constantes de buildHumanoid a la main. C'est
// acceptable pour une page de travail, mais des que les deux divergent
// l'apercu ment : on validerait un robot que le joueur ne voit jamais. Ce
// test compare les valeurs litterales des deux fichiers.
//
// Il compare aussi ce que l'apercu ne peut pas reproduire : les gabarits
// d'ennemis y sont declares en dur, et une divergence de couleur ou
// d'echelle passerait inapercue.
const fs = require('node:fs');
const path = require('node:path');

const WWW = path.join(__dirname, '..', 'wwwroot');
const jeu = fs.readFileSync(path.join(WWW, 'game.js'), 'utf8');
const apercu = fs.readFileSync(path.join(WWW, '__preview-robots.html'), 'utf8');

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

// Couleurs et echelles des ennemis, telles que declarees dans ENEMY_TYPES.
const GABARITS = [
  { nom: 'Rôdeur', couleur: '0x55f6c1', scale: '0.88' },
  { nom: 'Chasseur', couleur: '0xffcf4a', scale: '0.78' },
  { nom: 'Brute', couleur: '0xff5b42', scale: '1.28' },
  { nom: 'Alpha', couleur: '0xff2d85', scale: '1.5' },
  { nom: 'Forge-Monarque', couleur: '0xff2d85', scale: '1.6' }
];

let ecarts = 0;

console.log('=== PROPORTIONS DU ROBOT ===');
for (const proportion of PROPORTIONS) {
  const dansJeu = jeu.includes(proportion);
  const dansApercu = apercu.includes(proportion);
  const ok = dansJeu && dansApercu;
  if (!ok) ecarts += 1;
  const etat = dansJeu && dansApercu ? 'identique'
    : dansJeu ? 'MANQUANT DANS L APERCU' : 'MANQUANT DANS LE JEU';
  console.log(`  ${ok ? 'OK  ' : 'ECART'} ${proportion.padEnd(44)} ${etat}`);
}

console.log('\n=== COULEURS ET ECHELLES ===');
for (const gabarit of GABARITS) {
  const dansJeu = jeu.includes(gabarit.couleur) && jeu.includes(`scale: ${gabarit.scale},`);
  const dansApercu = apercu.includes(gabarit.couleur) && apercu.includes(`scale: ${gabarit.scale},`);
  const ok = dansJeu && dansApercu;
  if (!ok) ecarts += 1;
  const etat = dansJeu && dansApercu ? 'identique'
    : dansJeu ? 'ABSENT DE L APERCU' : 'ABSENT DU JEU';
  console.log(`  ${ok ? 'OK  ' : 'ECART'} ${gabarit.nom.padEnd(18)} ${gabarit.couleur.padEnd(10)} x${gabarit.scale.padEnd(5)} ${etat}`);
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
