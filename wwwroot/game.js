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
  menuCredits: document.querySelector('#menu-credits'),
  hudCredits: document.querySelector('#credits-value'),
  sectorValue: document.querySelector('#sector-value'),
  mapButtons: Array.from(document.querySelectorAll('[data-map-index]')),
  mapDescription: document.querySelector('#map-description'),
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

const MAP_DEFINITIONS = [
  {
    id: 'nexus',
    name: 'SECTEUR 07 // NEXUS',
    short: 'NEXUS',
    description: 'Arena initiale du protocole Nexus.',
    background: 0x07131b,
    fogColor: 0x07131b,
    fogDensity: 0.022,
    hemisphereSky: 0x6cdfff,
    hemisphereGround: 0x120d15,
    keyLight: 0xb9f5ff,
    floorColor: 0x243a45,
    wallColor: 0x14232c,
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
    description: 'Zone de forge hostile : quatre machines d’élite, plus résistantes et plus mortelles.',
    background: 0x160b13,
    fogColor: 0x160b13,
    fogDensity: 0.028,
    hemisphereSky: 0xffb56b,
    hemisphereGround: 0x160b18,
    keyLight: 0xffd1ae,
    floorColor: 0x3b222b,
    wallColor: 0x281722,
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
    enemyHealthMultiplier: 1.15,
    enemySpeedMultiplier: 1.06,
    enemyDamageMultiplier: 1.22,
    attackCooldownMultiplier: 0.88,
    scoreMultiplier: 1.35
  }
];

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
    name: 'Rôdeur',
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
    name: 'Rôdeur de Braise',
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

const UPGRADE_DEFINITIONS = {
  damage: {
    name: 'Canon amplifié',
    description: '+32 % de dégâts par tir.',
    short: 'PUISSANCE',
    color: '#ff6b2c',
    max: 6,
    icon: '<path d="M9 35h27l14-9v-9L36 26H9l-5-8 5-8 5 8Zm8 0v13m8-13v13m-16-18 5 5 7-9"/><circle cx="46" cy="21" r="4"/>'
  },
  fireRate: {
    name: 'Gâche rapide',
    description: '+24 % de vitesse de tir.',
    short: 'CADENCE',
    color: '#00f5ff',
    max: 6,
    icon: '<path d="M36 7 17 29h13l-5 19 22-27H33l3-14Z"/><path d="M8 13h8M6 21h7M8 29h8M49 48h7M48 40h6"/>'
  },
  magazine: {
    name: 'Chargeur étendu',
    description: '+8 munitions par chargeur.',
    short: 'CAPACITÉ',
    color: '#62ff9a',
    max: 6,
    icon: '<path d="M12 15h40v34H12zM20 22h24v20H20zM24 8h16v7M32 27v10m-5-5h10"/>'
  },
  reload: {
    name: 'Recharge instantanée',
    description: '-24 % de temps de recharge.',
    short: 'RECHARGE',
    color: '#9b78ff',
    max: 5,
    icon: '<path d="M50 24A18 18 0 1 0 48 39M50 11v15H35M23 31h15M30.5 23.5v15"/>'
  },
  armor: {
    name: 'Exosquelette',
    description: '+28 PV maximum et soin immédiat.',
    short: 'ARMURE',
    color: '#5ca8ff',
    max: 7,
    icon: '<path d="M32 7 52 16v15c0 13-9 24-20 29C21 55 12 44 12 31V16L32 7Z"/><path d="M32 18v29M20 25l12 8 12-8M20 40l12-7 12 7"/>'
  },
  speed: {
    name: 'Propulseurs',
    description: '+13 % de vitesse de déplacement.',
    short: 'MOBILITÉ',
    color: '#22e6a8',
    max: 5,
    icon: '<path d="M31 6 18 34h12l-4 25 19-35H33l5-18Z"/><path d="M9 14h12M7 24h10M9 34h12M47 49h9"/>'
  },
  pierce: {
    name: 'Rayons perforants',
    description: 'Touchez un hostile supplémentaire par tir.',
    short: 'PERFORATION',
    color: '#f6e45c',
    max: 3,
    icon: '<path d="m8 32 17-17 8 8L16 40l-8-8Z"/><path d="m25 15 8-8 8 8-8 8M34 39l8-8 12 12-8 8-12-12Z"/><path d="m45 12 10-5M41 18l12 2"/>'
  },
  repair: {
    name: 'Nanites réparateurs',
    description: 'Récupérez +1,2 PV par seconde.',
    short: 'RÉGÉNÉRATION',
    color: '#ff77c8',
    max: 6,
    icon: '<path d="M32 55S8 42 8 23C8 12 22 7 32 20 42 7 56 12 56 23c0 19-24 32-24 32Z"/><path d="M20 28h8l3-6 4 13 3-7h8"/>'
  },
  stabilize: {
    name: 'Stabilisateurs',
    description: 'Réduisez les dégâts subis de 18 %.',
    short: 'STABILITÉ',
    color: '#72d8ff',
    max: 4,
    icon: '<path d="M32 6v52M8 18l48 28M56 18 8 46M8 32h48"/><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="10"/>'
  }
};

