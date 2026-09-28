// Compare le depot GitHub et le disque, fichier par fichier.
//
// Question a laquelle cet audit repond : "est-ce que GitHub contient les
// fichiers de cet ordinateur ?". Le push construit deja son arbre avec les
// suppressions (sha: null pour ce qui n existe plus localement), donc il
// devrait etre un miroir exact. Plutot que de le croire, on le mesure.
//
// Trois écarts sont distingues, et ils ne se corrigent pas de la meme facon :
//   - fichier sur le depot mais pas sur le disque  : a supprimer du depot
//   - fichier sur le disque mais pas sur le depot  : a pousser
//   - fichier present des deux cotes mais different: a repousser
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.github.com/repos/nono433/NexusBreach';
const { IGNORED_FILES, ignoreDirectory } = require('./push-github.cjs');

// Meme collecte que tests\apercu-push.cjs : les regles d exclusion viennent du
// script de push, pas d une copie qui pourrait diverger.
const locaux = new Map();
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolu = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirectory(entry.name)) continue;
      collect(absolu);
    } else if (entry.isFile()) {
      if (IGNORED_FILES.test(entry.name)) continue;
      const relatif = path.relative(ROOT, absolu).split(path.sep).join('/');
      const data = fs.readFileSync(absolu);
      locaux.set(relatif, crypto.createHash('sha256').update(data).digest('hex'));
    }
  }
}
collect(ROOT);

(async () => {
  const tete = await (await fetch(`${API}/git/ref/heads/main`)).json();
  const commit = tete.object.sha;
  const arbre = await (await fetch(`${API}/git/commits/${commit}`)).json();
  const listing = await (await fetch(
    `${API}/git/trees/${arbre.tree.sha}?recursive=1`)).json();

  const distants = new Map();
  for (const entree of listing.tree || []) {
    if (entree.type === 'blob') distants.set(entree.path, entree.sha);
  }

  const enTrop = [...distants.keys()].filter((p) => !locaux.has(p));
  const manquants = [...locaux.keys()].filter((p) => !distants.has(p));
  // Pour l egalite du contenu, il faut la taille et le sha git de chaque blob
  // local. Comparer des sha256 a des sha git n'aurait pas de sens.
  const differents = [];
  for (const [chemin, sha] of locaux) {
    const distant = distants.get(chemin);
    if (!distant) continue;
    const blob = await (await fetch(`${API}/git/blobs/${distant}`)).json();
    const contenu = Buffer.from(blob.content || '', 'base64');
    const shaLocal = crypto.createHash('sha1')
      .update(Buffer.concat([Buffer.from('blob ' + contenu.length + '\0'), contenu]))
      .digest('hex');
    if (shaLocal !== distant) differents.push(chemin);
  }

  console.log(`  commit distant   : ${commit.slice(0, 7)}`);
  console.log(`  fichiers locaux  : ${locaux.size}`);
  console.log(`  fichiers distants: ${distants.size}`);
  console.log(`\n  sur le depot mais pas sur le disque : ${enTrop.length}`);
  enTrop.forEach((p) => console.log('    - ' + p));
  console.log(`  sur le disque mais pas sur le depot : ${manquants.length}`);
  manquants.forEach((p) => console.log('    - ' + p));
  console.log(`  presents des deux cotes mais differents : ${differents.length}`);
  differents.forEach((p) => console.log('    - ' + p));

  const ecart = enTrop.length + manquants.length + differents.length;
  if (ecart === 0) {
    console.log('\n  LE DEPOT EST DEJA UN MIROIR EXACT DU DISQUE.');
    return;
  }
  console.log(`\n  ${ecart} ECART(S) : un push les corrigerait.`);
})();
