// Modele d'equilibrage : simule le rapport de force joueur/ennemis par vague.
// Les chiffres sont ceux reellement ecrits dans game.js.
//
// Trois principes non negociables :
//  1. Les ameliorations de vague sont ADDITIVES en espace de niveau. Avec
//     1.32^6 et 1.24^6 le joueur montait a x32 et depassait toute courbe
//     ennemie lineaire : la montee devenait triviale puis la fin injouable.
//  2. Toutes les courbes ennIMes sont PLAFONNEES (PV, degats, cadence, effectif,
//     total). La puissance du joueur a un plafond, donc une seule courbe non
//     plafonnee garantit une mort arithmetique.
//  3. L'atelier permanent est SOBRE. C'est le point de vigilance : les credits
//     se gagnent a chaque mort, donc un joueur qui meurt beaucoup les empile.
//     C'est verifie par le scenario 'atelier plein' de balance.check.mjs.

export const CURVES = {
  hpMult: (w) => Math.min(8.5, 1 + 0.17 * (w - 1)),
  dmgMult: (w) => Math.min(1.7, 1 + 0.026 * (w - 1)),
  attackCooldown: (w) => Math.max(0.8, 1.5 - 0.016 * w),
  maxConcurrent: (w) => Math.min(11, 4 + Math.floor(w * 0.5)),
  total: (w) => Math.min(44, 6 + Math.round(w * 1.9 + w * w * 0.014)),
  // L'introduction est plus douce : la vague 1 ne doit pas killed un
  // joueur qui n'a jamais vu le jeu.
  spawnInterval: (w) => Math.max(0.36, (w <= 3 ? 1.35 : 1.05) - w * 0.042) * 0.9
};

export const MIX = { trash: 0.55, swift: 0.3, tank: 0.14, elite: 0.01 };

export const RUN = {
  damage: { max: 6, per: 0.13 },
  fireRate: { max: 6, per: 0.11 },
  armor: { max: 7, per: 28 },
  stabilize: { max: 4, per: 0.15 }
};

// Plafonds de l'atelier, volontairement bas (cf. commentaire du fichier).
export const META = {
  damage: { max: 5, per: 0.08 },
  fireRate: { max: 5, per: 0.07 },
  health: { max: 5, per: 18 },
  reduction: { max: 4, per: 0.04 }
};

export const MAPS = {
  nexus: { hpMult: 1, dmgMult: 1, atkMult: 1 },
  foundry: { hpMult: 1.1, dmgMult: 1.12, atkMult: 0.94 }
};

export const ENEMIES = {
  nexus: {
    trash: { hp: 48, damage: 9, speed: 2.35, score: 100 },
    swift: { hp: 36, damage: 7, speed: 3.65, score: 130 },
    tank: { hp: 145, damage: 19, speed: 1.58, score: 260 },
    elite: { hp: 680, damage: 29, speed: 1.18, score: 1200 }
  },
  foundry: {
    trash: { hp: 64, damage: 12, speed: 2.5, score: 145 },
    swift: { hp: 48, damage: 9, speed: 4.05, score: 190 },
    tank: { hp: 230, damage: 28, speed: 1.66, score: 430 },
    elite: { hp: 1080, damage: 43, speed: 1.26, score: 2100 }
  }
};

// raw = degats x cadence x projectiles. eff = rendement reel en jeu
// (dispersion qui fait manquer, portee courte, perforation qui ne touche
// jamais tout le temps, brasure, explosion).
export const WEAPONS = {
  pulse: { raw: 28 * 5.4, eff: 1, price: 0, targets: 1 },
  scatter: { raw: 19 * 1.7 * 7, eff: 0.55, price: 450, targets: 1 },
  smg: { raw: 16 * 13, eff: 0.95, price: 650, targets: 1 },
  vector: { raw: 98 * 1.85, eff: 1.15, price: 800, targets: 1 },
  cryo: { raw: 25 * 4.3 * 2, eff: 0.95, price: 900, targets: 1 },
  rail: { raw: 132 * 1, eff: 0.75, price: 950, targets: 2.2 },
  inferno: { raw: 6 * 18 * 3, eff: 0.6, price: 1100, targets: 1 },
  plasma: { raw: 92 * 2.3 + 60, eff: 0.9, price: 1400, targets: 1 },
  // Sabres : les degats par frappe touchent slashTargets ennemis.
  twinSabers: { raw: 48 * 2.7, eff: 1, price: 0, targets: 1.75, melee: true },
  heavySaber: { raw: 108 * 1.85, eff: 1, price: 700, targets: 1, melee: true },
  twinFang: { raw: 35 * 3.5, eff: 1, price: 850, targets: 2.5, melee: true },
  shuriken: { raw: 29 * 9, eff: 0.9, price: 1100, targets: 1 },
  shadowStep: { raw: 76 * 2.4, eff: 1, price: 1500, targets: 1.75, melee: true }
};