// Armes permanentes disponibles dans l'atelier.
const WEAPON_DEFINITIONS = {
  pulse: {
    id: 'pulse',
    name: 'AR-9 // PULSE',
    short: 'PULSE',
    description: 'Arme de départ équilibrée, précise et fiable.',
    price: 0,
    damage: CONFIG.baseDamage,
    fireRate: CONFIG.baseFireRate,
    magazine: CONFIG.baseMagazine,
    reload: CONFIG.baseReload,
    pellets: 1,
    spread: 0,
    pierce: 0,
    range: CONFIG.interactionRange,
    accuracy: 100,
    headshotMultiplier: 1.65,
    special: 'ÉQUILIBRÉ',
    color: '#00f5ff',
    energyColor: 0x00f5ff,
    accentColor: 0xff4d22,
    tracerColor: 0x9cffff,
    visualScale: 1,
    icon: '<path d="M9 35h27l14-9v-9L36 26H9l-5-8 5-8 5 8Zm8 0v13m8-13v13m-16-18 5 5 7-9"/><circle cx="46" cy="21" r="4"/>'
  },
  scatter: {
    id: 'scatter',
    name: 'SCATTER-7 // BREACH',
    short: 'SCATTER',
    description: '7 projectiles dispersés pour nettoyer les groupes.',
    price: 450,
    damage: 16,
    fireRate: 1.65,
    magazine: 7,
    reload: 1.9,
    pellets: 7,
    spread: 0.075,
    pierce: 0,
    range: 38,
    accuracy: 62,
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
    name: 'NOVA-12 // SWARM',
    short: 'NOVA',
    description: 'Cadence élevée et chargeur generous pour garder la pression.',
    price: 650,
    damage: 10,
    fireRate: 13,
    magazine: 42,
    reload: 1.55,
    pellets: 1,
    spread: 0.025,
    pierce: 0,
    range: 55,
    accuracy: 88,
    headshotMultiplier: 1.4,
    special: 'CADENCE',
    color: '#62ff9a',
    energyColor: 0x62ff9a,
    accentColor: 0x00f5ff,
    tracerColor: 0x9affc4,
    visualScale: 0.9,
    icon: '<path d="M10 29h29l12-7v-6l-12 7H10L6 16l4-7 5 7v13Z"/><path d="M17 25v14M25 25v14M33 25v14M45 18h10M44 26h9M18 39h9l5 9h-9Z"/>'
  },
  rail: {
    id: 'rail',
    name: 'LANCE-01 // RAIL',
    short: 'RAIL',
    description: 'Tir lent et dévastateur qui traverse plusieurs hostiles.',
    price: 950,
    damage: 125,
    fireRate: 0.95,
    magazine: 4,
    reload: 2.15,
    pellets: 1,
    spread: 0,
    pierce: 2,
    range: 110,
    accuracy: 100,
    headshotMultiplier: 2.1,
    special: 'PERFORATION',
    color: '#b17cff',
    energyColor: 0xb17cff,
    accentColor: 0x00f5ff,
    tracerColor: 0xe1c3ff,
    visualScale: 1.12,
    icon: '<path d="M7 32h39l11-7v-6l-11 7H7l-4-7 4-7Z"/><path d="M17 25v14M25 25v14M33 25v14M46 15h11M47 49h10"/><circle cx="51" cy="32" r="4"/>'
  },
  vector: {
    id: 'vector',
    name: 'VECTOR-6 // HEADHUNTER',
    short: 'VECTOR',
    description: 'Revolver de précision avec un bonus de dégâts headshot.',
    price: 800,
    damage: 72,
    fireRate: 1.8,
    magazine: 6,
    reload: 1.65,
    pellets: 1,
    spread: 0.003,
    pierce: 0,
    range: 90,
    accuracy: 99,
    headshotMultiplier: 2.5,
    special: 'HEADSHOT',
    color: '#ffcf4a',
    energyColor: 0xffcf4a,
    accentColor: 0xff3158,
    tracerColor: 0xfff0a6,
    visualScale: 0.96,
    icon: '<path d="M10 28h31l9-6v-6l-9 6H10L6 15l4-7 5 7v13Z"/><path d="M18 25v14M25 25v14M33 25v14M19 39h9l5 9h-9Z"/><circle cx="45" cy="18" r="3"/>'
  },
  inferno: {
    id: 'inferno',
    name: 'PYRO-4 // INFERNO',
    short: 'INFERNO',
    description: 'Flammèche rapprochée qui laisse les ennemis brûler.',
    price: 1200,
    damage: 5,
    fireRate: 18,
    magazine: 80,
    reload: 2.4,
    pellets: 3,
    spread: 0.11,
    pierce: 0,
    range: 22,
    accuracy: 55,
    headshotMultiplier: 1.3,
    burnDamage: 4,
    burnDuration: 2.5,
    special: 'BRÛLURE',
    color: '#ff6b2c',
    energyColor: 0xff6b2c,
    accentColor: 0xffd166,
    tracerColor: 0xffb05c,
    visualScale: 0.94,
    icon: '<path d="M12 45c-5-8 2-13 2-21 6 5 7 9 4 14 7-4 8-11 5-18 12 8 17 18 11 27-4 6-11 8-17 5Z"/><path d="M32 10c7 10 8 18 3 26-3 4-8 5-12 2 5-2 7-6 5-11 5 3 7 7 6 12"/>'
  },
  cryo: {
    id: 'cryo',
    name: 'FROST-3 // CRYO',
    short: 'CRYO',
    description: 'Projectiles glaciers qui ralentissent les hostiles.',
    price: 1000,
    damage: 14,
    fireRate: 4.2,
    magazine: 18,
    reload: 1.8,
    pellets: 2,
    spread: 0.025,
    pierce: 0,
    range: 60,
    accuracy: 90,
    headshotMultiplier: 1.5,
    slowMultiplier: 0.45,
    slowDuration: 2.2,
    special: 'RALENTIT',
    color: '#72d8ff',
    energyColor: 0x72d8ff,
    accentColor: 0xb17cff,
    tracerColor: 0xc9f5ff,
    visualScale: 1,
    icon: '<path d="M32 6v52M8 18l48 28M56 18 8 46M8 32h48"/><circle cx="32" cy="32" r="24"/><path d="m25 25 14 14M39 25 25 39"/>'
  },
  plasma: {
    id: 'plasma',
    name: 'ARC-9 // PLASMA',
    short: 'PLASMA',
    description: 'Boules de plasma qui explosent à l’impact.',
    price: 1500,
    damage: 55,
    fireRate: 2.2,
    magazine: 12,
    reload: 2,
    pellets: 1,
    spread: 0.01,
    pierce: 0,
    range: 75,
    accuracy: 95,
    headshotMultiplier: 1.7,
    explosionRadius: 3.8,
    explosionDamage: 42,
    special: 'EXPLOSION',
    color: '#ff77c8',
    energyColor: 0xff77c8,
    accentColor: 0x9b78ff,
    tracerColor: 0xffb4e2,
    visualScale: 1.05,
    icon: '<circle cx="32" cy="32" r="10"/><path d="M32 6v10M32 48v10M6 32h10M48 32h10M13 13l8 8M43 43l8 8M51 13l-8 8M21 43l-8 8"/><path d="m26 32 6-10 6 10-6 10Z"/>'
  }
};

// Capacités actives achetées dans l'atelier et déclenchées avec le clic droit.
const ABILITY_DEFINITIONS = {
  nova: {
    id: 'nova',
    name: 'NOVA PULSE',
    short: 'NOVA',
    description: 'Détonation de zone qui touche tous les hostiles autour de toi.',
    price: 500,
    cooldown: 12,
    duration: 0,
    radius: 10,
    damage: 90,
    effect: 'DÉGÂTS DE ZONE',
    color: '#ffcf4a',
    icon: '<circle cx="32" cy="32" r="9"/><circle cx="32" cy="32" r="23"/><path d="M32 4v12M32 48v12M4 32h12M48 32h12M12 12l9 9M43 43l9 9M52 12l-9 9M21 43l-9 9"/>'
  },
  cryo: {
    id: 'cryo',
    name: 'CRYO FIELD',
    short: 'CRYO',
    description: 'Gèle la zone et ralentit fortement les ennemis qui s’y trouvent.',
    price: 650,
    cooldown: 16,
    duration: 4,
    radius: 14,
    slowMultiplier: 0.25,
    slowDuration: 4,
    effect: 'RALENTISSEMENT',
    color: '#72d8ff',
    icon: '<path d="M32 6v52M8 18l48 28M56 18 8 46M8 32h48"/><circle cx="32" cy="32" r="24"/><path d="m25 25 14 14M39 25 25 39"/>'
  },
  aegis: {
    id: 'aegis',
    name: 'AEGIS SHIELD',
    short: 'AEGIS',
    description: 'Déploiement temporaire qui absorbe une grande partie des dégâts.',
    price: 800,
    cooldown: 20,
    duration: 6,
    damageReduction: 0.65,
    effect: 'PROTECTION',
    color: '#5ca8ff',
    icon: '<path d="M32 7 52 16v15c0 13-9 24-20 29C21 55 12 44 12 31V16L32 7Z"/><path d="M32 18v29M20 25l12 8 12-8M20 40l12-7 12 7"/>'
  },
  overload: {
    id: 'overload',
    name: 'OVERLOAD CORE',
    short: 'OVERDRIVE',
    description: 'Surcharge l’arme : dégâts et cadence augmentés pendant 7 secondes.',
    price: 1000,
    cooldown: 24,
    duration: 7,
    damageMultiplier: 1.5,
    fireRateMultiplier: 1.6,
    effect: 'SURCHARGE',
    color: '#ff77c8',
    icon: '<path d="m36 7-19 22h13l-5 19 22-27H33l3-14Z"/><path d="M8 13h8M6 21h7M8 29h8M49 48h7M48 40h6"/>'
  }
};

