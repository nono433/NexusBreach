import * as THREE from './vendor/three.module.min.js';

const canvas = document.querySelector('#game-canvas');
const ui = {
  loading: document.querySelector('#loading-screen'),
  menu: document.querySelector('#menu-screen'),
  pause: document.querySelector('#pause-screen'),
  upgrade: document.querySelector('#upgrade-screen'),
  gameover: document.querySelector('#gameover-screen'),
  hud: document.querySelector('#hud'),
  startButton: document.querySelector('#start-button'),
  resumeButton: document.querySelector('#resume-button'),
  quitButton: document.querySelector('#quit-button'),
  restartButton: document.querySelector('#restart-button'),
  retryButton: document.querySelector('#retry-button'),
  upgradeOptions: document.querySelector('#upgrade-options'),
  completedWave: document.querySelector('#completed-wave'),
  waveValue: document.querySelector('#wave-value'),
  enemyValue: document.querySelector('#enemy-value'),
  waveBanner: document.querySelector('#wave-banner'),
  waveBannerText: document.querySelector('#wave-banner-text'),
  healthValue: document.querySelector('#health-value'),
  healthBar: document.querySelector('#health-bar'),
  ammoValue: document.querySelector('#ammo-value'),
  reserveValue: document.querySelector('#reserve-value'),
  weaponName: document.querySelector('#weapon-name'),
  weaponLevel: document.querySelector('#weapon-level'),
  reloadStatus: document.querySelector('#reload-status'),
  weaponStatsHud: document.querySelector('#weapon-stats-hud'),
  abilityReadout: document.querySelector('#ability-readout'),
  abilityName: document.querySelector('#ability-name'),
  abilityStatus: document.querySelector('#ability-status'),
  equipmentList: document.querySelector('#equipment-list'),
  crosshair: document.querySelector('#crosshair'),
  damageFlash: document.querySelector('#damage-flash'),
  interactionHint: document.querySelector('#interaction-hint'),
  finalWave: document.querySelector('#final-wave'),
  finalKills: document.querySelector('#final-kills'),
  finalScore: document.querySelector('#final-score'),
  finalReward: document.querySelector('#final-reward'),
  performanceRating: document.querySelector('#performance-rating'),
  rewardBreakdown: document.querySelector('#reward-breakdown'),
  bestScore: document.querySelector('#best-score'),
  shop: document.querySelector('#shop-screen'),
  shopWeapons: document.querySelector('#shop-weapons'),
  shopAbilities: document.querySelector('#shop-abilities'),
  shopItems: document.querySelector('#shop-items'),
  shopCredits: document.querySelector('#shop-credits'),
  shopOwnedCount: document.querySelector('#shop-owned-count'),
  shopButton: document.querySelector('#shop-button'),
  gameoverShopButton: document.querySelector('#gameover-shop-button'),
  shopCloseButton: document.querySelector('#shop-close-button'),
  saveProgressButton: document.querySelector('#save-progress-button'),
  loadProgressButton: document.querySelector('#load-progress-button'),
  saveFileInput: document.querySelector('#save-file-input'),
  saveStatus: document.querySelector('#save-status'),
  menuCredits: document.querySelector('#menu-credits'),
  hudCredits: document.querySelector('#credits-value'),
  sectorValue: document.querySelector('#sector-value'),
  mapButtons: Array.from(document.querySelectorAll('[data-map-index]')),
  mapDescription: document.querySelector('#map-description'),
  classDescription: document.querySelector('#class-description'),
  classButtons: Array.from(document.querySelectorAll('[data-class-id]')),
  assassinClassStatus: document.querySelector('#assassin-class-status'),
  shopClasses: document.querySelector('#shop-classes'),
  abilityHint: document.querySelector('#ability-hint'),
  soundButton: document.querySelector('#sound-button')
};

const CONFIG = {
  arenaSize: 44,
  playerRadius: 0.42,
  playerEyeHeight: 1.68,
  baseSpeed: 6.1,
  baseHealth: 100,
  baseDamage: 25,
  baseFireRate: 5.4,
  baseMagazine: 30,
  baseReload: 1.45,
  interactionRange: 70
};

// Un profil automatique Ã©vite de rendre le jeu inutilisable sur les GPU intÃ©grÃ©s.
// Le rendu reste net, mais avec une rÃ©solution et des ombres mieux adaptÃ© au matÃ©riel.
const PERFORMANCE_PROFILE = (() => {
  const cores = Number(navigator.hardwareConcurrency) || 8;
  const memory = Number(navigator.deviceMemory) || 8;
  const lowPower = cores <= 4 || memory <= 4;
  return {
    lowPower,
    maxPixelRatio: lowPower ? 1 : 1.25,
    shadowMapSize: lowPower ? 512 : 1024,
    antialias: !lowPower,
    shadows: !lowPower,
    targetFps: lowPower ? 50 : 60,
    hudInterval: lowPower ? 0.1 : 0.05,
    flowFieldInterval: lowPower ? 0.4 : 0.3,
    particleScale: lowPower ? 0.55 : 1,
    enemyAuraLights: !lowPower
  };
})();

const MAP_DEFINITIONS = [
  {
    id: 'nexus',
    name: 'SECTEUR 07 // NEXUS',
    short: 'NEXUS',
    description: 'Arena initiale du protocole Nexus.',
    background: 0x0b1c28,
    fogColor: 0x0b1c28,
    fogDensity: 0.02,
    hemisphereSky: 0x91e7ff,
    hemisphereGround: 0x25202c,
    keyLight: 0xd8fbff,
    floorColor: 0x385662,
    wallColor: 0x243a46,
    wallEdge: 0x00b9c8,
    alternateEdge: 0xff4d1f,
    coreColor: 0x00eaff,
    coreAccent: 0xff3f22,
    lights: [
      { color: 0x00eaff, intensity: 32, distance: 25, x: -15, y: 6, z: -12 },
      { color: 0xff5a26, intensity: 28, distance: 22, x: 15, y: 5, z: 12 },
      { color: 0xff2b85, intensity: 21, distance: 18, x: 12, y: 4, z: -15 }
    ],
    covers: [
      [-9.5, -7.5, 5.6, 2.2, 2.1, 0x00eaff],
      [9.5, -5.2, 2.5, 6.3, 2.7, 0xff4e28],
      [-11.5, 8.7, 3.3, 4.2, 2.4, 0x9a4eff],
      [10.2, 11.4, 6.4, 2.1, 1.9, 0x00eaff],
      [-4.4, 16.5, 3.8, 1.6, 1.25, 0xff4e28],
      [5.1, -15.7, 2.1, 3.7, 2.3, 0x00eaff]
    ],
    pillars: [[-16, -16], [16, -16], [-16, 16], [16, 16], [-17, 1], [17, -1]],
    spawnPads: [[-18.5, -18.5, 0], [18.5, -18.5, 0], [-18.5, 18.5, 0], [18.5, 18.5, 0], [0, -18.8, 0], [0, 18.8, 0]],
    core: [0, 0],
    enemyTypeSet: 'nexus',
    enemyHealthMultiplier: 1,
    enemySpeedMultiplier: 1,
    enemyDamageMultiplier: 1,
    attackCooldownMultiplier: 1,
    scoreMultiplier: 1
  },
  {
    id: 'foundry',
    name: 'SECTEUR 12 // FOUNDRY',
    short: 'FOUNDRY',
    description: 'Zone de forge hostile : quatre machines dâ€™Ã©lite, plus rÃ©sistantes et plus mortelles.',
    background: 0x24121e,
    fogColor: 0x24121e,
    fogDensity: 0.024,
    hemisphereSky: 0xffca88,
    hemisphereGround: 0x2a1d28,
    keyLight: 0xffe0c2,
    floorColor: 0x593844,
    wallColor: 0x402735,
    wallEdge: 0xff4d22,
    alternateEdge: 0xff2d85,
    coreColor: 0xff4d22,
    coreAccent: 0xff2d85,
    lights: [
      { color: 0xff4d22, intensity: 38, distance: 27, x: -14, y: 6, z: -12 },
      { color: 0xff2d85, intensity: 30, distance: 24, x: 15, y: 5, z: 10 },
      { color: 0xffb43c, intensity: 24, distance: 20, x: 0, y: 7, z: -16 }
    ],
    covers: [
      [-12, -9, 4.5, 2.4, 2.6, 0xff4d22],
      [11, -10, 3.2, 5.5, 2.2, 0xff2d85],
      [-8, 10, 5.5, 2.2, 1.8, 0xffb43c],
      [9, 10, 2.2, 4.4, 2.8, 0xff4d22],
      [-1, 15, 5.5, 1.8, 1.6, 0xff2d85],
      [0, -15, 2.4, 4, 2.2, 0xffb43c]
    ],
    pillars: [[-15, -14], [15, -14], [-15, 14], [15, 14], [-18, 0], [18, 0], [-7, -17], [7, 17]],
    spawnPads: [[-18, -18, 0], [18, -18, 0], [-18, 18, 0], [18, 18, 0], [0, -18, 0], [0, 18, 0]],
    core: [0, 0],
    enemyTypeSet: 'foundry',
    // La carte doit rester plus dure que Nexus sans etre un goulot : avec
    // 1.22 de degats et 0.88 de cadence, le meme equipement y mourait a la
    // vague 12 la ou il atteignait la vague 42 sur Nexus.
    enemyHealthMultiplier: 1.1,
    enemySpeedMultiplier: 1.04,
    enemyDamageMultiplier: 1.12,
    attackCooldownMultiplier: 0.94,
    scoreMultiplier: 1.4
  }
];

// Toutes les courbes de vagues sont volontairement PLAFONNEES.
//
// Le joueur a un plafond de puissance fini : les ameliorations de vague ont
// un nombre de niveaux limite, l'equipement permanent est fini, et les
// armes sont en nombre fixe. Une seule courbe ennemie non plafonnee
// garantit donc une mort arithmetique : la vague 50 demandait 304 ennemis
// et la vague 100 en demandait 804, avec des PV et des degats linearly
// croissants. En faisant converger les deux, la difficulte atteint un
// plateau et la mort finit par survenir parce que le joueur a plafonne,
// pas parce que la difficulte s'emballe.
const WAVE_CURVES = {
  // PV ennemis : le principal axe de progression, puis convergence.
  enemyHealth: (wave) => Math.min(8.5, 1 + 0.17 * (wave - 1)),
  // Degats : plafond bas. Au-dela, un seul coup suffit et la mort devient
  // arithmetique. Avant : 1 + 0.09*(vague-1) sans borne, 5,4x a la vague 50.
  enemyDamage: (wave) => Math.min(1.7, 1 + 0.026 * (wave - 1)),
  attackCooldown: (wave) => Math.max(0.8, 1.5 - 0.016 * wave),
  maxConcurrent: (wave) => Math.min(11, 4 + Math.floor(wave * 0.5)),
  total: (wave) => Math.min(44, 6 + Math.round(wave * 1.9 + wave * wave * 0.014)),
  // L'introduction est plus douce : la vague 1 ne doit pas tuer un joueur
  // qui n'a jamais vu le jeu.
  spawnInterval: (wave) => Math.max(0.36, (wave <= 3 ? 1.35 : 1.05) - wave * 0.042) * 0.9
};

// Chaque classe porte ses propres statistiques de base. Elles vivaient
// auparavant en nombres magiques dans resetStats(), ce qui rendait
// l'equilibrage des classes presque impossible a voir.
const PLAYER_CLASSES = Object.freeze({
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    short: 'RANGER',
    tagline: 'TIR Ã€ DISTANCE Â· CONTRÃ”LE DE ZONE',
    description: 'SpÃ©cialiste du tir Ã  distance. Plus de vie, une arme Ã  distance, et des capacitÃ©s qui couvrent le sol.',
    price: 0,
    color: '#00f5ff',
    stats: {
      health: 100,
      speed: 6.1,
      slashDamage: 0,
      slashRate: 0,
      slashRange: 0,
      slashTargets: 0
    },
    icon: '<path d="M32 7v46M15 17l17 15 17-15M18 48l14-16 14 16"/><circle cx="32" cy="32" r="8"/>'
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    short: 'ASSASSIN',
    tagline: 'MÃ‰LÃ‰E Â· MOBILITÃ‰ Â· EXÃ‰CUTION',
    description: 'Corps Ã  corps. Moins de vie, mais plus rapide, un dash dâ€™Ã©vasion, et des frappes qui tuent plus vite.',
    price: 2500,
    color: '#b17cff',
    stats: {
      health: 84,
      speed: 7.3,
      // DÃ©gÃ¢ts par frappe et cadence de base, avant amÃ©liorations.
      slashDamage: 46,
      slashRate: 2.7,
      slashRange: 3.9,
      slashTargets: 2
    },
    icon: '<path d="m13 49 9-4 29-29-5-5-29 29-4 9Z"/><path d="m40 16 8-8 8 8-8 8M9 54l12-4M45 45l10 10"/><path d="m18 27 8 8"/>'
  }
});

const GAME_STATE = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  UPGRADE: 'upgrade',
  SHOP: 'shop',
  DEAD: 'dead'
});

const ENEMY_TYPES = {
  crawler: {
    name: 'RÃ´deur',
    hp: 48,
    speed: 2.35,
    damage: 9,
    radius: 0.62,
    scale: 0.88,
    color: 0x55f6c1,
    score: 100,
    legs: 4
  },
  hunter: {
    name: 'Chasseur',
    hp: 36,
    speed: 3.65,
    damage: 7,
    radius: 0.5,
    scale: 0.78,
    color: 0xffcf4a,
    score: 130,
    legs: 4
  },
  brute: {
    name: 'Brute',
    hp: 145,
    speed: 1.58,
    damage: 19,
    radius: 0.95,
    scale: 1.28,
    color: 0xff5b42,
    score: 260,
    legs: 6
  },
  titan: {
    name: 'Alpha',
    hp: 680,
    speed: 1.18,
    damage: 29,
    radius: 1.45,
    scale: 2.05,
    color: 0xff2d85,
    score: 1200,
    legs: 6,
    elite: true
  }
};

const FOUNDRY_ENEMY_TYPES = {
  slagCrawler: {
    name: 'Crawleur de Scorie',
    hp: 64,
    speed: 2.5,
    damage: 12,
    radius: 0.65,
    scale: 0.94,
    color: 0xff5a28,
    armorColor: 0x371b18,
    accentColor: 0xffc857,
    score: 145,
    legs: 4,
    bodyScale: [1.18, 0.78, 0.88],
    headScale: 0.95,
    spikeCount: 5
  },
  emberStalker: {
    name: 'RÃ´deur de Braise',
    hp: 48,
    speed: 4.05,
    damage: 9,
    radius: 0.54,
    scale: 0.82,
    color: 0xffc13d,
    armorColor: 0x342315,
    accentColor: 0xff4d22,
    score: 190,
    legs: 4,
    bodyScale: [0.88, 1.08, 0.72],
    headScale: 0.82,
    spikeCount: 3
  },
  ironBrute: {
    name: 'Colosse de Laitier',
    hp: 230,
    speed: 1.66,
    damage: 28,
    radius: 1.08,
    scale: 1.42,
    color: 0xff304f,
    armorColor: 0x3b2027,
    accentColor: 0xff9b36,
    score: 430,
    legs: 6,
    bodyScale: [1.3, 0.94, 1.02],
    headScale: 1.08,
    spikeCount: 7
  },
  foundryAlpha: {
    name: 'Forge-Monarque',
    hp: 1080,
    speed: 1.26,
    damage: 43,
    radius: 1.58,
    scale: 2.2,
    color: 0xff2d85,
    armorColor: 0x2c1830,
    accentColor: 0xffc857,
    score: 2100,
    legs: 6,
    bodyScale: [1.2, 1.08, 1],
    headScale: 1.08,
    spikeCount: 9,
    elite: true
  }
};

const ENEMY_TYPE_SETS = {
  nexus: ENEMY_TYPES,
  foundry: FOUNDRY_ENEMY_TYPES
};

// Ameliorations de vague. Chaque classe a son propre jeu : 7 exclusives
// Ranger, 7 exclusives Assassin, 3 partagees (armure, mobilite, stabilite).
// Le champ classId remplace les anciens drapeaux rangerOnly / assassinOnly.
const UPGRADE_DEFINITIONS = {
  // --- Partagees -----------------------------------------------------------
  armor: {
    classId: 'shared',
    name: 'Exosquelette',
    description: '+28 PV maximum et soin immÃ©diat.',
    short: 'ARMURE',
    color: '#5ca8ff',
    max: 7,
    icon: '<path d="M32 7 52 16v15c0 13-9 24-20 29C21 55 12 44 12 31V16L32 7Z"/><path d="M32 18v29M20 25l12 8 12-8M20 40l12-7 12 7"/>'
  },
  speed: {
    classId: 'shared',
    name: 'Propulseurs',
    description: '+6 % de vitesse de dÃ©placement.',
    short: 'MOBILITÃ‰',
    color: '#22e6a8',
    max: 5,
    icon: '<path d="M31 6 18 34h12l-4 25 19-35H33l5-18Z"/><path d="M9 14h12M7 24h10M9 34h12M47 49h9"/>'
  },
  stabilize: {
    classId: 'shared',
    name: 'Stabilisateurs',
    description: 'RÃ©duisez les dÃ©gÃ¢ts subis de 15 % (plafond 68 %).',
    short: 'STABILITÃ‰',
    color: '#72d8ff',
    max: 4,
    icon: '<path d="M32 6v52M8 18l48 28M56 18 8 46M8 32h48"/><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="10"/>'
  },

  // --- Ranger --------------------------------------------------------------
  damage: {
    classId: 'ranger',
    name: 'Canon amplifiÃ©',
    description: '+13 % de dÃ©gÃ¢ts de base par niveau.',
    short: 'PUISSANCE',
    color: '#ff6b2c',
    max: 6,
    icon: '<path d="M9 35h27l14-9v-9L36 26H9l-5-8 5-8 5 8Zm8 0v13m8-13v13m-16-18 5 5 7-9"/><circle cx="46" cy="21" r="4"/>'
  },
  fireRate: {
    classId: 'ranger',
    name: 'GÃ¢che rapide',
    description: '+11 % de cadence de base par niveau.',
    short: 'CADENCE',
    color: '#00f5ff',
    max: 6,
    icon: '<path d="M36 7 17 29h13l-5 19 22-27H33l3-14Z"/><path d="M8 13h8M6 21h7M8 29h8M49 48h7M48 40h6"/>'
  },
  magazine: {
    classId: 'ranger',
    name: 'Chargeur Ã©tendu',
    description: '+8 munitions par niveau.',
    short: 'CAPACITÃ‰',
    color: '#62ff9a',
    max: 6,
    icon: '<path d="M12 15h40v34H12zM20 22h24v20H20zM24 8h16v7M32 27v10m-5-5h10"/>'
  },
  reload: {
    classId: 'ranger',
    name: 'Recharge accÃ©lÃ©rÃ©e',
    description: '-11 % de temps de recharge par niveau.',
    short: 'RECHARGE',
    color: '#9b78ff',
    max: 5,
    icon: '<path d="M50 24A18 18 0 1 0 48 39M50 11v15H35M23 31h15M30.5 23.5v15"/>'
  },
  pierce: {
    classId: 'ranger',
    name: 'Rayons perforants',
    description: 'Touchez un hostile supplÃ©mentaire par niveau.',
    short: 'PERFORATION',
    color: '#f6e45c',
    max: 3,
    icon: '<path d="m8 32 17-17 8 8L16 40l-8-8Z"/><path d="m25 15 8-8 8 8-8 8M34 39l8-8 12 12-8 8-12-12Z"/><path d="m45 12 10-5M41 18l12 2"/>'
  },
  repair: {
    classId: 'ranger',
    name: 'Nanites rÃ©parateurs',
    description: 'RÃ©cupÃ©rez +1,2 PV par seconde et par niveau.',
    short: 'RÃ‰GÃ‰NÃ‰RATION',
    color: '#ff77c8',
    max: 6,
    icon: '<path d="M32 55S8 42 8 23C8 12 22 7 32 20 42 7 56 12 56 23c0 19-24 32-24 32Z"/><path d="M20 28h8l3-6 4 13 3-7h8"/>'
  },
  focus: {
    classId: 'ranger',
    name: 'Optique de prÃ©cision',
    description: '+0,35x sur les dÃ©gÃ¢ts de tÃªte par niveau.',
    short: 'PRÃ‰CISION',
    color: '#ffd166',
    max: 4,
    icon: '<circle cx="32" cy="32" r="18"/><circle cx="32" cy="32" r="9"/><path d="M32 4v9M32 51v9M4 32h9M51 32h9M12 12l7 7M45 45l7 7M52 12l-7 7M19 45l-7 7"/>'
  },

  // --- Assassin ------------------------------------------------------------
  shadowDamage: {
    classId: 'assassin',
    name: 'Lames affÃ»tÃ©es',
    description: '+13 % de dÃ©gÃ¢ts de frappe par niveau.',
    short: 'LAMES',
    color: '#b17cff',
    max: 6,
    icon: '<path d="m8 54 8-5 30-30-5-5-30 30-3 10Z"/><path d="m40 15 9-9 9 9-9 9M10 49l10 5M47 46l9 9"/><path d="m18 25 9 9"/>'
  },
  shadowFlurry: {
    classId: 'assassin',
    name: 'TempÃªte jumelle',
    description: '+11 % de cadence de frappe par niveau.',
    short: 'FRAPPE',
    color: '#e0a6ff',
    max: 6,
    icon: '<path d="M12 38 42 8M19 47 49 17M8 27l18 18M37 56l18-18"/><path d="m8 53 8-3 27-27-5-5-27 27-3 8Z"/>'
  },
  shadowVeil: {
    classId: 'assassin',
    name: 'Voile dâ€™ombre',
    description: '-9 % de recharge du dash et +0,05 s dâ€™invulnÃ©rabilitÃ© par niveau.',
    short: 'DASH',
    color: '#7c6bff',
    max: 4,
    icon: '<path d="M32 7 18 25l14 7-14 7 14 7-14 7 14 7 14-7-14-7 14-7-14-7 14-7-14-7Z"/><path d="M9 15 3 9M55 15l6-6M9 49l-6 6M55 49l6 6"/>'
  },
  shadowBlood: {
    classId: 'assassin',
    name: 'Sang dâ€™Ombre',
    description: 'RÃ©cupÃ©rez 5 PV par Ã©limination et par niveau.',
    short: 'SANG',
    color: '#ff4d83',
    max: 4,
    icon: '<path d="M32 55S8 42 8 23C8 12 22 7 32 20 42 7 56 12 56 23c0 19-24 32-24 32Z"/><path d="M21 29h8l3-6 4 13 3-7h8"/>'
  },
  shadowExecution: {
    classId: 'assassin',
    name: 'Sentence',
    description: '+35 % de dÃ©gÃ¢ts contre les hostiles sous 30 % PV, par niveau.',
    short: 'EXÃ‰CUTION',
    color: '#ff3158',
    max: 4,
    icon: '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="11"/><path d="M32 4v12M32 48v12M4 32h12M48 32h12M12 12l9 9M43 43l9 9M52 12l-9 9M21 43l-9 9"/><path d="m27 32 4 4 8-9"/>'
  },
  shadowReach: {
    classId: 'assassin',
    name: 'Allonge',
    description: '+0,35 m de portÃ©e et +0,06 dâ€™arc de frappe par niveau.',
    short: 'ALLONGE',
    color: '#9f7bff',
    max: 4,
    icon: '<path d="M6 54l6-3 30-30-4-4-30 30-2 7Z"/><path d="M12 44 44 12M40 6l14 14M46 20l14 14"/><circle cx="52" cy="50" r="6"/>'
  },
  shadowPoise: {
    classId: 'assassin',
    name: 'Garde dâ€™ombre',
    description: '+18 PV maximum et +0,5 PV rÃ©gÃ©nÃ©rÃ©s par seconde, par niveau.',
    short: 'GARDE',
    color: '#8affd6',
    max: 4,
    icon: '<path d="M32 6l20 8v14c0 12-8 22-20 27-12-5-20-15-20-27V14Z"/><path d="M32 20v26M21 27l11 7 11-7M21 41l11-6 11 6"/>'
  }
};

