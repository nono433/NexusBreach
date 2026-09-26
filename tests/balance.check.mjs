import { simulate, investmentFromDeaths, META, RUN, WEAPONS } from './balance.model.mjs';

const scenarios = [
  { label: 'RANGER / PULSE / 1re partie (0 mort)', weaponId: 'pulse', deaths: 0, archetype: 'sustain' },
  { label: 'RANGER / PULSE / 5 morts', weaponId: 'pulse', deaths: 5, archetype: 'sustain' },
  { label: 'RANGER / PULSE / 15 morts', weaponId: 'pulse', deaths: 15, archetype: 'sustain' },
  { label: 'RANGER / RAIL / 15 morts', weaponId: 'rail', deaths: 15, archetype: 'sustain' },
  { label: 'RANGER / INFERNO / 15 morts', weaponId: 'inferno', deaths: 15, archetype: 'sustain' },
  { label: 'RANGER / PLASMA / 15 morts', weaponId: 'plasma', deaths: 15, archetype: 'sustain' },
  { label: 'RANGER / SMG / 15 morts', weaponId: 'smg', deaths: 15, archetype: 'sustain' },
  { label: 'RANGER / PULSE / tank / 8 morts', weaponId: 'pulse', deaths: 8, archetype: 'tank' },
  { label: 'RANGER / PULSE / glass / 8 morts', weaponId: 'pulse', deaths: 8, archetype: 'glass' },
  { label: 'FOUNDRY / RAIL / 15 morts', weaponId: 'rail', deaths: 15, archetype: 'sustain', mapId: 'foundry' },
  { label: 'ASSASSIN / JUMELLES / 15 morts', weaponId: 'twinSabers', deaths: 15, archetype: 'sustain' },
  { label: 'ASSASSIN / CROCS / 15 morts', weaponId: 'twinFang', deaths: 15, archetype: 'sustain' },
  { label: 'ASSASSIN / SPATULE / 15 morts', weaponId: 'heavySaber', deaths: 15, archetype: 'sustain' },
  { label: 'ASSASSIN / SHURIKEN / 15 morts', weaponId: 'shuriken', deaths: 15, archetype: 'sustain' }
];

function deathWave(scenario) {
  const rows = simulate({ ...scenario, upTo: 90 });
  const row = rows.find((r) => r.sustained < 1 || r.ttd < 1.5);
  return { wave: row ? row.wave : 91, last: rows[rows.length - 1] };
}

console.log('=== ATELIER : quel niveau d\'investissement pour combien de morts ? ===');
for (const deaths of [0, 2, 5, 10, 20, 40, 80]) {
  const t = investmentFromDeaths(deaths);
  const capped = t >= 1;
  console.log(`  ${String(deaths).padStart(3)} morts  ->  atelier ${(t * 100).toFixed(0).padStart(3)} %${capped ? '  (sature)' : ''}`);
}

console.log('\n=== PLAFOND DE L\'ATELIER (tout au max) ===');
const maxDamage = (1 + RUN.damage.max * RUN.damage.per) * (1 + META.damage.max * META.damage.per);
const maxRate = (1 + RUN.fireRate.max * RUN.fireRate.per) * (1 + META.fireRate.max * META.fireRate.per);
console.log(`  Degats  : x${maxDamage.toFixed(2)}  (amameliorations x${(1 + RUN.damage.max * RUN.damage.per).toFixed(2)} + atelier x${(1 + META.damage.max * META.damage.per).toFixed(2)})`);
console.log(`  Cadence : x${maxRate.toFixed(2)}`);
console.log(`  PV      : +${RUN.armor.max * RUN.armor.per + META.health.max * META.health.per}`);
console.log(`  Reduction : ${Math.round(Math.min(0.68, RUN.stabilize.max * RUN.stabilize.per + META.reduction.max * META.reduction.per) * 100)} %`);

console.log('\n=== VAGUE DE MORT PREVUE PAR CONFIGURATION ===');
const results = [];
for (const scenario of scenarios) {
  const { wave, last } = deathWave(scenario);
  results.push({ label: scenario.label, wave });
  console.log(`  ${scenario.label.padEnd(40)} mort vague ${String(wave).padStart(3)}   (v90 : sustained ${last.sustained}, ttd ${last.ttd}s)`);
}

console.log('\n=== VERIFICATION : l\'atelier rend-il le jeu trop facile ? ===');
const shopOnly = results.filter((r) => r.label.includes('15 morts'));
const worst = shopOnly.reduce((a, b) => (b.wave > a.wave ? b : a));
const best = shopOnly.reduce((a, b) => (b.wave < a.wave ? b : a));
console.log(`  Avec 15 morts (atelier investi a ${(investmentFromDeaths(15) * 100).toFixed(0)} %) :`);
console.log(`    mort la plus tot  : vague ${best.wave}  (${best.label.trim()})`);
console.log(`    mort la plus tard : vague ${worst.wave}  (${worst.label.trim()})`);
const tropFacile = worst.wave < 25;
console.log(tropFacile
  ? '  !! ECHEC : l\'atelier rend le jeu trop facile, aucune configuration ne depasse la vague 25.'
  : `  OK : meme avec l'atelier finance, aucune configuration ne depasse la vague ${worst.wave}.`);

// Et l'inverse : l'atelier ne doit pas non plus etre inutile.
const sansAtelier = results.filter((r) => r.label.includes('0 mort'));
const avecAtelier = results.filter((r) => r.label.includes('15 morts'));
const gain = avecAtelier.length && sansAtelier.length
  ? avecAtelier[0].wave - sansAtelier[0].wave : 0;
console.log(`  Gain de l'atelier apres 15 morts : +${gain} vagues (il doit etre utile mais pas suffisant).`);