// Équipements permanents achetés avec les crédits gagnés à la mort.
const META_EQUIPMENT = [
  {
    id: 'reinforcedCore',
    name: 'Noyau blindé',
    short: 'BLINDAGE',
    description: '+18 PV maximum par niveau.',
    color: '#5ca8ff',
    maxLevel: 5,
    baseCost: 180,
    costGrowth: 1.5,
    icon: '<path d="M32 7 52 16v15c0 13-9 24-20 29C21 55 12 44 12 31V16L32 7Z"/><path d="M32 18v29M20 25l12 8 12-8M20 40l12-7 12 7"/>'
  },
  {
    id: 'pulseCoil',
    name: 'Bobine pulsante',
    short: 'DOMMAGE',
    description: '+10 % de dégâts par niveau.',
    color: '#ff6b2c',
    maxLevel: 5,
    baseCost: 230,
    costGrowth: 1.55,
    icon: '<path d="M36 7 17 29h13l-5 19 22-27H33l3-14Z"/><path d="M8 13h8M6 21h7M8 29h8M49 48h7M48 40h6"/>'
  },
  {
    id: 'overclock',
    name: 'Déclencheur surcadencé',
    short: 'CADENCE',
    description: '+9 % de vitesse de tir par niveau.',
    color: '#00f5ff',
    maxLevel: 5,
    baseCost: 210,
    costGrowth: 1.5,
    icon: '<circle cx="32" cy="32" r="20"/><path d="M32 7v10M32 47v10M7 32h10M47 32h10M14 14l7 7M43 43l7 7M50 14l-7 7M21 43l-7 7"/><circle cx="32" cy="32" r="5"/>'
  },
  {
    id: 'tacticalMagazine',
    name: 'Chargeur tactique',
    short: 'MUNITIONS',
    description: '+6 munitions par niveau.',
    color: '#62ff9a',
    maxLevel: 5,
    baseCost: 160,
    costGrowth: 1.45,
    icon: '<path d="M12 15h40v34H12zM20 22h24v20H20zM24 8h16v7M32 27v10m-5-5h10"/>'
  },
  {
    id: 'neuralShield',
    name: 'Réseau neural',
    short: 'STABILITÉ',
    description: '-4 % de dégâts subis par niveau.',
    color: '#72d8ff',
    maxLevel: 4,
    baseCost: 280,
    costGrowth: 1.6,
    icon: '<path d="M32 6v52M8 18l48 28M56 18 8 46M8 32h48"/><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="10"/>'
  },
  {
    id: 'servoMotors',
    name: 'Servomoteurs',
    short: 'MOBILITÉ',
    description: '+6 % de vitesse de déplacement par niveau.',
    color: '#22e6a8',
    maxLevel: 4,
    baseCost: 190,
    costGrowth: 1.5,
    icon: '<path d="M31 6 18 34h12l-4 25 19-35H33l5-18Z"/><path d="M9 14h12M7 24h10M9 34h12M47 49h9"/>'
  },
  {
    id: 'naniteCore',
    name: 'Nanites de terrain',
    short: 'RÉGÉNÉRATION',
    description: '+0,3 PV régénérés par seconde et par niveau.',
    color: '#ff77c8',
    maxLevel: 4,
    baseCost: 240,
    costGrowth: 1.55,
    icon: '<path d="M32 55S8 42 8 23C8 12 22 7 32 20 42 7 56 12 56 23c0 19-24 32-24 32Z"/><path d="M20 28h8l3-6 4 13 3-7h8"/>'
  },
  {
    id: 'piercingCore',
    name: 'R munition perforante',
    short: 'PERFORATION',
    description: '+1 cible supplémentaire par niveau.',
    color: '#f6e45c',
    maxLevel: 2,
    baseCost: 340,
    costGrowth: 1.7,
    icon: '<path d="m8 32 17-17 8 8L16 40l-8-8Z"/><path d="m25 15 8-8 8 8-8 8M34 39l8-8 12 12-8 8-12-12Z"/><path d="m45 12 10-5M41 18l12 2"/>'
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
  damage: CONFIG.baseDamage,
  fireRate: CONFIG.baseFireRate,
  weaponId: 'pulse',
  weaponRange: CONFIG.interactionRange,
  weaponPellets: 1,
  weaponSpread: 0,
  abilityId: '',
  abilityCooldown: 0,
  abilityTimer: 0,
  overdriveTimer: 0,
  magazineSize: CONFIG.baseMagazine,
  ammo: CONFIG.baseMagazine,
  reloadTime: CONFIG.baseReload,
  reloadRemaining: 0,
  fireCooldown: 0,
  regen: 0,
  damageReduction: 0,
  pierce: 0,
  upgrades: Object.fromEntries(Object.keys(UPGRADE_DEFINITIONS).map((key) => [key, 0])),
  recoil: 0,
  shake: 0,
  invulnerable: 0,
  bobTime: 0,
  moving: false
};

let scene;
let camera;
let renderer;
let weapon;
let muzzleFlash;
let muzzleLight;
let raycaster;

const STORAGE_KEYS = Object.freeze({
  bestScore: 'nexus-breach-best',
  credits: 'nexus-breach-credits',
  equipment: 'nexus-breach-equipment',
  weapons: 'nexus-breach-weapons',
  equippedWeapon: 'nexus-breach-equipped-weapon',
  abilities: 'nexus-breach-abilities',
  equippedAbility: 'nexus-breach-equipped-ability',
  map: 'nexus-breach-map'
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
let ownedAbilities = readOwnedAbilities();
let equippedAbility = readEquippedAbility();
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
const hudCache = Object.create(null);

const keys = new Set();
const enemies = [];
const enemyTargets = [];
const arenaTargets = [];
const obstacles = [];
const particles = [];
const tracers = [];
const ripples = [];
const animatedRings = [];
const spawnPads = [];

const NAV_CELL_SIZE = 1.5;
const NAV_GRID_SIZE = 30;
const navWalkable = new Uint8Array(NAV_GRID_SIZE * NAV_GRID_SIZE);
const navDistance = new Int32Array(NAV_GRID_SIZE * NAV_GRID_SIZE);
let navTimer = 0;

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
    // La progression reste disponible en mémoire si le stockage est bloqué.
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
    // Un profil corrompu ne doit pas empêcher de jouer.
  }
  return equipment;
}

function readOwnedWeapons() {
  const owned = { pulse: true };
  try {
    const saved = JSON.parse(readStorage(STORAGE_KEYS.weapons, '{}'));
    Object.keys(WEAPON_DEFINITIONS).forEach((id) => {
      if (id === 'pulse' || saved?.[id] === true) owned[id] = true;
    });
  } catch {
    // Un inventaire corrompu conserve au minimum l'arme de départ.
  }
  return owned;
}

function readEquippedWeapon() {
  const saved = readStorage(STORAGE_KEYS.equippedWeapon, 'pulse');
  return WEAPON_DEFINITIONS[saved] && ownedWeapons[saved] ? saved : 'pulse';
}

function readOwnedAbilities() {
  const owned = {};
  try {
    const saved = JSON.parse(readStorage(STORAGE_KEYS.abilities, '{}'));
    Object.keys(ABILITY_DEFINITIONS).forEach((id) => {
      if (saved?.[id] === true) owned[id] = true;
    });
  } catch {
    // Une sauvegarde invalide laisse simplement le joueur sans capacité.
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
  writeStorage(STORAGE_KEYS.abilities, JSON.stringify(ownedAbilities));
  writeStorage(STORAGE_KEYS.equippedAbility, equippedAbility);
}

function updateMapUI() {
  const map = MAP_DEFINITIONS[currentMapIndex];
  if (ui.sectorValue) ui.sectorValue.textContent = map.name;
  if (ui.mapDescription) ui.mapDescription.textContent = map.description;
  ui.mapButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.mapIndex) === currentMapIndex);
  });
}