// Armes permanentes, disponibles dans l'atelier.
//
// Les armes sont EXCLUSIVES a une classe : le Ranger n'a que des armes a
// distance, l'Assassin que des sabres et un lancer. Chaque arme porte un
// fireMode : 'ray' utilise le raycast existant, 'slash' la frappe melee.
// Une arme 'slash' est entierement decrite par ses parametres (portee, arc,
// nombre de cibles, multiplicateur), donc ajouter une arme melee ne demande
// aucun nouveau code de combat.
//
// Le DPS brut est volontairement croissant avec le prix : avant, PLASMA
// (1500 CR) etait 5 fois moins efficace que SCATTER (450 CR), ce qui
// inversait completement la valeur de l'atelier.
const WEAPON_DEFINITIONS = {
  pulse: {
    id: 'pulse',
    classId: 'ranger',
    fireMode: 'ray',
    name: 'AR-9 // PULSE',
    short: 'PULSE',
    description: 'Fiable et sans dÃ©faut. Le point de dÃ©part de tout opÃ©rateur.',
    price: 0,
    damage: 28,
    fireRate: 5.4,
    magazine: 30,
    reload: 1.45,
    pellets: 1,
    spread: 0,
    pierce: 0,
    range: 70,
    headshotMultiplier: 1.7,
    special: 'Ã‰QUILIBRÃ‰',
    color: '#00f5ff',
    energyColor: 0x00f5ff,
    accentColor: 0xff4d22,
    tracerColor: 0x9cffff,
    visualScale: 1,
    icon: '<path d="M9 35h27l14-9v-9L36 26H9l-5-8 5-8 5 8Zm8 0v13m8-13v13m-16-18 5 5 7-9"/><circle cx="46" cy="21" r="4"/>'
  },
  scatter: {
    id: 'scatter',
    classId: 'ranger',
    fireMode: 'ray',
    name: 'SCATTER-7 // BREACH',
    short: 'SCATTER',
    description: 'Sept projectiles dispersÃ©s. Sans effet sur un Alpha, redoutable sur un groupe.',
    price: 450,
    damage: 19,
    fireRate: 1.7,
    magazine: 8,
    reload: 1.9,
    pellets: 7,
    spread: 0.075,
    pierce: 0,
    range: 34,
    headshotMultiplier: 1.5,
    special: 'MULTI-CIBLES',
    color: '#ff6b2c',
    energyColor: 0xff6b2c,
    accentColor: 0xffd166,
    tracerColor: 0xffb05c,
    visualScale: 1.08,
    icon: '<path d="M8 32h31l12-8v-8l-12 8H8l-5-8 5-8 5 8Z"/><path d="M18 26l-5 6 5 6M27 26l-5 6 5 6M36 26l-5 6 5 6M49 16l7-4M49 48l7 4"/>'
  },
  smg: {
    id: 'smg',
    classId: 'ranger',
    fireMode: 'ray',
    name: 'NOVA-12 // SWARM',
    short: 'NOVA',
    description: 'Cadence Ã©levÃ©e et gros chargeur. Tient la pression quand Ã§a arrive de tous les cÃ´tÃ©s.',
    price: 650,
    damage: 16,
    fireRate: 13,
    magazine: 48,
    reload: 1.55,
    pellets: 1,
    spread: 0.025,
    pierce: 0,
    range: 55,
    headshotMultiplier: 1.45,
    special: 'CADENCE',
    color: '#62ff9a',
    energyColor: 0x62ff9a,
    accentColor: 0x00f5ff,
    tracerColor: 0x9affc4,
    visualScale: 0.9,
    icon: '<path d="M10 29h29l12-7v-6l-12 7H10L6 16l4-7 5 7v13Z"/><path d="M17 25v14M25 25v14M33 25v14M45 18h10M44 26h9M18 39h9l5 9h-9Z"/>'
  },
  vector: {
    id: 'vector',
    classId: 'ranger',
    fireMode: 'ray',
    name: 'VECTOR-6 // HEADHUNTER',
    short: 'VECTOR',
    description: 'Revolver de prÃ©cision. Faible cadence, mais Ã—2,6 sur la tÃªte : la rÃ©ponse aux Ã©lites.',
    price: 800,
    damage: 98,
    fireRate: 1.85,
    magazine: 6,
    reload: 1.6,
    pellets: 1,
    spread: 0.003,
    pierce: 0,
    range: 90,
    headshotMultiplier: 2.6,
    special: 'HEADSHOT',
    color: '#ffcf4a',
    energyColor: 0xffcf4a,
    accentColor: 0xff3158,
    tracerColor: 0xfff0a6,
    visualScale: 0.96,
    icon: '<path d="M10 28h31l9-6v-6l-9 6H10L6 15l4-7 5 7v13Z"/><path d="M18 25v14M25 25v14M33 25v14M19 39h9l5 9h-9Z"/><circle cx="45" cy="18" r="3"/>'
  },
  cryo: {
    id: 'cryo',
    classId: 'ranger',
    fireMode: 'ray',
    name: 'FROST-3 // CRYO',
    short: 'CRYO',
    description: 'Le froid ralentit de 55 %. Faible dÃ©gÃ¢ts, mais il achÃ¨te du temps.',
    price: 900,
    damage: 25,
    fireRate: 4.3,
    magazine: 20,
    reload: 1.8,
    pellets: 2,
    spread: 0.025,
    pierce: 0,
    range: 60,
    headshotMultiplier: 1.5,
    slowMultiplier: 0.45,
    slowDuration: 2.4,
    special: 'RALENTIT',
    color: '#72d8ff',
    energyColor: 0x72d8ff,
    accentColor: 0xb17cff,
    tracerColor: 0xc9f5ff,
    visualScale: 1,
    icon: '<path d="M32 6v52M8 18l48 28M56 18 8 46M8 32h48"/><circle cx="32" cy="32" r="24"/><path d="m25 25 14 14M39 25 25 39"/>'
  },
  rail: {
    id: 'rail',
    classId: 'ranger',
    fireMode: 'ray',
    name: 'LANCE-01 // RAIL',
    short: 'RAIL',
    description: 'Transperce trois hostiles alignÃ©s. La rÃ©ponse aux vagues dâ€™Ã©lites.',
    price: 950,
    damage: 132,
    fireRate: 1,
    magazine: 5,
    reload: 2.15,
    pellets: 1,
    spread: 0,
    pierce: 2,
    range: 110,
    headshotMultiplier: 2.1,
    special: 'PERFORATION',
    color: '#b17cff',
    energyColor: 0xb17cff,
    accentColor: 0x00f5ff,
    tracerColor: 0xe1c3ff,
    visualScale: 1.12,
    icon: '<path d="M7 32h39l11-7v-6l-11 7H7l-4-7 4-7Z"/><path d="M17 25v14M25 25v14M33 25v14M46 15h11M47 49h10"/><circle cx="51" cy="32" r="4"/>'
  },
  inferno: {
    id: 'inferno',
    classId: 'ranger',
    fireMode: 'ray',
    name: 'PYRO-4 // INFERNO',
    short: 'INFERNO',
    description: 'FlammÃ¨che de contact. PortÃ©e courte, mais tout ce quâ€™elle touche brÃ»le.',
    price: 1100,
    damage: 6,
    fireRate: 18,
    magazine: 90,
    reload: 2.4,
    pellets: 3,
    spread: 0.11,
    pierce: 0,
    range: 24,
    headshotMultiplier: 1.3,
    burnDamage: 6,
    burnDuration: 2.5,
    special: 'BRÃ›LURE',
    color: '#ff6b2c',
    energyColor: 0xff6b2c,
    accentColor: 0xffd166,
    tracerColor: 0xffb05c,
    visualScale: 0.94,
    icon: '<path d="M12 45c-5-8 2-13 2-21 6 5 7 9 4 14 7-4 8-11 5-18 12 8 17 18 11 27-4 6-11 8-17 5Z"/><path d="M32 10c7 10 8 18 3 26-3 4-8 5-12 2 5-2 7-6 5-11 5 3 7 7 6 12"/>'
  },
  plasma: {
    id: 'plasma',
    classId: 'ranger',
    fireMode: 'ray',
    name: 'ARC-9 // PLASMA',
    short: 'PLASMA',
    description: 'Boules Ã  fusion. Lâ€™explosion touche tout ce qui est autour du point dâ€™impact.',
    price: 1400,
    damage: 92,
    fireRate: 2.3,
    magazine: 14,
    reload: 2,
    pellets: 1,
    spread: 0.01,
    pierce: 0,
    range: 75,
    headshotMultiplier: 1.7,
    explosionRadius: 4.2,
    explosionDamage: 60,
    special: 'EXPLOSION',
    color: '#ff77c8',
    energyColor: 0xff77c8,
    accentColor: 0x9b78ff,
    tracerColor: 0xffb4e2,
    visualScale: 1.05,
    icon: '<circle cx="32" cy="32" r="10"/><path d="M32 6v10M32 48v10M6 32h10M48 32h10M13 13l8 8M43 43l8 8M51 13l-8 8M21 43l-8 8"/><path d="m26 32 6-10 6 10-6 10Z"/>'
  },

  // --- Armurerie de l'Assassin -------------------------------------------
  twinSabers: {
    id: 'twinSabers',
    classId: 'assassin',
    fireMode: 'slash',
    name: 'LAMES // JUMELLES',
    short: 'JUMELLES',
    description: 'Deux sabres, deux cibles. Lâ€™arme de base de lâ€™Assassin.',
    price: 0,
    damage: 48,
    fireRate: 2.7,
    slashTargets: 2,
    slashArc: 0.34,
    slashRange: 3.9,
    slashVisual: 1.35,
    range: 3.9,
    special: 'DEUX CIBLES',
    color: '#b17cff',
    energyColor: 0xb17cff,
    accentColor: 0x6a3cff,
    tracerColor: 0xd9c2ff,
    visualScale: 1,
    icon: '<path d="m8 54 8-5 30-30-5-5-30 30-3 10Z"/><path d="m40 15 9-9 9 9-9 9M10 49l10 5M47 46l9 9"/><path d="m18 25 9 9"/>'
  },
  heavySaber: {
    id: 'heavySaber',
    classId: 'assassin',
    fireMode: 'slash',
    name: 'LAME // SPATULE',
    short: 'SPATULE',
    description: 'Une seule cible, mais un coup qui arrache. Arc large pour les groups serrÃ©s.',
    price: 700,
    damage: 108,
    fireRate: 1.85,
    slashTargets: 1,
    slashArc: 0.15,
    slashRange: 4.4,
    slashVisual: 1.9,
    range: 4.4,
    special: 'FRAPPE LOURDE',
    color: '#ff3158',
    energyColor: 0xff3158,
    accentColor: 0xffa06a,
    tracerColor: 0xffb0bd,
    visualScale: 1.18,
    icon: '<path d="M10 54 4 46l30-32 10 10-32 32Z"/><path d="m40 12 12 12M8 46l10 10M20 40l6 6"/><path d="M46 14a8 8 0 1 1 12 12"/>'
  },
  twinFang: {
    id: 'twinFang',
    classId: 'assassin',
    fireMode: 'slash',
    name: 'CROCS // JUMELS',
    short: 'CROCS',
    description: 'Trois cibles, enchaÃ®nement rapide. Faible par coup, imbattable dans la masse.',
    price: 850,
    damage: 35,
    fireRate: 3.5,
    slashTargets: 3,
    slashArc: 0.5,
    slashRange: 3.6,
    slashVisual: 1.2,
    range: 3.6,
    special: 'TROIS CIBLES',
    color: '#ff77c8',
    energyColor: 0xff77c8,
    accentColor: 0xb17cff,
    tracerColor: 0xffc4e6,
    visualScale: 0.94,
    icon: '<path d="m6 52 7-4 24-24-4-4-24 24-3 8Z"/><path d="m32 22 6-6 6 6-6 6M38 32l6-6 6 6-6 6M26 36l6-6 6 6-6 6M9 47l8 4"/>'
  },
  shuriken: {
    id: 'shuriken',
    classId: 'assassin',
    fireMode: 'ray',
    name: 'SHURIKEN // VOLANT',
    short: 'SHURIKEN',
    description: 'Lancer Ã  la main. PortÃ©e courte, mais on garde la mobilitÃ© du dash.',
    price: 1100,
    damage: 29,
    fireRate: 9,
    magazine: 15,
    reload: 1.1,
    pellets: 1,
    spread: 0.018,
    pierce: 0,
    range: 46,
    headshotMultiplier: 1.8,
    special: 'LANCER',
    color: '#c9a6ff',
    energyColor: 0xc9a6ff,
    accentColor: 0x5ca8ff,
    tracerColor: 0xe6d8ff,
    visualScale: 0.9,
    icon: '<path d="M32 6 40 24l18 8-18 8-8 18-8-18-18-8 18-8Z"/><circle cx="32" cy="32" r="5"/><path d="M12 12l8 8M52 12l-8 8M12 52l8-8M52 52l-8-8"/>'
  },
  shadowStep: {
    id: 'shadowStep',
    classId: 'assassin',
    fireMode: 'slash',
    name: 'PAS // Dâ€™OMBRE',
    short: 'PAS OMBRE',
    description: 'Frappe qui voyage avec le dash : chaque esquive traverse ce qui traÃ®ne derriÃ¨re.',
    price: 1500,
    damage: 76,
    fireRate: 2.4,
    slashTargets: 2,
    slashArc: 0.28,
    slashRange: 4.2,
    slashVisual: 1.5,
    dashDamage: 88,
    range: 4.2,
    special: 'FRAPPE-DASH',
    color: '#7c6bff',
    energyColor: 0x7c6bff,
    accentColor: 0x00f5ff,
    tracerColor: 0xc2d0ff,
    visualScale: 1.05,
    icon: '<path d="M32 7 18 25l14 7-14 7 14 7-14 7 14 7 14-7-14-7 14-7-14-7 14-7-14-7Z"/><path d="m10 50 6-3 20-20-4-4-20 20-2 7Z"/><path d="M9 15 3 9M55 15l6-6M9 49l-6 6"/>'
  }
};

// Capacites actives achetees dans l'atelier et declenchees avec Espace.
// Elles sont exclusives a une classe : le Ranger controle l'espace, l'Assassin
// controle le corps.
//
// NOVA et AEGIS etaient du contenu mort dans l'equilibrage precedent :
// NOVA rapportait 7,5 DPS pour 500 CR, et AEGIS devenait inutile des que la
// reduction de degats de l'upgrade Stabilisateurs depassait 65 %.
const ABILITY_DEFINITIONS = {
  // --- Ranger --------------------------------------------------------------
  nova: {
    id: 'nova',
    classId: 'ranger',
    name: 'NOVA PULSE',
    short: 'NOVA',
    description: 'DÃ©tonation de zone. Touche tout le monde autour de toi, allies compris le dash de lâ€™Assassin.',
    price: 500,
    cooldown: 11,
    duration: 0,
    radius: 11,
    damage: 150,
    effect: 'DÃ‰GÃ‚TS DE ZONE',
    color: '#ffcf4a',
    icon: '<circle cx="32" cy="32" r="9"/><circle cx="32" cy="32" r="23"/><path d="M32 4v12M32 48v12M4 32h12M48 32h12M12 12l9 9M43 43l9 9M52 12l-9 9M21 43l-9 9"/>'
  },
  cryo: {
    id: 'cryo',
    classId: 'ranger',
    name: 'CRYO FIELD',
    short: 'CRYO',
    description: 'GÃ¨le la zone : les ennemis qui sâ€™y trouvent sont ralentis de 70 % pendant 4 secondes.',
    price: 650,
    cooldown: 16,
    duration: 4,
    radius: 15,
    slowMultiplier: 0.3,
    slowDuration: 4,
    effect: 'RALENTISSEMENT',
    color: '#72d8ff',
    icon: '<path d="M32 6v52M8 18l48 28M56 18 8 46M8 32h48"/><circle cx="32" cy="32" r="24"/><path d="m25 25 14 14M39 25 25 39"/>'
  },
  aegis: {
    id: 'aegis',
    classId: 'ranger',
    name: 'AEGIS SHIELD',
    short: 'AEGIS',
    description: 'Bouclier dâ€™Ã©nergie : -45 % de dÃ©gÃ¢ts subis pendant 5 secondes.',
    price: 800,
    cooldown: 18,
    duration: 5,
    // Ne peut pas depasser le plafond de reduction totale, sinon l'upgrade
    // Stabilisateur devenait inutile a partir du 3e niveau.
    damageReduction: 0.45,
    effect: 'PROTECTION',
    color: '#5ca8ff',
    icon: '<path d="M32 7 52 16v15c0 13-9 24-20 29C21 55 12 44 12 31V16L32 7Z"/><path d="M32 18v29M20 25l12 8 12-8M20 40l12-7 12 7"/>'
  },
  overload: {
    id: 'overload',
    classId: 'ranger',
    name: 'OVERLOAD CORE',
    short: 'OVERDRIVE',
    description: 'Surcharge lâ€™arme : +50 % de dÃ©gÃ¢ts et +60 % de cadence pendant 7 secondes.',
    price: 1000,
    cooldown: 24,
    duration: 7,
    damageMultiplier: 1.5,
    fireRateMultiplier: 1.6,
    effect: 'SURCHARGE',
    color: '#ff77c8',
    icon: '<path d="m36 7-19 22h13l-5 19 22-27H33l3-14Z"/><path d="M8 13h8M6 21h7M8 29h8M49 48h7M48 40h6"/>'
  },

  // --- Assassin ------------------------------------------------------------
  shadowStep: {
    id: 'shadowStep',
    classId: 'assassin',
    name: 'PAS OMBRE',
    short: 'PAS OMBRE',
    description: 'Reset immÃ©diat du dash et +50 % de dÃ©gÃ¢ts de frappe pendant 6 secondes.',
    price: 500,
    cooldown: 12,
    duration: 6,
    damageMultiplier: 1.5,
    resetDash: true,
    effect: 'RUPTURE',
    color: '#7c6bff',
    icon: '<path d="M32 7 18 25l14 7-14 7 14 7-14 7 14 7 14-7-14-7 14-7-14-7 14-7-14-7Z"/><path d="M9 15 3 9M55 15l6-6M9 49l-6 6M55 49l6 6"/>'
  },
  shadowVeilField: {
    id: 'shadowVeilField',
    classId: 'assassin',
    name: 'VOILE SOMBRE',
    short: 'VOILE',
    description: 'Invisible 1,5 s. La premiÃ¨re frappe qui suit est un headshot garanti, quelle que soit la distance.',
    price: 750,
    cooldown: 16,
    duration: 1.5,
    vanish: true,
    guaranteedCrit: true,
    effect: 'INVISIBILITÃ‰',
    color: '#b17cff',
    icon: '<path d="M32 6c9 0 15 7 15 16 0 10-7 20-15 30-8-10-15-20-15-30 0-9 6-16 15-16Z"/><path d="M6 20l8 4M58 20l-8 4M6 44l8-4M58 44l-8-4"/>'
  },
  shadowRiptide: {
    id: 'shadowRiptide',
    classId: 'assassin',
    name: 'SANG-DÃ‰CHIRÃ‰',
    short: 'SANG',
    description: 'Vampirie : +45 % de dÃ©gÃ¢ts et 6 PV rÃ©cupÃ©rÃ©s par Ã©limination, pendant 8 secondes.',
    price: 900,
    cooldown: 20,
    duration: 8,
    damageMultiplier: 1.45,
    killHeal: 6,
    effect: 'VAMPIRE',
    color: '#ff4d83',
    icon: '<path d="M32 55S8 42 8 23C8 12 22 7 32 20 42 7 56 12 56 23c0 19-24 32-24 32Z"/><path d="M21 29h8l3-6 4 13 3-7h8"/>'
  },
  shadowHourglass: {
    id: 'shadowHourglass',
    classId: 'assassin',
    name: 'HEURE DE CENDRE',
    short: 'CENDRES',
    description: 'Ralentit de 55 % tous les ennemis pendant 6 s et inflige 90 dÃ©gÃ¢ts Ã  l healthiest de la zone.',
    price: 1200,
    cooldown: 26,
    duration: 6,
    radius: 18,
    slowMultiplier: 0.45,
    damage: 90,
    effect: 'RALENTI + DÃ‰GÃ‚TS',
    color: '#c9a6ff',
    icon: '<path d="M16 6h32M16 58h32M18 6c0 14 14 16 14 26S18 44 18 58M46 6c0 14-14 16-14 26s14 12 14 26"/><path d="M22 50h20"/>'
  }
};

// Ã‰quipements permanents achetÃ©s avec les crÃ©dits gagnÃ©s Ã  la mort.
//
// Volontairement sobres. Les crÃ©dits sont gagnÃ©s Ã  chaque mort, donc un
// joueur qui meurt beaucoup les empile : des bonus trop forts rendent le jeu
// trivial aprÃ¨s quelques parties. Le plafond total de l'atelier est de
// +40 % de dÃ©gÃ¢ts, +35 % de cadence, +90 PV et 16 % de rÃ©duction, ce qui
// reste en dessous des amÃ©liorations de vague (jusqu'Ã  +78 % de dÃ©gÃ¢ts).
// Le champ classId rend chaque Ã©quipement exclusif Ã  une classe.
const META_EQUIPMENT = [
  {
    id: 'reinforcedCore',
    classId: 'shared',
    name: 'Noyau blindÃ©',
    short: 'BLINDAGE',
    description: '+18 PV maximum par niveau.',
    color: '#5ca8ff',
    maxLevel: 5,
    baseCost: 220,
    costGrowth: 1.5,
    icon: '<path d="M32 7 52 16v15c0 13-9 24-20 29C21 55 12 44 12 31V16L32 7Z"/><path d="M32 18v29M20 25l12 8 12-8M20 40l12-7 12 7"/>'
  },
  {
    id: 'neuralShield',
    classId: 'shared',
    name: 'RÃ©seau neural',
    short: 'STABILITÃ‰',
    description: '-4 % de dÃ©gÃ¢ts subis par niveau.',
    color: '#72d8ff',
    maxLevel: 4,
    baseCost: 320,
    costGrowth: 1.6,
    icon: '<path d="M32 6v52M8 18l48 28M56 18 8 46M8 32h48"/><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="10"/>'
  },
  {
    id: 'pulseCoil',
    classId: 'ranger',
    name: 'Bobine pulsante',
    short: 'DOMMAGE',
    description: '+8 % de dÃ©gÃ¢ts par niveau.',
    color: '#ff6b2c',
    maxLevel: 5,
    baseCost: 280,
    costGrowth: 1.55,
    icon: '<path d="M36 7 17 29h13l-5 19 22-27H33l3-14Z"/><path d="M8 13h8M6 21h7M8 29h8M49 48h7M48 40h6"/>'
  },
  {
    id: 'overclock',
    classId: 'ranger',
    name: 'DÃ©clencheur surcadencÃ©',
    short: 'CADENCE',
    description: '+7 % de cadence par niveau.',
    color: '#00f5ff',
    maxLevel: 5,
    baseCost: 260,
    costGrowth: 1.5,
    icon: '<circle cx="32" cy="32" r="20"/><path d="M32 7v10M32 47v10M7 32h10M47 32h10M14 14l7 7M43 43l7 7M50 14l-7 7M21 43l-7 7"/><circle cx="32" cy="32" r="5"/>'
  },
  {
    id: 'tacticalMagazine',
    classId: 'ranger',
    name: 'Chargeur tactique',
    short: 'MUNITIONS',
    description: '+5 munitions par niveau.',
    color: '#62ff9a',
    maxLevel: 5,
    baseCost: 200,
    costGrowth: 1.45,
    icon: '<path d="M12 15h40v34H12zM20 22h24v20H20zM24 8h16v7M32 27v10m-5-5h10"/>'
  },
  {
    id: 'bladeEdge',
    classId: 'assassin',
    name: 'Fil des lames',
    short: 'TRANCHE',
    description: '+9 % de dÃ©gÃ¢ts de frappe par niveau.',
    color: '#b17cff',
    maxLevel: 5,
    baseCost: 280,
    costGrowth: 1.55,
    icon: '<path d="m8 54 8-5 30-30-5-5-30 30-3 10Z"/><path d="m40 15 9-9 9 9-9 9M10 49l10 5M47 46l9 9"/><path d="m18 25 9 9"/>'
  },
  {
    id: 'tendonSurge',
    classId: 'assassin',
    name: 'Tendon synthÃ©tiques',
    short: 'REFLEXE',
    description: '+8 % de cadence de frappe par niveau.',
    color: '#8affd6',
    maxLevel: 5,
    baseCost: 260,
    costGrowth: 1.5,
    icon: '<path d="M31 6 18 34h12l-4 25 19-35H33l5-18Z"/><path d="M9 14h12M7 24h10M9 34h12M47 49h9"/>'
  },
  {
    id: 'bloodPact',
    classId: 'assassin',
    name: 'Pacte de sang',
    short: 'SAIGNÃ‰E',
    description: '+2 PV rÃ©cupÃ©rÃ©s par Ã©limination, par niveau.',
    color: '#ff4d83',
    maxLevel: 4,
    baseCost: 300,
    costGrowth: 1.6,
    icon: '<path d="M32 55S8 42 8 23C8 12 22 7 32 20 42 7 56 12 56 23c0 19-24 32-24 32Z"/><path d="M21 29h8l3-6 4 13 3-7h8"/>'
  }
];

const player = {
  position: new THREE.Vector3(0, CONFIG.playerEyeHeight, 10),
  yaw: 0,
  pitch: 0,
  velocity: new THREE.Vector3(),
  health: CONFIG.baseHealth,
  maxHealth: CONFIG.baseHealth,
  speed: CONFIG.baseSpeed,
  // Valeurs de reference : les ameliorations sont additives et partent de
  // ces bases, elles ne s'appliquent plus les unes sur les autres.
  baseDamage: CONFIG.baseDamage,
  baseFireRate: CONFIG.baseFireRate,
  damage: CONFIG.baseDamage,
  fireRate: CONFIG.baseFireRate,
  weaponId: 'pulse',
  weaponRange: CONFIG.interactionRange,
  weaponPellets: 1,
  weaponSpread: 0,
  classId: 'ranger',
  abilityId: '',
  abilityCooldown: 0,
  abilityTimer: 0,
  abilityDamageBonus: 0,
  abilityKillHeal: 0,
  vanishTimer: 0,
  critPending: false,
  overdriveTimer: 0,
  magazineSize: CONFIG.baseMagazine,
  ammo: CONFIG.baseMagazine,
  reloadTime: CONFIG.baseReload,
  reloadRemaining: 0,
  fireCooldown: 0,
  dashCooldown: 0,
  dashCooldownDuration: 2.4,
  dashTimer: 0,
  dashDirection: new THREE.Vector3(),
  slashTimer: 0,
  slashTargets: 2,
  killHeal: 0,
  executionBonus: 0,
  regen: 0,
  damageReduction: 0,
  pierce: 0,
  upgrades: Object.fromEntries(Object.keys(UPGRADE_DEFINITIONS).map((key) => [key, 0])),
  recoil: 0,
  shake: 0,
  invulnerable: 0,
  bobTime: 0,
  moving: false,
  moveScratch: new THREE.Vector3(),
  forwardScratch: new THREE.Vector3(),
  rightScratch: new THREE.Vector3()
};

