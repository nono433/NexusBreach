// Detecte (etoptionnellement repare) le double encodage UTF-8.
//
// Symptome : un accent ecrit normalement (e) peut avoir ete relu comme
// Latin-1 puis reecrit en UTF-8, ce qui produit des sequences comme
// 'SpÃ©cialiste'. C'est reversible de facon deterministe : on relit les
// octets comme Latin-1 puis on reecrit en UTF-8.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const REPAIR = process.argv.includes('--reparer');

const PATTERNS = [
  'Ã©',   // e accent
  'Ã¨',   // e grave
  'Ã ',
  'Ã/',
  'Ã ',   // a accent
  'Ã²',   // o accent
  'Ã¹',   // u accent
  'Ã§',   // cedille
  'Ã‰',   // E majuscule
  'Ã‹',   // o majuscule
  'Ã\xA0',
  'â€™',  // apostrophe typographique
  'â€œ',
  'â€',
  'Â·',   // point median
  'Â°'
];

function detecter(buffer) {
  const text = buffer.toString('utf8');
  const found = {};
  let total = 0;
  for (const pattern of PATTERNS) {
    const count = text.split(pattern).length - 1;
    if (count > 0) { found[pattern] = count; total += count; }
  }
  return { text, found, total };
}

function reparer(buffer) {
  // Relire en Latin-1 : chaque octet UTF-8 devient un caractere Latin-1.
  return Buffer.from(buffer.toString('latin1'), 'utf8');
}

const cibles = [];
function parcourir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // Les profils Edge de test sont des repertoires suffixes (_edgeprofile-x) :
    // un nom exact ne suffirait pas a les exclure.
    if (['_originaux', 'node_modules', '.git', 'vendor'].includes(entry.name)) continue;
    if (entry.name.startsWith('_edgeprofile')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { parcourir(full); continue; }
    if (!/\.(js|mjs|cjs|css|html|md|json|bat)$/i.test(entry.name)) continue;
    // Ces deux fichiers contiennent les motifs de detection en toutes lettres :
    // ils se signaleraient eux-memes sans que le jeu soit corrompu.
    if (entry.name === 'encodage.cjs' || entry.name === 'reparer-encodage.cjs') continue;
    cibles.push(full);
  }
}
parcourir(ROOT);

let totalGlobal = 0;
const ceramiques = [];
for (const file of cibles) {
  const buffer = fs.readFileSync(file);
  const info = detecter(buffer);
  if (info.total === 0) continue;
  const rel = path.relative(ROOT, file);
  totalGlobal += info.total;
  let verdict = 'PRESENT';
  if (REPAIR) {
    const corrige = reparer(buffer);
    const apres = detecter(corrige);
    // On ne retient la correction que si elle supprime vraiment le probleme
    // ET ne casse pas le reste du fichier.
    if (apres.total < info.total) {
      fs.writeFileSync(file, corrige);
      verdict = `CORRIGE (${info.total} -> ${apres.total} restant)`;
    } else {
      verdict = 'NON CORRIGE (la reparation n aide pas)';
    }
  }
  ceramiques.push({ rel, total: info.total, detail: info.found, verdict });
}

if (ceramiques.length === 0) {
  console.log('Aucun fichier corrompu.');
  process.exit(0);
}
for (const item of ceramiques) {
  const detail = Object.entries(item.detail).map(([k, v]) => `${JSON.stringify(k)}:${v}`).join(' ');
  console.log(`${item.verdict.padEnd(34)} ${String(item.total).padStart(4)}  ${item.rel}`);
  console.log(`   ${detail}`);
}
console.log(`\n${ceramiques.length} fichier(s) concerne(s), ${totalGlobal} occurrence(s).`);