function selectMap(index) {
  if (!MAP_DEFINITIONS[index] || index === currentMapIndex) return;
  writeStorage(STORAGE_KEYS.map, String(index));
  window.location.reload();
}

function getWeaponDefinition(id) {
  return WEAPON_DEFINITIONS[id] || WEAPON_DEFINITIONS.pulse;
}

function ownsWeapon(id) {
  return id === 'pulse' || ownedWeapons[id] === true;
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
  return Math.max(1, Math.round(item.baseCost * item.costGrowth ** Math.max(0, nextLevel - 1)));
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
    pierce: 0
  };

  META_EQUIPMENT.forEach((item) => {
    const level = getEquipmentLevel(item.id);
    switch (item.id) {
      case 'reinforcedCore':
        stats.maxHealth += 18 * level;
        break;
      case 'pulseCoil':
        stats.damageMultiplier += 0.1 * level;
        break;
      case 'overclock':
        stats.fireRateMultiplier += 0.09 * level;
        break;
      case 'tacticalMagazine':
        stats.magazine += 6 * level;
        break;
      case 'neuralShield':
        stats.damageReduction += 0.04 * level;
        break;
      case 'servoMotors':
        stats.speedMultiplier += 0.06 * level;
        break;
      case 'naniteCore':
        stats.regen += 0.3 * level;
        break;
      case 'piercingCore':
        stats.pierce += level;
        break;
      default:
        break;
    }
  });

  stats.damageReduction = Math.min(0.6, stats.damageReduction);
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
  if (!ui.shopItems || !ui.shopWeapons || !ui.shopAbilities) return;
  ui.shopItems.innerHTML = '';
  ui.shopWeapons.innerHTML = '';
  ui.shopAbilities.innerHTML = '';
  let installedCount = 0;

  Object.values(WEAPON_DEFINITIONS).forEach((weapon) => {
    const owned = ownsWeapon(weapon.id);
    const selected = equippedWeapon === weapon.id;
    const canBuy = credits >= weapon.price;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `shop-item weapon-item${selected ? ' weapon-selected' : ''}`;
    card.style.setProperty('--shop-color', weapon.color);
    card.disabled = selected || (!owned && !canBuy);
    card.setAttribute('aria-label', `${weapon.name}, ${owned ? 'possédée' : 'non possédée'}`);

    const action = selected
      ? '<span class="shop-maxed">ÉQUIPÉE</span>'
      : owned
        ? '<span class="shop-cost">ÉQUIPER</span><small>ACTIVER</small>'
        : `<span class="shop-cost">${formatCredits(weapon.price)} CR</span><small>ACHETER</small>`;
    const projectileStat = weapon.pellets > 1 ? `<span>PROJECTILES <b>${weapon.pellets}</b></span>` : '';
    const pierceStat = weapon.pierce > 0 ? `<span>PERFORATION <b>${weapon.pierce + 1}</b></span>` : '';
    const accuracy = weapon.accuracy ?? Math.round(Math.max(0, 100 - weapon.spread * 450));
    const headshot = weapon.headshotMultiplier ?? 1.65;
    const special = weapon.special || 'STANDARD';
    const recoil = {
      pulse: 'FAIBLE', scatter: 'MOYEN', smg: 'TRÈS FAIBLE', rail: 'ÉLEVÉ',
      vector: 'MOYEN', inferno: 'FAIBLE', cryo: 'MOYEN', plasma: 'ÉLEVÉ'
    }[weapon.id] || 'MOYEN';
    const stats = [
      `<span>DMG <b>${weapon.damage}</b></span>`,
      `<span>DPS <b>${Math.round(weapon.damage * weapon.fireRate * weapon.pellets)}</b></span>`,
      `<span>CADENCE <b>${weapon.fireRate.toFixed(1)}</b></span>`,
      `<span>CHARGEUR <b>${weapon.magazine}</b></span>`,
      `<span>PORTÉE <b>${weapon.range} m</b></span>`,
      `<span>PRÉCISION <b>${accuracy}%</b></span>`,
      `<span>TÊTE <b>${headshot.toFixed(1)}x</b></span>`,
      `<span>RECHARGE <b>${weapon.reload.toFixed(2)}s</b></span>`,
      `<span>RECUL <b>${recoil}</b></span>`,
      projectileStat,
      pierceStat,
      `<span>EFFET <b>${special}</b></span>`
    ].join('');

    card.innerHTML = `
      <span class="shop-item-top"><span>${weapon.short}</span><span>${selected ? 'ACTIVE' : owned ? 'POSSÉDÉE' : 'VERROUILLÉE'}</span></span>
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

  Object.values(ABILITY_DEFINITIONS).forEach((ability) => {
    const owned = ownsAbility(ability.id);
    const selected = equippedAbility === ability.id;
    const canBuy = credits >= ability.price;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `shop-item ability-item${selected ? ' ability-selected' : ''}`;
    card.style.setProperty('--shop-color', ability.color);
    card.disabled = selected || (!owned && !canBuy);
    card.setAttribute('aria-label', `${ability.name}, ${owned ? 'possédée' : 'non possédée'}`);

    const action = selected
      ? '<span class="shop-maxed">ÉQUIPÉE</span>'
      : owned
        ? '<span class="shop-cost">ÉQUIPER</span><small>ACTIVER</small>'
        : `<span class="shop-cost">${formatCredits(ability.price)} CR</span><small>ACHETER</small>`;
    const duration = ability.duration > 0 ? `${ability.duration}s` : 'INSTANT';
    const stats = [
      `<span>RECHARGE <b>${ability.cooldown}s</b></span>`,
      `<span>DUREE <b>${duration}</b></span>`,
      `<span>RAYON <b>${ability.radius || '—'}</b></span>`,
      `<span>EFFET <b>${ability.effect}</b></span>`
    ].join('');

    card.innerHTML = `
      <span class="shop-item-top"><span>${ability.short}</span><span>${selected ? 'ACTIVE' : owned ? 'POSSÉDÉE' : 'VERROUILLÉE'}</span></span>
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

  META_EQUIPMENT.forEach((item) => {
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
      ? '<span class="shop-maxed">ÉQUIPÉ // MAX</span>'
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

  const ownedWeaponsCount = Object.values(ownedWeapons).filter(Boolean).length;
  const ownedAbilitiesCount = Object.values(ownedAbilities).filter(Boolean).length;
  ui.shopOwnedCount.textContent = `${ownedWeaponsCount} / ${Object.keys(WEAPON_DEFINITIONS).length} ARMES // ${ownedAbilitiesCount} / ${Object.keys(ABILITY_DEFINITIONS).length} CAPACITÉS // ${installedCount} / ${META_EQUIPMENT.length} MODULES`;
  updateCreditsUI();
}

function buyWeapon(id) {
  if (state !== GAME_STATE.SHOP) return;
  const weapon = WEAPON_DEFINITIONS[id];
  if (!weapon || ownsWeapon(id) || credits < weapon.price) return;
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
  if (!ability || ownsAbility(id) || credits < ability.price) return;
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

function resetStats() {
  const permanent = getPermanentStats();
  const weaponDefinition = getWeaponDefinition(equippedWeapon);
  player.weaponId = weaponDefinition.id;
  player.abilityId = equippedAbility;
  Object.assign(player, {
    health: CONFIG.baseHealth + permanent.maxHealth,
    maxHealth: CONFIG.baseHealth + permanent.maxHealth,
    speed: CONFIG.baseSpeed * permanent.speedMultiplier,
    damage: weaponDefinition.damage * permanent.damageMultiplier,
    fireRate: weaponDefinition.fireRate * permanent.fireRateMultiplier,
    weaponRange: weaponDefinition.range,
    weaponPellets: weaponDefinition.pellets,
    weaponSpread: weaponDefinition.spread,
    abilityCooldown: 0,
    abilityTimer: 0,
    overdriveTimer: 0,
    magazineSize: weaponDefinition.magazine + permanent.magazine,
    ammo: weaponDefinition.magazine + permanent.magazine,
    reloadTime: weaponDefinition.reload * permanent.reloadMultiplier,
    reloadRemaining: 0,
    fireCooldown: 0,
    regen: permanent.regen,
    damageReduction: permanent.damageReduction,
    pierce: weaponDefinition.pierce + permanent.pierce,
    recoil: 0,
    shake: 0,
    invulnerable: 0,
    bobTime: 0
  });
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

function clearDynamicObjects() {
  enemies.splice(0).forEach((enemy) => {
    scene.remove(enemy.root);
    disposeEnemy(enemy);
  });
  enemyTargets.length = 0;
  navTimer = 0;
  particles.splice(0).forEach((particle) => scene.remove(particle.mesh));
  tracers.splice(0).forEach((tracer) => scene.remove(tracer.line));
  ripples.splice(0).forEach((ripple) => scene.remove(ripple.mesh));
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
  context.fillStyle = '#0d1a23';
  context.fillRect(0, 0, 512, 512);
  context.strokeStyle = 'rgba(0, 245, 255, 0.14)';
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
  context.strokeStyle = 'rgba(0, 245, 255, 0.3)';
  context.lineWidth = 4;
  context.strokeRect(4, 4, 504, 504);
  for (let i = 0; i < 70; i += 1) {
    context.fillStyle = `rgba(140, 235, 245, ${Math.random() * 0.035})`;
    context.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 35, Math.random() * 3);
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
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
  return new THREE.CanvasTexture(textureCanvas);
}

function createEnvironment() {
  const map = MAP_DEFINITIONS[currentMapIndex];
  scene.background = new THREE.Color(map.background);
  scene.fog = new THREE.FogExp2(map.fogColor, map.fogDensity);

  const hemisphere = new THREE.HemisphereLight(map.hemisphereSky, map.hemisphereGround, 1.45);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(map.keyLight, 2.05);
  keyLight.position.set(10, 28, 12);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
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
    roughness: 0.72,
    metalness: 0.55
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.arenaSize, CONFIG.arenaSize), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const underfloor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshBasicMaterial({ color: 0x030b11, transparent: true, opacity: 0.55 })
  );
  underfloor.rotation.x = -Math.PI / 2;
  underfloor.position.y = -0.04;
  scene.add(underfloor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: map.wallColor, roughness: 0.46, metalness: 0.78 });
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
    wall.castShadow = true;
    wall.receiveShadow = true;
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
    const material = new THREE.MeshStandardMaterial({ color: 0x0c1820, roughness: 0.42, metalness: 0.8 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    block.position.set(x, height / 2, z);
    block.castShadow = true;
    block.receiveShadow = true;
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

  const pillarMaterial = new THREE.MeshStandardMaterial({ color: map.wallColor, roughness: 0.38, metalness: 0.84 });
  map.pillars.forEach(([x, z], index) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 5.8, 8), pillarMaterial);
    pillar.position.set(x, 2.9, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
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
    new THREE.MeshStandardMaterial({ color: map.wallColor, metalness: 0.86, roughness: 0.35 })
  );
  coreBase.position.y = 0.33;
  coreBase.castShadow = true;
  coreBase.receiveShadow = true;
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
    new THREE.PointsMaterial({ color: 0x8eeeff, size: 0.085, transparent: true, opacity: 0.72, sizeAttenuation: true })
  );
  scene.add(stars);
  animatedRings.push({ mesh: stars, speed: 0.001, axis: 'menu' });
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
  applyWeaponVisual(group);
  camera.add(group);
  return group;
}

function applyWeaponVisual(target = weapon) {
  if (!target) return;
  const definition = getWeaponDefinition(player.weaponId);
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
  const background = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x101820, transparent: true, opacity: 0.9, depthTest: false }));
  background.scale.set(1.05, 0.1, 1);
  background.renderOrder = 20;
  group.add(background);

  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color, depthTest: false }));
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
  const levelScale = 1 + Math.max(0, level - 1) * 0.17;
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
  root.add(auraLight);

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 1), materials.body);
  body.position.y = 0.92;
  body.scale.set(...(template.bodyScale || [1.08, 0.9, 0.82]));
  body.castShadow = true;
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
  head.castShadow = true;
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
    leg.castShadow = true;
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
      shoulder.castShadow = true;
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
    materials,
    hitMeshes,
    legPivots,
    healthBar: healthBar.fill,
    hp: maxHealth,
    maxHealth,
    speed: template.speed * (0.95 + Math.min(level, 20) * 0.012) * map.enemySpeedMultiplier,
    damage: template.damage * (1 + Math.max(0, level - 1) * 0.09) * map.enemyDamageMultiplier,
    radius: template.radius * template.scale,
    scale: template.scale,
    score: Math.round(template.score * (1 + (level - 1) * 0.12) * map.scoreMultiplier),
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

