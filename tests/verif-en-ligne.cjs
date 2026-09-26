// Verifie que la version deployee sur GitHub Pages correspond bien au
// contenu local : sans cela un push reussi ne prouve pas que le site est a
// jour, car Pages peut servir une version cachee.
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'https://nono433.github.io/NexusBreach';
const ROOT = path.join(__dirname, '..');
const bust = `v=${Date.now()}`;

async function charger(fichier) {
  const response = await fetch(`${BASE}/${fichier}?${bust}`, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!response.ok) throw new Error(`${fichier} -> HTTP ${response.status}`);
  return response.text();
}

function compter(texte, motifs) {
  const resultat = {};
  for (const motif of motifs) {
    resultat[motif] = texte.split(motif).length - 1;
  }
  return resultat;
}

(async () => {
  let enLigne;
  try {
    enLigne = {
      'game.js': await charger('game.js'),
      'style.css': await charger('style.css'),
      'index.html': await charger('index.html')
    };
  } catch (e) {
    console.log('TELECHARGEMENT IMPOSSIBLE :', e.message);
    process.exit(1);
  }

  for (const [fichier, texte] of Object.entries(enLigne)) {
    console.log(`  ${fichier.padEnd(12)} ${texte.length} caracteres`);
  }

  console.log('\n=== SOURCES PRESENTES EN LIGNE ===');
  const attendu = {
    'game.js': ['IS_TOUCH', 'initTouchControls', 'touchStickBounds', 'touche-en-jeu', 'isTouchFiring', 'openPause', 'maxConcurrentCap', 'unlockTouch'],
    'style.css': ['touch-layer', 'touche-en-jeu', 'touch-stick-base', 'rotate-hint', 'max-height: 540px', 'env(safe-area-inset-bottom)'],
    'index.html': ['touch-stick', 'touch-fire', 'touch-ability', 'touch-reload', 'touch-pause', 'rotate-hint']
  };
  let manquant = 0;
  for (const [fichier, motifs] of Object.entries(attendu)) {
    const compte = compter(enLigne[fichier], motifs);
    for (const [motif, n] of Object.entries(compte)) {
      const ok = n > 0;
      if (!ok) manquant += 1;
      console.log(`  ${ok ? 'OK  ' : 'MANQUE'} ${fichier.padEnd(11)} ${motif.padEnd(28)} ${n}`);
    }
  }

  console.log('\n=== IDENTIQUE AU LOCAL ? (sha256) ===');
  const crypto = require('node:crypto');
  for (const fichier of Object.keys(enLigne)) {
    const distant = crypto.createHash('sha256').update(enLigne[fichier], 'utf8').digest('hex').slice(0, 16);
    const local = fs.readFileSync(path.join(ROOT, 'wwwroot', fichier), 'utf8');
    const localHash = crypto.createHash('sha256').update(local, 'utf8').digest('hex').slice(0, 16);
    const identique = distant === localHash;
    if (!identique) manquant += 1;
    console.log(`  ${identique ? 'OK  ' : 'DIFF'} ${fichier.padEnd(12)} local ${localHash}  en ligne ${distant}`);
  }

  console.log('\n=== ENCODAGE (doit etre 0) ===');
  const tout = Object.values(enLigne).join('');
  const mojibake = (tout.match(/Ã©|Ã¨|Ã |â€|Â·|Ã\xA0/g) || []).length;
  console.log(`  occurrences : ${mojibake}`);

  console.log(manquant === 0 && mojibake === 0
    ? '\nLE SITE EN LIGNE EST A JOUR.'
    : `\n${manquant} PROBLEME(S).`);
  process.exit(manquant === 0 && mojibake === 0 ? 0 : 1);
})();
