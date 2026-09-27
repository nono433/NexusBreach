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
    'Assassin : la capacite s AJOUTE au dash au lieu de le remplacer',
    '',
    'Le defaut, qui etait un defaut de conception :',
    '- L Assassin n a qu une touche, Espace, pour deux ressources. La touche',
    '  appartenait entierement a la capacite des qu une capacite etait achetee.',
    '- Pendant la recharge de la capacite, l appui ne faisait RIEN. Le dash',
    '  devenait donc injoignable pendant 12 a 26 secondes d affilee.',
    '- Le pire cas est nomme dans sa propre description : PAS OMBRE promet',
    '  "reset immediat du dash et +50 % de degats pendant 6 secondes". Il',
    '  remettait le compteur a zero, puis bloquait la touche qui sert a',
    '  s en servir. Elle faisait l inverse de ce qu elle annoncait.',
    '',
    'La regle desormais :',
    '- La capacite part quand elle est prete.',
    '- Le dash prend le relais quand elle recharge.',
    '- Il ne se passe rien seulement quand les deux sont en attente, et le',
    '  message nomme alors les deux temps de recharge.',
    '- Chaque ressource garde son propre temps de recharge : rien ne se vole.',
    '',
    'Le HUD cachait le defaut, il le corrige aussi :',
    '- Le bandeau du bas n affichait l etat du dash que sans capacite equipee.',
    '  Le joueur n avait donc aucun moyen de savoir que son dash revenait.',
    '- L indicateur "pret" ne regardait que la capacite : il affirmait pret',
    '  pendant que le dash etait indisponible. Il vaut desormais " pret des',
    '  qu UNE des deux ressources l est, ce qui est la regle reelle.',
    '',
    'tests/dash-assassin.cjs, conduisant une vraie partie, Espace 8 fois par',
    'de vrais evenements clavier :',
    '- Code actuel : 2 capacites, 6 dash, dont 6 pendant une recharge, 0 refus.',
    '- Ancien code, remis en place pour le controle negatif : 0 dash, 7 refus',
    '  injustifies. Le test echoue, donc il detecte bien la difference.',
    '- __nexus.etatAction() est le diagnostic qui rend la mesure possible.',
    '',
    'Suite : 13 tests verts.'
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