function isBlocked(x, z, radius) {
  const limit = CONFIG.arenaSize / 2 - 0.45;
  if (Math.abs(x) > limit || Math.abs(z) > limit) return true;
  return obstacles.some((obstacle) => {
    if (obstacle.type === 'circle') {
      const dx = x - obstacle.x;
      const dz = z - obstacle.z;
      return dx * dx + dz * dz < (radius + obstacle.radius) ** 2;
    }
    return circleHitsRect(x, z, radius, obstacle);
  });
}

function getNavIndex(x, z) {
  const column = THREE.MathUtils.clamp(Math.floor((x + CONFIG.arenaSize / 2) / NAV_CELL_SIZE), 0, NAV_GRID_SIZE - 1);
  const row = THREE.MathUtils.clamp(Math.floor((z + CONFIG.arenaSize / 2) / NAV_CELL_SIZE), 0, NAV_GRID_SIZE - 1);
  return { column, row, index: row * NAV_GRID_SIZE + column };
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
  const cellCenters = new Array(NAV_GRID_SIZE * NAV_GRID_SIZE);
  for (let row = 0; row < NAV_GRID_SIZE; row += 1) {
    for (let column = 0; column < NAV_GRID_SIZE; column += 1) {
      const index = row * NAV_GRID_SIZE + column;
      const center = getNavCenter(column, row);
      cellCenters[index] = center;
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

  const queue = new Int32Array(navWalkable.length);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  navDistance[start] = 0;
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1]
  ];
  while (head < tail) {
    const current = queue[head++];
    const currentColumn = current % NAV_GRID_SIZE;
    const currentRow = Math.floor(current / NAV_GRID_SIZE);
    for (const [columnOffset, rowOffset] of directions) {
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
      queue[tail++] = next;
    }
  }
}

