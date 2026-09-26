// Apercu de ce que le push enverrait, avec exactement les memes regles
// d'exclusion que tests/push-github.cjs. Verifie avant de pousser.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const IGNORED_DIRS = new Set(['_originaux', 'node_modules', '.git']);
const IGNORED_DIR_PREFIXES = ['_edgeprofile'];
const IGNORED_FILES = /^(__.*\.html|capture-.*\.png)$/;

function ignoreDirectory(name) {
  return IGNORED_DIRS.has(name) || IGNORED_DIR_PREFIXES.some((p) => name.startsWith(p));
}

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
