// Verifie qu'il existe bien deux roles d'ennemis, et non pas "tous qui tirent".
//
// Un seul type sur deux declare portee dans game.js. Si ce test passe, la
// repartition des roles est bien celle voulue : des Chargeurs qui avancent et
// des Tireurs qui se stabilisent. Legerement decale, tous les ennemis
// tirePresenteraient a nouveau le defaut signale.
//
// La lecture se fait sur le code, pas sur une partie : ce qui compte ici est
// une propriete de donnees, pas un comportement emergent.
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'wwwroot', 'game.js'), 'utf8');

// Chaque gabarit est un bloc "nom: avecTir({ ... })".
const blocs = [...source.matchAll(/^  (\w+): avecTir\(\{([\s\S]*?)^\s{2}\}\)/gm)];

console.log('=== ROLES DES ENNEMIS ===');
let tireurs = 0;
let chargeurs = 0;
for (const [, nom, corps] of blocs) {
  // Un type tire s'il declare portee : c'est la regle de avecTir.
  const declarePortee = /portee:\s*\d/.test(corps);
  const tire = declarePortee;
  if (tire) tireurs += 1; else chargeurs += 1;
  const cadence = (corps.match(/cadence:\s*([\d.]+)/) || [, 'defaut'])[1];
  console.log(`  ${nom.padEnd(15)} ${tire ? 'TIREUR  ' : 'CHARGEUR'} ${tire ? 'portee ' + (corps.match(/portee:\s*([\d.]+)/) || [])[1] + ' u, cadence ' + cadence + ' s' : 'avance, frappe au contact'}`);
}

console.log(`\n  ${tireurs} tireurs, ${chargeurs} chargeurs.`);

const attendus = 4;
const problems = [];
if (blocs.length !== 8) problems.push(`${blocs.length} gabarits au lieu de 8`);
if (tireurs !== attendus) problems.push(`${tireurs} tireurs au lieu de ${attendus}`);
if (chargeurs !== attendus) problems.push(`${chargeurs} chargeurs au lieu de ${attendus}`);

// La regle de avecTir doit rester le pivot : sans portee, pas de tir.
if (!source.includes('if (tir.portee === undefined) return Object.assign({ tire: false }, tir);')) {
  problems.push('avecTir n applique plus la regle "sans portee, pas de tir"');
}
// L'IA doit consulter le role, sinon tous les ennemis tirent a nouveau.
if (!source.includes('const aPortee = enemy.peutTirer')) {
  problems.push("l'IA ne consulte plus le role de l'ennemi");
}

if (problems.length === 0) {
  console.log('  LES DEUX ROLES EXISTENT ET L IA LES RESPECTE.');
  process.exit(0);
}
console.log('\n  PROBLEMES :');
problems.forEach((p) => console.log('   - ' + p));
process.exit(1);