function getFlowDirection(position) {
  const currentCell = getNavIndex(position.x, position.z);
  let current = currentCell.index;
  if (!navWalkable[current] || navDistance[current] < 0) {
    let nearest = -1;
    let nearestDistance = Infinity;
    for (let row = 0; row < NAV_GRID_SIZE; row += 1) {
      for (let column = 0; column < NAV_GRID_SIZE; column += 1) {
        const index = row * NAV_GRID_SIZE + column;
        if (!navWalkable[index] || navDistance[index] < 0) continue;
        const center = getNavCenter(column, row);
        const dx = center.x - position.x;
        const dz = center.z - position.z;
        const distance = dx * dx + dz * dz;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
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

  const target = getNavCenter(next % NAV_GRID_SIZE, Math.floor(next / NAV_GRID_SIZE));
  const direction = new THREE.Vector3(target.x - position.x, 0, target.z - position.z);
  return direction.lengthSq() > 0.001 ? direction.normalize() : null;
}

function moveEntity(position, dx, dz, radius) {
  const nextX = position.x + dx;
  if (!isBlocked(nextX, position.z, radius)) position.x = nextX;
  const nextZ = position.z + dz;
  if (!isBlocked(position.x, nextZ, radius)) position.z = nextZ;
}

function updatePlayer(delta) {
  player.fireCooldown = Math.max(0, player.fireCooldown - delta);
  player.abilityCooldown = Math.max(0, player.abilityCooldown - delta);
  player.abilityTimer = Math.max(0, player.abilityTimer - delta);
  player.overdriveTimer = Math.max(0, player.overdriveTimer - delta);
  abilityMessageTimer = Math.max(0, abilityMessageTimer - delta);
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  player.recoil += (0 - player.recoil) * Math.min(1, delta * 12);
  player.shake += (0 - player.shake) * Math.min(1, delta * 9);

  if (player.reloadRemaining > 0) {
    player.reloadRemaining -= delta;
    ui.reloadStatus.textContent = `RECHARGE // ${Math.max(0, player.reloadRemaining).toFixed(1)}s`;
    if (player.reloadRemaining <= 0) {
      player.reloadRemaining = 0;
      player.ammo = player.magazineSize;
      ui.reloadStatus.textContent = 'SYSTÈME PRÊT';
    }
  }

  if (player.regen > 0 && player.health < player.maxHealth) {
    player.health = Math.min(player.maxHealth, player.health + player.regen * delta);
  }

  const forwardInput = (keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const rightInput = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
    - (keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft') ? 1 : 0);
  const move = new THREE.Vector3();
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  move.addScaledVector(forward, forwardInput).addScaledVector(right, rightInput);
  if (move.lengthSq() > 1) move.normalize();
  player.moving = move.lengthSq() > 0.01;

  if (player.moving) {
    const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const shootSlow = keys.has('Mouse0') ? 0.78 : 1;
    const speed = player.speed * (sprinting ? 1.42 : 1) * shootSlow;
    player.velocity.lerp(move.multiplyScalar(speed), Math.min(1, delta * 11));
    player.bobTime += delta * (sprinting ? 13 : 9.5);
  } else {
    player.velocity.lerp(new THREE.Vector3(), Math.min(1, delta * 13));
  }

  moveEntity(player.position, player.velocity.x * delta, player.velocity.z * delta, CONFIG.playerRadius);
  const bob = player.moving ? Math.sin(player.bobTime) * 0.035 : 0;
  const shakeX = player.shake * (Math.random() - 0.5) * 0.12;
  const shakeY = player.shake * (Math.random() - 0.5) * 0.12;
  camera.position.set(player.position.x + shakeX, player.position.y + bob + shakeY, player.position.z);
  camera.rotation.set(player.pitch + player.recoil * 0.012, player.yaw, player.shake * (Math.random() - 0.5) * 0.018, 'YXZ');
  updateWeapon(delta);
}

function updateWeapon(delta) {
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
  const ability = getAbilityDefinition(player.abilityId);
  if (!ability) {
    abilityMessage = "ACHÈTE UNE CAPACITÉ DANS L'ATELIER";
    abilityMessageTimer = 1.8;
    return;
  }
  if (player.abilityCooldown > 0) {
    abilityMessage = `CAPACITÉ // RECHARGE ${player.abilityCooldown.toFixed(1)}s`;
    abilityMessageTimer = 0.8;
    return;
  }

  player.abilityCooldown = ability.cooldown;
  player.abilityTimer = ability.duration;
  const center = player.position;
  const radius = ability.radius || 0;

  if (ability.id === 'nova') {
    [...enemies].forEach((enemy) => {
      if (enemy.dead) return;
      const dx = enemy.root.position.x - center.x;
      const dz = enemy.root.position.z - center.z;
      if (dx * dx + dz * dz <= radius * radius) {
        damageEnemy(enemy, ability.damage, false, false);
      }
    });
    spawnAbilityEffect(radius, new THREE.Color(ability.color).getHex());
    abilityMessage = 'NOVA // DÉGÂTS DE ZONE';
  } else if (ability.id === 'cryo') {
    [...enemies].forEach((enemy) => {
      if (enemy.dead) return;
      const dx = enemy.root.position.x - center.x;
      const dz = enemy.root.position.z - center.z;
      if (dx * dx + dz * dz <= radius * radius) applyWeaponStatus(enemy, ability);
    });
    spawnAbilityEffect(radius, new THREE.Color(ability.color).getHex());
    abilityMessage = 'CRYO // HOSTILES RALENTIS';
  } else if (ability.id === 'aegis') {
    spawnAbilityEffect(4.5, new THREE.Color(ability.color).getHex());
    abilityMessage = 'AEGIS // BOUCLIER ACTIF';
  } else if (ability.id === 'overload') {
    player.overdriveTimer = ability.duration;
    spawnAbilityEffect(3.5, new THREE.Color(ability.color).getHex());
    abilityMessage = 'OVERDRIVE // ARME SURCHARGÉE';
  }

  abilityMessageTimer = 1.5;
  audio.ability(ability.id);
}

function fireWeapon() {
  if (state !== GAME_STATE.PLAYING || player.fireCooldown > 0 || player.reloadRemaining > 0) return;
  if (player.ammo <= 0) {
    startReload();
    return;
  }

  const weaponDefinition = getWeaponDefinition(player.weaponId);
  const overloadActive = player.overdriveTimer > 0;
  const overloadDefinition = getAbilityDefinition('overload');
  const fireRateMultiplier = overloadActive ? overloadDefinition?.fireRateMultiplier || 1 : 1;
  const damageMultiplier = overloadActive ? overloadDefinition?.damageMultiplier || 1 : 1;
  const recoilKick = player.weaponId === 'rail' ? 1.05 : player.weaponId === 'scatter' ? 0.9 : player.weaponId === 'smg' ? 0.38 : 0.7;
  const shakeAmount = player.weaponId === 'rail' ? 0.2 : player.weaponId === 'scatter' ? 0.18 : 0.11;
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
    const intersections = raycaster.intersectObjects([...arenaTargets, ...enemyTargets], false);
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
        const headshot = Boolean(intersection.object.userData.headshot);
        applyWeaponStatus(enemy, weaponDefinition);
        damageEnemy(enemy, player.damage * damageMultiplier * (headshot ? (weaponDefinition.headshotMultiplier || 1.65) : 1), headshot);
        endPoint.copy(intersection.point);
      }
    });

    applyAreaDamage(endPoint, weaponDefinition, hitEnemies);
    if (hitEnemies.size === 0) spawnImpact(endPoint, new THREE.Vector3(0, 1, 0), weaponDefinition.tracerColor, 2);
    createTracer(muzzlePosition, endPoint, hitEnemies.size > 0 ? 0xffffff : weaponDefinition.tracerColor);
  }

  if (player.ammo === 0) window.setTimeout(() => startReload(), 130);
}

function createTracer(start, end, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  tracers.push({ line, life: 0.075, maxLife: 0.075 });
}

function spawnImpact(position, normal, color, count) {
  const worldNormal = normal.clone();
  if (worldNormal.lengthSq() < 0.001 || !Number.isFinite(worldNormal.x)) worldNormal.set(0, 1, 0);
  worldNormal.normalize();
  for (let i = 0; i < count; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.035 + Math.random() * 0.035),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
    );
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
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
  );
  burst.position.copy(deathPosition);
  burst.rotation.x = Math.PI / 2;
  scene.add(burst);
  ripples.push({ mesh: burst, life: 0.45, maxLife: 0.45, startScale: 0.6, endScale: 2.2 * enemy.scale });

  for (let i = 0; i < 11; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.045 + Math.random() * 0.08),
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffffff : color })
    );
    mesh.position.copy(deathPosition);
    scene.add(mesh);
    const velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.85 + 0.1, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(2 + Math.random() * 4.5);
    particles.push({ mesh, velocity, life: 0.45 + Math.random() * 0.35, maxLife: 0.8 });
  }

  const index = enemies.indexOf(enemy);
  if (index >= 0) enemies.splice(index, 1);
  enemy.hitMeshes.forEach((mesh) => {
    const targetIndex = enemyTargets.indexOf(mesh);
    if (targetIndex >= 0) enemyTargets.splice(targetIndex, 1);
  });
  scene.remove(enemy.root);
  disposeEnemy(enemy);
}