let scene;
let camera;
let renderer;
let environmentRenderTarget;
let weapon;
let assassinWeapon;
let muzzleFlash;
let muzzleLight;
let raycaster;

const STORAGE_KEYS = Object.freeze({
  bestScore: 'nexus-breach-best',
  credits: 'nexus-breach-credits',
  equipment: 'nexus-breach-equipment',
  weapons: 'nexus-breach-weapons',
  equippedWeapon: 'nexus-breach-equipped-weapon',
  classes: 'nexus-breach-classes',
  equippedClass: 'nexus-breach-equipped-class',
  abilities: 'nexus-breach-abilities',
  equippedAbility: 'nexus-breach-equipped-ability',
  map: 'nexus-breach-map',
  saveVersion: 'nexus-breach-save-version',
  restoreNotice: 'nexus-breach-restore-notice'
});

let state = GAME_STATE.MENU;
let currentMapIndex = readCurrentMapIndex();
let wave = 0;
let score = 0;
let kills = 0;

let soundEnabled = true;
let bestScore = readBestScore();
let credits = readCredits();
let ownedEquipment = readOwnedEquipment();
let ownedWeapons = readOwnedWeapons();
let equippedWeapon = readEquippedWeapon();
let ownedClasses = readOwnedClasses();
let equippedClass = readEquippedClass();
let ownedAbilities = readOwnedAbilities();
let equippedAbility = readEquippedAbility();

// Reconciliation apres chargement : une sauvegarde d'avant le split par
// classe peut porter une arme ou une capacite de l'autre classe. On les
// remplace par les valeurs de depart de la classe plutot que de les laisser
// trainer, ce qui laisserait l'operateur sans arme utilisable.
if (WEAPON_DEFINITIONS[equippedWeapon]?.classId !== equippedClass) {
  equippedWeapon = resolveWeaponForClass(equippedWeapon, equippedClass).id;
}
if (ABILITY_DEFINITIONS[equippedAbility]?.classId !== equippedClass) equippedAbility = '';
let shopReturnState = GAME_STATE.MENU;
let lastReward = null;
let runTime = 0;
let shotsFired = 0;
let shotsHit = 0;
let headshots = 0;
let damageTaken = 0;
let abilityMessage = '';
let abilityMessageTimer = 0;
let waveTotal = 0;
let waveSpawned = 0;
let spawnTimer = 0;
let waveBannerTimer = 0;
let damageFlashTimer = 0;
let elapsed = 0;
let lastFrame = 0;
let lastRenderedFrame = 0;
let hudTimer = 0;
const hudCache = Object.create(null);

const keys = new Set();
const enemies = [];
const enemyTargets = [];
const arenaTargets = [];
// Cible de raycast unique : fireWeapon copiait [...arenaTargets,
// ...enemyTargets] a chaque projectile, soit ~70 elements recopies par tir.
const raycastTargets = [];
const obstacles = [];
const particles = [];
const slashEffects = [];
const dashTrails = [];
const tracers = [];
// Geometrie de debris partagee : elle etait recreee a chaque impact et a
// chaque mort (tailles tirees au hasard), ce qui uploadait des buffers GPU
// sans arret. La taille passe maintenant par l'echelle du mesh.
const sharedDebrisGeometry = new THREE.TetrahedronGeometry(1, 0);
const debrisMaterialPool = [];
const ripples = [];
const animatedRings = [];
const spawnPads = [];

const NAV_CELL_SIZE = 1.5;
const NAV_GRID_SIZE = 30;
const navWalkable = new Uint8Array(NAV_GRID_SIZE * NAV_GRID_SIZE);
const navDistance = new Int32Array(NAV_GRID_SIZE * NAV_GRID_SIZE);
const navQueue = new Int32Array(NAV_GRID_SIZE * NAV_GRID_SIZE);
const navCellCenters = Array.from({ length: NAV_GRID_SIZE * NAV_GRID_SIZE }, () => new THREE.Vector3());
const NAV_DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1]
];
let navTimer = 0;

// La shadow map est rafraichie 1 frame sur SHADOW_REFRESH_FRAMES pendant le
// jeu, et a chaque frame hors jeu (menu anime, arene qui tourne).
const SHADOW_REFRESH_FRAMES = 3;
let shadowFrameCounter = 0;

class SoundSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = soundEnabled ? 0.42 : 0;
    this.master.connect(this.context.destination);
    this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.5, this.context.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  setEnabled(enabled) {
    soundEnabled = enabled;
    this.ensure();
    if (this.master) this.master.gain.setTargetAtTime(enabled ? 0.42 : 0, this.context.currentTime, 0.025);
  }

  tone(frequency, duration, volume = 0.1, type = 'sine', slide = 0) {
    if (!soundEnabled || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, frequency + slide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise(duration, volume = 0.12, cutoff = 1800) {
    if (!soundEnabled || !this.context || !this.noiseBuffer) return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + duration);
  }

  shoot(weaponId = 'pulse') {
    const frequency = weaponId === 'rail' ? 82
      : weaponId === 'scatter' ? 118
        : weaponId === 'smg' ? 190
          : weaponId === 'vector' ? 135
            : weaponId === 'inferno' ? 165
              : weaponId === 'cryo' ? 240
                : weaponId === 'plasma' ? 105 : 155;
    const duration = weaponId === 'rail' ? 0.16 : weaponId === 'scatter' ? 0.13 : weaponId === 'plasma' ? 0.14 : 0.09;
    const toneType = weaponId === 'cryo' ? 'triangle' : weaponId === 'plasma' ? 'square' : 'sawtooth';
    const cutoff = weaponId === 'cryo' ? 3600 : weaponId === 'inferno' ? 900 : weaponId === 'plasma' ? 1600 : 2300;
    this.tone(frequency, duration, weaponId === 'smg' ? 0.1 : 0.15, toneType, weaponId === 'rail' ? -55 : -105);
    this.noise(weaponId === 'rail' ? 0.12 : 0.075, weaponId === 'scatter' ? 0.17 : 0.13, cutoff);
  }

  hit(headshot = false) {
    this.tone(headshot ? 820 : 610, 0.055, 0.075, 'square', -140);
  }

  hurt() {
    this.tone(95, 0.19, 0.15, 'sawtooth', -42);
    this.noise(0.12, 0.08, 650);
  }

  kill() {
    this.tone(210, 0.18, 0.09, 'triangle', 260);
  }

  reload() {
    this.tone(290, 0.06, 0.06, 'square', -60);
    window.setTimeout(() => this.tone(430, 0.05, 0.05, 'square', -40), 240);
  }

  waveStart() {
    this.tone(160, 0.55, 0.09, 'sawtooth', 190);
    window.setTimeout(() => this.tone(320, 0.38, 0.07, 'triangle', 180), 180);
  }

  upgrade() {
    this.tone(420, 0.28, 0.07, 'sine', 360);
    window.setTimeout(() => this.tone(760, 0.38, 0.06, 'sine', 420), 100);
  }

  death() {
    this.tone(190, 0.9, 0.12, 'sawtooth', -165);
  }

  purchase() {
    this.tone(360, 0.12, 0.07, 'square', 120);
    window.setTimeout(() => this.tone(620, 0.18, 0.06, 'triangle', 260), 90);
  }

  ability(abilityId = 'nova') {
    const frequency = abilityId === 'cryo' ? 720 : abilityId === 'aegis' ? 260 : abilityId === 'overload' ? 440 : 180;
    this.tone(frequency, 0.3, 0.09, abilityId === 'cryo' ? 'triangle' : 'sawtooth', abilityId === 'cryo' ? 280 : 180);
    this.noise(0.16, 0.08, abilityId === 'cryo' ? 3200 : 1400);
  }

  slash() {
    this.tone(520, 0.11, 0.1, 'triangle', -260);
    this.noise(0.08, 0.1, 4200);
  }

  dash() {
    this.tone(160, 0.18, 0.1, 'sawtooth', 420);
    this.noise(0.12, 0.09, 2200);
  }
}

const audio = new SoundSystem();

function setScreen(screen, active) {
  screen.classList.toggle('active', active);
}

function readStorage(key, fallback = '') {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // La progression reste disponible en mÃ©moire si le stockage est bloquÃ©.
  }
}

function readCurrentMapIndex() {
  const value = Number.parseInt(readStorage(STORAGE_KEYS.map, '0'), 10);
  return Number.isInteger(value) && MAP_DEFINITIONS[value] ? value : 0;
}

