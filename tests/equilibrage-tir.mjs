// Mesure ce que le tir a distance change a l'equilibrage.
//
// Le tableau de simulate() donne desormais le temps avant de mourir AVEC et
// SANS le tir. L'ecart entre les deux est la mesure qui compte : siAdding le
// tir ne change rien, la mecanique n'exerce aucune pression ; s'il divise le
// temps de survie par deux, le jeu n'est plus le meme.
import { simulate, TIR } from './balance.model.mjs';

const CAS = [
  { nom: 'RANGER / PULSE / 1re partie', archetype: 'ranger', weapon: 'pulse', deaths: 0, map: 'nexus' },
  { nom: 'RANGER / PULSE / 15 morts', archetype: 'ranger', weapon: 'pulse', deaths: 15, map: 'nexus' },
  { nom: 'RANGER / RAIL / 15 morts', archetype: 'ranger', weapon: 'rail', deaths: 15, map: 'nexus' },
  { nom: 'ASSASSIN / JUMELLES / 15 morts', archetype: 'assassin', weapon: 'twinSabers', deaths: 15, map: 'nexus' },
  { nom: 'ASSASSIN / CROCS / 15 morts', archetype: 'assassin', weapon: 'twinFang', deaths: 15, map: 'nexus' },
  { nom: 'FOUNDRY / RAIL / 15 morts', archetype: 'ranger', weapon: 'rail', deaths: 15, map: 'foundry' }
];

// Seuls MORT et IMPOSSIBLE sont une mort. SERRE et CRITIQUE sont des
// avertissements : les compter comme des morts faisait dire "mort vague 1" a
// une partie qui survit jusqu'a la vague 8.
const MORTS = new Set(['MORT', 'IMPOSSIBLE']);

function premiereMort(lignes) {
  const trouvee = lignes.find((l) => MORTS.has(l.verdict));
  return trouvee ? trouvee.wave : '>' + lignes[lignes.length - 1].wave;
}

console.log('=== EFFET DU TIR SUR LA SURVIE ===');
console.log('  configuration                 | mort avec tir | mort sans tir | gain');
for (const cas of CAS) {
  const lignes = simulate({ upTo: 30, archetype: cas.archetype, weaponId: cas.weapon, deaths: cas.deaths, map: cas.map });
  const avec = premiereMort(lignes);
  // On rejoue le modele sans le tir pour comparer la meme configuration.
  const sans = premiereMort(lignes.map((l) => ({ ...l, ttd: l.ttdSansTir })));
  const gain = (avec === '>' + lignes[lignes.length - 1].wave || sans === '>' + lignes[lignes.length - 1].wave)
    ? 'n/d'
    : (sans - avec) + ' vague(s)';
  console.log(`  ${cas.nom.padEnd(29)} | ${String(avec).padStart(13)} | ${String(sans).padStart(12)} | ${gain}`);
}

console.log('\n=== DETAIL : RANGER / PULSE / 1re partie ===');
const detail = simulate({ upTo: 14, archetype: 'ranger', weaponId: 'pulse', deaths: 0, map: 'nexus' });
console.log('  vague | degats tir/s | survie avec tir | survie sans tir | gain');
for (const l of detail) {
  const gain = l.ttdSansTir > 0 ? (l.ttdSansTir / l.ttd) : 0;
  console.log(`  ${String(l.wave).padStart(5)} | ${String(l.tir).padStart(12)} | ${String(l.ttd).padStart(16)} s | ${String(l.ttdSansTir).padStart(15)} s | x${gain.toFixed(2)}`);
}

const v10 = detail.find((l) => l.wave === 10);
const rapport = v10 && v10.ttd > 0 ? v10.ttdSansTir / v10.ttd : 1;
console.log(`\n  A la vague 10, le tir divise le temps de survie par ${rapport.toFixed(2)}.`);
console.log('  C\'est la mesure attendue : rester a distance doit cesser d etre sur,');
console.log('  mais pas au point de rendre le jeu injouable.');

const tropDur = rapport > 2.2;
console.log(`\n  ${tropDur
  ? 'ATTENTION : le tir double la pression, il faudra le tempérer.'
  : 'Le tir ajoute une pression réelle sans ruiner l equilibrage.'}`);
process.exit(tropDur ? 1 : 0);
