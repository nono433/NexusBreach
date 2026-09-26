// Audit d'encodage HONNETE. tests/encodage.cjs ne cherche que quelques
// sequences concretas (Ã©, â€...) et conclude "aucun fichier corrompu" sur un
// fichier qui contient pourtant "nǸcessaire" a la place de "nécessaire".
// Ce controle liste les caracteres hors alphabet francais : il ne depend
// d'aucune sequence a antipsychier, donc un encodage casse finit toujours par
// se voir.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CIBLES = ['wwwroot/game.js', 'wwwroot/index.html', 'wwwroot/style.css', 'wwwroot/favicon.svg', 'README.md', 'serveur.js', 'Lance Nexus Breach.bat'];

// Tout ce qui est legitime en francais et dans le jeu.
const AUTORISE = new Set(
  ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
   ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~' +
   'éèêëàâäôöùûüïîçÉÈÊËÀÂÄÔÖÙÛÜÏÎÇ' +
   'œŒæÆ' +
   '’‘“”«»…–—·°×÷±≤≥≠≈∞' +
   '→←↑↓✓✕●○■□▓▒░│─┌┐└┘├┤┬┴┼' +
   '❚♪⚠')
    .split('')
);

const suspect = [];
let totalSignales = 0;

for (const relatif of CIBLES) {
  const fichier = path.join(ROOT, relatif);
  if (!fs.existsSync(fichier)) continue;
  const texte = fs.readFileSync(fichier, 'utf8');
  const lignes = texte.split('\n');
  const trouve = new Map();
  lignes.forEach((ligne, i) => {
    for (const caractere of ligne) {
      if (AUTORISE.has(caractere)) continue;
      const code = caractere.codePointAt(0);
      const cle = `${caractere} (U+${code.toString(16).toUpperCase().padStart(4, '0')})`;
      if (!trouve.has(cle)) trouve.set(cle, []);
      if (trouve.get(cle).length < 4) trouve.get(cle).push(i + 1);
    }
  });
  if (trouve.size === 0) continue;
  console.log(`\n${relatif} : ${trouve.size} caractere(s) hors alphabet francais`);
  for (const [cle, lignesListe] of trouve) {
    console.log(`   ${cle.padEnd(28)} lignes ${lignesListe.join(', ')}`);
    totalSignales += 1;
  }
  suspect.push(relatif);
}

// Montrons le contexte des premieres occurrences, c'est plus parlant.
console.log('\n=== CONTEXTE ===');
for (const relatif of suspect) {
  const texte = fs.readFileSync(path.join(ROOT, relatif), 'utf8');
  const lignes = texte.split('\n');
  let montre = 0;
  lignes.forEach((ligne, i) => {
    if (montre >= 6) return;
    for (const caractere of ligne) {
      if (AUTORISE.has(caractere)) continue;
      console.log(`  ${relatif} L${i + 1} : ${ligne.trim().slice(0, 100)}`);
      montre += 1;
      break;
    }
  });
}

console.log(`\n${totalSignales === 0 ? 'ENCODAGE PROPRE.' : totalSignales + ' caractere(s) suspect(s).'}`);
process.exit(totalSignales === 0 ? 0 : 1);
