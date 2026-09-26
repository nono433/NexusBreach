// Repare un double encodage UTF-8 cause par un aller-retour via la console
// Windows. Le detail qui compte : le mojibake n'est PAS en Latin-1 mais en
// cp1252 (Windows-1252), ou 0x8A vaut 'Š' et non le caractere de controle
// U+008A. Reparer avec Latin-1 produit donc des caracteres de controle qui
// cassent la syntaxe JavaScript.
//
// methode : chaque caractere du texte mojibake est reconverti en octet via
// la table cp1252, puis la suite d'octets est relue comme UTF-8.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const cible = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'wwwroot', 'game.js');

// Table inverse cp1252 : position = octet, valeur = caractere.
const CP1252 = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F
};

const REPARER_UN_CARACTERE = new Map(Object.entries(CP1252).map(([code, octet]) => [String.fromCodePoint(Number(code)), octet]));

const MOTIFS = ['Ã©', 'Ã¨', 'Ã ', 'Ã/', 'Ã ', 'Ã²', 'Ã¹', 'Ã§', 'Ã‰', 'Ã‹', 'Ã', 'â€™', 'â€œ', 'â€', 'Â·', 'Â°', 'Ãˆ', 'Ã©'];

function compter(text) {
  let total = 0;
  for (const motif of MOTIFS) total += text.split(motif).length - 1;
  return total;
}

function versOctets(text) {
  const octets = [];
  for (const caractere of text) {
    const code = caractere.codePointAt(0);
    if (REPARER_UN_CARACTERE.has(caractere)) {
      octets.push(REPARER_UN_CARACTERE.get(caractere));
    } else if (code < 0x100) {
      octets.push(code);
    } else {
      // Caractere hors cp1252 : ce n'est pas du mojibake, on le laisse tel
      // quel en le signalant.
      return null;
    }
  }
  return Buffer.from(octets);
}

function reparerUneFois(text) {
  const octets = versOctets(text);
  if (!octets) return null;
  return octets.toString('utf8');
}

function apercu(text) {
  return {
    Specialiste: text.includes('Spécialiste'),
    capacites: text.includes('capacités'),
    ameliorations: text.includes('améliorations'),
    TETE: text.includes('TÊTE'),
    dege: text.includes('dégâts')
  };
}

const original = fs.readFileSync(cible);
let text = original.toString('utf8');
console.log(`fichier : ${path.relative(ROOT, cible)}`);
console.log(`taille  : ${original.length} octets`);
console.log(`avant   : ${compter(text)} sequence(s) mojibake`);
console.log(`apercu avant : ${JSON.stringify(apercu(text))}`);

if (compter(text) === 0) { console.log('\nDeja propre.'); process.exit(0); }

for (let passe = 1; passe <= 3; passe += 1) {
  const avant = compter(text);
  if (avant === 0) break;
  const suivant = reparerUneFois(text);
  if (suivant === null) {
    console.log('\nCaractere hors cp1252 detecte : arret, reparation non applicable.');
    process.exit(1);
  }
  const apres = compter(suivant);
  console.log(`\npasse ${passe} : ${avant} -> ${apres} sequence(s)`);
  console.log(`  apercu : ${JSON.stringify(apercu(suivant))}`);
  if (apres >= avant) {
    console.log('  Aucun gain : arret.');
    process.exit(1);
  }
  // Le fichier ne doit contenir aucun caractere de controle suspect, qui
  // casserait la syntaxe JavaScript.
  const controle = suivant.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g);
  if (controle) {
    console.log(`  ${controle.length} caractere(s) de controle detecte(s) : reparation refusee.`);
    process.exit(1);
  }
  text = suivant;
}

const restant = compter(text);
const marks = apercu(text);
console.log(`\nfinal : ${restant} sequence(s), marqueurs ${JSON.stringify(marks)}`);
if (restant === 0 && Object.values(marks).filter(Boolean).length >= 3) {
  fs.writeFileSync(cible, Buffer.from(text, 'utf8'));
  console.log('Fichier repare et ecrit.');
} else {
  console.log('Ecriture refusee.');
  process.exit(1);
}
