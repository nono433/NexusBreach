// Verifie les Alpha avant et apres correction, sur la meme base de calcul.
//
// La comparaisoninteresting est le rapport "survie face a un Alpha" /
// "temps pour tuer un Alpha" : c'est lui qui repond a la plainte "avec la
// classe Assassin on ne peut pas les tuer". Un rapport inferieur a 1 signifie
// que le joueur meurt avant d'avoir fini sa cible, donc que la classe est
// structurellement incapable d'affronter ce monstre.
import {
  analyseVagueAlpha, playerPower, expectedRunUpgrades, expectedMetaLevel,
  investmentFromDeaths, CURVES, MAPS, ENEMIES, ELITE_CADENCE, ALPHA_PREMIERE_VAGUE
} from './balance.model.mjs';

// Etat d'avant la correction, valeurs litterales : le test garde la reference
// pour documenter ce qui a change, plutot que de le recalculer.
const AVANT = {
  hp: 680, damage: 29, radius: 1.45, scale: 2.05,
  cadence: () => 1.15,
  premiereVague: 5
};

const hpMult = (v, m) => CURVES.hpMult(v) * MAPS[m].hpMult;
const dmgMult = (v, m) => CURVES.dmgMult(v) * MAPS[m].dmgMult;

function avant(vague, archetype, arme, carte, morts) {
  const set = carte === 'foundry'
    ? { elite: { hp: 1080, damage: 43 } }
    : { elite: { hp: AVANT.hp, damage: AVANT.damage } };
  const invest = investmentFromDeaths(morts);
  const meta = expectedMetaLevel(invest);
  const power = playerPower(arme, vague, meta, expectedRunUpgrades(vague, archetype));
  const eliteHp = set.elite.hp * hpMult(vague, carte);
  const eliteDamage = set.elite.damage * dmgMult(vague, carte);
  const cadence = AVANT.cadence() * MAPS[carte].atkMult;
  const dps = power.dps * power.targets;
  return {
    eliteHp: Math.round(eliteHp),
    eliteDamage: Math.round(eliteDamage),
    eliteDps: Math.round((eliteDamage / cadence) * 10) / 10,
    cadence: Math.round(cadence * 100) / 100,
    timeToKill: Math.round((eliteHp / dps) * 100) / 100,
    survival: Math.round((power.effectiveHp / (eliteDamage / cadence)) * 100) / 100,
    ratio: Math.round((power.effectiveHp / (eliteDamage / cadence)) / (eliteHp / dps) * 100) / 100
  };
}

function verdict(ratio) {
  if (ratio >= 3) return 'CONFORTABLE';
  if (ratio >= 1.5) return 'SERRE MAIS FAITABLE';
  if (ratio >= 1) return 'JUSTE';
  return 'IMPOSSIBLE';
}

console.log('=== RAPORT SURVIE / TEMPS POUR TUER UN ALPHA ===');
console.log('    (en dessous de 1, l\'Assassin meurt avant la fin de sa cible)\n');
console.log('  carte     classe    vague | avant                                        | apres');
for (const carte of ['nexus', 'foundry']) {
  for (const [archetype, arme] of [['ranger', 'pulse'], ['assassin', 'twinSabers']]) {
    for (const vague of [5, 10, 15]) {
      const a = avant(vague, archetype, arme, carte, 0);
      const b = analyseVagueAlpha(vague, archetype, arme, carte, 0);
      const avantTxt = `${a.eliteHp} PV ${a.eliteDamage} deg/${a.cadence}s rapport ${a.ratio} ${verdict(a.ratio)}`;
      const apresTxt = `${b.eliteHp} PV ${b.eliteDamage} deg/${b.eliteCooldown}s rapport ${b.meleeRatio} ${verdict(b.meleeRatio)}`;
      console.log(`  ${carte.padEnd(8)} ${archetype.padEnd(9)} ${String(vague).padStart(3)} | ${avantTxt.padEnd(45)} | ${apresTxt}`);
    }
  }
}

console.log('\n=== CE QUI A CHANGE ===');
const av = avant(5, 'assassin', 'twinSabers', 'nexus', 0);
const ap = analyseVagueAlpha(10, 'assassin', 'twinSabers', 'nexus', 0);
console.log(`  Points de vie (vague 5 -> 10)   : ${av.eliteHp} PV  ->  ${ap.eliteHp} PV`);
console.log(`  Degats par coup                : ${av.eliteDamage}  ->  ${ap.eliteDamage}`);
console.log(`  Cadence d'attaque elite        : ${av.cadence} s  ->  ${ap.eliteCooldown} s`);
console.log(`  Rapport survie/tuer (vague 5)  : ${av.ratio} (${verdict(av.ratio)})`);
console.log(`  Rapport survie/tuer (vague 10) : ${ap.meleeRatio} (${verdict(ap.meleeRatio)})`);
console.log(`  Premiere apparition            : vague ${AVANT.premiereVague}  ->  vague ${ALPHA_PREMIERE_VAGUE}`);
console.log(`  Rayon de collision             : ${(AVANT.radius * AVANT.scale).toFixed(2)}  ->  `
  + `${(0.98 * 2.05).toFixed(2)} (majore a 0.95 pour le deplacement)`);

const tousTenables = [10, 15, 20].every((v) => {
  const a = analyseVagueAlpha(v, 'assassin', 'twinSabers', 'nexus', 0);
  return a.meleeRatio >= 1.5;
});
console.log(`\n  ${tousTenables
  ? 'L\'Assassin peut maintenant affronter un Alpha sur toutes les vagues concernees.'
  : 'Il reste des vagues ou l\'Assassin ne peut pas finir un Alpha.'}`);
process.exit(tousTenables ? 0 : 1);
