// Balayage des constantes d'equilibrage : cherche la croissance des PV ennemis
// qui place la mort au bon endroit selon l'equipement du joueur.
// Cible : jouer mal (garder l'arme de depart) doit perdre vers la vague 12-16,
// jouer bien (arme dear + atelier investi) doit atteindre la vague 28-40.
import { CURVES, simulate, MIX } from './balance.model.mjs';
import { ENEMIES, MAPS } from './balance.roster.mjs';

const SCENARIOS = [
  { label: 'PULSE (arme de depart)', weaponId: 'pulse', deaths: 0, archetype: 'sustain', band: [10, 18] },
  { label: 'PULSE veteran', weaponId: 'pulse', deaths: 20, archetype: 'sustain', band: [16, 26] },
  { label: 'SCATTER veteran', weaponId: 'scatter', deaths: 20, archetype: 'sustain', band: [18, 28] },
  { label: 'RAIL veteran', weaponId: 'rail', deaths: 20, archetype: 'sustain', band: [26, 40] },
  { label: 'INFERNO veteran', weaponId: 'inferno', deaths: 20, archetype: 'sustain', band: [26, 40] },
  { label: 'PLASMA veteran', weaponId: 'plasma', deaths: 20, archetype: 'sustain', band: [24, 38] },
  { label: 'RAIL veteran Foundry', weaponId: 'rail', deaths: 20, archetype: 'sustain', mapId: 'foundry', band: [22, 36] },
  { label: 'RAIL veteran tank', weaponId: 'rail', deaths: 12, archetype: 'tank', band: [24, 40] }
];

// Vague a laquelle le joueur ne tient plus : sustained < 1 (il ne finit plus
// la vague) ET le temps de survie tombe sous 2 s.
function deathWave(scenario) {
  const rows = simulate({ ...scenario, upTo: 90 });
  const row = rows.find((r) => r.sustained < 1 || r.ttd < 2);
  return row ? row.wave : 91;
}

function applyCurves(hpRate, hpCap, dmgRate, dmgCap, totalCap, concCap) {
  CURVES.hpMult = (w) => Math.min(hpCap, 1 + hpRate * (w - 1));
  CURVES.dmgMult = (w) => Math.min(dmgCap, 1 + dmgRate * (w - 1));
  CURVES.waveTotal = (w) => Math.min(totalCap, 6 + 1.9 * w + Math.floor(0.014 * w * w));
  CURVES.maxConcurrent = (w) => Math.min(concCap, 4 + Math.floor(0.5 * w));
}

const candidates = [];
for (const hpRate of [0.16, 0.18, 0.20, 0.22, 0.24]) {
  for (const hpCap of [7, 8, 9, 10]) {
    for (const totalCap of [34, 40, 46]) {
      candidates.push({ hpRate, hpCap, dmgRate: 0.026, dmgCap: 1.7, totalCap, concCap: 11 });
    }
  }
}

const results = [];
for (const candidate of candidates) {
  applyCurves(candidate.hpRate, candidate.hpCap, candidate.dmgRate, candidate.dmgCap, candidate.totalCap, candidate.concCap);
  let penalty = 0;
  const detail = [];
  for (const scenario of SCENARIOS) {
    const wave = deathWave(scenario);
    const [low, high] = scenario.band;
    if (wave < low) penalty += (low - wave) * 3;
    else if (wave > high) penalty += (wave - high) * 3;
    detail.push(`${scenario.label}=${wave}`);
  }
  results.push({ ...candidate, penalty, detail: detail.join(' ') });
}

results.sort((a, b) => a.penalty - b.penalty);
console.log('=== 12 meilleures combinaisons ===');
for (const row of results.slice(0, 12)) {
  console.log(`  penalite ${String(row.penalty).padStart(4)}  hp=${row.hpRate}/vague plafond ${row.hpCap}  total<=${row.totalCap}  conc<=${row.concCap}`);
  console.log(`      ${row.detail}`);
}