function damagePlayer(amount) {
  if (state !== GAME_STATE.PLAYING || player.invulnerable > 0) return;
  const aegis = player.abilityId === 'aegis' && player.abilityTimer > 0 ? getAbilityDefinition('aegis') : null;
  const damageReduction = Math.max(player.damageReduction, aegis?.damageReduction || 0);
  const actualDamage = Math.max(1, amount * (1 - damageReduction));
  damageTaken += actualDamage;
  player.health = Math.max(0, player.health - actualDamage);
  player.invulnerable = 0.16;
  player.shake = 0.7;
  damageFlashTimer = 0.12;
  audio.hurt();
  if (player.health <= 0) endGame();
}

function updateEnemies(delta) {
  navTimer -= delta;
  if (navTimer <= 0) {
    rebuildFlowField();
    navTimer = 0.18;
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

    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.root.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();
    if (distance > 0.001) toPlayer.normalize();
    const attackDistance = enemy.radius * 1.45 + 0.5;
    const attackSpeed = distance > attackDistance ? enemy.speed * enemy.slowMultiplier : 0;
    if (attackSpeed > 0) {
      const flowDirection = getFlowDirection(enemy.root.position);
      const movementDirection = (flowDirection || toPlayer).clone();
      movementDirection.lerp(toPlayer, 0.12).normalize();
      movementDirection.multiplyScalar(attackSpeed * delta);
      moveEntity(enemy.root.position, movementDirection.x, movementDirection.z, enemy.radius);
    }

    for (let j = 0; j < enemies.length; j += 1) {
      if (i === j) continue;
      const other = enemies[j];
      const away = new THREE.Vector3().subVectors(enemy.root.position, other.root.position);
      away.y = 0;
      const separationDistance = away.length();
      const desired = (enemy.radius + other.radius) * 0.72;
      if (separationDistance > 0.001 && separationDistance < desired) {
        away.multiplyScalar(1 / separationDistance).multiplyScalar((desired - separationDistance) * delta * 2.2);
        moveEntity(enemy.root.position, away.x, away.z, enemy.radius);
      }
    }

    const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
    const currentYaw = enemy.root.rotation.y;
    let yawDelta = targetYaw - currentYaw;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    enemy.root.rotation.y += yawDelta * Math.min(1, delta * 5.5);

    enemy.attackCooldown -= delta;
    enemy.attackPulse = Math.max(0, enemy.attackPulse - delta * 2.2);
    if (distance < attackDistance && enemy.attackCooldown <= 0) {
      const baseAttackCooldown = enemy.elite ? 1.15 : Math.max(0.85, 1.45 - wave * 0.018);
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
  const maxConcurrent = Math.min(9, 4 + Math.floor(wave * 0.7));
  spawnTimer -= delta;
  if (waveSpawned < waveTotal && enemies.length < maxConcurrent && spawnTimer <= 0) {
    spawnEnemy();
    waveSpawned += 1;
    spawnTimer = Math.max(0.34, 1.05 - wave * 0.055) * (0.75 + Math.random() * 0.5);
  }
  const remaining = waveTotal - waveSpawned + enemies.length;
  ui.enemyValue.textContent = String(remaining).padStart(2, '0');
  if (waveSpawned >= waveTotal && enemies.length === 0) completeWave();
}

function startWave() {
  wave += 1;
  waveTotal = 4 + wave * 2 + Math.floor(wave * wave * 0.08);
  waveSpawned = 0;
  spawnTimer = 0.4;
  state = GAME_STATE.PLAYING;
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
  state = GAME_STATE.UPGRADE;
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  ui.waveBanner.classList.remove('show');
  showUpgradeChoices();
}

function getUpgradeChoices() {
  const available = Object.entries(UPGRADE_DEFINITIONS)
    .filter(([key, definition]) => player.upgrades[key] < definition.max)
    .map(([key, definition]) => ({ key, ...definition }));
  for (let i = available.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  while (available.length < 3) {
    available.push({ key: 'repair', ...UPGRADE_DEFINITIONS.repair });
  }
  return available.slice(0, 3);
}

function showUpgradeChoices() {
  ui.completedWave.textContent = String(wave).padStart(2, '0');
  ui.upgradeOptions.innerHTML = '';
  getUpgradeChoices().forEach((upgrade, index) => {
    const currentLevel = player.upgrades[upgrade.key];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upgrade-card';
    button.style.setProperty('--card-color', upgrade.color);
    const pips = Array.from({ length: upgrade.max }, (_, pipIndex) => `<i class="${pipIndex <= currentLevel ? 'active' : ''}"></i>`).join('');
    button.innerHTML = `
      <span class="card-index">OPT_0${index + 1} // ${upgrade.short}</span>
      <span class="card-visual"><svg viewBox="0 0 64 64" aria-hidden="true">${upgrade.icon}</svg></span>
      <span class="card-rarity">AMÉLIORATION // NIVEAU ${currentLevel + 1}</span>
      <h3>${upgrade.name}</h3>
      <p>${upgrade.description}</p>
      <span class="card-footer"><span class="level-pips">${pips}</span><span>INSTALLER →</span></span>
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
  player.upgrades[key] += 1;
  const definition = UPGRADE_DEFINITIONS[key];
  switch (key) {
    case 'damage':
      player.damage *= 1.32;
      break;
    case 'fireRate':
      player.fireRate *= 1.24;
      break;
    case 'magazine':
      player.magazineSize += 8;
      break;
    case 'reload':
      player.reloadTime = Math.max(0.42, player.reloadTime * 0.76);
      break;
    case 'armor':
      player.maxHealth += 28;
      player.health = Math.min(player.maxHealth, player.health + 28);
      break;
    case 'speed':
      player.speed *= 1.13;
      break;
    case 'pierce':
      player.pierce += 1;
      break;
    case 'repair':
      player.regen += 1.2;
      break;
    case 'stabilize':
      player.damageReduction = Math.min(0.68, player.damageReduction + 0.18);
      break;
    default:
      break;
  }

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
  ui.performanceRating.textContent = `PERFORMANCE // ${lastReward.rating} // ${Math.round(lastReward.accuracy * 100)}% PRÉCISION`;
  ui.rewardBreakdown.textContent = [
    `VAGUE +${formatCredits(lastReward.waveCredits)}`,
    `ÉLIMINATIONS +${formatCredits(lastReward.eliminationCredits)}`,
    `SCORE +${formatCredits(lastReward.scoreCredits)}`,
    `PRÉCISION +${formatCredits(lastReward.accuracyCredits)}`,
    `HEADSHOTS +${formatCredits(lastReward.headshotCredits)}`,
    `SURVIE +${formatCredits(lastReward.survivalCredits)}`,
    `EFFICACITÉ +${formatCredits(lastReward.efficiencyCredits)}`
  ].join(' // ');
  ui.bestScore.textContent = `MEILLEUR SCORE // ${bestScore.toLocaleString('fr-FR')}`;
  updateCreditsUI();
  ui.gameover.classList.add('active');
  audio.death();
  updateHUD();
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
  updateCreditsUI();
  ui.hud.classList.remove('hidden');
  weapon.visible = true;
  audio.ensure();
  startWave();
  requestPointerLock();
}

function setHudText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function updateHUD() {
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

  const ammo = String(player.ammo).padStart(2, '0');
  if (hudCache.ammo !== ammo) {
    ui.ammoValue.textContent = ammo;
    hudCache.ammo = ammo;
  }
  const weaponName = getWeaponDefinition(player.weaponId).name;
  if (hudCache.weaponName !== weaponName) {
    ui.weaponName.textContent = weaponName;
    hudCache.weaponName = weaponName;
  }
  const weaponStatsText = `DMG ${Math.round(player.damage)} // CAD ${player.fireRate.toFixed(1)} // ${Math.round(player.weaponRange)} M${player.weaponPellets > 1 ? ` // ${player.weaponPellets} PROJ` : ''}`;
  if (hudCache.weaponStats !== weaponStatsText) {
    ui.weaponStatsHud.textContent = weaponStatsText;
    hudCache.weaponStats = weaponStatsText;
  }
  const ability = getAbilityDefinition(player.abilityId);
  const abilityStatus = abilityMessageTimer > 0
    ? abilityMessage
    : ability
      ? player.abilityCooldown > 0
        ? `RECHARGE // ${player.abilityCooldown.toFixed(1)}s`
        : 'CLIC DROIT // PRÊT'
      : "ÉQUIPE UNE CAPACITÉ DANS L'ATELIER";
  const abilityText = ability ? ability.name : 'AUCUNE';
  if (hudCache.abilityName !== abilityText) {
    ui.abilityName.textContent = abilityText;
    hudCache.abilityName = abilityText;
  }
  if (hudCache.abilityStatus !== abilityStatus) {
    ui.abilityStatus.textContent = abilityStatus;
    hudCache.abilityStatus = abilityStatus;
  }
  ui.abilityReadout.classList.toggle('ready', Boolean(ability) && player.abilityCooldown <= 0);
  ui.abilityReadout.classList.toggle('cooling', Boolean(ability) && player.abilityCooldown > 0);
  if (player.reloadRemaining <= 0 && hudCache.reload !== 'SYSTÈME PRÊT') {
    ui.reloadStatus.classList.remove('active');
    ui.reloadStatus.textContent = 'SYSTÈME PRÊT';
    hudCache.reload = 'SYSTÈME PRÊT';
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
    ui.equipmentList.innerHTML = chips || '<span class="equipment-chip">SYSTÈME<b>STANDARD</b></span>';
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
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
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

  if (waveBannerTimer > 0) {
    waveBannerTimer -= delta;
    if (waveBannerTimer <= 0) ui.waveBanner.classList.remove('show');
  }

  damageFlashTimer = Math.max(0, damageFlashTimer - delta);
  ui.damageFlash.style.opacity = String(damageFlashTimer > 0 ? Math.min(1, damageFlashTimer * 8) : 0);
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
  if (canvas.requestPointerLock) canvas.requestPointerLock();
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
  ui.retryButton.addEventListener('click', startNewGame);
  ui.restartButton.addEventListener('click', startNewGame);
  ui.shopButton.addEventListener('click', openShop);
  ui.gameoverShopButton.addEventListener('click', openShop);
  ui.shopCloseButton.addEventListener('click', closeShop);
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
    activateAbility();
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
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyQ', 'KeyR', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === 'KeyM' && !event.repeat) {
      audio.setEnabled(!soundEnabled);
      ui.soundButton.classList.toggle('muted', !soundEnabled);
    }
    if (event.code === 'KeyR' && !event.repeat && state === GAME_STATE.PLAYING) startReload();
    if (state === GAME_STATE.PLAYING) keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === GAME_STATE.PLAYING && document.pointerLockElement === canvas) document.exitPointerLock();
  });
}

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = true;
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function frame(time) {
  const delta = Math.min(0.05, lastFrame ? (time - lastFrame) / 1000 : 1 / 60);
  lastFrame = time;
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
    updateHUD();
  }

  updateEffects(delta);
  updateSceneAnimations(delta);
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
  weapon = createWeapon();
  resetStats();
  applyWeaponVisual();
  resetCamera();
  updateMapUI();
  initEvents();
  window.addEventListener('resize', resize);
  resize();
  updateCreditsUI();
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
      WebGL 2 est nécessaire pour lancer Nexus Breach.<br>
      Vérifiez l'accélération matérielle de votre navigateur, puis rechargez la page.
    </div>
  `;
}
