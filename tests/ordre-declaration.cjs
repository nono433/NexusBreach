// Repositionne la declaration de CLASS_DEFAULT_WEAPON APRES la reconciliation
// qui l'utilise, c'est-a-dire exactement l'ancien defaut.
//
// shared avec tests/verif-controle-negatif.cjs, qui verifie que la
// transformation fait bien ce qu'elle pretend, et que le test de controle
// negatif ne peut donc pas passer sans rien tester.
const fs = require('node:fs');
const path = require('node:path');

const DECLARATION = "const CLASS_DEFAULT_WEAPON = Object.freeze({ ranger: 'pulse', assassin: 'twinSabers', tank: 'bulwark' });";
const ANCRE = 'function resolveWeaponForClass(id, classId) {';

function remettrePlusBas(source) {
  // On retire la declaration de sa place, puis on la reinjecte juste avant la
  // fonction qui la lit. Reposer sur le texte du commentaire serait fragile :
  // il a deja change une fois, et la substitution echouait en silence.
  const sansDeclaration = source.replace(DECLARATION + '\n', '').replace('\n' + DECLARATION, '');
  if (sansDeclaration === source) return { texte: source, applique: false };
  const indexAncre = sansDeclaration.indexOf(ANCRE);
  if (indexAncre < 0) return { texte: sansDeclaration, applique: false };
  return {
    texte: sansDeclaration.slice(0, indexAncre) + DECLARATION + '\n\n' + sansDeclaration.slice(indexAncre),
    applique: true
  };
}

module.exports = { remettrePlusBas, DECLARATION, ANCRE };

if (require.main === module) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'wwwroot', 'game.js'), 'utf8');
  const { texte, applique } = remettrePlusBas(source);
  const lignes = texte.split('\n');
  const ligneDeclaration = lignes.findIndex((l) => l.startsWith('const CLASS_DEFAULT_WEAPON'));
  const ligneUsage = lignes.findIndex((l) => l.includes('resolveWeaponForClass(equippedWeapon'));
  const nbDeclarations = lignes.filter((l) => l.startsWith('const CLASS_DEFAULT_WEAPON')).length;

  console.log('  transformation appliquee :', applique);
  console.log('  fichier modifie          :', texte !== source);
  console.log('  nombre de declarations   :', nbDeclarations);
  console.log('  ligne declaration        :', ligneDeclaration + 1);
  console.log('  ligne usage              :', ligneUsage + 1);

  const reproduit = applique && nbDeclarations === 1 && ligneDeclaration > ligneUsage;
  console.log(`\n  ${reproduit
    ? 'LE CONTROLE NEGATIF REPRODUIT L ANCIEN DEFAUT.'
    : 'LE CONTROLE NEGATIF EST INERTE : il ne testerait rien.'}`);
  process.exit(reproduit ? 0 : 1);
}
