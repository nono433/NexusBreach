// Telecharge integralement un commit du depot sur le disque.
//
// But : ne rien perdre. Un commit GitHub n'est pas une sauvegarde de travail :
// personne ne peut lecompiler, et il disparait des que la machine d origine
// n'est plus la. On le ramene donc sous forme de fichiers reels.
//
// Chaque fichier est verifie : le SHA git d'un blob est le SHA1 de
// "blob <taille>\\0<contenu>", ce qui se recalcule ici. On ne fait confiance ni
// a la reponse ni a la taille affichee.
//
// Le dossier de sortie est VOISIN du projet, pas dedans : un dossier dans
// NexusBreach serait recursive pour le push, et le depot distant se copierait
// dans sa propre sauvegarde.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const API = 'https://api.github.com/repos/nono433/NexusBreach';
const SHA = process.argv[2];
const SORTIE = process.argv[3];

if (!SHA || !SORTIE) {
  console.log('  usage : node recuperer-depot.cjs <sha> <dossier>');
  process.exit(1);
}

const jeton = process.env.GH_TOKEN;
const entetes = jeton
  ? { Authorization: 'Bearer ' + jeton, 'User-Agent': 'nexus-recup' }
  : { 'User-Agent': 'nexus-recup' };

const api = async (chemin) => {
  const r = await fetch(API + chemin, { headers: entetes });
  if (!r.ok) throw new Error(chemin + ' -> HTTP ' + r.status);
  return r.json();
};

const shaGit = (contenu) => crypto.createHash('sha1')
  .update(Buffer.concat([Buffer.from('blob ' + contenu.length + '\0'), contenu]))
  .digest('hex');

(async () => {
  // L'API Git Data exige le SHA complet sur 40 caracteres : un SHA court y
  // donne un 404. On le resout d'abord par l'API de commits, qui accepte un
  // abrege.
  let complet = SHA;
  if (SHA.length !== 40) {
    const court = await api('/commits/' + SHA);
    complet = court.sha;
    console.log('  SHA court resolu : ' + SHA + ' -> ' + complet);
  }

  const commit = await api('/git/commits/' + complet);
  const listing = await api('/git/trees/' + commit.tree.sha + '?recursive=1');
  const blobs = (listing.tree || []).filter((e) => e.type === 'blob');
  const dossiers = (listing.tree || []).filter((e) => e.type === 'tree');

  console.log('  commit   : ' + commit.sha.slice(0, 7));
  console.log('  message  : ' + String(commit.message).split('\n')[0]);
  console.log('  date     : ' + String(commit.author && commit.author.date));
  console.log('  fichiers : ' + blobs.length + '   dossiers : ' + dossiers.length);
  console.log('  sortie   : ' + SORTIE + '\n');

  fs.rmSync(SORTIE, { recursive: true, force: true });
  for (const d of dossiers) {
    fs.mkdirSync(path.join(SORTIE, d.path), { recursive: true });
  }

  let ok = 0;
  const casse = [];
  for (const entree of blobs) {
    const blob = await api('/git/blobs/' + entree.sha);
    const contenu = Buffer.from(blob.content || '', blob.encoding === 'base64' ? 'base64' : 'utf8');
    const attendu = shaGit(contenu);
    if (attendu !== entree.sha) {
      casse.push(entree.path + ' (sha recalu ' + attendu.slice(0, 8)
        + ', annonce ' + entree.sha.slice(0, 8) + ')');
      continue;
    }
    const cible = path.join(SORTIE, entree.path);
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    fs.writeFileSync(cible, contenu);
    ok += 1;
    if (ok % 15 === 0) console.log('  ' + ok + '/' + blobs.length + ' fichiers...');
  }

  console.log('\n  ecrits et verifies : ' + ok + '/' + blobs.length);
  if (casse.length) {
    console.log('  FICHIERS INTEGRES : ' + casse.length);
    casse.forEach((c) => console.log('    ! ' + c));
    process.exit(1);
  }

  // Le commit.message est ecrit a part : il n'est pas dans l'arbre, et c'est
  // lui qui dit ce que cette version est censee etre.
  fs.writeFileSync(path.join(SORTIE, '_COMMIT.txt'),
    'commit ' + commit.sha + '\n'
    + 'date ' + String(commit.author && commit.author.date) + '\n'
    + 'auteur ' + String(commit.author && commit.author.name) + '\n\n'
    + String(commit.message) + '\n', 'utf8');

  console.log('  description du commit : ' + path.join(SORTIE, '_COMMIT.txt'));
  console.log('  Dossier complet et fidele au commit.');
})();
