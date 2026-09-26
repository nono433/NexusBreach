// Detecte les erreurs de zone morte temporelle sans executer le jeu.
//
// Le module se declare avec const : lire une constante avant sa ligne de
// declaration echoue au chargement. Ce defaut a casse le jeu deux fois
// (CLASS_DEFAULT_WEAPON, puis ALPHA_STATS) et les deux fois il n'est
// visible que sur le navigateur du joueur, pas dans les tests habituels.
//
// On liste les references de chaque constante de premier niveau, et on
// signale celles qui apparaissent avant la declaration. C'est une heuristique :
// elle peut signaler un faux positif si une fonction est referencee avant sa
// definition, ce qui est legal. Les cas probables sont donc lists, et le
// controle negatif de tests/ordre-declaration.cjs confirme qu'on sait les
// reproduire.
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'wwwroot', 'game.js'), 'utf8');
const lignes = source.split('\n');

// References explicites, hors declaration et hors propre occurence du nom.
function declarations(nom) {
  const trouvees = [];
  lignes.forEach((ligne, i) => {
    const motif = new RegExp(`^(const|let|var)\\s+${nom}\\b`);
    if (motif.test(ligne.trim())) trouvees.push(i);
  });
  return trouvees;
}

function references(nom, ligneDeclaration) {
  const trouvees = [];
  const motif = new RegExp(`\\b${nom}\\b`, 'g');
  lignes.forEach((ligne, i) => {
    if (i === ligneDeclaration) return;
    const mots = ligne.match(motif);
    if (!mots) return;
    // On ignore la declaration elle-meme (prefixe const/let/var).
    if (new RegExp(`^\\s*(const|let|var)\\s+${nom}\\b`).test(ligne)) return;
    // Et les commentaires : une constante nommee en commentaire n'est pas une
    // lecture, or plusieurs commentaires du jeu citent ces noms.
    //
    // Le motif utilise [^\r\n] et non .*$ : le fichier est en CRLF, et en
    // JavaScript le point ne correspond pas a \r, qui est un terminateur de
    // ligne. Avec .*$ le nettoyage ne supprimait rien et le test signalait des
    // commentaires comme s'ils etaient des lectures.
    const sansCommentaire = ligne.replace(/\/\/[^\r\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (!new RegExp(`\\b${nom}\\b`).test(sansCommentaire)) return;
    trouvees.push(i);
  });
  return trouvees;
}

const suspectes = [];
lignes.forEach((ligne, i) => {
  const m = ligne.trim().match(/^(?:export\s+)?(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})\s*=/);
  if (!m) return;
  const nom = m[1];
  const decls = declarations(nom);
  if (decls.length !== 1) return;
  const refAvant = references(nom, decls[0]).filter((r) => r < decls[0]);
  if (refAvant.length === 0) return;
  suspectes.push({
    nom,
    declaration: decls[0] + 1,
    avant: refAvant.map((r) => r + 1)
  });
});

if (suspectes.length === 0) {
  console.log('  AUCUNE CONSTANTE LUE AVANT SA DECLARATION.');
  process.exit(0);
}
console.log(`  ${suspectes.length} constante(s) referencees avant leur declaration :`);
for (const s of suspectes) {
  console.log(`    ${s.nom.padEnd(28)} declaree L${s.declaration}, referencee L${s.avant.join(', L')}`);
}
console.log('\n  A verifier : une fonction referencee avant sa definition est legales,');
console.log('  une constante lue avant son initialisation ne l est pas.');
process.exit(1);