function readBestScore() {
  const value = Number.parseInt(readStorage(STORAGE_KEYS.bestScore, '0'), 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readCredits() {
  const value = Number.parseInt(readStorage(STORAGE_KEYS.credits, '0'), 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readOwnedEquipment() {
  const equipment = Object.fromEntries(META_EQUIPMENT.map((item) => [item.id, 0]));
  try {
    const saved = JSON.parse(readStorage(STORAGE_KEYS.equipment, '{}'));
    META_EQUIPMENT.forEach((item) => {
      const level = Number(saved?.[item.id]);
      if (Number.isInteger(level) && level >= 0) {
        equipment[item.id] = Math.min(level, item.maxLevel);
      }
    });
  } catch {
    // Un profil corrompu ne doit pas empÃªcher de jouer.
  }
  return equipment;
}

function readOwnedWeapons() {
  // Les armes de depart (prix 0) sont toujours possedees, pour chaque classe.
  const owned = {};
  Object.values(WEAPON_DEFINITIONS).forEach((weapon) => {
    if (weapon.price === 0) owned[weapon.id] = true;
  });
  try {
    const saved = JSON.parse(readStorage(STORAGE_KEYS.weapons, '{}'));
    Object.keys(WEAPON_DEFINITIONS).forEach((id) => {
      if (saved?.[id] === true) owned[id] = true;
    });
  } catch {
    // Un inventaire corrompu conserve au minimum les armes de depart.
  }
  return owned;
}

function readEquippedWeapon() {
  const saved = readStorage(STORAGE_KEYS.equippedWeapon, 'pulse');
  return WEAPON_DEFINITIONS[saved] && ownedWeapons[saved] ? saved : 'pulse';
}

function readOwnedClasses() {
  const classes = { ranger: true, assassin: false };
  try {
    const saved = JSON.parse(readStorage(STORAGE_KEYS.classes, '{}'));
    if (saved?.assassin === true) classes.assassin = true;
  } catch {
    // Un inventaire de classes corrompu conserve le Ranger.
  }
  return classes;
}

function readEquippedClass() {
  const saved = readStorage(STORAGE_KEYS.equippedClass, 'ranger');
  return PLAYER_CLASSES[saved] && ownedClasses[saved] ? saved : 'ranger';
}

function ownsClass(id) {
  return PLAYER_CLASSES[id] && ownedClasses[id] === true;
}

function getPlayerClassDefinition(id = equippedClass) {
  return PLAYER_CLASSES[id] || PLAYER_CLASSES.ranger;
}

function readOwnedAbilities() {
  const owned = {};
  try {
    const saved = JSON.parse(readStorage(STORAGE_KEYS.abilities, '{}'));
    Object.keys(ABILITY_DEFINITIONS).forEach((id) => {
      if (saved?.[id] === true) owned[id] = true;
    });
  } catch {
    // Une sauvegarde invalide laisse simplement le joueur sans capacitÃ©.
  }
  return owned;
}

function readEquippedAbility() {
  const saved = readStorage(STORAGE_KEYS.equippedAbility, '');
  return ABILITY_DEFINITIONS[saved] && ownedAbilities[saved] ? saved : '';
}

function saveProfile() {
  writeStorage(STORAGE_KEYS.bestScore, String(bestScore));
  writeStorage(STORAGE_KEYS.credits, String(credits));
  writeStorage(STORAGE_KEYS.equipment, JSON.stringify(ownedEquipment));
  writeStorage(STORAGE_KEYS.weapons, JSON.stringify(ownedWeapons));
  writeStorage(STORAGE_KEYS.equippedWeapon, equippedWeapon);
  writeStorage(STORAGE_KEYS.classes, JSON.stringify(ownedClasses));
  writeStorage(STORAGE_KEYS.equippedClass, equippedClass);
  writeStorage(STORAGE_KEYS.abilities, JSON.stringify(ownedAbilities));
  writeStorage(STORAGE_KEYS.equippedAbility, equippedAbility);
  writeStorage(STORAGE_KEYS.map, String(currentMapIndex));
  writeStorage(STORAGE_KEYS.saveVersion, '1');
}

function createProfileBackup() {
  saveProfile();
  return {
    game: 'Nexus Breach',
    saveVersion: 1,
    savedAt: new Date().toISOString(),
    progression: {
      bestScore,
      credits,
      ownedEquipment: { ...ownedEquipment },
      ownedWeapons: { ...ownedWeapons },
      equippedWeapon,
      ownedClasses: { ...ownedClasses },
      equippedClass,
      ownedAbilities: { ...ownedAbilities },
      equippedAbility,
      currentMapIndex
    }
  };
}

function sanitizeImportedProfile(data) {
  if (!data || data.game !== 'Nexus Breach' || data.saveVersion !== 1 || !data.progression) {
    throw new Error('Ce fichier nâ€™est pas une sauvegarde valide de Nexus Breach.');
  }

  const progression = data.progression;
  const equipment = Object.fromEntries(META_EQUIPMENT.map((item) => [item.id, 0]));
  META_EQUIPMENT.forEach((item) => {
    const level = Number(progression.ownedEquipment?.[item.id]);
    if (Number.isInteger(level) && level >= 0) equipment[item.id] = Math.min(level, item.maxLevel);
  });

  const weapons = { pulse: true };
  Object.keys(WEAPON_DEFINITIONS).forEach((id) => {
    if (id === 'pulse' || progression.ownedWeapons?.[id] === true) weapons[id] = true;
  });

  const abilities = {};
  Object.keys(ABILITY_DEFINITIONS).forEach((id) => {
    if (progression.ownedAbilities?.[id] === true) abilities[id] = true;
  });

  const importedWeapon = WEAPON_DEFINITIONS[progression.equippedWeapon] && weapons[progression.equippedWeapon]
    ? progression.equippedWeapon
    : 'pulse';
  const importedAbility = ABILITY_DEFINITIONS[progression.equippedAbility] && abilities[progression.equippedAbility]
    ? progression.equippedAbility
    : '';
  const classes = { ranger: true, assassin: progression.ownedClasses?.assassin === true };
  const importedClass = PLAYER_CLASSES[progression.equippedClass] && classes[progression.equippedClass]
    ? progression.equippedClass
    : 'ranger';
  const importedMap = Number(progression.currentMapIndex);

  return {
    bestScore: Number.isFinite(Number(progression.bestScore)) ? Math.max(0, Math.round(Number(progression.bestScore))) : 0,
    credits: Number.isFinite(Number(progression.credits)) ? Math.max(0, Math.round(Number(progression.credits))) : 0,
    ownedEquipment: equipment,
    ownedWeapons: weapons,
    equippedWeapon: importedWeapon,
    ownedClasses: classes,
    equippedClass: importedClass,
    ownedAbilities: abilities,
    equippedAbility: importedAbility,
    currentMapIndex: Number.isInteger(importedMap) && MAP_DEFINITIONS[importedMap] ? importedMap : 0
  };
}

function applyProfileBackup(profile) {
  bestScore = profile.bestScore;
  credits = profile.credits;
  ownedEquipment = profile.ownedEquipment;
  ownedWeapons = profile.ownedWeapons;
  equippedWeapon = profile.equippedWeapon;
  ownedClasses = profile.ownedClasses;
  equippedClass = profile.equippedClass;
  ownedAbilities = profile.ownedAbilities;
  equippedAbility = profile.equippedAbility;
  currentMapIndex = profile.currentMapIndex;
  saveProfile();
  resetStats();
  applyWeaponVisual();
  updateMapUI();
  updateClassUI();
  updateCreditsUI();
  if (state === GAME_STATE.SHOP) renderShop();
}

function showSaveStatus(message, type = 'info') {
  if (!ui.saveStatus) return;
  ui.saveStatus.textContent = message;
  ui.saveStatus.dataset.state = type;
  window.setTimeout(() => {
    if (ui.saveStatus?.textContent === message) {
      ui.saveStatus.textContent = 'SAUVEGARDE AUTOMATIQUE // ACTIVE';
      ui.saveStatus.dataset.state = 'info';
    }
  }, 4200);
}

function downloadProfileBackup() {
  const backup = createProfileBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `nexus-breach-sauvegarde-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showSaveStatus('SAUVEGARDE TÃ‰LÃ‰CHARGÃ‰E', 'success');
}

async function importProfileBackup(file) {
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Le fichier de sauvegarde est trop volumineux.');
    const data = JSON.parse(await file.text());
    const profile = sanitizeImportedProfile(data);
    applyProfileBackup(profile);
    writeStorage(STORAGE_KEYS.restoreNotice, 'SAUVEGARDE RESTAURÃ‰E');
    window.location.reload();
  } catch (error) {
    showSaveStatus(error instanceof Error ? error.message.toUpperCase() : 'SAUVEGARDE INVALIDE', 'error');
  } finally {
    ui.saveFileInput.value = '';
  }
}

function updateMapUI() {
  const map = MAP_DEFINITIONS[currentMapIndex];
  if (ui.sectorValue) ui.sectorValue.textContent = map.name;
  if (ui.mapDescription) ui.mapDescription.textContent = map.description;
  ui.mapButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.mapIndex) === currentMapIndex);
  });
}

function updateClassUI() {
  const definition = getPlayerClassDefinition();
  if (ui.classDescription) ui.classDescription.textContent = definition.description;
  ui.classButtons.forEach((button) => {
    const id = button.dataset.classId;
    const unlocked = ownsClass(id);
    button.classList.toggle('active', id === equippedClass);
    button.classList.toggle('locked', !unlocked);
    button.setAttribute('aria-disabled', String(!unlocked));
    if (id === 'assassin' && ui.assassinClassStatus) {
      ui.assassinClassStatus.textContent = unlocked ? (equippedClass === id ? 'Ã‰QUIPÃ‰E' : 'POSSÃ‰DÃ‰E') : `${formatCredits(PLAYER_CLASSES.assassin.price)} CR`;
    }
  });
  if (ui.abilityHint) {
    // L'Assassin n'a un dash nu que tant qu'il n'a achete aucune capacite.
    const label = equippedAbility && ABILITY_DEFINITIONS[equippedAbility]?.classId === equippedClass
      ? 'CAPACITÃ‰'
      : 'DASH';
    ui.abilityHint.innerHTML = `<kbd>ESPACE</kbd> ${label}`;
  }
}

function selectMap(index) {
  if (!MAP_DEFINITIONS[index] || index === currentMapIndex) return;
  currentMapIndex = index;
  saveProfile();
  updateMapUI();
  window.location.reload();
}

function selectPlayerClass(id) {
  if (!PLAYER_CLASSES[id]) return;
  if (id === equippedClass) {
    if (state === GAME_STATE.MENU) {
      window.setTimeout(() => document.querySelector('#start-button')?.focus(), 0);
    }
    return;
  }
  if (!ownsClass(id)) {
    openShop();
    showSaveStatus('DÃ‰BLOQUEZ Lâ€™ASSASSIN POUR 2 500 CR DANS Lâ€™ATELIER', 'error');
    return;
  }
  equippedClass = id;
  player.classId = id;
  saveProfile();
  resetStats();
  applyWeaponVisual();
  updateClassUI();
  updateHUD();
  audio.purchase();
}

function getWeaponDefinition(id) {
  return WEAPON_DEFINITIONS[id] || WEAPON_DEFINITIONS.pulse;
}

// Armes de depart de chaque classe. Changer de classe ou de sauvegarder une
// veille version ne doit jamais laisser l'operateur sans arme utilisable.
const CLASS_DEFAULT_WEAPON = Object.freeze({ ranger: 'pulse', assassin: 'twinSabers' });

// L'arme equipee n'est valide que pour sa classe. Changer de classe en
// garde une, ou bascule sur celle de la classe.
function resolveWeaponForClass(id, classId) {
  const definition = WEAPON_DEFINITIONS[id];
  if (definition && definition.classId === classId) return definition;
  return WEAPON_DEFINITIONS[CLASS_DEFAULT_WEAPON[classId] || 'pulse'];
}

function ownsWeapon(id) {
  return (WEAPON_DEFINITIONS[id] && WEAPON_DEFINITIONS[id].price === 0) || ownedWeapons[id] === true;
}

function getAbilityDefinition(id) {
  return ABILITY_DEFINITIONS[id] || null;
}

function ownsAbility(id) {
  return ownedAbilities[id] === true;
}

function getEquipmentLevel(id) {
  return Number.isInteger(ownedEquipment[id]) ? ownedEquipment[id] : 0;
}

function getEquipmentCost(item, nextLevel = getEquipmentLevel(item.id) + 1) {
  const level = Math.max(1, nextLevel);
  const escalatingMultiplier = 1 + (level - 1) * 0.16;
  return Math.max(1, Math.round((item.baseCost * item.costGrowth ** (level - 1) * escalatingMultiplier) / 5) * 5);
}

function getPermanentStats() {
  const stats = {
    maxHealth: 0,
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    magazine: 0,
    reloadMultiplier: 1,
    speedMultiplier: 1,
    damageReduction: 0,
    regen: 0,
    pierce: 0,
    lifesteal: 0
  };

  META_EQUIPMENT.forEach((item) => {
    // Un equipement d'une autre classe n'apporte rien : changer de classe ne
    // doit pas laisser des bonus orphelins comptes.
    if (item.classId !== 'shared' && item.classId !== equippedClass) return;
    const level = getEquipmentLevel(item.id);
    switch (item.id) {
      case 'reinforcedCore':
        stats.maxHealth += 18 * level;
        break;
      case 'pulseCoil':
      case 'bladeEdge':
        stats.damageMultiplier += (item.id === 'bladeEdge' ? 0.09 : 0.08) * level;
        break;
      case 'overclock':
      case 'tendonSurge':
        stats.fireRateMultiplier += (item.id === 'tendonSurge' ? 0.08 : 0.07) * level;
        break;
      case 'tacticalMagazine':
        stats.magazine += 5 * level;
        break;
      case 'neuralShield':
        stats.damageReduction += 0.04 * level;
        break;
      case 'bloodPact':
        stats.lifesteal += 2 * level;
        break;
      default:
        break;
    }
  });

  // Le plafond rÃ©el est posÃ© par applyUpgradeStats (68 %), pas ici : un
  // plafond de 60 % ici Ã©tait du code inatteignable, puisque les rÃ©ductions
  // permanentes ne dÃ©passent jamais 16 %.
  stats.damageReduction = Math.min(0.16, stats.damageReduction);
  return stats;
}

function formatCredits(value) {
  return Math.max(0, Math.round(value)).toLocaleString('fr-FR');
}

function updateCreditsUI() {
  const formatted = formatCredits(credits);
  [ui.menuCredits, ui.hudCredits, ui.shopCredits].forEach((element) => {
    if (element) element.textContent = formatted;
  });
}

function renderShop() {
  if (!ui.shopItems || !ui.shopWeapons || !ui.shopAbilities || !ui.shopClasses) return;
  ui.shopItems.innerHTML = '';
  ui.shopWeapons.innerHTML = '';
  ui.shopAbilities.innerHTML = '';
  ui.shopClasses.innerHTML = '';
  let installedCount = 0;

  Object.values(PLAYER_CLASSES).forEach((classDefinition) => {
    const owned = ownsClass(classDefinition.id);
    const selected = equippedClass === classDefinition.id;
    const canBuy = credits >= classDefinition.price;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `shop-item class-item${selected ? ' weapon-selected' : ''}`;
    card.style.setProperty('--shop-color', classDefinition.color);
    card.disabled = selected || (!owned && !canBuy);
    card.setAttribute('aria-label', `${classDefinition.name}, ${owned ? 'possÃ©dÃ©e' : `non possÃ©dÃ©e, ${formatCredits(classDefinition.price)} crÃ©dits`}`);
    const action = selected
      ? '<span class="shop-maxed">Ã‰QUIPÃ‰E</span>'
      : owned
        ? '<span class="shop-cost">Ã‰QUIPER</span><small>ACTIVER</small>'
        : `<span class="shop-cost">${formatCredits(classDefinition.price)} CR</span><small>ACHETER</small>`;
    card.innerHTML = `
      <span class="shop-item-top"><span>${classDefinition.short}</span><span>${selected ? 'ACTIVE' : owned ? 'POSSÃ‰DÃ‰E' : 'VERROUILLÃ‰E'}</span></span>
      <span class="shop-item-visual"><svg viewBox="0 0 64 64" aria-hidden="true">${classDefinition.icon}</svg></span>
      <h3>${classDefinition.name}</h3>
      <p>${classDefinition.description}</p>
      <span class="shop-item-bottom">${action}</span>
    `;
    card.addEventListener('click', () => {
      if (owned) {
        equippedClass = classDefinition.id;
        player.classId = classDefinition.id;
        saveProfile();
        resetStats();
        applyWeaponVisual();
        updateClassUI();
        updateHUD();
        renderShop();
        audio.purchase();
      } else {
        buyPlayerClass(classDefinition.id);
      }
    });
    ui.shopClasses.appendChild(card);
  });

  // L'atelier n'affiche que l'arsenal de la classe equipped : l'Assassin ne
  // doit pas voir les fusils, ni le Ranger les sabres.
  Object.values(WEAPON_DEFINITIONS)
    .filter((weapon) => weapon.classId === equippedClass)
    .forEach((weapon) => {
    const owned = ownsWeapon(weapon.id);
    const selected = equippedWeapon === weapon.id;
    const canBuy = credits >= weapon.price;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `shop-item weapon-item${selected ? ' weapon-selected' : ''}`;
    card.style.setProperty('--shop-color', weapon.color);
    card.disabled = selected || (!owned && !canBuy);
    card.setAttribute('aria-label', `${weapon.name}, ${owned ? 'possÃ©dÃ©e' : 'non possÃ©dÃ©e'}`);

    const action = selected
      ? '<span class="shop-maxed">Ã‰QUIPÃ‰E</span>'
      : owned
        ? '<span class="shop-cost">Ã‰QUIPER</span><small>ACTIVER</small>'
        : `<span class="shop-cost">${formatCredits(weapon.price)} CR</span><small>ACHETER</small>`;
    const isSlash = weapon.fireMode === 'slash';
    const projectileStat = weapon.pellets > 1 ? `<span>PROJECTILES <b>${weapon.pellets}</b></span>` : '';
    const pierceStat = weapon.pierce > 0 ? `<span>PERFORATION <b>${weapon.pierce + 1}</b></span>` : '';
    const targetStat = isSlash ? `<span>CIBLES <b>${weapon.slashTargets}</b></span>` : '';
    const headshot = isSlash ? '' : `<span>TÃŠTE <b>${(weapon.headshotMultiplier ?? 1.65).toFixed(1)}x</b></span>`;
    const magazineStat = isSlash ? '' : `<span>CHARGEUR <b>${weapon.magazine}</b></span>`;
    const reloadStat = isSlash ? '' : `<span>RECHARGE <b>${weapon.reload.toFixed(2)}s</b></span>`;
    const special = weapon.special || 'STANDARD';
    // Le DPS affiche ne vaut que pour une arme a distance. Pour un sabre, on
    // affiche le degat par frappe et le nombre de cibles : l'ancien calcul
    // ignorait la perforation et les explosions, ce qui rendait SCATTER-7
    // (450 CR) plus rentable que RAIL (950 CR).
    const damageStat = isSlash
      ? `<span>FRAPPE <b>${weapon.damage}</b></span>`
      : `<span>DMG <b>${weapon.damage}</b></span>`;
    const rateStat = isSlash
      ? `<span>FRAPPES/S <b>${weapon.fireRate.toFixed(1)}</b></span>`
      : `<span>CADENCE <b>${weapon.fireRate.toFixed(1)}</b></span>`;
    const dpsStat = isSlash
      ? `<span>DEGÃ‚TS/S <b>${Math.round(weapon.damage * weapon.fireRate * (weapon.slashTargets * 0.75 + 0.25))}</b></span>`
      : `<span>DPS <b>${Math.round(weapon.damage * weapon.fireRate * weapon.pellets * (weapon.pierce + 1) * 0.6)}</b></span>`;
    const accuracyStat = isSlash ? '' : `<span>PRÃ‰CISION <b>${Math.round(Math.max(0, 100 - weapon.spread * 450))}%</b></span>`;
    const stats = [
      damageStat,
      dpsStat,
      rateStat,
      magazineStat,
      `<span>PORTÃ‰E <b>${weapon.range} m</b></span>`,
      accuracyStat,
      headshot,
      reloadStat,
      targetStat,
      projectileStat,
      pierceStat,
      `<span>EFFET <b>${special}</b></span>`
    ].filter(Boolean).join('');

    card.innerHTML = `
      <span class="shop-item-top"><span>${weapon.short}</span><span>${selected ? 'ACTIVE' : owned ? 'POSSÃ‰DÃ‰E' : 'VERROUILLÃ‰E'}</span></span>
      <span class="shop-item-visual"><svg viewBox="0 0 64 64" aria-hidden="true">${weapon.icon}</svg></span>
      <h3>${weapon.name}</h3>
      <p>${weapon.description}</p>
      <span class="weapon-stats">${stats}</span>
      <span class="shop-item-bottom">${action}</span>
    `;
    card.addEventListener('click', () => {
      if (owned) equipWeapon(weapon.id);
      else buyWeapon(weapon.id);
    });
    ui.shopWeapons.appendChild(card);
  });

  Object.values(ABILITY_DEFINITIONS)
    .filter((ability) => ability.classId === equippedClass)
    .forEach((ability) => {
    const owned = ownsAbility(ability.id);
    const selected = equippedAbility === ability.id;
    const canBuy = credits >= ability.price;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `shop-item ability-item${selected ? ' ability-selected' : ''}`;
    card.style.setProperty('--shop-color', ability.color);
    card.disabled = selected || (!owned && !canBuy);
    card.setAttribute('aria-label', `${ability.name}, ${owned ? 'possÃ©dÃ©e' : 'non possÃ©dÃ©e'}`);

    const action = selected
      ? '<span class="shop-maxed">Ã‰QUIPÃ‰E</span>'
      : owned
        ? '<span class="shop-cost">Ã‰QUIPER</span><small>ACTIVER</small>'
        : `<span class="shop-cost">${formatCredits(ability.price)} CR</span><small>ACHETER</small>`;
    const duration = ability.duration > 0 ? `${ability.duration}s` : 'INSTANT';
    const stats = [
      `<span>RECHARGE <b>${ability.cooldown}s</b></span>`,
      `<span>DUREE <b>${duration}</b></span>`,
      `<span>RAYON <b>${ability.radius || 'â€”'}</b></span>`,
      `<span>EFFET <b>${ability.effect}</b></span>`
    ].join('');

    card.innerHTML = `
      <span class="shop-item-top"><span>${ability.short}</span><span>${selected ? 'ACTIVE' : owned ? 'POSSÃ‰DÃ‰E' : 'VERROUILLÃ‰E'}</span></span>
      <span class="shop-item-visual"><svg viewBox="0 0 64 64" aria-hidden="true">${ability.icon}</svg></span>
      <h3>${ability.name}</h3>
      <p>${ability.description}</p>
      <span class="ability-stats">${stats}</span>
      <span class="shop-item-bottom">${action}</span>
    `;
    card.addEventListener('click', () => {
      if (owned) equipAbility(ability.id);
      else buyAbility(ability.id);
    });
    ui.shopAbilities.appendChild(card);
  });

  // L'equipement permanent est lui aussi filtre par classe : un module de
  // sabres n'a aucun effet sur un Ranger, l'afficher serait du leurre.
  const visibleEquipment = META_EQUIPMENT.filter((item) => item.classId === 'shared' || item.classId === equippedClass);
  visibleEquipment.forEach((item) => {
    const level = getEquipmentLevel(item.id);
    const maxed = level >= item.maxLevel;
    const nextCost = getEquipmentCost(item, level + 1);
    const affordable = credits >= nextCost;
    if (level > 0) installedCount += 1;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `shop-item${maxed ? ' maxed' : ''}`;
    card.style.setProperty('--shop-color', item.color);
    card.disabled = maxed || !affordable;
    card.setAttribute('aria-label', `${item.name}, niveau ${level} sur ${item.maxLevel}`);

    const pips = Array.from({ length: item.maxLevel }, (_, index) =>
      `<i class="${index < level ? 'active' : ''}"></i>`).join('');
    const action = maxed
      ? '<span class="shop-maxed">Ã‰QUIPÃ‰ // MAX</span>'
      : `<span class="shop-cost">${formatCredits(nextCost)} CR</span><small>ACHETER</small>`;

    card.innerHTML = `
      <span class="shop-item-top"><span>${item.short}</span><span>NIV. ${level} / ${item.maxLevel}</span></span>
      <span class="shop-item-visual"><svg viewBox="0 0 64 64" aria-hidden="true">${item.icon}</svg></span>
      <h3>${item.name}</h3>
      <p>${item.description}</p>
      <span class="shop-level-pips">${pips}</span>
      <span class="shop-item-bottom">${action}</span>
    `;
    card.addEventListener('click', () => buyEquipment(item.id));
    ui.shopItems.appendChild(card);
  });

  // Les compteurs n'affichent que ce qui est reellement accessible avec la
  // classe courante, sinon ils annoncent des armes inatteignables.
  const classWeapons = Object.values(WEAPON_DEFINITIONS).filter((weapon) => weapon.classId === equippedClass);
  const classAbilities = Object.values(ABILITY_DEFINITIONS).filter((ability) => ability.classId === equippedClass);
  const ownedWeaponsCount = classWeapons.filter((weapon) => ownsWeapon(weapon.id)).length;
  const ownedAbilitiesCount = classAbilities.filter((ability) => ownsAbility(ability.id)).length;
  ui.shopOwnedCount.textContent = `${equippedClass === 'ranger' ? 'RANGER' : 'ASSASSIN'} // ${ownedWeaponsCount} / ${classWeapons.length} ARMES // ${ownedAbilitiesCount} / ${classAbilities.length} CAPACITÃ‰S // ${installedCount} / ${visibleEquipment.length} MODULES`;
  updateCreditsUI();
}

function buyPlayerClass(id) {
  if (state !== GAME_STATE.SHOP) return;
  const classDefinition = PLAYER_CLASSES[id];
  if (!classDefinition || ownsClass(id) || credits < classDefinition.price) return;
  credits -= classDefinition.price;
  ownedClasses[id] = true;
  equippedClass = id;
  player.classId = id;
  saveProfile();
  resetStats();
  applyWeaponVisual();
  updateCreditsUI();
  updateClassUI();
  updateHUD();
  renderShop();
  audio.purchase();
}

function buyWeapon(id) {
  if (state !== GAME_STATE.SHOP) return;
  const weapon = WEAPON_DEFINITIONS[id];
  if (!weapon || weapon.classId !== equippedClass) return;
  if (ownsWeapon(id) || credits < weapon.price) return;
  credits -= weapon.price;
  ownedWeapons[id] = true;
  equippedWeapon = id;
  player.weaponId = id;
  saveProfile();
  updateCreditsUI();
  renderShop();
  updateHUD();
  audio.purchase();
}

function equipWeapon(id) {
  if (state !== GAME_STATE.SHOP || !ownsWeapon(id) || equippedWeapon === id) return;
  if (WEAPON_DEFINITIONS[id]?.classId !== equippedClass) return;
  equippedWeapon = id;
  player.weaponId = id;
  saveProfile();
  renderShop();
  updateHUD();
  audio.purchase();
}

function buyAbility(id) {
  if (state !== GAME_STATE.SHOP) return;
  const ability = ABILITY_DEFINITIONS[id];
  if (!ability || ability.classId !== equippedClass) return;
  if (ownsAbility(id) || credits < ability.price) return;
  credits -= ability.price;
  ownedAbilities[id] = true;
  equippedAbility = id;
  player.abilityId = id;
  saveProfile();
  updateCreditsUI();
  renderShop();
  updateHUD();
  audio.purchase();
}

function equipAbility(id) {
  if (state !== GAME_STATE.SHOP || !ownsAbility(id) || equippedAbility === id) return;
  if (ABILITY_DEFINITIONS[id]?.classId !== equippedClass) return;
  equippedAbility = id;
  player.abilityId = id;
  saveProfile();
  renderShop();
  updateHUD();
  audio.purchase();
}

function openShop() {
  if (state === GAME_STATE.SHOP) return;
  shopReturnState = state;
  applyWeaponVisual();
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  if (state === GAME_STATE.MENU) ui.menu.classList.remove('active');
  if (state === GAME_STATE.DEAD) ui.gameover.classList.remove('active');
  if (state === GAME_STATE.PAUSED) ui.pause.classList.remove('active');
  if (state === GAME_STATE.UPGRADE) ui.upgrade.classList.remove('active');
  state = GAME_STATE.SHOP;
  ui.shop.classList.add('active');
  renderShop();
}

function closeShop() {
  if (state !== GAME_STATE.SHOP) return;
  ui.shop.classList.remove('active');
  state = shopReturnState;
  applyWeaponVisual();
  if (state === GAME_STATE.DEAD) ui.gameover.classList.add('active');
  else if (state === GAME_STATE.PAUSED) ui.pause.classList.add('active');
  else if (state === GAME_STATE.UPGRADE) ui.upgrade.classList.add('active');
  else if (state === GAME_STATE.PLAYING) requestPointerLock();
  else ui.menu.classList.add('active');
}

function buyEquipment(id) {
  if (state !== GAME_STATE.SHOP) return;
  const item = META_EQUIPMENT.find((definition) => definition.id === id);
  if (!item) return;
  if (item.classId !== 'shared' && item.classId !== equippedClass) return;
  const level = getEquipmentLevel(id);
  if (level >= item.maxLevel) return;
  const cost = getEquipmentCost(item, level + 1);
  if (credits < cost) return;

  credits -= cost;
  ownedEquipment[id] = level + 1;
  saveProfile();
  updateCreditsUI();
  renderShop();
  updateHUD();
  audio.purchase();
}

// Valeurs par niveau des ameliorations de vague.
//
// Le changement le plus important de cet equilibrage : ces bonus sont
// ADDITIFS en espace de niveau. Avant, damage x1.32 et fireRate x1.24 a chaque
// niveau donnaient 1,32^6 x 1,24^6 = x32 de puissance apres 12 choix, ce qui
// rendait la montee triviale puis la fin injouable. Ici 6 niveaux de degats
// donnent +78 % et 6 niveaux de cadence +66 %.
const UPGRADE_VALUES = {
  damagePer: 0.13,
  fireRatePer: 0.11,
  armorPer: 28,
  speedPer: 0.06,
  regenPer: 1.2,
  reductionPer: 0.15,
  reductionCap: 0.68,
  magazinePer: 8,
  reloadPer: 0.11,
  reloadFloor: 0.45,
  killHealPer: 5,
  executionPer: 0.35,
  poiseHealthPer: 18,
  poiseRegenPer: 0.5,
  veilIFramePer: 0.05,
  focusPer: 0.35,
  reachPer: 0.35,
  reachArcPer: 0.06
};

// Recalcule les statistiques derivees des ameliorations. Appele apres chaque
// choix ET au reset, pour que la valeur soit toujours derivable de la base.
function applyUpgradeStats() {
  const permanent = getPermanentStats();
  const upgrades = player.upgrades;
  const isAssassin = player.classId === 'assassin';
  const damageKey = isAssassin ? 'shadowDamage' : 'damage';
  const rateKey = isAssassin ? 'shadowFlurry' : 'fireRate';

  const damageScale = (1 + UPGRADE_VALUES.damagePer * (upgrades[damageKey] || 0)) * permanent.damageMultiplier;
  const rateScale = (1 + UPGRADE_VALUES.fireRatePer * (upgrades[rateKey] || 0)) * permanent.fireRateMultiplier;

  player.damage = player.baseDamage * damageScale;
  player.fireRate = player.baseFireRate * rateScale;
  player.maxHealth = player.baseMaxHealth
    + UPGRADE_VALUES.armorPer * (upgrades.armor || 0)
    + UPGRADE_VALUES.poiseHealthPer * (upgrades.shadowPoise || 0);
  player.health = Math.min(player.maxHealth, player.health);
  player.speed = player.baseSpeed * (1 + UPGRADE_VALUES.speedPer * (upgrades.speed || 0)) * permanent.speedMultiplier;
  player.regen = permanent.regen
    + UPGRADE_VALUES.regenPer * (upgrades.repair || 0)
    + UPGRADE_VALUES.poiseRegenPer * (upgrades.shadowPoise || 0);
  player.damageReduction = Math.min(
    UPGRADE_VALUES.reductionCap,
    UPGRADE_VALUES.reductionPer * (upgrades.stabilize || 0) + permanent.damageReduction
  );
  player.magazineSize = player.baseMagazine + UPGRADE_VALUES.magazinePer * (upgrades.magazine || 0);
  player.reloadTime = Math.max(
    UPGRADE_VALUES.reloadFloor,
    player.baseReloadTime * (1 - UPGRADE_VALUES.reloadPer * (upgrades.reload || 0)) * permanent.reloadMultiplier
  );
  player.pierce = player.basePierce + (upgrades.pierce || 0);
  player.killHeal = UPGRADE_VALUES.killHealPer * (upgrades.shadowBlood || 0) + permanent.lifesteal;
  player.executionBonus = 1 + UPGRADE_VALUES.executionPer * (upgrades.shadowExecution || 0);
  player.dashCooldownDuration = Math.max(1.1, player.baseDashCooldown * (1 - 0.09 * (upgrades.shadowVeil || 0)));
  player.dashInvulnerability = 0.22 + UPGRADE_VALUES.veilIFramePer * (upgrades.shadowVeil || 0);
  player.headshotBonus = UPGRADE_VALUES.focusPer * (upgrades.focus || 0);
  player.weaponRange = player.baseWeaponRange + UPGRADE_VALUES.reachPer * (upgrades.shadowReach || 0);
  player.slashArc = Math.min(0.95, player.baseSlashArc + UPGRADE_VALUES.reachArcPer * (upgrades.shadowReach || 0));
}

function resetStats() {
  const permanent = getPermanentStats();
  const classDefinition = getPlayerClassDefinition();
  const weaponDefinition = getWeaponDefinition(equippedWeapon);
  const isAssassin = classDefinition.id === 'assassin';
  const classStats = classDefinition.stats;
  // Une arme de l'autre classe n'est pas equipable : on retombe sur celle de
  // la classe. L'Assassin peut porter une arme 'ray' (shuriken), donc c'est
  // le fireMode de l'arme qui decide des munitions, pas la classe.
  const effectiveWeapon = resolveWeaponForClass(weaponDefinition.id, classDefinition.id);
  const isSlash = effectiveWeapon.fireMode === 'slash';
  player.classId = classDefinition.id;
  player.weaponId = effectiveWeapon.id;
  player.abilityId = equippedAbility && getAbilityDefinition(equippedAbility)?.classId === classDefinition.id
    ? equippedAbility
    : '';
  Object.assign(player, {
    baseMaxHealth: classStats.health + permanent.maxHealth,
    baseSpeed: classStats.speed,
    health: classStats.health + permanent.maxHealth,
    maxHealth: classStats.health + permanent.maxHealth,
    speed: classStats.speed,
    baseDamage: isSlash ? classStats.slashDamage : effectiveWeapon.damage,
    baseFireRate: isSlash ? classStats.slashRate : effectiveWeapon.fireRate,
    baseMagazine: isSlash ? 0 : effectiveWeapon.magazine + permanent.magazine,
    baseReloadTime: isSlash ? 0 : effectiveWeapon.reload,
    basePierce: isSlash ? 0 : effectiveWeapon.pierce + permanent.pierce,
    baseDashCooldown: 2.6,
    baseWeaponRange: isSlash ? (effectiveWeapon.slashRange || classStats.slashRange) : effectiveWeapon.range,
    baseSlashArc: isSlash ? (effectiveWeapon.slashArc ?? 0.34) : 0,
    headshotBonus: 0,
    dashInvulnerability: 0.22,
    weaponRange: isSlash ? (effectiveWeapon.slashRange || classStats.slashRange) : effectiveWeapon.range,
    weaponPellets: isSlash ? 1 : effectiveWeapon.pellets,
    weaponSpread: isSlash ? 0 : effectiveWeapon.spread,
    abilityCooldown: 0,
    abilityTimer: 0,
    abilityDamageBonus: 0,
    abilityKillHeal: 0,
    vanishTimer: 0,
    critPending: false,
    overdriveTimer: 0,
    magazineSize: isSlash ? 0 : effectiveWeapon.magazine + permanent.magazine,
    ammo: isSlash ? 0 : effectiveWeapon.magazine + permanent.magazine,
    reloadTime: isSlash ? 0 : effectiveWeapon.reload * permanent.reloadMultiplier,
    reloadRemaining: 0,
    fireCooldown: 0,
    dashCooldown: 0,
    dashCooldownDuration: 2.6,
    dashTimer: 0,
    slashTimer: 0,
    slashTargets: isSlash ? (effectiveWeapon.slashTargets || classStats.slashTargets) : 0,
    slashArc: isSlash ? (effectiveWeapon.slashArc ?? 0.34) : 0,
    dashDamage: isSlash ? (effectiveWeapon.dashDamage || 0) : 0,
    killHeal: 0,
    executionBonus: 1,
    regen: permanent.regen,
    damageReduction: permanent.damageReduction,
    pierce: isSlash ? 0 : effectiveWeapon.pierce + permanent.pierce,
    recoil: 0,
    shake: 0,
    invulnerable: 0,
    bobTime: 0
  });
  applyUpgradeStats();
  player.health = player.maxHealth;
  Object.keys(player.upgrades).forEach((key) => { player.upgrades[key] = 0; });
  runTime = 0;
  shotsFired = 0;
  shotsHit = 0;
  headshots = 0;
  damageTaken = 0;
  abilityMessage = '';
  abilityMessageTimer = 0;
  lastReward = null;
  player.position.set(0, CONFIG.playerEyeHeight, 10);
  player.yaw = 0;
  player.pitch = 0;
  player.velocity.set(0, 0, 0);
}

function disposeEffect(object) {
  if (!object) return;
  if (object.geometry) object.geometry.dispose();
  if (object.material) {
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => material.dispose());
  }
}

function clearDynamicObjects() {
  enemies.splice(0).forEach((enemy) => {
    scene.remove(enemy.root);
    disposeEnemy(enemy);
  });
  enemyTargets.length = 0;
  syncRaycastTargets();
  navTimer = 0;
  // scene.remove() ne libÃ¨re rien : sans dispose(), chaque partie quittÃ©e
  // laisse ses gÃ©omÃ©tries et matÃ©riaux dans les buffers GPU.
  particles.splice(0).forEach((particle) => {
    scene.remove(particle.mesh);
    releaseDebrisMaterial(particle.mesh.material);
  });
  tracers.splice(0).forEach((tracer) => {
    scene.remove(tracer.line);
    disposeEffect(tracer.line);
  });
  ripples.splice(0).forEach((ripple) => {
    scene.remove(ripple.mesh);
    disposeEffect(ripple.mesh);
  });
  slashEffects.splice(0).forEach((effect) => {
    scene.remove(effect.mesh);
    disposeEffect(effect.mesh);
  });
  dashTrails.splice(0).forEach((effect) => {
    scene.remove(effect.mesh);
    disposeEffect(effect.mesh);
  });
}

function resetCamera() {
  camera.position.copy(player.position);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}

function makeGridTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext('2d');
  context.fillStyle = '#61757e';
  context.fillRect(0, 0, 512, 512);
  context.strokeStyle = 'rgba(0, 245, 255, 0.22)';
  context.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, 512);
    context.stroke();
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(512, i);
    context.stroke();
  }
  context.strokeStyle = 'rgba(0, 245, 255, 0.42)';
  context.lineWidth = 4;
  context.strokeRect(4, 4, 504, 504);
  for (let i = 0; i < 70; i += 1) {
    context.fillStyle = `rgba(190, 245, 250, ${0.025 + Math.random() * 0.055})`;
    context.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 35, Math.random() * 3);
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeEnvironmentTexture(map) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 256;
  textureCanvas.height = 128;
  const context = textureCanvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 128);
  const sky = new THREE.Color(map.hemisphereSky);
  const ground = new THREE.Color(map.hemisphereGround);
  gradient.addColorStop(0, `#${sky.clone().multiplyScalar(0.8).getHexString()}`);
  gradient.addColorStop(0.46, `#${new THREE.Color(map.background).lerp(sky, 0.2).getHexString()}`);
  gradient.addColorStop(0.58, `#${new THREE.Color(map.background).getHexString()}`);
  gradient.addColorStop(1, `#${ground.clone().multiplyScalar(0.7).getHexString()}`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 128);

  const lightStrips = [
    { x: 42, width: 24, color: map.wallEdge, opacity: 0.85 },
    { x: 142, width: 34, color: map.keyLight, opacity: 0.72 },
    { x: 218, width: 18, color: map.alternateEdge, opacity: 0.62 }
  ];
  lightStrips.forEach((strip) => {
    const stripGradient = context.createLinearGradient(strip.x, 0, strip.x + strip.width, 0);
    const color = new THREE.Color(strip.color);
    stripGradient.addColorStop(0, 'rgba(0,0,0,0)');
    stripGradient.addColorStop(0.5, `#${color.getHexString()}`);
    stripGradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.globalAlpha = strip.opacity;
    context.fillStyle = stripGradient;
    context.fillRect(strip.x, 28, strip.width, 34);
  });
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGlowTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 128;
  textureCanvas.height = 128;
  const context = textureCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.12, 'rgba(255,255,255,.95)');
  gradient.addColorStop(0.35, 'rgba(120,245,255,.55)');
  gradient.addColorStop(1, 'rgba(0,180,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createEnvironment() {
  const map = MAP_DEFINITIONS[currentMapIndex];
  scene.background = new THREE.Color(map.background);
  scene.fog = new THREE.FogExp2(map.fogColor, map.fogDensity);

  const environmentSource = makeEnvironmentTexture(map);
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  environmentRenderTarget = pmremGenerator.fromEquirectangular(environmentSource);
  scene.environment = environmentRenderTarget.texture;
  scene.environmentIntensity = 0.42;
  environmentSource.dispose();
  pmremGenerator.dispose();

  const hemisphere = new THREE.HemisphereLight(map.hemisphereSky, map.hemisphereGround, 1.65);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(map.keyLight, 2.65);
  keyLight.position.set(10, 28, 12);
  keyLight.castShadow = PERFORMANCE_PROFILE.shadows;
  keyLight.shadow.mapSize.set(PERFORMANCE_PROFILE.shadowMapSize, PERFORMANCE_PROFILE.shadowMapSize);
  keyLight.shadow.bias = -0.00015;
  keyLight.shadow.normalBias = 0.025;
  keyLight.shadow.camera.left = -28;
  keyLight.shadow.camera.right = 28;
  keyLight.shadow.camera.top = 28;
  keyLight.shadow.camera.bottom = -28;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 70;
  scene.add(keyLight);

  map.lights.forEach((light) => {
    const pointLight = new THREE.PointLight(light.color, light.intensity, light.distance, 2);
    pointLight.position.set(light.x, light.y, light.z);
    scene.add(pointLight);
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: map.floorColor,
    map: makeGridTexture(),
    roughness: 0.68,
    metalness: 0.42
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.arenaSize, CONFIG.arenaSize), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = PERFORMANCE_PROFILE.shadows;
  scene.add(floor);

  const underfloor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshBasicMaterial({ color: 0x030b11, transparent: true, opacity: 0.55 })
  );
  underfloor.rotation.x = -Math.PI / 2;
  underfloor.position.y = -0.04;
  scene.add(underfloor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: map.wallColor, roughness: 0.5, metalness: 0.62 });
  const wallEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b1b24,
    emissive: map.wallEdge,
    emissiveIntensity: 1.8,
    roughness: 0.35,
    metalness: 0.6
  });
  const orangeEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d0b06,
    emissive: map.alternateEdge,
    emissiveIntensity: 1.4,
    roughness: 0.4,
    metalness: 0.55
  });

  function addWall(x, z, width, depth, edgeMaterial = wallEdgeMaterial) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, 5.4, depth), wallMaterial);
    wall.position.set(x, 2.7, z);
    wall.castShadow = PERFORMANCE_PROFILE.shadows;
    wall.receiveShadow = PERFORMANCE_PROFILE.shadows;
    wall.userData.solid = true;
    scene.add(wall);
    arenaTargets.push(wall);

    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(width > depth ? width * 0.94 : 0.09, 0.09, depth > width ? depth * 0.94 : 0.09),
      edgeMaterial
    );
    edge.position.set(x, 2.5, z + (depth < width ? 0 : 0));
    scene.add(edge);
    obstacles.push({ x, z, width, depth, type: 'rect' });
  }

  addWall(0, -22.6, 46, 1.6);
  addWall(0, 22.6, 46, 1.6);
  addWall(-22.6, 0, 1.6, 46, orangeEdgeMaterial);
  addWall(22.6, 0, 1.6, 46, orangeEdgeMaterial);

  function addCover(x, z, width, depth, height, accent = 0x00eaff) {
    const material = new THREE.MeshStandardMaterial({ color: 0x162833, roughness: 0.48, metalness: 0.6 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    block.position.set(x, height / 2, z);
    block.castShadow = PERFORMANCE_PROFILE.shadows;
    block.receiveShadow = PERFORMANCE_PROFILE.shadows;
    block.userData.solid = true;
    scene.add(block);
    arenaTargets.push(block);
    obstacles.push({ x, z, width, depth, type: 'rect' });

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x03080a,
      emissive: accent,
      emissiveIntensity: 1.7
    });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.055, depth * 0.86), edgeMaterial);
    edge.position.set(x, height + 0.04, z);
    scene.add(edge);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(0.45, width * 0.45), Math.max(0.22, height * 0.25)),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    panel.position.set(x, height * 0.56, z + (depth > width ? 0.01 : depth / 2 + 0.01));
    scene.add(panel);
  }

  map.covers.forEach(([x, z, width, depth, height, accent]) => {
    addCover(x, z, width, depth, height, accent);
  });

  const pillarMaterial = new THREE.MeshStandardMaterial({ color: map.wallColor, roughness: 0.42, metalness: 0.64 });
  map.pillars.forEach(([x, z], index) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 5.8, 8), pillarMaterial);
    pillar.position.set(x, 2.9, z);
    pillar.castShadow = PERFORMANCE_PROFILE.shadows;
    pillar.receiveShadow = PERFORMANCE_PROFILE.shadows;
    pillar.userData.solid = true;
    scene.add(pillar);
    arenaTargets.push(pillar);
    obstacles.push({ x, z, radius: 1.35, type: 'circle' });

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(1.08, 0.075, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x02080a, emissive: index % 2 ? map.alternateEdge : map.wallEdge, emissiveIntensity: 2 })
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(x, 4.5, z);
    scene.add(collar);
    animatedRings.push({ mesh: collar, speed: index % 2 ? -0.25 : 0.35, axis: 'y' });
  });

  function addSpawnPad(x, z, rotation) {
    const pad = new THREE.Group();
    pad.position.set(x, 0.025, z);
    pad.rotation.y = rotation;
    const base = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 6),
      new THREE.MeshBasicMaterial({ color: 0x061017, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    base.rotation.x = -Math.PI / 2;
    pad.add(base);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.055, 6, 6),
      new THREE.MeshBasicMaterial({ color: map.coreColor, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.035;
    pad.add(ring);
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.025, 5, 6),
      new THREE.MeshBasicMaterial({ color: map.coreAccent, transparent: true, opacity: 0.8 })
    );
    inner.rotation.x = Math.PI / 2;
    inner.position.y = 0.045;
    pad.add(inner);
    scene.add(pad);
    spawnPads.push(new THREE.Vector3(x, 0, z));
    animatedRings.push({ mesh: ring, speed: 0.4, axis: 'z' });
    animatedRings.push({ mesh: inner, speed: -0.65, axis: 'y' });
  }

  map.spawnPads.forEach(([x, z, rotation]) => addSpawnPad(x, z, rotation));

  const core = new THREE.Group();
  const coreBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.8, 0.65, 12),
    new THREE.MeshStandardMaterial({ color: map.wallColor, metalness: 0.6, roughness: 0.42 })
  );
  coreBase.position.y = 0.33;
  coreBase.castShadow = PERFORMANCE_PROFILE.shadows;
  coreBase.receiveShadow = PERFORMANCE_PROFILE.shadows;
  core.add(coreBase);
  const energyCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.85, 0),
    new THREE.MeshStandardMaterial({ color: map.coreColor, emissive: map.coreColor, emissiveIntensity: 3, roughness: 0.15 })
  );
  energyCore.position.y = 2.1;
  core.add(energyCore);
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.45 + i * 0.18, 0.035, 6, 36),
      new THREE.MeshBasicMaterial({ color: i === 1 ? map.coreAccent : map.coreColor, transparent: true, opacity: 0.65 })
    );
    ring.position.y = 1.15 + i * 0.65;
    ring.rotation.set(Math.PI / 2 + i * 0.36, i * 0.5, 0);
    core.add(ring);
    animatedRings.push({ mesh: ring, speed: (i % 2 ? -1 : 1) * (0.16 + i * 0.08), axis: 'local' });
  }
  core.position.set(map.core[0], 0, map.core[1]);
  scene.add(core);
  obstacles.push({ x: map.core[0], z: map.core[1], radius: 2.5, type: 'circle' });
  coreBase.userData.solid = true;
  energyCore.userData.solid = true;
  arenaTargets.push(coreBase, energyCore);
  animatedRings.push({ mesh: energyCore, speed: 0.45, axis: 'y' });

  const starPositions = new Float32Array(900);
  for (let i = 0; i < starPositions.length; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 150;
    starPositions[i + 1] = 25 + Math.random() * 85;
    starPositions[i + 2] = (Math.random() - 0.5) * 150;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xa8f4ff,
      size: 0.09,
      transparent: true,
      opacity: 0.78,
      sizeAttenuation: true,
      fog: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  scene.add(stars);
  animatedRings.push({ mesh: stars, speed: 0.001, axis: 'menu' });
}

