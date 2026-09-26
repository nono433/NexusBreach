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

const token = process.env.GH_TOKEN;
if (!token) {
  console.error('GH_TOKEN absent.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
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
const IGNORED_FILES = /^(__smoke\.html|__preview-.*\.html|__shopshot\.html|capture-.*\.png)$/;

function ignoreDirectory(name) {
  return IGNORED_DIRS.has(name) || IGNORED_DIR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

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

(async () => {
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
    'Rééquilibrage complet, séparation des classes et nouveau sabre',
    '',
    'Équilibrage :',
    '- Améliorations de vague additives (+78 % dégâts / +66 % cadence au lieu de ×32 en cascade)',
    '- Toutes les courbes ennemies plafonnées : PV, dégâts, cadence, effectif, total par vague',
    '- Armes rééquilibrées pour que le DPS suive le prix, atelier volontairement sobre',
    '- NOVA et AEGIS reprises, elles étaient du contenu mort',
    '- Foundry assouplie, le même équipement y mourait 30 vagues plus tôt',
    '- DPS affiché dans l\'atelier corrigé (perforation, explosion, brasure)',
    '',
    'Classes exclusives :',
    '- Ranger : 8 armes à feu, 4 capacités, 7 améliorations, 3 modules',
    '- Assassin : 5 sabres, 4 capacités, 7 améliorations, 3 modules',
    '- 3 améliorations et 2 modules communs',
    '- L\'atelier n\'affiche que ce qui est accessible avec la classe',
    '',
    'Visuels :',
    '- Sabre reconstruit : lame courbée au corps sombre et tranchant néon, garde angulaire',
    '- La lame est déformée par vertex pour obtenir une vraie courbure de sabre',
    '',
    'Corrections antérieures :',
    '- Headshots enfin comptabilisés (la hitbox englobait la tête)',
    '- Fuite de mémoire GPU corrigée dans clearDynamicObjects',
    '- Blocage de l\'écran d\'amélioration quand tout était au maximum',
    '',
    'Performances :',
    '- Géométrie de débris partagée, pool de matériaux, suppression des allocations par frame',
    '- Shadow map rafraîchie 1 frame sur 3, cache DOM pour le HUD',
    '',
    'Outillage :',
    '- Lanceur Node.js (le SDK .NET n\'était pas installé) et tests de rééquilibrage'
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
