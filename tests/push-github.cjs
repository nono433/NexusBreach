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
// Les artefacts de test sont nommes __prefixe (collecteur injecte) et
// capture-*.png : ils ne doivent jamais partir sur GitHub.
const IGNORED_FILES = /^(__.*\.html|capture-.*\.png)$/;

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
    'Commandes tactiles : le jeu devient jouable sur mobile',
    '',
    'Jeu jouable au doigt, en paysage :',
    '- Joystick flottant dans le coin gauche bas, il apparait ou se pose le pouce',
    '- Glissement a droite qui vise ET tire : sans tir automatique il faudrait un 3e doigt',
    '- Boutons RECH / TIR / CAP et pause tactile',
    '- La pause passe par un bouton car il n y a pas de pointer lock sur mobile',
    '- ?tactile=1 force le mode tactile pour tester depuis un ordinateur',
    '',
    'Performance mobile :',
    '- Ombres et anticrenelage coupes, resolution a 85 %, particules a 40 %',
    '- 8 ennemis simultanes au lieu de 11, 50 images par seconde',
    '- Detection au pointeur grossier : un portable a ecran tactile n affiche rien',
    '- Audio deverrouille au premier appui, sinon iOS et Chrome le bloquent',
    '',
    'Ecrans verifies sur format telephone :',
    '- Indications clavier retirees au doigt, barre de vie remontee en haut a gauche',
    '- Compteur de munitions et boutons d action realignes a droite',
    '- Les commandes n apparaissent qu en jeu et en pause',
    '- Ecran de rotation en portrait, menus defilables sur ecran court',
    '- touch-action: none, sans quoi le doigt fait defiler la page en jouant',
    '',
    'Corrections trouvees en verifiant le tactile :',
    '- Les commandes restaient affichees sur l ecran de mort et a l atelier',
    '- touchStickBounds calculait minY sans jamais l utiliser',
    '- En sortant la barre de vie du flux de grille, les munitions glissaient au centre',
    '',
    'Tests :',
    '- tests/tactile.cjs : 13 etapes, joystick, visee, tir auto, pause, atelier',
    '- tests/hud.cjs : collisions du HUD en paysage, bureau et tactile',
    '- Le test de HUD mesure l encre visible, pas les boites de conteneur : un',
    '  element de grille est etire sur toute sa cellule, donc deux freres se',
    '  toucheraient toujours. Controle negatif documente dans le fichier.',
    '- tests/encodage.cjs ne se signale plus lui-meme',
    '- 7 tests au vert, headshots 15/15, encodage propre'
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
