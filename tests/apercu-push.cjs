// Apercu de ce que le push enverrait, avec exactement les memes regles
// d'exclusion que tests/push-github.cjs. Verifie avant de pousser.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const IGNORED_DIRS = new Set(['_originaux', 'node_modules', '.git']);
// Regles importees, pas recopiees. Ce fichier les avait dupliquees, et sa
// copie avait diverge de celle du push : elle laissait passer les captures
// PNG. Un apercu qui montre un fichier different de ce qui part sur GitHub
// ne sert a rien.
const { IGNORED_FILES, ignoreDirectory } = require('./push-github.cjs');

const out = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirectory(entry.name)) continue;
      collect(absolute);
    } else if (entry.isFile()) {
      if (IGNORED_FILES.test(entry.name)) continue;
      out.push(path.relative(ROOT, absolute).split(path.sep).join('/'));
    }
  }
}
collect(ROOT);
out.sort();
console.log(`${out.length} fichiers a publier :`);
out.forEach((f) => {
  const size = fs.statSync(path.join(ROOT, f)).size;
  console.log(`  ${f.padEnd(36)} ${String(size).padStart(8)} octets`);
});