// Courbe une lame deja extrudee : decale chaque sommet en X selon sa
// position le long de Z, pour obtenir le sori d'un sabre. Three.js n'a pas
// de modificateur de courbure, on applique donc la deformation directement.
// Courbe une lame deja extrudee : decale chaque sommet en X selon sa
// position le long de Z, pour obtenir le sori d'un sabre. Three.js n'a pas
// de modificateur de courbure, on applique donc la deformation directement.
function curveBlade(geometry, length, amount) {
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const z = positions.getZ(index);
    // 0 a la garde, 1 a la pointe.
    const t = Math.min(1, Math.max(0, -z / length));
    positions.setX(index, positions.getX(index) + amount * t * t);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createAssassinWeapon() {
  const group = new THREE.Group();
  group.position.set(0, -0.44, -0.72);
  group.rotation.set(-0.02, 0, 0);
  group.visible = false;

  // Sur la maquette de reference, le corps de la lame est SOMBRE et
  // metallique : seuls le tranchant et une nervure emettent. Une lame
  // entierement emissive donnerait un sabre en plastique lumineux.
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x14161f, roughness: 0.3, metalness: 0.95 });
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x1d2230, roughness: 0.45, metalness: 0.8 });
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x1b1d2b, roughness: 0.22, metalness: 0.9 });
  const purpleMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1450,
    emissive: 0xa855ff,
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.6
  });
  const cyanMaterial = new THREE.MeshStandardMaterial({
    color: 0x06252b,
    emissive: 0x00f5ff,
    emissiveIntensity: 2.6,
    roughness: 0.2,
    metalness: 0.5
  });
  // La tranche est le seul point vraiment lumineux.
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd2ff, toneMapped: false });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x9b5cff,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  glowMaterial.toneMapped = false;
  const nodeMaterial = new THREE.MeshBasicMaterial({
    color: 0xf0d7ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  nodeMaterial.toneMapped = false;

  const BLADE_LENGTH = 1.34;
  const BLADE_CURVE = 0.29;

  // Profil de lame : dos epais cote garde, tranche qui s'affine jusqu'a la
  // pointe. La section est etroite pour garder une silhouette de sabre.
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.052, -0.06);
  bladeShape.lineTo(0.046, -0.72);
  bladeShape.lineTo(0.03, -1.12);
  bladeShape.lineTo(0.008, -BLADE_LENGTH);
  bladeShape.lineTo(-0.006, -1.1);
  bladeShape.lineTo(-0.014, -0.7);
  bladeShape.lineTo(-0.016, -0.05);
  bladeShape.closePath();
  const bladeGeometry = curveBlade(
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.036,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.008,
      bevelThickness: 0.008
    }),
    BLADE_LENGTH,
    BLADE_CURVE
  );
  bladeGeometry.rotateX(Math.PI / 2);
  bladeGeometry.translate(0, -0.018, 0);

  // Trait de tranche lumineux. Il doit depasser le corps de lame, sinon il
  // est masque par le z-buffer : d'ou le decalage de -0.016 sur X.
  const edgeShape = new THREE.Shape();
  edgeShape.moveTo(0, 0);
  edgeShape.lineTo(0.016, -0.05);
  edgeShape.lineTo(0.009, -1.1);
  edgeShape.lineTo(0.003, -BLADE_LENGTH * 0.985);
  edgeShape.lineTo(-0.004, -1.08);
  edgeShape.lineTo(-0.004, -0.04);
  edgeShape.closePath();
  const edgeGeometry = curveBlade(
    new THREE.ExtrudeGeometry(edgeShape, {
      depth: 0.042,
      steps: 1,
      bevelEnabled: false
    }),
    BLADE_LENGTH,
    BLADE_CURVE
  );
  edgeGeometry.rotateX(Math.PI / 2);
  edgeGeometry.translate(0, -0.021, 0);

  // Nervure violette en retrait du dos : la seconde ligne lumineuse de la
  // maquette, elle donne de la profondeur sans noyer la lame.
  const accentShape = new THREE.Shape();
  accentShape.moveTo(0, 0);
  accentShape.lineTo(0.008, -0.05);
  accentShape.lineTo(0.006, -1.06);
  accentShape.lineTo(0.002, -1.2);
  accentShape.lineTo(-0.003, -1.05);
  accentShape.lineTo(-0.003, -0.04);
  accentShape.closePath();
  const accentGeometry = curveBlade(
    new THREE.ExtrudeGeometry(accentShape, {
      depth: 0.042,
      steps: 1,
      bevelEnabled: false
    }),
    BLADE_LENGTH,
    BLADE_CURVE
  );
  accentGeometry.rotateX(Math.PI / 2);
  accentGeometry.translate(0.024, -0.021, 0);

  const handleGeometry = new THREE.CylinderGeometry(0.036, 0.042, 0.36, 8);
  const gripRingGeometry = new THREE.TorusGeometry(0.044, 0.008, 5, 12);
  const nodeGeometry = new THREE.SphereGeometry(0.016, 6, 4);
  // Tsuba : barre centrale et deux ailes balayees vers l'arriere, dans la
  // meme epaisseur que la lame. Des cones vifs donnaient des pointes
  // blanches qui cassaient la lecture de la silhouette.
  const guardWingGeometry = new THREE.BoxGeometry(0.135, 0.026, 0.05);

  function createSaber(side) {
    const saber = new THREE.Group();
    saber.position.set(side * 0.33, side < 0 ? 0.03 : -0.03, -0.1);
    saber.rotation.set(-0.1, side * 0.2, side * 0.1);

    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.z = 0.02;
    blade.renderOrder = 2;
    saber.add(blade);

    const bladeGlow = new THREE.Mesh(bladeGeometry, glowMaterial);
    bladeGlow.position.z = 0.02;
    bladeGlow.scale.set(1.2, 1.06, 1.02);
    bladeGlow.renderOrder = 1;
    saber.add(bladeGlow);

    const accent = new THREE.Mesh(accentGeometry, purpleMaterial);
    accent.position.x = 0.004;
    accent.renderOrder = 3;
    saber.add(accent);

    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.x = -0.016;
    edge.renderOrder = 4;
    saber.add(edge);

    // Noeuds d'energie le long du dos, sur la partie la plus courbe.
    const energyNodes = [-0.3, -0.66, -1.02].map((z) => {
      const t = Math.min(1, -z / BLADE_LENGTH);
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.set(BLADE_CURVE * t * t + 0.03, 0.014, z);
      node.userData.baseScale = 1;
      saber.add(node);
      return node;
    });

    const guardBar = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.038, 0.062), darkMaterial);
    guardBar.position.z = 0.048;
    saber.add(guardBar);
    [-1, 1].forEach((direction) => {
      const wing = new THREE.Mesh(guardWingGeometry, darkMaterial);
      wing.position.set(direction * 0.1, 0.004, 0.052);
      wing.rotation.z = direction * -0.3;
      wing.rotation.y = direction * 0.26;
      saber.add(wing);
      // Lisere lumineux sur le dessus de chaque aile.
      const wingLight = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.007, 0.012), cyanMaterial);
      wingLight.position.set(direction * 0.1, 0.02, 0.052);
      wingLight.rotation.z = direction * -0.3;
      wingLight.rotation.y = direction * 0.26;
      saber.add(wingLight);
    });
    const guardGlow = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.006, 5, 14), cyanMaterial);
    guardGlow.position.z = 0.048;
    saber.add(guardGlow);

    // Poignee minimaliste, deux anneaux et un pommeau conique.
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.26;
    saber.add(handle);
    [0.17, 0.3].forEach((z) => {
      const gripRing = new THREE.Mesh(gripRingGeometry, darkMaterial);
      gripRing.position.z = z;
      saber.add(gripRing);
    });
    const pommel = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 6), darkMaterial);
    pommel.rotation.x = -Math.PI / 2;
    pommel.position.z = 0.47;
    saber.add(pommel);
    const pommelLight = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), cyanMaterial);
    pommelLight.position.z = 0.51;
    saber.add(pommelLight);

    // Main faktice, pour que le sabre paraisse tenu.
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.3), darkMaterial);
    arm.position.set(0, -0.02, 0.62);
    saber.add(arm);
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.05, 0.11), handleMaterial);
    knuckle.position.set(0, 0.055, 0.53);
    saber.add(knuckle);
    const knuckleLight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.008, 0.02), cyanMaterial);
    knuckleLight.position.set(0, 0.081, 0.53);
    saber.add(knuckleLight);

    saber.userData.energyNodes = energyNodes;
    return saber;
  }

  const leftSaber = createSaber(-1);
  const rightSaber = createSaber(1);
  group.add(leftSaber, rightSaber);
  group.userData.leftSaber = leftSaber;
  group.userData.rightSaber = rightSaber;
  group.userData.energyMaterial = purpleMaterial;
  group.userData.accentMaterial = cyanMaterial;
  group.userData.glowMaterial = glowMaterial;
  group.userData.edgeMaterial = edgeMaterial;
  group.userData.energyNodes = [...leftSaber.userData.energyNodes, ...rightSaber.userData.energyNodes];
  camera.add(group);
  return group;
}


function createWeapon() {
  const group = new THREE.Group();
  group.position.set(0.48, -0.42, -0.78);
  group.rotation.set(-0.025, -0.06, -0.015);
  group.visible = false;

  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x101b22, roughness: 0.3, metalness: 0.92 });
  const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x030609, roughness: 0.48, metalness: 0.72 });
  const cyanMaterial = new THREE.MeshStandardMaterial({ color: 0x06252b, emissive: 0x00eaff, emissiveIntensity: 2.8, roughness: 0.2, metalness: 0.55 });
  const orangeMaterial = new THREE.MeshStandardMaterial({ color: 0x2a0b04, emissive: 0xff4d22, emissiveIntensity: 1.8, roughness: 0.25, metalness: 0.6 });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.19, 0.52), darkMaterial);
  receiver.position.set(0, 0.03, -0.12);
  group.add(receiver);

  const upperRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.065, 0.46), blackMaterial);
  upperRail.position.set(0, 0.16, -0.14);
  group.add(upperRail);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.058, 0.55, 10), blackMaterial);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.045, -0.57);
  group.add(barrel);

  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.078, 0.28, 8), darkMaterial);
  shroud.rotation.x = Math.PI / 2;
  shroud.position.set(0, 0.045, -0.42);
  group.add(shroud);

  for (let i = 0; i < 4; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.035), cyanMaterial);
    fin.position.set(0, 0.12, -0.29 - i * 0.105);
    group.add(fin);
  }

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.33, 0.16), blackMaterial);
  grip.position.set(0, -0.2, 0.06);
  grip.rotation.x = -0.28;
  group.add(grip);

  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.18), darkMaterial);
  magazine.position.set(0, -0.21, -0.13);
  magazine.rotation.x = 0.12;
  group.add(magazine);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.33), darkMaterial);
  stock.position.set(0, 0, 0.27);
  group.add(stock);

  const energyCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), cyanMaterial);
  energyCore.position.set(0.13, 0.035, -0.08);
  energyCore.rotation.z = Math.PI / 4;
  group.add(energyCore);

  const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.055, 0.27), orangeMaterial);
  sideRail.position.set(0.135, -0.025, 0.02);
  group.add(sideRail);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.035), blackMaterial);
  frontSight.position.set(0, 0.21, -0.7);
  group.add(frontSight);

  muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0x9cffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  muzzleFlash.position.set(0, 0.045, -0.89);
  muzzleFlash.scale.set(0.42, 0.42, 0.42);
  group.add(muzzleFlash);

  muzzleLight = new THREE.PointLight(0x4cf7ff, 0, 2.8, 2);
  muzzleLight.position.copy(muzzleFlash.position);
  group.add(muzzleLight);

  group.userData.energyMaterial = cyanMaterial;
  group.userData.accentMaterial = orangeMaterial;
  group.userData.muzzleFlash = muzzleFlash;
  group.userData.muzzleLight = muzzleLight;
  camera.add(group);
  return group;
}

function applyWeaponVisual(target = weapon) {
  if (!target) return;
  const definition = getWeaponDefinition(player.weaponId);
  const shouldShow = state === GAME_STATE.PLAYING || state === GAME_STATE.PAUSED;
  // C'est le fireMode de l'arme qui decide de ce qui est en main, pas la
  // classe : l'Assassin equipe du shuriken tient un armeur, pas des sabres.
  const showSabers = definition.fireMode === 'slash';
  if (weapon) weapon.visible = shouldShow && !showSabers;
  if (assassinWeapon) assassinWeapon.visible = shouldShow && showSabers;

  if (showSabers) {
    if (assassinWeapon) {
      assassinWeapon.userData.energyMaterial?.color.setHex(definition.energyColor);
      assassinWeapon.userData.energyMaterial?.emissive.setHex(definition.energyColor);
      assassinWeapon.userData.accentMaterial?.color.setHex(definition.accentColor);
      assassinWeapon.userData.accentMaterial?.emissive.setHex(definition.accentColor);
    }
    return;
  }
  target.scale.setScalar(definition.visualScale);
  target.userData.energyMaterial?.color.setHex(definition.energyColor);
  target.userData.energyMaterial?.emissive.setHex(definition.energyColor);
  target.userData.accentMaterial?.color.setHex(definition.accentColor);
  target.userData.accentMaterial?.emissive.setHex(definition.accentColor);
  target.userData.muzzleFlash?.material.color.setHex(definition.tracerColor);
  target.userData.muzzleLight?.color.setHex(definition.tracerColor);
}

function createEnemyMaterials(template) {
  const color = template.color;
  const armorColor = template.armorColor || 0x1b2932;
  const accentColor = template.accentColor || color;
  const bodyColor = template.armorColor
    ? new THREE.Color(armorColor).lerp(new THREE.Color(color), 0.3)
    : new THREE.Color(color).multiplyScalar(0.5);
  const body = new THREE.MeshStandardMaterial({
    color: bodyColor,
    emissive: new THREE.Color(color).multiplyScalar(0.2),
    emissiveIntensity: 0.5,
    roughness: 0.58,
    metalness: 0.28,
    flatShading: true
  });
  const armor = new THREE.MeshStandardMaterial({
    color: armorColor,
    emissive: color,
    emissiveIntensity: 0.18,
    roughness: 0.48,
    metalness: 0.68,
    flatShading: true
  });
  const glow = new THREE.MeshBasicMaterial({ color: accentColor });
  const eye = new THREE.MeshBasicMaterial({ color: 0xffffff });
  return { body, armor, glow, eye, accentColor };
}

function makeHealthBar(color) {
  const group = new THREE.Group();
  const background = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x101820, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }));
  background.scale.set(1.05, 0.1, 1);
  background.renderOrder = 20;
  group.add(background);

  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color, depthTest: false, depthWrite: false }));
  fill.center.set(0, 0.5);
  fill.scale.set(0.98, 0.055, 1);
  fill.position.x = -0.49;
  fill.renderOrder = 21;
  group.add(fill);
  group.position.y = 1.75;
  return { group, fill };
}

function createEnemy(typeKey, level) {
  const map = MAP_DEFINITIONS[currentMapIndex];
  const typeSet = ENEMY_TYPE_SETS[map.enemyTypeSet] || ENEMY_TYPES;
  const template = typeSet[typeKey];
  const levelScale = WAVE_CURVES.enemyHealth(level);
  const elite = template.elite && level % 5 === 0;
  const root = new THREE.Group();
  const materials = createEnemyMaterials(template);
  const hitMeshes = [];
  const legPivots = [];
  const isAlpha = typeKey === 'titan' || typeKey === 'foundryAlpha';
  const isFoundry = map.enemyTypeSet === 'foundry';
  const auraIntensity = isFoundry ? (isAlpha ? 5.2 : 1.65) : (isAlpha ? 4.2 : 1.35);
  const auraRange = isFoundry ? (isAlpha ? 6.2 : 3.6) : (isAlpha ? 5.5 : 3.2);

  const auraLight = new THREE.PointLight(template.color, auraIntensity, auraRange, 2);
  auraLight.position.set(0, 1.15, 0.25);
  auraLight.visible = PERFORMANCE_PROFILE.enemyAuraLights && (isAlpha || elite);
  root.add(auraLight);

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 1), materials.body);
  body.position.y = 0.92;
  body.scale.set(...(template.bodyScale || [1.08, 0.9, 0.82]));
  body.castShadow = PERFORMANCE_PROFILE.shadows;
  root.add(body);
  hitMeshes.push(body);

  const chestPlate = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), materials.armor);
  chestPlate.position.set(0, 0.95, 0.36);
  chestPlate.scale.set(1.05, 0.75, 0.32);
  chestPlate.rotation.x = -0.12;
  root.add(chestPlate);
  hitMeshes.push(chestPlate);

  const headSize = (isAlpha ? 0.56 : 0.39) * (template.headScale || 1);
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(headSize, 0), materials.body);
  head.position.set(0, 1.58, 0.03);
  head.rotation.y = Math.PI / 4;
  head.castShadow = PERFORMANCE_PROFILE.shadows;
  root.add(head);
  hitMeshes.push(head);
  head.userData.headshot = true;

  const eyeGeometry = new THREE.SphereGeometry(isAlpha ? 0.09 : 0.065, 8, 6);
  [-0.15, 0.15].forEach((x) => {
    const eye = new THREE.Mesh(eyeGeometry, materials.eye);
    eye.position.set(x, 1.62, isAlpha ? 0.51 : 0.36);
    root.add(eye);
    hitMeshes.push(eye);
  });

  const spineCount = template.spikeCount || (isAlpha ? 7 : 4);
  for (let i = 0; i < spineCount; i += 1) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 4), materials.glow);
    spike.position.set((i % 2 ? -1 : 1) * 0.47, 0.65 + Math.floor(i / 2) * 0.25, -0.12 - (i % 2) * 0.12);
    spike.rotation.z = (i % 2 ? -1 : 1) * -0.45;
    root.add(spike);
  }

  const fastLegs = typeKey === 'hunter' || typeKey === 'emberStalker';
  const crawlerLegs = typeKey === 'crawler' || typeKey === 'slagCrawler';
  const legRadius = fastLegs ? 0.055 : crawlerLegs ? 0.065 : 0.09;
  const legLength = fastLegs ? 0.62 : 0.75;
  const legGeometry = new THREE.CylinderGeometry(legRadius * 0.75, legRadius, legLength, 5);
  for (let i = 0; i < template.legs; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.45, 0.75 - row * 0.1, row * 0.35 - 0.18);
    const leg = new THREE.Mesh(legGeometry, materials.armor);
    leg.position.y = -legLength / 2;
    leg.rotation.z = side * 0.28;
    leg.castShadow = PERFORMANCE_PROFILE.shadows;
    pivot.add(leg);
    root.add(pivot);
    legPivots.push({ pivot, side, phase: i * Math.PI * 0.5 });
  }

  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(template.radius * 0.9, template.radius, 2.05 * template.scale, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  );
  hitbox.position.y = 1.05 * template.scale;
  root.add(hitbox);
  hitMeshes.push(hitbox);

  const healthBar = makeHealthBar(elite ? 0xff2d85 : template.color);
  healthBar.group.scale.setScalar(Math.max(0.72, template.scale));
  root.add(healthBar.group);

  if (elite) {
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 5, 10), materials.glow);
    crown.position.y = 2.15;
    crown.rotation.x = Math.PI / 2;
    root.add(crown);
  }

  if (map.enemyTypeSet === 'foundry') {
    const shoulderGeometry = new THREE.DodecahedronGeometry(0.22, 0);
    [-0.6, 0.6].forEach((x, index) => {
      const shoulder = new THREE.Mesh(shoulderGeometry, materials.armor);
      shoulder.position.set(x, 1.13 + index * 0.03, 0.03);
      shoulder.scale.set(1.2, 0.58, 0.88);
      shoulder.rotation.z = x < 0 ? -0.28 : 0.28;
      shoulder.castShadow = PERFORMANCE_PROFILE.shadows;
      root.add(shoulder);
    });

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), materials.glow);
    core.position.set(0, 1.06, 0.53);
    core.rotation.z = Math.PI / 4;
    root.add(core);
  }

  const maxHealth = template.hp * levelScale * map.enemyHealthMultiplier;
  const enemy = {
    typeKey,
    template,
    root,
    body,
    head,
    headRadius: headSize * template.scale,
    materials,
    hitMeshes,
    legPivots,
    healthBar: healthBar.fill,
    hp: maxHealth,
    maxHealth,
    speed: template.speed * (0.95 + Math.min(level, 20) * 0.012) * map.enemySpeedMultiplier,
    damage: template.damage * WAVE_CURVES.enemyDamage(level) * map.enemyDamageMultiplier,
    radius: template.radius * template.scale,
    scale: template.scale,
    score: Math.round(template.score * (1 + Math.min(level - 1, 40) * 0.08) * map.scoreMultiplier),
    attackCooldown: 0.25 + Math.random() * 0.5,
    flashTime: 0,
    attackPulse: 0,
    slowTimer: 0,
    slowMultiplier: 1,
    burnTimer: 0,
    burnDamage: 0,
    burnTick: 0,
    seed: Math.random() * Math.PI * 2,
    elite,
    dead: false
  };

  hitMeshes.forEach((mesh) => {
    mesh.userData.enemy = enemy;
  });

  root.scale.setScalar(template.scale);
  scene.add(root);
  return enemy;
}

