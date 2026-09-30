// Verifie que chaque identifiant demande par game.js existe dans index.html.
//
// Les ecrans s'affichent par la classe active, et chaque panneau a ses propres
// elements : un identifiant manquant ne provoque aucune erreur au chargement,
// seulement une exception le jour ou l'on ouvre cet ecran. C'est donc
// exactement le genre de defaut qui attend le joueur.
//
// Cette verification existe parce que index.html a ete reconstruit depuis une
// copie plus ancienne, et que la reconstruction avait oublie des blocs. Elle
// rattrape tout ce qui manque, pas seulement ce qu on soupconne.
const fs = require('node:fs');
const path = require('node:path');

const JS = fs.readFileSync(path.join(__dirname, '..', 'wwwroot', 'game.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'wwwroot', 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'wwwroot', 'style.css'), 'utf8');

const trouves = new Set();
const motifs = [
  /querySelector\('#([\w-]+)'\)/g,
  /getElementById\('([\w-]+)'\)/g,
  /querySelectorAll\('#([\w-]+)'\)/g
];
for (const motif of motifs) {
  let m = motif.exec(JS);
  while (m) { trouves.add(m[1]); m = motif.exec(JS); }
}

const manquants = [];
const sansStyle = [];
for (const id of [...trouves].sort()) {
  if (!new RegExp('id="' + id + '"').test(HTML)) {
    manquants.push(id);
    continue;
  }
  // Une classe d affichage pour cet identifiant. Toutes ne sont pas des
  // ecrans, mais la plupart le sont, et c'est la que le jeu planifie.
  const classe = (HTML.match(new RegExp('id="' + id + '"[^>]*class="([^"]*)"'))
    || HTML.match(new RegExp('class="([^"]*)"[^>]*id="' + id + '"')) || [])[1] || '';
  const mots = classe.split(/\s+/).filter(Boolean);
  if (!mots.some((m) => CSS.includes('.' + m))) sansStyle.push(id + ' (' + classe + ')');
}

console.log('  identifiant references par game.js : ' + trouves.size);
console.log('  presents dans index.html            : ' + (trouves.size - manquants.length));
if (manquants.length) {
  console.log('  MANQUANTS : ' + manquants.join(', '));
} else {
  console.log('  aucun identifiant manquant');
}
if (sansStyle.length) {
  console.log('  sans regle de style directe : ' + sansStyle.slice(0, 12).join(', '));
}

// Et l'inverse : un identifiant present mais jamais demande. C'est de la
// surface morte, pas un defaut, mais elle signale souvent un bloc orphelin
// apres une reconstruction.
const demandes = new Set();
for (const motif of [/id="([\w-]+)"/g]) {
  let m = motif.exec(HTML);
  while (m) { demandes.add(m[1]); m = motif.exec(HTML); }
}
const orphelins = [...demandes].filter((id) => !trouves.has(id) && !id.startsWith('__'));
console.log('  elements HTML jamais demandes : ' + orphelins.length
  + (orphelins.length ? '  -> ' + orphelins.slice(0, 12).join(', ') : ''));

process.exit(manquants.length ? 1 : 0);
