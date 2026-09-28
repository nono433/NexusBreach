// Pousser le projet sur GitHub en UN SEUL commit atomique.
//
// On utilise l'API Git Data (blobs / tree / commit / ref) plutot que de
// commiter fichier par fichier : soit toute la version part, soit rien.
// C'est aussi la seule facon de supprimer un fichier (LanceNexusBreach.bat)
// dans la meme operation, en passant sa sha a null dans le tree.
//
// Le token est lu dans process.env.GH_TOKEN : il n'est jamais ecrit sur disque.
const fs = require('node:fs');
const path = require('node:path');

const OWNER = 'nono433';
const REPO = 'NexusBreach';
const BRANCH = 'main';
const ROOT = path.join(__dirname, '..');
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

// Le jeton n'est verifie qu'au moment de pousser, pas au chargement : ce
// fichier est aussi importe par apercu-push.cjs pour ses regles d'exclusion,
// et il sortait en erreur avant meme d'avoir expose quoi que ce soit.
const token = process.env.GH_TOKEN;

const headers = {
  Authorization: `Bearer ${token || ''}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'opencode',
  'Content-Type': 'application/json'
};

async function api(method, url, body) {
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!response.ok) {
    const detail = data && data.message ? data.message : text.slice(0, 300);
    throw new Error(`${method} ${url.replace(API, '')} -> ${response.status} ${detail}`);
  }
  return data;
}

// Fichiers ignores : sauvegardes locales, profils de navigateur Edge
// (ils sont nommes _edgeprofile, _edgeprofile-assassin, ...), artefacts.
const IGNORED_DIRS = new Set(['_originaux', 'node_modules', '.git']);
const IGNORED_DIR_PREFIXES = ['_edgeprofile'];
// Les artefacts de test sont nommes __prefixe (collecteur injecte) et
// capture-*.png : ils ne doivent jamais partir sur GitHub.
// Les artefacts de test sont nommes __prefixe (collecteur injecte) et les
// captures d'ecran sont des PNG. Le projet n'a aucun PNG legitime : son seul
// visuel est favicon.svg. On les ecarte donc tous plutot que d'entretenir une
// liste de prefixes a jour, ce que les deux noms anterieurs ont deja rate.
const IGNORED_FILES = /^(__.*\.html|.*\.png)$/;

function ignoreDirectory(name) {
  return IGNORED_DIRS.has(name) || IGNORED_DIR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

// Exporte pour que les autres scripts ne recopient pas ces regles :
// apercu-push le faisait, et il a diverge, laissant passer les PNG que cette
// version ecarte. Une regle dupliquee finit toujours par mentir.
module.exports = { IGNORED_DIRS, IGNORED_DIR_PREFIXES, IGNORED_FILES, ignoreDirectory };

function collect(dir, base, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(base, absolute).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (ignoreDirectory(entry.name)) continue;
      collect(absolute, base, out);
    } else if (entry.isFile()) {
      if (IGNORED_FILES.test(entry.name)) continue;
      out.push(relative);
    }
  }
  return out;
}

// Ce corps ne s'execute que si le script est lance directement. Sans ce
// garde, un simple require par apercu-push.cjs declenchait le push, ou a tout
// le moins une erreur sur le jeton manquant.
if (require.main === module) (async () => {
  if (!token) {
    console.error('GH_TOKEN absent : rien n a ete pousse.');
    process.exit(1);
  }
  const files = collect(ROOT, ROOT, []).sort();
  console.log(`${files.length} fichiers a publier :`);
  files.forEach((file) => console.log(`  ${file}`));

  const ref = await api('GET', `${API}/git/ref/heads/${BRANCH}`);
  const baseCommit = ref.object.sha;
  const baseCommitData = await api('GET', `${API}/git/commits/${baseCommit}`);
  const baseTree = baseCommitData.tree.sha;
  console.log(`\ncommit de base : ${baseCommit}`);
  console.log(`arbre de base  : ${baseTree}`);

  // Fichiers a supprimer : presents sur le depot, absents du disque.
  const baseTreeData = await api('GET', `${API}/git/trees/${baseTree}?recursive=1`);
  const basePaths = new Map();
  (baseTreeData.tree || []).forEach((entry) => { if (entry.type === 'blob') basePaths.set(entry.path, entry.sha); });
  const localPaths = new Set(files);
  const deletions = [...basePaths.keys()].filter((pathInRepo) => !localPaths.has(pathInRepo));
  if (deletions.length) {
    console.log(`\nfichiers a supprimer : ${deletions.join(', ')}`);
  }

  const treeEntries = [];
  let blobCount = 0;
  for (const relative of files) {
    const content = fs.readFileSync(path.join(ROOT, relative));
    const blob = await api('POST', `${API}/git/blobs`, {
      content: content.toString('base64'),
      encoding: 'base64'
    });
    const mode = relative.endsWith('.bat') ? '100755' : '100644';
    const unchanged = basePaths.get(relative) === blob.sha;
    treeEntries.push({ path: relative, mode, type: 'blob', sha: blob.sha });
    blobCount += 1;
    if (blobCount % 5 === 0) console.log(`  ${blobCount}/${files.length} blobs...`);
  }
  // null supprime le fichier dans cet arbre.
  deletions.forEach((pathInRepo) => {
    treeEntries.push({ path: pathInRepo, mode: '100644', type: 'blob', sha: null });
  });

  const newTree = await api('POST', `${API}/git/trees`, { base_tree: baseTree, tree: treeEntries });
  console.log(`\nnouvel arbre : ${newTree.sha}`);

  const message = [
    'Ranger : plus aucun soin, et un vrai choix a chaque fin de vague',
    '',
    'Ce qui disparait :',
    '- Les Nénithes réparateurs, amélioration de soin du Ranger. C etait la',
    '  seule voie qui le rendait : aucune de ses quatre capacités ne soigne.',
    '  AEGIS reduit les degats subis de 45 %, c est de la protection, pas du',
    '  soin.',
    '- La valeur regenPer et la contribution correspondante dans player.regen.',
    '  Ce qui reste de la regeneration n appartient qu a l Assassin (poise) ou',
    '  a l atelier permanent, dont la valeur est nulle par construction.',
    '',
    'Ce qui arrive a la fin d une vague, pour le Ranger :',
    '- Deux options au lieu de trois modules :',
    '    Régénération complète  : tous les points de vie, et pas de module.',
    '    Prendre une amélioration : les trois modules habituels, et la vie',
    '                             telle qu elle est.',
    '- Les deux s excluent, et l ecran le dit. Se soigner ne fait pas',
    '  progresser l equipement ; un module ne rend rien.',
    '- L option de soin disparait quand la vie est deja au maximum : elle ne',
    '  ferait rien et prendrait la place d un module. L option d amelioration',
    '  disparait quand plus aucun module n est disponible. Aucune carte morte.',
    '',
    'L Assassin n est pas concerne : il garde ses trois cartes direct, et sa',
    'SANG-DÉCHIRÉ qui soigne sur elimination.',
    '',
    'tests/soin-ranger.cjs verifie sept points, dont le plus important : que',
    'l option de soin ne reapparait pas apres avoir choisi une amelioration.',
    'Controle negatif : le module de soin et la valeur de regeneration remis en',
    'place, le test echoue sur ses deux premiers points.',
    'tests/capture-soin.cjs photographie l ecran.',
    '',
    'Un bug de harnais trouve par ces tests, et de mon fait :',
    '- tests/_cdp.cjs naviguait vers l URL de la page SANS la query quand il',
    '  se reprogrammait apres un onglet vierge. Or le mode tactile du jeu se',
    '  declenche par ?tactile=1 : le jeu demarrait tres bien, mais croyait',
    '  tourner sur un ordinateur et ne creait aucune commande tactile.',
    '- Les tests qui verifiaient le bouton DASH de l Assassin echouaient de',
    '  facon aleatoire, sans raison visible. Les deux causes trouvees : cette',
    '  query perdue, et des credits ecrits APRES le premier chargement que le',
    '  profil du jeu ecrasait. preparerStockage() ecrit maintenant avant que le',
    '  jeu ne lise quoi que ce soit.',
    '',
    'Suite : 16 tests verts.'
  ].join('\n');

  const commit = await api('POST', `${API}/git/commits`, {
    message,
    tree: newTree.sha,
    parents: [baseCommit]
  });
  console.log(`nouveau commit : ${commit.sha}`);

  const updated = await api('PATCH', `${API}/git/refs/heads/${BRANCH}`, {
    sha: commit.sha,
    force: false
  });
  console.log(`branche mise a jour : ${updated.ref} -> ${updated.object.sha}`);

  console.log('\nPUBLIE.');
  console.log(`https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`);
})().catch((error) => {
  console.error('\nECHEC :', error.message);
  process.exit(1);
});