function disposeEnemy(enemy) {
  enemy.root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => material.dispose());
    }
  });
}

function chooseEnemyType(waveNumber) {
  const map = MAP_DEFINITIONS[currentMapIndex];
  if (map.enemyTypeSet === 'foundry') {
    if (waveNumber >= 5 && waveNumber % 5 === 0 && Math.random() < 0.22) return 'foundryAlpha';
    if (waveNumber >= 3 && Math.random() < 0.38) return 'ironBrute';
    if (waveNumber >= 2 && Math.random() < 0.5) return 'emberStalker';
    return 'slagCrawler';
  }
  if (waveNumber >= 5 && waveNumber % 5 === 0 && Math.random() < 0.18) return 'titan';
  if (waveNumber >= 3 && Math.random() < 0.3) return 'brute';
  if (waveNumber >= 2 && Math.random() < 0.46) return 'hunter';
  return 'crawler';
}

function findSpawnPosition() {
  let chosen = spawnPads[Math.floor(Math.random() * spawnPads.length)];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = spawnPads[Math.floor(Math.random() * spawnPads.length)];
    const dx = candidate.x - player.position.x;
    const dz = candidate.z - player.position.z;
    if (dx * dx + dz * dz > 100) {
      chosen = candidate;
      break;
    }
  }
  return chosen.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5));
}

function spawnEnemy() {
  const position = findSpawnPosition();
  const enemy = createEnemy(chooseEnemyType(wave), wave);
  enemy.root.position.copy(position);
  enemy.root.rotation.y = Math.atan2(player.position.x - position.x, player.position.z - position.z);
  enemies.push(enemy);
  enemyTargets.push(...enemy.hitMeshes);
  syncRaycastTargets();

  const burstColor = enemy.template.color;
  const burst = new THREE.Mesh(
    new THREE.TorusGeometry(0.75 * enemy.scale, 0.05, 5, 24),
    new THREE.MeshBasicMaterial({ color: burstColor, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
  );
  burst.position.copy(position).add(new THREE.Vector3(0, 0.9, 0));
  burst.rotation.x = Math.PI / 2;
  scene.add(burst);
  ripples.push({ mesh: burst, life: 0.5, maxLife: 0.5, startScale: 0.5, endScale: 1.9 });
}

function circleHitsRect(x, z, radius, rect) {
  const halfWidth = rect.width / 2;
  const halfDepth = rect.depth / 2;
  const nearestX = THREE.MathUtils.clamp(x, rect.x - halfWidth, rect.x + halfWidth);
  const nearestZ = THREE.MathUtils.clamp(z, rect.z - halfDepth, rect.z + halfDepth);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

function syncRaycastTargets() {
  raycastTargets.length = 0;
  for (let index = 0; index < arenaTargets.length; index += 1) raycastTargets.push(arenaTargets[index]);
  for (let index = 0; index < enemyTargets.length; index += 1) raycastTargets.push(enemyTargets[index]);
}

function isBlocked(x, z, radius) {
  const limit = CONFIG.arenaSize / 2 - 0.45;
  if (Math.abs(x) > limit || Math.abs(z) > limit) return true;
  // Boucle explicite : obstacles.some(closure) allouait une fermeture a chaque
  // appel, et isBlocked tourne plusieurs centaines de fois par frame.
  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (obstacle.type === 'circle') {
      const dx = x - obstacle.x;
      const dz = z - obstacle.z;
      const reach = radius + obstacle.radius;
      if (dx * dx + dz * dz < reach * reach) return true;
    } else if (circleHitsRect(x, z, radius, obstacle)) {
      return true;
    }
  }
  return false;
}

// Resultat reutilise : getNavIndex est appele pour chaque ennemi a chaque
// frame, et un objet neuf par appel ajouteait ~9 allocations/frame.
// Les deux appelants lisent les valeurs immediatement, l'aliasing est sur.
const navIndexResult = { column: 0, row: 0, index: 0 };

function getNavIndex(x, z) {
  const column = THREE.MathUtils.clamp(Math.floor((x + CONFIG.arenaSize / 2) / NAV_CELL_SIZE), 0, NAV_GRID_SIZE - 1);
  const row = THREE.MathUtils.clamp(Math.floor((z + CONFIG.arenaSize / 2) / NAV_CELL_SIZE), 0, NAV_GRID_SIZE - 1);
  navIndexResult.column = column;
  navIndexResult.row = row;
  navIndexResult.index = row * NAV_GRID_SIZE + column;
  return navIndexResult;
}

function getNavCenter(column, row, target = new THREE.Vector3()) {
  target.set(
    (column + 0.5) * NAV_CELL_SIZE - CONFIG.arenaSize / 2,
    0,
    (row + 0.5) * NAV_CELL_SIZE - CONFIG.arenaSize / 2
  );
  return target;
}

function rebuildFlowField() {
  navWalkable.fill(0);
  navDistance.fill(-1);
  const cellCenters = navCellCenters;
  for (let row = 0; row < NAV_GRID_SIZE; row += 1) {
    for (let column = 0; column < NAV_GRID_SIZE; column += 1) {
      const index = row * NAV_GRID_SIZE + column;
      const center = cellCenters[index];
      center.set((column + 0.5) * NAV_CELL_SIZE - CONFIG.arenaSize / 2, 0, (row + 0.5) * NAV_CELL_SIZE - CONFIG.arenaSize / 2);
      if (!isBlocked(center.x, center.z, 0.78)) navWalkable[index] = 1;
    }
  }

  const playerCell = getNavIndex(player.position.x, player.position.z);
  let start = playerCell.index;
  if (!navWalkable[start]) {
    let bestDistance = Infinity;
    for (let index = 0; index < navWalkable.length; index += 1) {
      if (!navWalkable[index]) continue;
      const center = cellCenters[index];
      const dx = center.x - player.position.x;
      const dz = center.z - player.position.z;
      const distance = dx * dx + dz * dz;
      if (distance < bestDistance) {
        bestDistance = distance;
        start = index;
      }
    }
  }

  let head = 0;
  let tail = 0;
  navQueue[tail++] = start;
  navDistance[start] = 0;
  while (head < tail) {
    const current = navQueue[head++];
    const currentColumn = current % NAV_GRID_SIZE;
    const currentRow = Math.floor(current / NAV_GRID_SIZE);
    for (let directionIndex = 0; directionIndex < NAV_DIRECTIONS.length; directionIndex += 1) {
      const direction = NAV_DIRECTIONS[directionIndex];
      const columnOffset = direction[0];
      const rowOffset = direction[1];
      const column = currentColumn + columnOffset;
      const row = currentRow + rowOffset;
      if (column < 0 || column >= NAV_GRID_SIZE || row < 0 || row >= NAV_GRID_SIZE) continue;
      const next = row * NAV_GRID_SIZE + column;
      if (!navWalkable[next] || navDistance[next] !== -1) continue;
      if (columnOffset !== 0 && rowOffset !== 0) {
        const horizontal = currentRow * NAV_GRID_SIZE + column;
        const vertical = row * NAV_GRID_SIZE + currentColumn;
        if (!navWalkable[horizontal] || !navWalkable[vertical]) continue;
      }
      navDistance[next] = navDistance[current] + 1;
      navQueue[tail++] = next;
    }
  }
}

const flowDirectionTarget = new THREE.Vector3();

function getFlowDirection(position, target = flowDirectionTarget) {
  const currentCell = getNavIndex(position.x, position.z);
  let current = currentCell.index;
  if (!navWalkable[current] || navDistance[current] < 0) {
    // Case courante non marchable (ennemi plus large qu'une maille) : on
    // cherche la cellule marchable la plus proche. navCellCenters est deja
    // pre-alloce, on ne doit surtout pas reconstruire un Vector3 par cellule.
    let nearest = -1;
    let nearestDistance = Infinity;
    for (let index = 0; index < navWalkable.length; index += 1) {
      if (!navWalkable[index] || navDistance[index] < 0) continue;
      const center = navCellCenters[index];
      const dx = center.x - position.x;
      const dz = center.z - position.z;
      const distance = dx * dx + dz * dz;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    }
    if (nearest < 0) return null;
    current = nearest;
  }

  const currentColumn = current % NAV_GRID_SIZE;
  const currentRow = Math.floor(current / NAV_GRID_SIZE);
  const currentDistance = navDistance[current];
  let next = current;
  let nextDistance = currentDistance;
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      const column = currentColumn + columnOffset;
      const row = currentRow + rowOffset;
      if (column < 0 || column >= NAV_GRID_SIZE || row < 0 || row >= NAV_GRID_SIZE) continue;
      const candidate = row * NAV_GRID_SIZE + column;
      if (!navWalkable[candidate] || navDistance[candidate] < 0) continue;
      if (columnOffset !== 0 && rowOffset !== 0) {
        const horizontal = currentRow * NAV_GRID_SIZE + column;
        const vertical = row * NAV_GRID_SIZE + currentColumn;
        if (!navWalkable[horizontal] || !navWalkable[vertical]) continue;
      }
      if (navDistance[candidate] < nextDistance) {
        next = candidate;
        nextDistance = navDistance[candidate];
      }
    }
  }

  const targetCell = getNavCenter(next % NAV_GRID_SIZE, Math.floor(next / NAV_GRID_SIZE), target);
  targetCell.set(targetCell.x - position.x, 0, targetCell.z - position.z);
  return targetCell.lengthSq() > 0.001 ? targetCell.normalize() : null;
}

function moveEntity(position, dx, dz, radius) {
  const nextX = position.x + dx;
  if (!isBlocked(nextX, position.z, radius)) position.x = nextX;
  const nextZ = position.z + dz;
  if (!isBlocked(position.x, nextZ, radius)) position.z = nextZ;
}

function updatePlayer(delta) {
  player.fireCooldown = Math.max(0, player.fireCooldown - delta);
  player.dashCooldown = Math.max(0, player.dashCooldown - delta);
  player.slashTimer = Math.max(0, player.slashTimer - delta);
  if (assassinWeapon && assassinWeapon.visible) {
    const pulse = 0.5 + Math.sin(elapsed * 7) * 0.5;
    assassinWeapon.userData.energyMaterial.emissiveIntensity = 3.6 + pulse * 1.8 + (player.slashTimer > 0 ? 2.4 : 0);
    assassinWeapon.userData.glowMaterial.opacity = 0.14 + pulse * 0.1 + (player.slashTimer > 0 ? 0.12 : 0);
    assassinWeapon.userData.energyNodes.forEach((node, index) => {
      const nodePulse = 0.75 + Math.sin(elapsed * 9 + index * 1.7) * 0.25;
      node.scale.setScalar(nodePulse);
    });
  }
  player.abilityCooldown = Math.max(0, player.abilityCooldown - delta);
  const wasAbilityActive = player.abilityTimer > 0;
  player.abilityTimer = Math.max(0, player.abilityTimer - delta);
  // Les bonus temporaires doivent retomber Ã  zÃ©ro exactement Ã  l'expiration,
  // sinon ils survivraient jusqu'Ã  la prochaine activation.
  if (wasAbilityActive && player.abilityTimer === 0) {
    player.abilityDamageBonus = 0;
    player.abilityKillHeal = 0;
  }
  if (player.vanishTimer > 0) {
    player.vanishTimer = Math.max(0, player.vanishTimer - delta);
    // On masque l'arme en main : c'est le seul signe lisible de l'etat.
    if (player.vanishTimer === 0) applyWeaponVisual();
  }
  player.overdriveTimer = Math.max(0, player.overdriveTimer - delta);
  abilityMessageTimer = Math.max(0, abilityMessageTimer - delta);
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  player.recoil += (0 - player.recoil) * Math.min(1, delta * 12);
  player.shake += (0 - player.shake) * Math.min(1, delta * 9);

  if (player.reloadRemaining > 0) {
    player.reloadRemaining -= delta;
    // Ecriture DOM par frame : on passe par le cache du HUD, qui filtre
    // deja les valeurs identiques. Les deux writers se partageent la cle.
    const reloadText = `RECHARGE // ${Math.max(0, player.reloadRemaining).toFixed(1)}s`;
    if (hudCache.reload !== reloadText) {
      ui.reloadStatus.textContent = reloadText;
      hudCache.reload = reloadText;
    }
    if (player.reloadRemaining <= 0) {
      player.reloadRemaining = 0;
      player.ammo = player.magazineSize;
      if (hudCache.reload !== 'SYSTÃˆME PRÃŠT') {
        ui.reloadStatus.textContent = 'SYSTÃˆME PRÃŠT';
        hudCache.reload = 'SYSTÃˆME PRÃŠT';
      }
    }
  }

  if (player.regen > 0 && player.health < player.maxHealth) {
    player.health = Math.min(player.maxHealth, player.health + player.regen * delta);
  }

  const forwardInput = (keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const rightInput = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
    - (keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft') ? 1 : 0);
  const move = player.moveScratch.set(0, 0, 0);
  const forward = player.forwardScratch.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = player.rightScratch.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  move.addScaledVector(forward, forwardInput).addScaledVector(right, rightInput);
  if (move.lengthSq() > 1) move.normalize();
  player.moving = move.lengthSq() > 0.01;

  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - delta);
    player.velocity.copy(player.dashDirection).multiplyScalar(18);
    player.moving = true;
    player.bobTime += delta * 18;
  } else if (player.moving) {
    const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const shootSlow = keys.has('Mouse0') ? 0.78 : 1;
    const speed = player.speed * (sprinting ? 1.42 : 1) * shootSlow;
    player.velocity.lerp(move.multiplyScalar(speed), Math.min(1, delta * 11));
    player.bobTime += delta * (sprinting ? 13 : 9.5);
  } else {
    player.velocity.multiplyScalar(Math.max(0, 1 - delta * 13));
  }

  const previousX = player.position.x;
  const previousZ = player.position.z;
  moveEntity(player.position, player.velocity.x * delta, player.velocity.z * delta, CONFIG.playerRadius);

  // PAS D'OMBRE : la frappe voyage avec le dash. On mesure le segment
  // reellement parcouru (le dash peut etre bloque par un obstacle) et on ne
  // touche chaque ennemi qu'une fois par esquive.
  if (player.dashDamage > 0 && player.dashTimer > 0) {
    applyDashDamage(previousX, previousZ);
  }

  const bob = player.moving ? Math.sin(player.bobTime) * (player.dashTimer > 0 ? 0.018 : 0.035) : 0;
  const shakeX = player.shake * (Math.random() - 0.5) * 0.12;
  const shakeY = player.shake * (Math.random() - 0.5) * 0.12;
  camera.position.set(player.position.x + shakeX, player.position.y + bob + shakeY, player.position.z);
  // 0.012 ne montait le canon que de 0.79 deg au plafond de recoil : le tir
  // ne se sentait pas. 0.030 donne ~1.8 deg pour le RAIL et ~0.65 deg pour
  // la SMG, ce qui rend chaque arme identifiable au recoil.
  camera.rotation.set(player.pitch + player.recoil * 0.03, player.yaw, player.shake * (Math.random() - 0.5) * 0.018, 'YXZ');
  updateWeapon(delta);
}

function updateWeapon(delta) {
  if (equippedClass === 'assassin') {
    if (!assassinWeapon) return;
    const speedBob = player.moving ? Math.sin(player.bobTime * 0.5) * 0.02 : 0;
    const slashProgress = player.slashTimer > 0 ? 1 - player.slashTimer / 0.28 : 0;
    const swing = Math.sin(slashProgress * Math.PI);
    assassinWeapon.position.x += (0 - assassinWeapon.position.x) * Math.min(1, delta * 12);
    assassinWeapon.position.y += (-0.44 + speedBob - (player.dashTimer > 0 ? 0.08 : 0) - assassinWeapon.position.y) * Math.min(1, delta * 12);
    assassinWeapon.position.z += (-0.72 - swing * 0.16 - assassinWeapon.position.z) * Math.min(1, delta * 15);
    assassinWeapon.rotation.x += ((-0.02 + swing * 0.08) - assassinWeapon.rotation.x) * Math.min(1, delta * 16);
    assassinWeapon.userData.leftSaber.rotation.z += ((-0.12 - swing * 0.7) - assassinWeapon.userData.leftSaber.rotation.z) * Math.min(1, delta * 20);
    assassinWeapon.userData.rightSaber.rotation.z += ((0.12 + swing * 0.7) - assassinWeapon.userData.rightSaber.rotation.z) * Math.min(1, delta * 20);
    assassinWeapon.userData.leftSaber.rotation.x += ((-0.12 + swing * 0.3) - assassinWeapon.userData.leftSaber.rotation.x) * Math.min(1, delta * 20);
    assassinWeapon.userData.rightSaber.rotation.x += ((-0.12 - swing * 0.3) - assassinWeapon.userData.rightSaber.rotation.x) * Math.min(1, delta * 20);
    return;
  }
  if (!weapon) return;
  const speedBob = player.moving ? Math.sin(player.bobTime * 0.5) * 0.018 : 0;
  const sprintFactor = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1 : 0;
  const targetX = 0.48 - sprintFactor * 0.06;
  const targetY = -0.42 + speedBob - sprintFactor * 0.035;
  const reloadTilt = player.reloadRemaining > 0 ? Math.sin((1 - player.reloadRemaining / player.reloadTime) * Math.PI) : 0;
  weapon.position.x += (targetX - weapon.position.x) * Math.min(1, delta * 12);
  weapon.position.y += (targetY - weapon.position.y) * Math.min(1, delta * 12);
  weapon.position.z += (-0.78 + player.recoil * 0.11 - reloadTilt * 0.16 - weapon.position.z) * Math.min(1, delta * 15);
  weapon.rotation.x += ((-0.025 + player.recoil * 0.19 + reloadTilt * 0.45) - weapon.rotation.x) * Math.min(1, delta * 16);
  weapon.rotation.z += ((-0.015 + player.recoil * 0.035 - reloadTilt * 0.18) - weapon.rotation.z) * Math.min(1, delta * 16);
  weapon.rotation.y += ((-0.06 + speedBob * 0.4) - weapon.rotation.y) * Math.min(1, delta * 10);
}

function startReload() {
  // Un sabre n'a pas de chargeur ; le shuriken de l'Assassin en a un.
  if (getWeaponDefinition(player.weaponId).fireMode === 'slash') return;
  if (state !== GAME_STATE.PLAYING || player.reloadRemaining > 0 || player.ammo >= player.magazineSize) return;
  player.reloadRemaining = player.reloadTime;
  audio.reload();
  ui.reloadStatus.classList.add('active');
  ui.reloadStatus.textContent = 'RECHARGE EN COURS';
}

function applyWeaponStatus(enemy, weapon) {
  if (!enemy || enemy.dead) return;
  if (weapon.slowDuration) {
    enemy.slowTimer = Math.max(enemy.slowTimer, weapon.slowDuration);
    enemy.slowMultiplier = Math.min(enemy.slowMultiplier, weapon.slowMultiplier || 0.5);
  }
  if (weapon.burnDamage) {
    enemy.burnTimer = Math.max(enemy.burnTimer, weapon.burnDuration || 1);
    enemy.burnDamage = Math.max(enemy.burnDamage, weapon.burnDamage);
    enemy.burnTick = Math.min(enemy.burnTick || 0.2, 0.2);
  }
}

function applyAreaDamage(position, weapon, directTargets = new Set()) {
  if (!weapon.explosionRadius || !weapon.explosionDamage) return;
  const radiusSquared = weapon.explosionRadius ** 2;
  [...enemies].forEach((enemy) => {
    if (enemy.dead || directTargets.has(enemy)) return;
    const dx = enemy.root.position.x - position.x;
    const dz = enemy.root.position.z - position.z;
    if (dx * dx + dz * dz <= radiusSquared) {
      applyWeaponStatus(enemy, weapon);
      damageEnemy(enemy, weapon.explosionDamage, false, false);
    }
  });
  spawnImpact(position, new THREE.Vector3(0, 1, 0), weapon.tracerColor, 14);
}

function spawnAbilityEffect(radius, color) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.08, 8, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
  );
  ring.position.set(player.position.x, 0.1, player.position.z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  ripples.push({ mesh: ring, life: 0.65, maxLife: 0.65, startScale: 0.15, endScale: 1.15 });
}

function activateAbility() {
  if (state !== GAME_STATE.PLAYING) return;
  const isAssassin = player.classId === 'assassin';
  // Sans capacitÃ© achetÃ©e, l'Assassin garde son dash : c'est sa seule
  // ressource de base, elle ne doit pas disparaÃ®tre au rang 0.
  if (isAssassin && !player.abilityId) {
    activateDash();
    return;
  }
  const ability = getAbilityDefinition(player.abilityId);
  if (!ability || ability.classId !== player.classId) {
    abilityMessage = "ACHÃˆTE UNE CAPACITÃ‰ DANS L'ATELIER";
    abilityMessageTimer = 1.8;
    if (isAssassin) activateDash();
    return;
  }
  if (player.abilityCooldown > 0) {
    abilityMessage = `CAPACITÃ‰ // RECHARGE ${player.abilityCooldown.toFixed(1)}s`;
    abilityMessageTimer = 0.8;
    return;
  }

  player.abilityCooldown = ability.cooldown;
  player.abilityTimer = ability.duration;
  const center = player.position;
  const radius = ability.radius || 0;
  const hex = new THREE.Color(ability.color).getHex();

  if (ability.id === 'nova') {
    [...enemies].forEach((enemy) => {
      if (enemy.dead) return;
      const dx = enemy.root.position.x - center.x;
      const dz = enemy.root.position.z - center.z;
      if (dx * dx + dz * dz <= radius * radius) {
        damageEnemy(enemy, ability.damage, false, false);
      }
    });
    spawnAbilityEffect(radius, hex);
    abilityMessage = 'NOVA // DÃ‰GÃ‚TS DE ZONE';
  } else if (ability.id === 'cryo') {
    [...enemies].forEach((enemy) => {
      if (enemy.dead) return;
      const dx = enemy.root.position.x - center.x;
      const dz = enemy.root.position.z - center.z;
      if (dx * dx + dz * dz <= radius * radius) applyWeaponStatus(enemy, ability);
    });
    spawnAbilityEffect(radius, hex);
    abilityMessage = 'CRYO // HOSTILES RALENTIS';
  } else if (ability.id === 'aegis') {
    spawnAbilityEffect(4.5, hex);
    abilityMessage = 'AEGIS // BOUCLIER ACTIF';
  } else if (ability.id === 'overload') {
    player.overdriveTimer = ability.duration;
    spawnAbilityEffect(3.5, hex);
    abilityMessage = 'OVERDRIVE // ARME SURCHARGÃ‰E';
  } else if (ability.id === 'shadowStep') {
    // Reset du dash : l'Assassin peut s'enfuir en boucle tant que la
    // capacite dure, ce qui en fait le vrai outil de survie du melee.
    player.dashCooldown = 0;
    player.abilityDamageBonus = ability.damageMultiplier - 1;
    player.abilityKillHeal = 0;
    spawnAbilityEffect(3.2, hex);
    abilityMessage = 'PAS OMBRE // DASH LIBRE';
  } else if (ability.id === 'shadowVeilField') {
    player.vanishTimer = ability.duration;
    player.critPending = true;
    player.abilityDamageBonus = 0;
    spawnAbilityEffect(2.6, hex);
    abilityMessage = 'VOILE // INVISIBLE';
  } else if (ability.id === 'shadowRiptide') {
    player.abilityKillHeal = ability.killHeal;
    player.abilityDamageBonus = ability.damageMultiplier - 1;
    spawnAbilityEffect(4, hex);
    abilityMessage = 'SANG-DÃ‰CHIRÃ‰ // VAMPIRE';
  } else if (ability.id === 'shadowHourglass') {
    let healthiest = null;
    [...enemies].forEach((enemy) => {
      if (enemy.dead) return;
      const dx = enemy.root.position.x - center.x;
      const dz = enemy.root.position.z - center.z;
      if (dx * dx + dz * dz > radius * radius) return;
      applyWeaponStatus(enemy, ability);
      if (!healthiest || enemy.hp > healthiest.hp) healthiest = enemy;
    });
    if (healthiest) damageEnemy(healthiest, ability.damage, false, false);
    spawnAbilityEffect(radius * 0.6, hex);
    abilityMessage = 'HEURE DE CENDRE // TEMPS RALENTI';
  }

  abilityMessageTimer = 1.5;
  audio.ability(ability.id);
}

