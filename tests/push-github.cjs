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
    'Assassin : un bouton pour le dash, un bouton pour la capacite',
    '',
    'Sur ordinateur :',
    '- ESPACE declenche la capacite, F declenche le dash. Deux touches, deux',
    '  ressources, deux messages.',
    '- F n existe que chez l Assassin. Le Ranger n a pas de dash et ne doit',
    '  pas heriter d une touche qui ne repond a rien.',
    '',
    'Sur mobile :',
    '- Nouveau bouton DASH dans la couche tactile, a cote de CAP.',
    '- Il n est visible que chez l Assassin, via la classe touche-assassin qui',
    '  suit la classe equipee.',
    '',
    'Pourquoi la separation etait necessaire :',
    '- Une touche qui fait deux choses n en fait aucune correctement. Quand une',
    '  des deux etait indisponible, le joueur ne savait pas laquelle, et l appui',
    '  ne donait rien.',
    '- C est exactement ce qui rendait PAS OMBRE inerte : il remettait le',
    '  compteur du dash a zero, puis bloquait la touche qui sert a s en servir.',
    '',
    'Le HUD nomme les deux touches et le bandeau du bas suit le dash, avec ou',
    'sans capacite equipee.',
    '',
    'tests/dash-assassin.cjs, sur une vraie partie :',
    '- Il debloque la classe et la capacite PAR LA BOUTIQUE, pas par le',
    '  stockage : la possession vit dans la sauvegarde et prime au chargement,',
    '  donc la forcer par localStorage echouait en silence.',
    '- ESPACE : capacite 2/5, dash 0/5. Touche F : capacite 0/5, dash 4/5.',
    '- Les deux zeros sont le controle negatif : c est eux qui distinguent',
    '  "les deux touches marchent" de "une touche fait les deux".',
    '- Il verifie aussi que le bouton DASH est masque chez le Ranger.',
    '',
    'Deux corrections de harnais trouvees au passage :',
    '- tests/_cdp.cjs pouvait se connecter a un onglet vierge laisse par un',
    '  navigateur precedent. Le symptome etait un "Access is denied for this',
    '  document" sans rapport avec le code teste. Il verifie maintenant que le',
    '  document connecte est bien la page demandee, et navigue si besoin.',
    '- tests/capture-projectile.cjs echouait par hasard quand le joueur',
    '  immobile mourait avant qu un Tireur ne tire. Il relance et recommence',
    '  maintenant, comme le fait deja tir-distance.cjs.',
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