// Investissement permanent : fonction du nombre de morts, car les crédits
// ne sont gagnés qu'à la mort. C'est le levier de progression long terme.
export function expectedMetaLevel(investment = 0) {
  const t = Math.max(0, Math.min(1, investment));
  return {
    damage: Math.round(t * META.damage.max),
    fireRate: Math.round(t * META.fireRate.max),
    health: Math.round(t * META.health.max),
    reduction: Math.round(t * META.reduction.max)
  };
}

// Credits cumules à partir des morts : seule source de revenu de l'atelier.
export function investmentFromDeaths(deaths) {
  // Cout total pour remplir l'atelier d'une classe (2 modules partages +
  // 3 modules de classe, coutGrowth 1.5).
  let fullCost = 0;
  for (const cost of [220, 320, 280, 260, 200]) {
    for (let level = 0; level < 5; level += 1) {
      fullCost += cost * 1.5 ** level * (1 + level * 0.16);
    }
  }
  const creditsEarned = deaths * 900;
  return Math.min(1, creditsEarned / fullCost);
}

export function expectedRunUpgrades(wave, archetype = 'sustain') {
  const picks = wave - 1;
  const focus = archetype === 'glass' ? 0.85 : archetype === 'tank' ? 0.3 : 0.55;
  const defense = archetype === 'glass' ? 0.05 : archetype === 'tank' ? 0.45 : 0.2;
  return {
    damage: Math.min(RUN.damage.max, Math.round(picks * focus * 0.5)),
    fireRate: Math.min(RUN.fireRate.max, Math.round(picks * focus * 0.5)),
    armor: Math.min(RUN.armor.max, Math.round(picks * defense)),
    stabilize: Math.min(RUN.stabilize.max, Math.round(picks * defense * 0.4))
  };
}

export function playerPower(weaponId, wave, meta, run) {
  const weapon = WEAPONS[weaponId];
  const damageScale = (1 + RUN.damage.per * run.damage) * (1 + META.damage.per * meta.damage);
  const rateScale = (1 + RUN.fireRate.per * run.fireRate) * (1 + META.fireRate.per * meta.fireRate);
  const maxHealth = 100 + RUN.armor.per * run.armor + META.health.per * meta.health;
  const damageReduction = Math.min(0.68, RUN.stabilize.per * run.stabilize + META.reduction.per * meta.reduction);
  return {
    dps: weapon.raw * weapon.eff * damageScale * rateScale,
    targets: weapon.targets,
    maxHealth,
    effectiveHp: maxHealth / (1 - damageReduction)
  };
}

export function simulate({ mapId = 'nexus', weaponId = 'pulse', archetype = 'sustain', deaths = 0, upTo = 50 } = {}) {
  const map = MAPS[mapId];
  const set = ENEMIES[mapId];
  const rows = [];
  const investment = investmentFromDeaths(deaths);
  const meta = expectedMetaLevel(investment);

  for (let wave = 1; wave <= upTo; wave += 1) {
    const hpMult = CURVES.hpMult(wave) * map.hpMult;
    const dmgMult = CURVES.dmgMult(wave) * map.dmgMult;
    const cooldown = CURVES.attackCooldown(wave) * map.atkMult;
    const concurrent = CURVES.maxConcurrent(wave);
    const total = CURVES.total(wave);
    const spawnInterval = CURVES.spawnInterval(wave);

    const run = expectedRunUpgrades(wave, archetype);
    const power = playerPower(weaponId, wave, meta, run);

    const avgDamage = set.trash.damage * MIX.trash + set.swift.damage * MIX.swift
      + set.tank.damage * MIX.tank + set.elite.damage * MIX.elite;
    const avgHp = set.trash.hp * MIX.trash + set.swift.hp * MIX.swift
      + set.tank.hp * MIX.tank + set.elite.hp * MIX.elite;

    const incomingHpPerSecond = (avgHp * hpMult) / spawnInterval;
    const sustained = (power.dps * power.targets) / incomingHpPerSecond;

    const engaged = Math.min(concurrent, 5 + Math.floor(concurrent * 0.55));
    const incomingPerSecond = (engaged * avgDamage * dmgMult) / cooldown;
    const timeToDie = power.effectiveHp / incomingPerSecond;

    rows.push({
      wave,
      total,
      conc: concurrent,
      invest: Math.round(investment * 100) / 100,
      dps: Math.round(power.dps * power.targets),
      effHp: Math.round(power.effectiveHp),
      ttd: Math.round(timeToDie * 100) / 100,
      sustained: Math.round(sustained * 100) / 100,
      verdict: sustained < 0.8 ? 'IMPOSSIBLE'
        : sustained < 1.15 || timeToDie < 1.2 ? 'MORT'
          : sustained < 1.8 || timeToDie < 2 ? 'CRITIQUE'
            : sustained < 3 || timeToDie < 3.5 ? 'SERRE' : 'OK'
    });
  }
  return rows;
}