// La hitbox cylindrique englobe la tete, donc le tri par distance de
// intersectObjects la touche toujours avant le mesh de tete : le flag
// userData.headshot n'est jamais lu. On tranche donc par geometrie, avec un
// test rayon/sphere sur la tete, indifferent a l'ordre des intersections.
// Le centre est legerement remonte et le rayon resserre : le torse monte
// jusqu'a y=1.53 alors que la tete descend a y=1.19, donc une zone trop large
// compterait les tirs aux epaules comme des headshots.
const headTestCenter = new THREE.Vector3();
const headTestOffset = new THREE.Vector3();
// Normale d'impact enemy : orientÃ©e de l'ennemi vers le point touchÃ©, ce qui
// donne une gerbe qui part vers l'extÃ©rieur sans dependre de face.normal
// (qui est en espace local de l'objet, non transformÃ©).
const impactNormal = new THREE.Vector3();

function isHeadshotHit(enemy, hitDistance) {
  if (!enemy.head || !enemy.head.parent) return false;
  enemy.head.getWorldPosition(headTestCenter);
  const radius = enemy.headRadius * 0.85;
  headTestCenter.y += enemy.headRadius * 0.25;
  headTestOffset.copy(headTestCenter).sub(raycaster.ray.origin);
  const projection = headTestOffset.dot(raycaster.ray.direction);
  if (projection < 0) return false;
  if (projection > hitDistance + enemy.radius * 0.75 + radius) return false;
  const perpendicularSq = headTestOffset.lengthSq() - projection * projection;
  return perpendicularSq <= radius * radius;
}

function fireWeapon() {
  if (state !== GAME_STATE.PLAYING || player.fireCooldown > 0 || player.reloadRemaining > 0) return;
  const weaponDefinition = getWeaponDefinition(player.weaponId);
  // Le branchement se fait sur le fireMode de l'arme et non sur la classe :
  // l'Assassin peut equiper le shuriken, qui est lance a distance.
  if (weaponDefinition.fireMode === 'slash') {
    slashAttack();
    return;
  }
  if (player.ammo <= 0) {
    startReload();
    return;
  }

  const overloadActive = player.overdriveTimer > 0;
  const overloadDefinition = getAbilityDefinition('overload');
  const fireRateMultiplier = overloadActive ? overloadDefinition?.fireRateMultiplier || 1 : 1;
  const damageMultiplier = (overloadActive ? overloadDefinition?.damageMultiplier || 1 : 1)
    * (1 + (player.abilityDamageBonus || 0));
  const recoilKick = player.weaponId === 'rail' ? 1.05 : player.weaponId === 'scatter' ? 0.9 : player.weaponId === 'smg' ? 0.38 : 0.7;
  const shakeAmount = player.weaponId === 'rail' ? 0.2 : player.weaponId === 'scatter' ? 0.18 : player.weaponId === 'smg' ? 0.06 : player.weaponId === 'plasma' ? 0.16 : 0.11;
  player.ammo -= 1;
  shotsFired += 1;
  player.fireCooldown = 1 / (player.fireRate * fireRateMultiplier);
  player.recoil = Math.min(1.15, player.recoil + recoilKick);
  player.shake = Math.min(0.8, player.shake + shakeAmount);
  audio.shoot(player.weaponId);
  ui.crosshair.classList.add('shooting');
  window.setTimeout(() => ui.crosshair.classList.remove('shooting'), 80);

  muzzleFlash.material.opacity = 1;
  muzzleFlash.material.rotation = Math.random() * Math.PI;
  muzzleFlash.scale.setScalar(0.36 + Math.random() * 0.14);
  muzzleLight.intensity = 5.5;
  weapon.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);

  const muzzlePosition = new THREE.Vector3();
  muzzleFlash.getWorldPosition(muzzlePosition);
  const shotCount = Math.max(1, player.weaponPellets || 1);
  const spread = player.weaponSpread || 0;

  for (let pellet = 0; pellet < shotCount; pellet += 1) {
    const spreadX = (Math.random() * 2 - 1) * spread;
    const spreadY = (Math.random() * 2 - 1) * spread;
    raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);
    raycaster.far = player.weaponRange || CONFIG.interactionRange;
    const intersections = raycaster.intersectObjects(raycastTargets, false);
    const endPoint = raycaster.ray.at(player.weaponRange || CONFIG.interactionRange, new THREE.Vector3());
    let remainingTargets = player.pierce + 1;
    const hitEnemies = new Set();

    intersections.forEach((intersection) => {
      if (remainingTargets <= 0) return;
      if (intersection.object.userData.solid) {
        endPoint.copy(intersection.point);
        remainingTargets = 0;
        spawnImpact(intersection.point, intersection.face?.normal || new THREE.Vector3(0, 1, 0), weaponDefinition.tracerColor, 4);
        return;
      }
      const enemy = intersection.object.userData.enemy;
      if (enemy && !enemy.dead && !hitEnemies.has(enemy)) {
        hitEnemies.add(enemy);
        remainingTargets -= 1;
        const headshot = Boolean(intersection.object.userData.headshot) || isHeadshotHit(enemy, intersection.distance);
        const headshotMultiplier = (weaponDefinition.headshotMultiplier || 1.65) + (player.headshotBonus || 0);
        applyWeaponStatus(enemy, weaponDefinition);
        damageEnemy(enemy, player.damage * damageMultiplier * (headshot ? headshotMultiplier : 1), headshot);
        endPoint.copy(intersection.point);
        // Avant, un tir qui touchait un ennemi ne produisait aucune gerbe :
        // le seul retour etait le flash global du modele. La pastille de
        // touche devient ici un feedback local, et l'or reserved au headshot.
        impactNormal.copy(intersection.point).sub(enemy.root.position);
        impactNormal.y = 0;
        if (impactNormal.lengthSq() < 0.0001) impactNormal.set(0, 1, 0);
        spawnImpact(intersection.point, impactNormal, headshot ? 0xfff0a6 : weaponDefinition.tracerColor, headshot ? 7 : 4);
      }
    });

    applyAreaDamage(endPoint, weaponDefinition, hitEnemies);
    if (hitEnemies.size === 0) spawnImpact(endPoint, new THREE.Vector3(0, 1, 0), weaponDefinition.tracerColor, 2);
    createTracer(muzzlePosition, endPoint, hitEnemies.size > 0 ? 0xffffff : weaponDefinition.tracerColor);
  }

  if (player.ammo === 0) window.setTimeout(() => startReload(), 130);
}

function slashAttack() {
  if (player.fireCooldown > 0) return;
  const weaponDefinition = getWeaponDefinition(player.weaponId);
  player.fireCooldown = 1 / player.fireRate;
  player.slashTimer = 0.28;
  player.recoil = Math.min(1, player.recoil + 0.28);
  player.shake = Math.min(0.8, player.shake + 0.18);
  shotsFired += 1;
  audio.slash();

  const arc = player.slashArc || 0.34;
  const visualRadius = weaponDefinition.slashVisual || 1.35;
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const slashCenter = player.position.clone().addScaledVector(forward, 1.25);
  const slashColor = weaponDefinition.energyColor ?? 0xb17cff;
  const slash = new THREE.Mesh(
    new THREE.TorusGeometry(visualRadius, 0.045, 6, 28, Math.PI * 0.72),
    new THREE.MeshBasicMaterial({ color: slashColor, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  slash.position.copy(slashCenter);
  slash.rotation.set(Math.PI / 2, 0, player.yaw + Math.PI * 0.12);
  scene.add(slash);
  slashEffects.push({ mesh: slash, life: 0.22, maxLife: 0.22, startScale: 0.55, endScale: 1.35 });

  let hitCount = 0;
  for (const enemy of [...enemies]) {
    if (enemy.dead || hitCount >= player.slashTargets) continue;
    const toEnemy = new THREE.Vector3().subVectors(enemy.root.position, player.position);
    toEnemy.y = 0;
    const distance = toEnemy.length();
    if (distance > player.weaponRange + enemy.radius) continue;
    if (distance > 0.001 && toEnemy.normalize().dot(forward) < arc) continue;
    const executionMultiplier = player.executionBonus > 1 && enemy.hp <= enemy.maxHealth * 0.3 ? player.executionBonus : 1;
    // VOILE SOMBRE : la frappe qui suit l'invisibilite est un headshot
    // garanti, quelle que soit la distance ou l'angle.
    const guaranteed = player.critPending;
    const damage = player.damage
      * (1 + (player.abilityDamageBonus || 0))
      * (hitCount === 0 ? 1 : 0.75)
      * executionMultiplier
      * (guaranteed ? 2.2 : 1);
    player.critPending = false;
    damageEnemy(enemy, damage, guaranteed);
    hitCount += 1;
  }
  if (hitCount > 0) {
    ui.crosshair.classList.remove('hit');
    void ui.crosshair.offsetWidth;
    ui.crosshair.classList.add('hit');
    window.setTimeout(() => ui.crosshair.classList.remove('hit'), 180);
  } else {
    spawnImpact(slashCenter, new THREE.Vector3(0, 1, 0), slashColor, 3);
  }
}

// Degats de la frappe traversante du PAS D'OMBRE. Le segment est teste en
// projection : un ennemi est touche s'il est dans le cylindre du segment,
// ce qui evite de dependre de la frequence d'image. Le Set garantit qu'un
// ennemi ne subit qu'un seul coup par esquive, alors que applyDashDamage est
// appele a chaque frame pendant les 0,2 s du dash.
const dashHitSet = new Set();
function applyDashDamage(fromX, fromZ) {
  const toX = player.position.x;
  const toZ = player.position.z;
  const segmentX = toX - fromX;
  const segmentZ = toZ - fromZ;
  const lengthSq = segmentX * segmentX + segmentZ * segmentZ;
  if (lengthSq < 1e-6) return;
  for (let index = 0; index < enemies.length; index += 1) {
    const enemy = enemies[index];
    if (enemy.dead || dashHitSet.has(enemy)) continue;
    const dx = enemy.root.position.x - fromX;
    const dz = enemy.root.position.z - fromZ;
    let t = (dx * segmentX + dz * segmentZ) / lengthSq;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    const closestX = fromX + segmentX * t;
    const closestZ = fromZ + segmentZ * t;
    const offsetX = enemy.root.position.x - closestX;
    const offsetZ = enemy.root.position.z - closestZ;
    const reach = enemy.radius + 1.1;
    if (offsetX * offsetX + offsetZ * offsetZ > reach * reach) continue;
    const executionMultiplier = player.executionBonus > 1 && enemy.hp <= enemy.maxHealth * 0.3 ? player.executionBonus : 1;
    dashHitSet.add(enemy);
    damageEnemy(enemy, player.dashDamage * executionMultiplier, false);
  }
}

function activateDash() {
  if (state !== GAME_STATE.PLAYING || player.classId !== 'assassin' || player.dashCooldown > 0) return;
  const forwardInput = (keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const rightInput = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
    - (keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft') ? 1 : 0);
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const direction = forward.multiplyScalar(forwardInput).addScaledVector(right, rightInput);
  if (direction.lengthSq() < 0.01) direction.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  player.dashDirection.copy(direction.normalize());
  player.dashTimer = 0.2;
  dashHitSet.clear();
  player.dashCooldown = player.dashCooldownDuration;
  player.invulnerable = Math.max(player.invulnerable, player.dashInvulnerability || 0.22);
  player.shake = Math.min(0.8, player.shake + 0.2);
  audio.dash();
  const trail = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.34, 16),
    new THREE.MeshBasicMaterial({ color: 0xb17cff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  trail.position.set(player.position.x, 0.08, player.position.z);
  trail.rotation.x = -Math.PI / 2;
  scene.add(trail);
  dashTrails.push({ mesh: trail, life: 0.3, maxLife: 0.3, startScale: 0.6, endScale: 2.4 });
}

function createTracer(start, end, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  tracers.push({ line, life: 0.075, maxLife: 0.075 });
}

// Les dÃ©bris nÃ©cessitent un matÃ©riau par particule (le fondu est indÃ©pendant),
// mais on recycle les matÃ©riaux au lieu de les allouer et dÃ©truire en boucle.
function acquireDebrisMaterial(color, additive) {
  const material = debrisMaterialPool.pop() || new THREE.MeshBasicMaterial();
  material.color.set(color);
  material.transparent = true;
  material.opacity = additive ? 0.88 : 1;
  material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
  material.depthWrite = !additive;
  return material;
}

function releaseDebrisMaterial(material) {
  if (debrisMaterialPool.length < 256) debrisMaterialPool.push(material);
  else material.dispose();
}

function spawnImpact(position, normal, color, count) {
  count = Math.max(1, Math.round(count * PERFORMANCE_PROFILE.particleScale));
  const worldNormal = normal.clone();
  if (worldNormal.lengthSq() < 0.001 || !Number.isFinite(worldNormal.x)) worldNormal.set(0, 1, 0);
  worldNormal.normalize();
  for (let i = 0; i < count; i += 1) {
    const mesh = new THREE.Mesh(sharedDebrisGeometry, acquireDebrisMaterial(color, true));
    mesh.scale.setScalar(0.035 + Math.random() * 0.035);
    mesh.position.copy(position);
    scene.add(mesh);
    const velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(1.5 + Math.random() * 2.5)
      .addScaledVector(worldNormal, 0.35);
    particles.push({ mesh, velocity, life: 0.25 + Math.random() * 0.18, maxLife: 0.43 });
  }
}

function damageEnemy(enemy, amount, headshot, countHit = true) {
  if (enemy.dead) return;
  if (countHit) {
    shotsHit += 1;
    if (headshot) headshots += 1;
  }
  enemy.hp -= amount;
  enemy.flashTime = 0.12;
  enemy.attackPulse = Math.max(enemy.attackPulse, 0.25);
  if (countHit) {
    ui.crosshair.classList.remove('hit');
    void ui.crosshair.offsetWidth;
    ui.crosshair.classList.add('hit');
    window.setTimeout(() => ui.crosshair.classList.remove('hit'), 180);
    audio.hit(headshot);
  }
  if (enemy.hp <= 0) killEnemy(enemy);
}

function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  kills += 1;
  score += enemy.score;
  audio.kill();
  const color = enemy.template.color;
  const deathPosition = enemy.root.position.clone().add(new THREE.Vector3(0, 1 * enemy.scale, 0));
  const burst = new THREE.Mesh(
    new THREE.TorusGeometry(0.55 * enemy.scale, 0.045, 5, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  burst.position.copy(deathPosition);
  burst.rotation.x = Math.PI / 2;
  scene.add(burst);
  ripples.push({ mesh: burst, life: 0.45, maxLife: 0.45, startScale: 0.6, endScale: 2.2 * enemy.scale });

  for (let i = 0; i < Math.max(5, Math.round(11 * PERFORMANCE_PROFILE.particleScale)); i += 1) {
    const mesh = new THREE.Mesh(sharedDebrisGeometry, acquireDebrisMaterial(i % 3 === 0 ? 0xffffff : color, false));
    mesh.scale.setScalar(0.045 + Math.random() * 0.08);
    mesh.position.copy(deathPosition);
    scene.add(mesh);
    const velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.85 + 0.1, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(2 + Math.random() * 4.5);
    particles.push({ mesh, velocity, life: 0.45 + Math.random() * 0.35, maxLife: 0.8 });
  }

  // Le soin par elimination vient de l'upgrade Sang d'Ombre, et de la
  // capacite Sang-dechire quand elle est active.
  const lifesteal = (player.killHeal || 0) + (player.abilityKillHeal || 0);
  if (lifesteal > 0) {
    player.health = Math.min(player.maxHealth, player.health + lifesteal);
  }
  const index = enemies.indexOf(enemy);
  if (index >= 0) enemies.splice(index, 1);
  enemy.hitMeshes.forEach((mesh) => {
    const targetIndex = enemyTargets.indexOf(mesh);
    if (targetIndex >= 0) enemyTargets.splice(targetIndex, 1);
  });
  syncRaycastTargets();
  scene.remove(enemy.root);
  disposeEnemy(enemy);
}

function damagePlayer(amount) {
  if (state !== GAME_STATE.PLAYING || player.invulnerable > 0) return;
  const aegis = player.abilityId === 'aegis' && player.abilityTimer > 0 ? getAbilityDefinition('aegis') : null;
  // VOILE SOMBRE : l'invisibilite n'est pas cosmeticque, elle divise les
  // degats encaisses par deux.
  const vanishFactor = player.vanishTimer > 0 ? 0.5 : 1;
  const damageReduction = Math.min(
    UPGRADE_VALUES.reductionCap,
    Math.max(player.damageReduction, aegis?.damageReduction || 0)
  );
  const actualDamage = Math.max(1, amount * (1 - damageReduction) * vanishFactor);
  damageTaken += actualDamage;
  player.health = Math.max(0, player.health - actualDamage);
  player.invulnerable = 0.16;
  player.shake = 0.7;
  damageFlashTimer = 0.12;
  audio.hurt();
  if (player.health <= 0) endGame();
}

// Vecteurs de travail reutilises par updateEnemies : le code allouait un
// Vector3 par ennemi et par paire d'ennemis, soit plusieurs milliers
// d'allocations par seconde uniquement pour des calculs intermediaires.
// enemyCount est plafonne a 9, la separation O(n^2) reste negligeable.
const scratchToPlayer = new THREE.Vector3();
const scratchMovement = new THREE.Vector3();
const scratchAway = new THREE.Vector3();

function updateEnemies(delta) {
  navTimer -= delta;
  if (navTimer <= 0) {
    rebuildFlowField();
    navTimer = PERFORMANCE_PROFILE.flowFieldInterval;
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.dead) continue;

    if (enemy.slowTimer > 0) {
      enemy.slowTimer = Math.max(0, enemy.slowTimer - delta);
      if (enemy.slowTimer === 0) enemy.slowMultiplier = 1;
    }
    if (enemy.burnTimer > 0) {
      enemy.burnTimer = Math.max(0, enemy.burnTimer - delta);
      enemy.burnTick -= delta;
      if (enemy.burnTick <= 0) {
        enemy.burnTick += 0.5;
        damageEnemy(enemy, enemy.burnDamage, false, false);
        if (enemy.dead) continue;
      }
      if (enemy.burnTimer === 0) enemy.burnDamage = 0;
    }

    scratchToPlayer.subVectors(player.position, enemy.root.position);
    scratchToPlayer.y = 0;
    const distance = scratchToPlayer.length();
    if (distance > 0.001) scratchToPlayer.normalize();
    const attackDistance = enemy.radius * 1.45 + 0.5;
    const attackSpeed = distance > attackDistance ? enemy.speed * enemy.slowMultiplier : 0;
    if (attackSpeed > 0) {
      const flowDirection = getFlowDirection(enemy.root.position);
      scratchMovement.copy(flowDirection || scratchToPlayer);
      scratchMovement.lerp(scratchToPlayer, 0.12).normalize();
      scratchMovement.multiplyScalar(attackSpeed * delta);
      moveEntity(enemy.root.position, scratchMovement.x, scratchMovement.z, enemy.radius);
    }

    for (let j = 0; j < enemies.length; j += 1) {
      if (i === j) continue;
      const other = enemies[j];
      scratchAway.subVectors(enemy.root.position, other.root.position);
      scratchAway.y = 0;
      const separationDistance = scratchAway.length();
      const desired = (enemy.radius + other.radius) * 0.72;
      if (separationDistance > 0.001 && separationDistance < desired) {
        scratchAway.multiplyScalar(1 / separationDistance).multiplyScalar((desired - separationDistance) * delta * 2.2);
        moveEntity(enemy.root.position, scratchAway.x, scratchAway.z, enemy.radius);
      }
    }

    const targetYaw = Math.atan2(scratchToPlayer.x, scratchToPlayer.z);
    const currentYaw = enemy.root.rotation.y;
    let yawDelta = targetYaw - currentYaw;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    enemy.root.rotation.y += yawDelta * Math.min(1, delta * 5.5);

    enemy.attackCooldown -= delta;
    enemy.attackPulse = Math.max(0, enemy.attackPulse - delta * 2.2);
    if (distance < attackDistance && enemy.attackCooldown <= 0) {
      const baseAttackCooldown = enemy.elite ? 1.15 : WAVE_CURVES.attackCooldown(wave);
      const mapAttackMultiplier = MAP_DEFINITIONS[currentMapIndex].attackCooldownMultiplier;
      enemy.attackCooldown = baseAttackCooldown * mapAttackMultiplier;
      enemy.attackPulse = 1;
      damagePlayer(enemy.damage);
    }

    enemy.flashTime = Math.max(0, enemy.flashTime - delta);
    const pulse = 0.5 + Math.sin(elapsed * 4 + enemy.seed) * 0.12;
    const statusColor = enemy.burnTimer > 0 ? 0xff6b2c : enemy.slowTimer > 0 ? 0x72d8ff : enemy.template.color;
    enemy.materials.body.emissive.set(statusColor).multiplyScalar(0.11 + pulse * 0.07);
    enemy.materials.body.emissiveIntensity = enemy.flashTime > 0 ? 3.8 : 0.62 + enemy.attackPulse * 0.5;
    enemy.materials.armor.emissive.set(statusColor).multiplyScalar(enemy.flashTime > 0 ? 0.85 : 0.13);
    enemy.materials.armor.emissiveIntensity = enemy.flashTime > 0 ? 4 : 0.72;
    enemy.legPivots.forEach(({ pivot, side, phase }) => {
      const fastLegs = enemy.typeKey === 'hunter' || enemy.typeKey === 'emberStalker';
      pivot.rotation.x = Math.sin(elapsed * (fastLegs ? 10 : 7) + phase) * (fastLegs ? 0.55 : 0.35);
      pivot.rotation.z = side * (0.06 + Math.cos(elapsed * 6 + phase) * 0.04);
    });
    enemy.root.position.y = Math.sin(elapsed * 5.5 + enemy.seed) * 0.045;
    enemy.healthBar.scale.x = Math.max(0.001, enemy.hp / enemy.maxHealth);
    enemy.healthBar.position.x = -0.49 * (1 - enemy.hp / enemy.maxHealth);
  }
}

function updateWave(delta) {
  if (state !== GAME_STATE.PLAYING) return;
  const maxConcurrent = WAVE_CURVES.maxConcurrent(wave);
  spawnTimer -= delta;
  if (waveSpawned < waveTotal && enemies.length < maxConcurrent && spawnTimer <= 0) {
    spawnEnemy();
    waveSpawned += 1;
    spawnTimer = WAVE_CURVES.spawnInterval(wave) * (0.75 + Math.random() * 0.5);
  }
  const remaining = waveTotal - waveSpawned + enemies.length;
  // Compteur d'ennemis : change rarement, on evite une ecriture DOM par frame.
  const remainingText = String(remaining).padStart(2, '0');
  if (hudCache.enemies !== remainingText) {
    ui.enemyValue.textContent = remainingText;
    hudCache.enemies = remainingText;
  }
  if (waveSpawned >= waveTotal && enemies.length === 0) completeWave();
}

function startWave() {
  wave += 1;
  waveTotal = WAVE_CURVES.total(wave);
  waveSpawned = 0;
  spawnTimer = 0.4;
  state = GAME_STATE.PLAYING;
  applyWeaponVisual();
  player.reloadRemaining = 0;
  player.ammo = player.magazineSize;
  ui.waveValue.textContent = String(wave).padStart(2, '0');
  ui.enemyValue.textContent = String(waveTotal).padStart(2, '0');
  ui.waveBannerText.textContent = wave % 5 === 0 ? 'VAGUE ALPHA' : `VAGUE ${String(wave).padStart(2, '0')}`;
  ui.waveBanner.classList.remove('show');
  void ui.waveBanner.offsetWidth;
  ui.waveBanner.classList.add('show');
  waveBannerTimer = 2.3;
  audio.waveStart();
  updateHUD();
}

function completeWave() {
  if (state !== GAME_STATE.PLAYING) return;
  const choices = getUpgradeChoices();
  if (choices.length === 0) {
    // Tous les modules sont au niveau maximum : on enchaÃ®ne sur la vague
    // suivante plutÃ´t que d'afficher un Ã©cran vide oÃ¹ aucun clic ne fait rien.
    ui.waveBanner.classList.remove('show');
    startWave();
    return;
  }
  state = GAME_STATE.UPGRADE;
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  ui.waveBanner.classList.remove('show');
  showUpgradeChoices(choices);
}

function getUpgradeChoices() {
  const classId = player.classId;
  const available = Object.entries(UPGRADE_DEFINITIONS)
    .filter(([key, definition]) => {
      if (player.upgrades[key] >= definition.max) return false;
      if (definition.classId !== 'shared' && definition.classId !== classId) return false;
      return true;
    })
    .map(([key, definition]) => ({ key, ...definition }));
  for (let i = available.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  // Aucun remplissage de secours : une carte dÃ©jÃ  au niveau maximum ferait
  // sortir chooseUpgrade sans rien appliquer, laissant l'Ã©cran bloquÃ© sans issue.
  return available.slice(0, 3);
}

function showUpgradeChoices(choices) {
  ui.completedWave.textContent = String(wave).padStart(2, '0');
  ui.upgradeOptions.innerHTML = '';
  choices.forEach((upgrade, index) => {
    const currentLevel = player.upgrades[upgrade.key];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `upgrade-card${upgrade.classId && upgrade.classId !== 'shared' ? ` ${upgrade.classId}-upgrade` : ''}`;
    button.style.setProperty('--card-color', upgrade.color);
    const pips = Array.from({ length: upgrade.max }, (_, pipIndex) => `<i class="${pipIndex < currentLevel ? 'active' : ''}"></i>`).join('');
    const origin = upgrade.classId === 'ranger' ? 'RANGER'
      : upgrade.classId === 'assassin' ? 'ASSASSIN' : 'COMMUN';
    button.innerHTML = `
      <span class="card-index">OPT_0${index + 1} // ${upgrade.short}</span>
      <span class="card-visual"><svg viewBox="0 0 64 64" aria-hidden="true">${upgrade.icon}</svg></span>
      <span class="card-rarity">${origin} // NIVEAU ${currentLevel + 1}</span>
      <h3>${upgrade.name}</h3>
      <p>${upgrade.description}</p>
      <span class="card-footer"><span class="level-pips">${pips}</span><span>INSTALLER â†’</span></span>
    `;
    button.addEventListener('click', () => chooseUpgrade(upgrade.key));
    ui.upgradeOptions.appendChild(button);
  });
  ui.upgrade.classList.add('active');
  ui.interactionHint.classList.remove('hidden');
  audio.upgrade();
}

function chooseUpgrade(key) {
  if (state !== GAME_STATE.UPGRADE) return;
  const definition = UPGRADE_DEFINITIONS[key];
  // Filet de sÃ©curitÃ© : un module au maximum ne doit jamais laisser l'Ã©cran
  // d'amÃ©lioration ouvert, on enchaÃ®ne donc sur la vague suivante.
  if (!definition || player.upgrades[key] >= definition.max) {
    state = GAME_STATE.PLAYING;
    ui.upgrade.classList.remove('active');
    startWave();
    return;
  }
  player.upgrades[key] += 1;
  const previousMaxHealth = player.maxHealth;
  // Toutes les statistiques derivees sont recalculees depuis les bases : plus
  // aucune multiplication en cascade d'un niveau a l'autre.
  applyUpgradeStats();
  // L'armure soigne du meme coup que la progression elle-meme.
  if (key === 'armor' || key === 'shadowPoise') {
    player.health = Math.min(player.maxHealth, player.health + (player.maxHealth - previousMaxHealth));
  }
  if (key === 'shadowVeil') player.dashCooldown = 0;
  player.ammo = player.magazineSize;
  player.reloadRemaining = 0;
  ui.upgrade.classList.remove('active');
  ui.interactionHint.classList.add('hidden');
  updateHUD();
  startWave();
  requestPointerLock();
  if (definition) audio.upgrade();
}

function calculateRunReward() {
  const accuracy = shotsFired > 0 ? Math.min(1, shotsHit / shotsFired) : 0;
  const waveCredits = Math.max(0, wave * 45);
  const eliminationCredits = Math.max(0, kills * 8);
  const scoreCredits = Math.max(0, Math.floor(score * 0.02));
  const accuracyCredits = Math.floor(accuracy * 260);
  const headshotCredits = headshots * 18;
  const survivalCredits = Math.min(300, Math.floor(runTime * 1.5));
  const efficiencyCredits = damageTaken <= 0
    ? 120
    : Math.max(0, Math.floor(120 * (1 - Math.min(1, damageTaken / Math.max(100, player.maxHealth * 2)))));
  const total = waveCredits + eliminationCredits + scoreCredits + accuracyCredits +
    headshotCredits + survivalCredits + efficiencyCredits;
  const performancePoints = wave * 100 + kills * 28 + score * 0.35 + accuracy * 500 + headshots * 25;
  const rating = performancePoints >= 8000 ? 'S'
    : performancePoints >= 5000 ? 'A'
      : performancePoints >= 3000 ? 'B'
        : performancePoints >= 1500 ? 'C' : 'D';

  return {
    total,
    rating,
    accuracy,
    waveCredits,
    eliminationCredits,
    scoreCredits,
    accuracyCredits,
    headshotCredits,
    survivalCredits,
    efficiencyCredits
  };
}

function endGame() {
  if (state === GAME_STATE.DEAD) return;
  state = GAME_STATE.DEAD;
  keys.clear();
  player.health = 0;
  if (document.pointerLockElement) document.exitPointerLock();
  score += Math.max(0, Math.floor(wave * 125));
  lastReward = calculateRunReward();
  credits += lastReward.total;
  bestScore = Math.max(bestScore, score);
  saveProfile();
  ui.finalWave.textContent = String(wave);
  ui.finalKills.textContent = String(kills);
  ui.finalScore.textContent = score.toLocaleString('fr-FR');
  ui.finalReward.textContent = `+${formatCredits(lastReward.total)} CR`;
  ui.performanceRating.textContent = `PERFORMANCE // ${lastReward.rating} // ${Math.round(lastReward.accuracy * 100)}% PRÃ‰CISION`;
  ui.rewardBreakdown.textContent = [
    `VAGUE +${formatCredits(lastReward.waveCredits)}`,
    `Ã‰LIMINATIONS +${formatCredits(lastReward.eliminationCredits)}`,
    `SCORE +${formatCredits(lastReward.scoreCredits)}`,
    `PRÃ‰CISION +${formatCredits(lastReward.accuracyCredits)}`,
    `HEADSHOTS +${formatCredits(lastReward.headshotCredits)}`,
    `SURVIE +${formatCredits(lastReward.survivalCredits)}`,
    `EFFICACITÃ‰ +${formatCredits(lastReward.efficiencyCredits)}`
  ].join(' // ');
  ui.bestScore.textContent = `MEILLEUR SCORE // ${bestScore.toLocaleString('fr-FR')}`;
  updateCreditsUI();
  ui.gameover.classList.add('active');
  audio.death();
  updateHUD();
}

function returnToMenu() {
  if (![GAME_STATE.PLAYING, GAME_STATE.PAUSED, GAME_STATE.UPGRADE].includes(state)) return;

  saveProfile();
  state = GAME_STATE.MENU;
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  weapon.visible = false;
  if (assassinWeapon) assassinWeapon.visible = false;

  clearDynamicObjects();
  shopReturnState = GAME_STATE.MENU;
  ui.menu.classList.add('active');
  ui.pause.classList.remove('active');
  ui.upgrade.classList.remove('active');
  ui.shop.classList.remove('active');
  ui.gameover.classList.remove('active');
  ui.hud.classList.add('hidden');
  ui.waveBanner.classList.remove('show');
  ui.interactionHint.classList.add('hidden');
  weapon.visible = false;
  if (assassinWeapon) assassinWeapon.visible = false;
  damageFlashTimer = 0;
  waveBannerTimer = 0;
  ui.damageFlash.style.opacity = '0';
  hudCache.damageFlash = '0';
  updateCreditsUI();
  updateMapUI();
  updateClassUI();
  showSaveStatus('SESSION SAUVEGARDÃ‰E // MENU', 'success');
}

function startNewGame() {
  clearDynamicObjects();
  resetStats();
  applyWeaponVisual();
  resetCamera();
  wave = 0;
  score = 0;
  kills = 0;
  ui.menu.classList.remove('active');
  ui.pause.classList.remove('active');
  ui.gameover.classList.remove('active');
  ui.upgrade.classList.remove('active');
  ui.shop.classList.remove('active');
  shopReturnState = GAME_STATE.MENU;
  weapon.visible = false;
  if (assassinWeapon) assassinWeapon.visible = false;
  updateCreditsUI();
  updateClassUI();
  ui.hud.classList.remove('hidden');
  applyWeaponVisual();
  audio.ensure();
  startWave();
  requestPointerLock();
}

function setHudText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function updateHUD() {
  const isAssassin = player.classId === 'assassin';
  const health = String(Math.ceil(player.health));
  const healthPercent = Math.max(0, player.health / player.maxHealth) * 100;
  const width = `${healthPercent.toFixed(2)}%`;
  if (hudCache.health !== health) {
    ui.healthValue.textContent = health;
    hudCache.health = health;
  }
  if (hudCache.healthWidth !== width) {
    ui.healthBar.style.width = width;
    hudCache.healthWidth = width;
  }
  ui.healthBar.classList.toggle('low', healthPercent <= 30);

  const ammo = isAssassin ? '2' : String(player.ammo).padStart(2, '0');
  if (hudCache.ammo !== ammo) {
    ui.ammoValue.textContent = ammo;
    hudCache.ammo = ammo;
  }
  if (ui.reserveValue && hudCache.reserve !== 'âˆž') {
    ui.reserveValue.textContent = 'âˆž';
    hudCache.reserve = 'âˆž';
  }
  // Le HUD lit desormais la definition reelle de l'arme : avant il affichait
  // un libelle code en dur, ce qui cachait le fait que l'Assassin peut
  // Ã©quiper une arme Ã  distance comme le shuriken.
  const weaponDefinition = getWeaponDefinition(player.weaponId);
  const weaponName = weaponDefinition.name;
  if (hudCache.weaponName !== weaponName) {
    ui.weaponName.textContent = weaponName;
    hudCache.weaponName = weaponName;
  }
  const weaponStatsText = weaponDefinition.fireMode === 'slash'
    ? `DMG ${Math.round(player.damage)} // CAD ${player.fireRate.toFixed(1)} // ${player.slashTargets} CIBLES`
    : `DMG ${Math.round(player.damage)} // CAD ${player.fireRate.toFixed(1)} // ${Math.round(player.weaponRange)} M${player.weaponPellets > 1 ? ` // ${player.weaponPellets} PROJ` : ''}`;
  if (hudCache.weaponStats !== weaponStatsText) {
    ui.weaponStatsHud.textContent = weaponStatsText;
    hudCache.weaponStats = weaponStatsText;
  }

  // L'Assassin a une capacite de classe, pas un dash nu : le libelle doit
  // suivre l'equipement, sinon le HUD ment sur ce que Espace declenche.
  const ability = getAbilityDefinition(player.abilityId);
  const hasDash = isAssassin;
  const abilityStatus = abilityMessageTimer > 0
    ? abilityMessage
    : ability
      ? player.abilityCooldown > 0
        ? `RECHARGE // ${player.abilityCooldown.toFixed(1)}s`
        : 'ESPACE // PRÃŠT'
      : hasDash
        ? player.dashCooldown > 0
          ? `DASH // ${player.dashCooldown.toFixed(1)}s`
          : 'ESPACE // DASH PRÃŠT'
        : "Ã‰QUIPE UNE CAPACITÃ‰ DANS L'ATELIER";
  const abilityText = ability ? ability.name : hasDash ? 'DASH OMBRE' : 'AUCUNE';
  if (hudCache.abilityName !== abilityText) {
    ui.abilityName.textContent = abilityText;
    hudCache.abilityName = abilityText;
  }
  if (hudCache.abilityStatus !== abilityStatus) {
    ui.abilityStatus.textContent = abilityStatus;
    hudCache.abilityStatus = abilityStatus;
  }
  const abilityReady = ability ? player.abilityCooldown <= 0 : hasDash && player.dashCooldown <= 0;
  const abilityCooling = ability ? player.abilityCooldown > 0 : hasDash && player.dashCooldown > 0;
  ui.abilityReadout.classList.toggle('ready', abilityReady);
  ui.abilityReadout.classList.toggle('cooling', abilityCooling);
  // Le <span> existe une seule fois dans le HUD : on le resout une fois au
  // lieu de faire un querySelector a chaque tick.
  if (!ui.abilityHeading) ui.abilityHeading = ui.abilityReadout.querySelector('span');
  if (ui.abilityHeading) {
    const headingText = ability ? 'CAPACITÃ‰ // ESPACE' : 'DASH // ESPACE';
    if (hudCache.abilityHeading !== headingText) {
      ui.abilityHeading.textContent = headingText;
      hudCache.abilityHeading = headingText;
    }
  }

  if (isAssassin && !ability) {
    // Sans capacite de classe, le bandeau du bas affiche l'etat du sabre.
    const assassinStatus = player.slashTimer > 0
      ? 'FRAPPE // ACTIVE'
      : player.dashCooldown > 0
        ? `DASH // ${player.dashCooldown.toFixed(1)}s`
        : 'DASH // PRÃŠT';
    ui.reloadStatus.classList.toggle('active', player.slashTimer > 0 || player.dashCooldown > 0);
    if (hudCache.reload !== assassinStatus) {
      ui.reloadStatus.textContent = assassinStatus;
      hudCache.reload = assassinStatus;
    }
  } else if (getWeaponDefinition(player.weaponId).fireMode === 'slash') {
    // Sabre equipe : pas de chargeur, on montre la frappe.
    const slashStatus = player.slashTimer > 0 ? 'FRAPPE // ACTIVE' : 'MÃ‰LÃ‰E // PRÃŠT';
    ui.reloadStatus.classList.toggle('active', player.slashTimer > 0);
    if (hudCache.reload !== slashStatus) {
      ui.reloadStatus.textContent = slashStatus;
      hudCache.reload = slashStatus;
    }
  } else if (player.reloadRemaining <= 0) {
    ui.reloadStatus.classList.remove('active');
    if (hudCache.reload !== 'SYSTÃˆME PRÃŠT') {
      ui.reloadStatus.textContent = 'SYSTÃˆME PRÃŠT';
      hudCache.reload = 'SYSTÃˆME PRÃŠT';
    }
  }

  const permanentLevels = Object.values(ownedEquipment).reduce((sum, level) => sum + level, 0);
  const runLevels = Object.values(player.upgrades).reduce((sum, level) => sum + level, 0);
  const levelText = `NIV. ${String(permanentLevels + runLevels + 1).padStart(2, '0')}`;
  if (hudCache.levelText !== levelText) {
    ui.weaponLevel.textContent = levelText;
    hudCache.levelText = levelText;
  }

  const permanentEquipment = META_EQUIPMENT
    .filter((item) => getEquipmentLevel(item.id) > 0)
    .map((item) => ({ short: item.short, level: getEquipmentLevel(item.id) }));
  const runEquipment = Object.entries(player.upgrades)
    .filter(([, level]) => level > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, level]) => ({ short: UPGRADE_DEFINITIONS[key].short, level }));
  const equipmentSignature = JSON.stringify({ permanentEquipment, runEquipment });
  if (hudCache.equipment !== equipmentSignature) {
    const chips = [...permanentEquipment, ...runEquipment]
      .slice(0, 6)
      .map((item) => `<span class="equipment-chip">${item.short}<b>${item.level}</b></span>`)
      .join('');
    ui.equipmentList.innerHTML = chips || '<span class="equipment-chip">SYSTÃˆME<b>STANDARD</b></span>';
    hudCache.equipment = equipmentSignature;
  }
}

function updateEffects(delta) {
  muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - delta * 12);
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - delta * 30);

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= delta;
    particle.velocity.y -= 6.5 * delta;
    particle.mesh.position.addScaledVector(particle.velocity, delta);
    particle.mesh.rotation.x += delta * 6;
    particle.mesh.rotation.y += delta * 8;
    particle.mesh.material.opacity = Math.max(0, particle.life / particle.maxLife);
    if (particle.life <= 0) {
      scene.remove(particle.mesh);
      // La geometrie est partagee, seul le materiau revient au pool.
      releaseDebrisMaterial(particle.mesh.material);
      particles.splice(i, 1);
    }
  }

  for (let i = tracers.length - 1; i >= 0; i -= 1) {
    const tracer = tracers[i];
    tracer.life -= delta;
    tracer.line.material.opacity = Math.max(0, tracer.life / tracer.maxLife) * 0.8;
    if (tracer.life <= 0) {
      scene.remove(tracer.line);
      tracer.line.geometry.dispose();
      tracer.line.material.dispose();
      tracers.splice(i, 1);
    }
  }

  for (let i = ripples.length - 1; i >= 0; i -= 1) {
    const ripple = ripples[i];
    ripple.life -= delta;
    const progress = 1 - Math.max(0, ripple.life / ripple.maxLife);
    const scale = THREE.MathUtils.lerp(ripple.startScale, ripple.endScale, progress);
    ripple.mesh.scale.setScalar(scale);
    ripple.mesh.material.opacity = Math.max(0, 1 - progress) * 0.9;
    if (ripple.life <= 0) {
      scene.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      ripple.mesh.material.dispose();
      ripples.splice(i, 1);
    }
  }

  for (let i = slashEffects.length - 1; i >= 0; i -= 1) {
    const effect = slashEffects[i];
    effect.life -= delta;
    const progress = 1 - Math.max(0, effect.life / effect.maxLife);
    effect.mesh.scale.setScalar(THREE.MathUtils.lerp(effect.startScale, effect.endScale, progress));
    effect.mesh.material.opacity = Math.max(0, 1 - progress);
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      slashEffects.splice(i, 1);
    }
  }

  for (let i = dashTrails.length - 1; i >= 0; i -= 1) {
    const effect = dashTrails[i];
    effect.life -= delta;
    const progress = 1 - Math.max(0, effect.life / effect.maxLife);
    effect.mesh.scale.setScalar(THREE.MathUtils.lerp(effect.startScale, effect.endScale, progress));
    effect.mesh.material.opacity = Math.max(0, 1 - progress) * 0.7;
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      dashTrails.splice(i, 1);
    }
  }

  if (waveBannerTimer > 0) {
    waveBannerTimer -= delta;
    if (waveBannerTimer <= 0) ui.waveBanner.classList.remove('show');
  }

  damageFlashTimer = Math.max(0, damageFlashTimer - delta);
  // Ecrire style.opacity force un recalcul de style : on n'ecrit que si ca
  // change vraiment, donc zero ecriture quand on ne subit pas de degats.
  const flashOpacity = damageFlashTimer > 0 ? String(Math.min(1, damageFlashTimer * 8)) : '0';
  if (hudCache.damageFlash !== flashOpacity) {
    ui.damageFlash.style.opacity = flashOpacity;
    hudCache.damageFlash = flashOpacity;
  }
}

function updateSceneAnimations(delta) {
  animatedRings.forEach((entry) => {
    if (entry.axis === 'local') entry.mesh.rotation.z += delta * entry.speed;
    else if (entry.axis === 'y') entry.mesh.rotation.y += delta * entry.speed;
    else if (entry.axis === 'z') entry.mesh.rotation.z += delta * entry.speed;
    else entry.mesh.rotation.y += delta * entry.speed;
  });
}

function requestPointerLock() {
  if (!canvas.requestPointerLock) return;
  try {
    const request = canvas.requestPointerLock();
    if (request && typeof request.catch === 'function') request.catch(() => {});
  } catch {
    // Le navigateur peut refuser le pointer lock dans un onglet headless ou sandboxÃ©.
  }
}

function onPointerLockChange() {
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    if (state === GAME_STATE.PAUSED) {
      state = GAME_STATE.PLAYING;
      ui.pause.classList.remove('active');
    }
  } else if (state === GAME_STATE.PLAYING) {
    state = GAME_STATE.PAUSED;
    keys.clear();
    ui.pause.classList.add('active');
  }
}

function initEvents() {
  ui.startButton.addEventListener('click', startNewGame);
  ui.mapButtons.forEach((button) => {
    button.addEventListener('click', () => selectMap(Number(button.dataset.mapIndex)));
  });
  ui.classButtons.forEach((button) => {
    button.addEventListener('click', () => selectPlayerClass(button.dataset.classId));
  });
  ui.retryButton.addEventListener('click', startNewGame);
  ui.restartButton.addEventListener('click', startNewGame);
  ui.quitButton.addEventListener('click', returnToMenu);
  ui.shopButton.addEventListener('click', openShop);
  ui.gameoverShopButton.addEventListener('click', openShop);
  ui.shopCloseButton.addEventListener('click', closeShop);
  ui.saveProgressButton.addEventListener('click', downloadProfileBackup);
  ui.loadProgressButton.addEventListener('click', () => ui.saveFileInput.click());
  ui.saveFileInput.addEventListener('change', () => importProfileBackup(ui.saveFileInput.files?.[0]));
  ui.resumeButton.addEventListener('click', () => {
    if (state !== GAME_STATE.PAUSED) return;
    state = GAME_STATE.PLAYING;
    ui.pause.classList.remove('active');
    requestPointerLock();
  });
  ui.soundButton.addEventListener('click', () => {
    audio.setEnabled(!soundEnabled);
    ui.soundButton.classList.toggle('muted', !soundEnabled);
  });

  canvas.addEventListener('click', () => {
    audio.ensure();
    if (state === GAME_STATE.PLAYING && document.pointerLockElement !== canvas) requestPointerLock();
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) keys.add('Mouse0');
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) keys.delete('Mouse0');
  });
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== canvas || state !== GAME_STATE.PLAYING) return;
    const sensitivity = 0.00185;
    player.yaw -= event.movementX * sensitivity;
    player.pitch -= event.movementY * sensitivity;
    player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI * 0.46, Math.PI * 0.46);
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape' && state === GAME_STATE.SHOP) {
      closeShop();
      return;
    }
    const gameplayKey = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyQ', 'KeyR', 'Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code);
    if (gameplayKey && state === GAME_STATE.PLAYING) event.preventDefault();
    if (event.code === 'KeyM' && !event.repeat) {
      audio.setEnabled(!soundEnabled);
      ui.soundButton.classList.toggle('muted', !soundEnabled);
    }
    if (event.code === 'KeyR' && !event.repeat && state === GAME_STATE.PLAYING) startReload();
    if (event.code === 'Space' && !event.repeat && state === GAME_STATE.PLAYING) {
      event.preventDefault();
      activateAbility();
    }
    if (state === GAME_STATE.PLAYING) keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('pagehide', saveProfile);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === GAME_STATE.PLAYING && document.pointerLockElement === canvas) document.exitPointerLock();
  });
}

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: PERFORMANCE_PROFILE.antialias, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PERFORMANCE_PROFILE.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  renderer.shadowMap.enabled = PERFORMANCE_PROFILE.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Par defaut Three.js re-rend la shadow map a chaque frame, alors que
  // l'arene est statique : on ne la rafraichit qu'a intervalles reguliers.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.autoClear = true;
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PERFORMANCE_PROFILE.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function frame(time) {
  const minFrameTime = 1000 / PERFORMANCE_PROFILE.targetFps;
  if (time - lastRenderedFrame < minFrameTime - 0.5) return;
  const delta = Math.min(0.05, lastFrame ? (time - lastFrame) / 1000 : 1 / 60);
  lastFrame = time;
  lastRenderedFrame = time;
  elapsed += delta;

  if (state === GAME_STATE.MENU) {
    camera.position.set(Math.sin(elapsed * 0.08) * 1.8, 3.7, 18.5);
    camera.lookAt(0, 1.1, -3);
  } else if (state === GAME_STATE.PLAYING) {
    runTime += delta;
    if (keys.has('Mouse0')) fireWeapon();
    updatePlayer(delta);
    updateEnemies(delta);
    updateWave(delta);
    hudTimer -= delta;
    if (hudTimer <= 0) {
      updateHUD();
      hudTimer = PERFORMANCE_PROFILE.hudInterval;
    }
  }

  updateEffects(delta);
  updateSceneAnimations(delta);
  // RafraÃ®chissement espacÃ© de la shadow map : les ennemis bougent et
  // projettent une ombre, mais 20 Hz suffisent et coÃ»tent bien moins cher.
  if (PERFORMANCE_PROFILE.shadows && state === GAME_STATE.PLAYING) {
    shadowFrameCounter += 1;
    if (shadowFrameCounter >= SHADOW_REFRESH_FRAMES) {
      shadowFrameCounter = 0;
      renderer.shadowMap.needsUpdate = true;
    }
  } else {
    renderer.shadowMap.needsUpdate = true;
  }
  renderer.render(scene, camera);
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.05, 180);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  raycaster = new THREE.Raycaster();
  initRenderer();
  createEnvironment();
  syncRaycastTargets();
  weapon = createWeapon();
  assassinWeapon = createAssassinWeapon();
  resetStats();
  applyWeaponVisual();
  resetCamera();
  updateMapUI();
  updateClassUI();
  initEvents();
  window.addEventListener('resize', resize);
  resize();
  updateCreditsUI();
  const restoreNotice = readStorage(STORAGE_KEYS.restoreNotice, '');
  if (restoreNotice) {
    writeStorage(STORAGE_KEYS.restoreNotice, '');
    showSaveStatus(restoreNotice, 'success');
  }
  ui.soundButton.classList.toggle('muted', !soundEnabled);

  window.setTimeout(() => ui.loading.classList.add('done'), 480);
  renderer.setAnimationLoop(frame);
}

try {
  init();
} catch (error) {
  console.error(error);
  ui.loading.innerHTML = `
    <div style="max-width:520px;padding:28px;text-align:center;border:1px solid #ff3158;color:#ff9bab;font:12px monospace;line-height:1.6">
      <strong>INITIALISATION IMPOSSIBLE</strong><br><br>
      WebGL 2 est nÃ©cessaire pour lancer Nexus Breach.<br>
      VÃ©rifiez l'accÃ©lÃ©ration matÃ©rielle de votre navigateur, puis rechargez la page.
    </div>
  `;
}
