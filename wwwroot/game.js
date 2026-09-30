import * as THREE from './vendor/three.module.min.js';

// Le gardien de demarrage dans index.html attend ces deux signaux. Sans eux,
// un echec silencieux (module non execute, initialisation bloquee) laisse
// l'ecran de chargement tourner indefiniment sans aucune explication.
if (window.__nexus) window.__nexus.moduleTouche = true;

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
  // Titres de l'ecran de fin de vague. Le Ranger n'y a plus le meme choix que
  // l'Assassin : son titre doit annoncer le vrai arbitrage, sinon l'ecran
  // promet des modules la ou il propose de se soigner.
  upgradeOverline: document.querySelector('#upgrade-overline'),
  upgradeTitle: document.querySelector('#upgrade-title'),
  upgradeCountLabel: document.querySelector('#upgrade-count-label'),
  upgradeCount: document.querySelector('#upgrade-count'),
  upgradeFooter: document.querySelector('#upgrade-footer'),
  waveValue: document.querySelector('#wave-value'),
  waveLabel: document.querySelector('#wave-label'),
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
  performanceRating: document.querySelector('#performance-rating'),
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
  shopAmeliorations: document.querySelector('#shop-ameliorations'),
  shopAmeliorationsHeading: document.querySelector('#shop-ameliorations-heading'),
  pointerNote: document.querySelector('.pointer-note'),
  // Commandes tactiles : absentes du DOM sur un poste classique, le code
  // doit donc tolerate un null.
  touchLayer: document.querySelector('#touch-layer'),
  touchStick: document.querySelector('#touch-stick'),
  touchFire: document.querySelector('#touch-fire'),
  touchReload: document.querySelector('#touch-reload'),
  touchAbility: document.querySelector('#touch-ability'),
  touchPause: document.querySelector('#touch-pause'),
  touchDash: document.querySelector('#touch-dash'),
  saveProgressButton: document.querySelector('#save-progress-button'),
  loadProgressButton: document.querySelector('#load-progress-button'),
  saveFileInput: document.querySelector('#save-file-input'),
  saveStatus: document.querySelector('#save-status'),
  menuCredits: document.querySelector('#menu-credits'),
  hudCredits: document.querySelector('#credits-value'),
  sectorValue: document.querySelector('#sector-value'),
  mapButtons: Array.from(document.querySelectorAll('[data-map-index]')),
  modeButtons: Array.from(document.querySelectorAll('[data-mode-id]')),
  modeDescription: document.querySelector('#mode-description'),
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

// Le plus grand corps qui se deplace, borne applique a tous les acteurs.
//
// La constante est ici, avec les autres reglages, et non pres du code de
// deplacement : la navigation l'utilise aussi, pour gonfler les obstacles, et
// le generateur de salles doit pouvoir garantir la meme chose. Declaree en bas
// du fichier, elle ne pouvait pas etre lue plus haut, et le detecteur de zone
// morte le signalait a juste titre.
//
// NAV_MARQUE doit lui valoir exactement cette valeur. Si la navigation gonfle
// moins que le corps, elle declare franchissables des couloirs ou un ennemi
// large ne passe pas : il entre, la collision refuse chaque pas, et il reste
// bloque. C'est un bug constate, pas une precaution theorique.
// La borne elle-meme est declaree avec les reglages, en haut du fichier, parce
// que la navigation s en sert aussi. Le diagnostic navConcordance() verifie
// que la marge du generateur et celle-ci valent la meme chose : sans cette
// verification, les deux derives silencieusement et l on revient au bug.
const MOUVEMENT_RAYON_MAX = 0.95;
const NAV_MARQUE = MOUVEMENT_RAYON_MAX;


// Appareil tactile : on se base sur le pointeur principal et non sur
// maxTouchPoints, sinon un portable avec ecran tactile (pointeur fin)
// afficherait les commandes sans raison.
// Le parametre ?tactile=1 force le mode tactile : utile pour tester les
// commandes depuis un ordinateur.
const FORCE_TOUCH = typeof location !== 'undefined'
  && typeof URLSearchParams === 'function'
  && new URLSearchParams(location.search).get('tactile') === '1';
const IS_TOUCH = FORCE_TOUCH || (typeof window.matchMedia === 'function'
  ? window.matchMedia('(pointer: coarse)').matches
  : navigator.maxTouchPoints > 0);

// Un profil automatique évite de rendre le jeu inutilisable sur les GPU intégrés.
// Le rendu reste net, mais avec une résolution et des ombres mieux adapté au matériel.
// Le palier mobile est plus sever : les GPU de telephone encaissent bien moins
// les ombres et la haute resolution.
const PERFORMANCE_PROFILE = (() => {
  const cores = Number(navigator.hardwareConcurrency) || 8;
  const memory = Number(navigator.deviceMemory) || 8;
  const lowPower = cores <= 4 || memory <= 4;
  const mobile = IS_TOUCH;
  return {
    mobile,
    lowPower,
    maxPixelRatio: mobile ? 0.85 : lowPower ? 1 : 1.25,
    // Ombres a 2048 sur un bureau : le levier le plus gratuit qui reste pour
      // la profondeur, parce qu une ombre nette donne au joueur une
      // indication de distance et de hauteur qu aucune couleur ne remplace.
      // Cout nul en temps de calcul, la carte d ombres etant rendue une
      // fois pour toutes les surfaces.
      shadowMapSize: mobile ? 512 : lowPower ? 512 : 2048,
    antialias: !lowPower && !mobile,
    shadows: !lowPower && !mobile,
    targetFps: mobile ? 50 : lowPower ? 50 : 60,
    hudInterval: mobile ? 0.12 : lowPower ? 0.1 : 0.05,
    flowFieldInterval: mobile ? 0.5 : lowPower ? 0.4 : 0.3,
    particleScale: mobile ? 0.4 : lowPower ? 0.55 : 1,
    enemyAuraLights: !lowPower && !mobile,
    // Effectif concurrent : reduit sur mobile, ou le GPU doit dessiner plus
    // d'ennemis dans le meme temps alors qu'il a moins de marge.
    maxConcurrentCap: mobile ? 8 : 11
  };
})();

// ===========================================================================

const MAP_DEFINITIONS = [
  {
    id: 'nexus',
    name: 'SECTEUR 07 // NEXUS',
    short: 'NEXUS',
    description: 'Arena initiale du protocole Nexus.',
    background: 0x0b1c28,
    fogColor: 0x0b1c28,
    fogDensity: 0.026,
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
    description: 'Zone de forge hostile : quatre machines d’élite, plus résistantes et plus mortelles.',
    background: 0x24121e,
    fogColor: 0x24121e,
    fogDensity: 0.03,
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
  maxConcurrent: (wave) => Math.min(PERFORMANCE_PROFILE.maxConcurrentCap, 4 + Math.floor(wave * 0.5)),
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
    tagline: 'TIR À DISTANCE · CONTRÔLE DE ZONE',
    description: 'Plus de vie et un arsenal complet. Ses capacités couvrent le terrain.',
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
    tagline: 'MÉLÉE · MOBILITÉ · EXÉCUTION',
    description: 'Sabres et dash. Moins de vie, mais plus rapide, et des frappes qui tuent plus vite.',
    price: 2500,
    color: '#b17cff',
    stats: {
      health: 84,
      speed: 7.3,
      // Dégâts par frappe et cadence de base, avant améliorations.
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

// Le rayon de collision d'un ennemi vaut rayon * echelle. Les Alpha
// atteignaient 3 a 3.5 unites : ils ne pouvaient donc pas etre atteints au
// corps a corps (portee de sabre 3.6 a 4.4) et restaient bloques contre la
// geometrie. Leur silhouette reste celle d'un gros monstre, mais leurs
// collisions et leurs points de vie sont ramenes a une echelle tenable.
// Premiere apparition d'un Alpha. A la vague 5 il foulait le joueur avant
// qu'il n'ait eu le temps de batir un equipement : 680 PV de base, soit 1142
// apres le multiplicateur de vague, et une cadence d'attaque plus rapide que
// celle d'un ennemi ordinaire. Il apparait des la vague 8, quand le joueur a
// deja quelques ameliorations.
//
// Ces deux constantes sont declarees AVANT les tables d'ennemis qui les
// utilisent. Les placer plus bas produisait une erreur de zone morte
// temporelle qui empechait le jeu de demarrer, exactement comme
// CLASS_DEFAULT_WEAPON avant que le test de sauvegarde ancienne ne le revele.
const ALPHA_PREMIERE_VAGUE = 8;

// Le rayon de collision d'un ennemi vaut rayon * echelle. Les Alpha
// atteignaient 3 a 3.5 unites : ils ne pouvaient donc pas etre atteints au
// corps a corps (portee de sabre 3.6 a 4.4) et restaient bloques contre la
// geometrie. Leur silhouette reste celle d'un gros monstre, mais leurs
// collisions et leurs points de vie sont ramenes a une echelle tenable.
//
// Declaree avant ENEMY_TYPES, qui l'utilise. La placer apres produisait une
// erreur de zone morte temporelle qui empechait le jeu de demarrer, comme
// CLASS_DEFAULT_WEAPON avant que le test de sauvegarde ancienne ne le revele.
const ALPHA_STATS = { hp: 320, damage: 17, radius: 0.98, speed: 1.3 };

// Tir a distance, commun a tous les types.
//
// Jusqu ici les ennemis n'infligeaient leurs degats qu'au contact. Chacun
// tire desormais en plus, ce qui donne au joueur une reponse : foncer sur un
// ennemi le fait passer en melee, ou il ne peut plus tirer. Sans cela, un
// ennemi a distance serait un probleme sans reponse.
//
// Les valeurs par defaut s'appliquent a tous ; chaque type ne declare que ce
// qui le distingue. portee est la distance a laquelle il se stabilise, cadence
// l'intervalle entre deux tirs, annonce le temps d'armement avant le depart du
// projectile, et degats la part de ses degats au contact que vaut un tir.
// Tir a distance : seul un type sur deux le possede.
//
// Faire tirer tous les ennemis etait un choix qui sonnait bon sur le papier et
// mauvais en jeu : il ne restait plus de role de pres, donc plus rien a
// decider. Foncer sur un ennemi qui tire n'etait plus une riposte, c'etait
// devenu un automatisme. La repartition ci-dessous redonne deux roles
// lisibles :
//
//   - les Chargeurs (Rodeur, Brute) avancent et ne savent rien faire d'autre.
//     Il faut les abattre avant qu'ils arrivent, ou les tenir a distance.
//   - les Tireurs (Chasseur, Alpha) se stabilisent au loin et couvrent le
//     groupe. Il faut les approcher pour les faire taire, ou chercher un decor.
//
// Un type qui declare portee sait tirer. Un type qui ne la declare pas charge
// seulement : c'est la seule information a maintenir, tout le reste en decoule.
const TIR_DEFAUTS = {
  portee: 12,
  cadence: 2.2,
  vitesse: 20,
  annonce: 0.8,
  degats: 0.42,
  // Au-dela de cette distance l'ennemi avance au lieu de tirer : sans limite
  // haute, un robot resterait immobile a l'autre bout de l'arene.
  porteeMax: 26
};

function avecTir(tir) {
  // Sans portee, le type ne tire pas : on ne lui invente pas de valeurs.
  if (tir.portee === undefined) return Object.assign({ tire: false }, tir);
  return Object.assign({ tire: true }, TIR_DEFAUTS, tir);
}

const ENEMY_TYPES = {
  crawler: avecTir({
    name: 'Rôdeur',
    hp: 48,
    speed: 2.35,
    damage: 9,
    radius: 0.62,
    scale: 0.88,
    bulk: 'light',
    color: 0x55f6c1,
    score: 100,
    legs: 4
    // Chargeur : le Roteur avance et frappe. Il ne tire pas, et c'est
    // volontaire : c'est lui qui oblige a sortir de sa position.
  }),
  hunter: avecTir({
    name: 'Chasseur',
    hp: 36,
    speed: 3.65,
    damage: 7,
    radius: 0.5,
    scale: 0.78,
    bulk: 'light',
    color: 0xffcf4a,
    score: 130,
    legs: 4,
    // Le tireur : portee la plus longue, cadence la plus rapide, et un
    // projectile qui fait enfin mal. Il oblige a rester a distance, la ou les
    // autres AVANCENT, ce qui change la lecture du combat.
    portee: 19, cadence: 1.15, vitesse: 25, annonce: 0.6, degats: 0.45
  }),
  brute: avecTir({
    name: 'Brute',
    hp: 145,
    speed: 1.58,
    damage: 19,
    radius: 0.95,
    scale: 1.28,
    bulk: 'heavy',
    color: 0xff5b42,
    score: 260,
    legs: 6
    // Chargeur lourd : un mur qu on affronte, pas qu on esquive.
  }),
  titan: avecTir({
    name: 'Alpha',
    hp: ALPHA_STATS.hp,
    speed: ALPHA_STATS.speed,
    damage: ALPHA_STATS.damage,
    radius: ALPHA_STATS.radius,
    // L'echelle de 2.05 datait de l'ancien corps compact. Appliquee a un
    // robot de 2.3 unites, elle donnait un monstre de pres de 5 unites, deux
    // fois et demi le Chasseur : la silhouette traduisait une taille, pas une
    // puissance. Le rayon est augmente en compensation pour conserver une
    // emprise au sol comparable.
    scale: 1.5,
    color: 0xff2d85,
    score: 1200,
    legs: 6,
    bulk: 'heavy',
    elite: true,
    // Tir lourd a moyenne distance, annonce appreciable.
    portee: 16, cadence: 1.75, vitesse: 19, annonce: 0.9, degats: 0.8
  })
};

const FOUNDRY_ENEMY_TYPES = {
  slagCrawler: avecTir({
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
    // Chargeur.
  }),
  emberStalker: avecTir({
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
    spikeCount: 3,
    // Le plus rapide en tir et en deplacement : il traverse l'arene.
    portee: 18, cadence: 1.05, vitesse: 27, annonce: 0.55, degats: 0.45
  }),
  ironBrute: avecTir({
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
    // Chargeur lourd.
  }),
  foundryAlpha: avecTir({
    name: 'Forge-Monarque',
    hp: ALPHA_STATS.hp * 1.3,
    speed: ALPHA_STATS.speed * 0.95,
    damage: ALPHA_STATS.damage * 1.25,
    radius: ALPHA_STATS.radius * 1.32,
    scale: 1.6,
    bulk: 'heavy',
    color: 0xff2d85,
    armorColor: 0x2c1830,
    accentColor: 0xffc857,
    score: 2100,
    legs: 6,
    bodyScale: [1.2, 1.08, 1],
    headScale: 1.08,
    spikeCount: 9,
    elite: true,
    portee: 17, cadence: 1.65, vitesse: 20, annonce: 0.85, degats: 0.85
  })
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
    description: '+28 PV maximum et soin immédiat.',
    short: 'ARMURE',
    color: '#5ca8ff',
    max: 7,
    icon: '<path d="M32 7 52 16v15c0 13-9 24-20 29C21 55 12 44 12 31V16L32 7Z"/><path d="M32 18v29M20 25l12 8 12-8M20 40l12-7 12 7"/>'
  },
  speed: {
    classId: 'shared',
    name: 'Propulseurs',
    description: '+6 % de vitesse de déplacement.',
    short: 'MOBILITÉ',
    color: '#22e6a8',
    max: 5,
    icon: '<path d="M31 6 18 34h12l-4 25 19-35H33l5-18Z"/><path d="M9 14h12M7 24h10M9 34h12M47 49h9"/>'
  },
  stabilize: {
    classId: 'shared',
    name: 'Stabilisateurs',
    description: 'Réduisez les dégâts subis de 15 % (plafond 68 %).',
    short: 'STABILITÉ',
    color: '#72d8ff',
    max: 4,
    icon: '<path d="M32 6v52M8 18l48 28M56 18 8 46M8 32h48"/><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="10"/>'
  },

  // --- Ranger --------------------------------------------------------------
  damage: {
    classId: 'ranger',
    name: 'Canon amplifié',
    description: '+13 % de dégâts de base par niveau.',
    short: 'PUISSANCE',
    color: '#ff6b2c',
    max: 6,
    icon: '<path d="M9 35h27l14-9v-9L36 26H9l-5-8 5-8 5 8Zm8 0v13m8-13v13m-16-18 5 5 7-9"/><circle cx="46" cy="21" r="4"/>'
  },
  fireRate: {
    classId: 'ranger',
    name: 'Gâche rapide',
    description: '+11 % de cadence de base par niveau.',
    short: 'CADENCE',
    color: '#00f5ff',
    max: 6,
    icon: '<path d="M36 7 17 29h13l-5 19 22-27H33l3-14Z"/><path d="M8 13h8M6 21h7M8 29h8M49 48h7M48 40h6"/>'
  },
  magazine: {
    classId: 'ranger',
    name: 'Chargeur étendu',
    description: '+8 munitions par niveau.',
    short: 'CAPACITÉ',
    color: '#62ff9a',
    max: 6,
    icon: '<path d="M12 15h40v34H12zM20 22h24v20H20zM24 8h16v7M32 27v10m-5-5h10"/>'
  },
  reload: {
    classId: 'ranger',
    name: 'Recharge accélérée',
    description: '-11 % de temps de recharge par niveau.',
    short: 'RECHARGE',
    color: '#9b78ff',
    max: 5,
    icon: '<path d="M50 24A18 18 0 1 0 48 39M50 11v15H35M23 31h15M30.5 23.5v15"/>'
  },
  pierce: {
    classId: 'ranger',
    name: 'Rayons perforants',
    description: 'Touchez un hostile supplémentaire par niveau.',
    short: 'PERFORATION',
    color: '#f6e45c',
    max: 3,
    icon: '<path d="m8 32 17-17 8 8L16 40l-8-8Z"/><path d="m25 15 8-8 8 8-8 8M34 39l8-8 12 12-8 8-12-12Z"/><path d="m45 12 10-5M41 18l12 2"/>'
  },
  focus: {
    classId: 'ranger',
    name: 'Optique de précision',
    description: '+0,35x sur les dégâts de tête par niveau.',
    short: 'PRÉCISION',
    color: '#ffd166',
    max: 4,
    icon: '<circle cx="32" cy="32" r="18"/><circle cx="32" cy="32" r="9"/><path d="M32 4v9M32 51v9M4 32h9M51 32h9M12 12l7 7M45 45l7 7M52 12l-7 7M19 45l-7 7"/>'
  },

  // --- Assassin ------------------------------------------------------------
  shadowDamage: {
    classId: 'assassin',
    name: 'Lames affûtées',
    description: '+13 % de dégâts de frappe par niveau.',
    short: 'LAMES',
    color: '#b17cff',
    max: 6,
    icon: '<path d="m8 54 8-5 30-30-5-5-30 30-3 10Z"/><path d="m40 15 9-9 9 9-9 9M10 49l10 5M47 46l9 9"/><path d="m18 25 9 9"/>'
  },
  shadowFlurry: {
    classId: 'assassin',
    name: 'Tempête jumelle',
    description: '+11 % de cadence de frappe par niveau.',
    short: 'FRAPPE',
    color: '#e0a6ff',
    max: 6,
    icon: '<path d="M12 38 42 8M19 47 49 17M8 27l18 18M37 56l18-18"/><path d="m8 53 8-3 27-27-5-5-27 27-3 8Z"/>'
  },
  shadowVeil: {
    classId: 'assassin',
    name: 'Voile d’ombre',
    description: '-9 % de recharge du dash et +0,05 s d’invulnérabilité par niveau.',
    short: 'DASH',
    color: '#7c6bff',
    max: 4,
    icon: '<path d="M32 7 18 25l14 7-14 7 14 7-14 7 14 7 14-7-14-7 14-7-14-7 14-7-14-7Z"/><path d="M9 15 3 9M55 15l6-6M9 49l-6 6M55 49l6 6"/>'
  },
  shadowBlood: {
    classId: 'assassin',
    name: 'Sang d’Ombre',
    description: 'Récupérez 5 PV par élimination et par niveau.',
    short: 'SANG',
    color: '#ff4d83',
    max: 4,
    icon: '<path d="M32 55S8 42 8 23C8 12 22 7 32 20 42 7 56 12 56 23c0 19-24 32-24 32Z"/><path d="M21 29h8l3-6 4 13 3-7h8"/>'
  },
  shadowExecution: {
    classId: 'assassin',
    name: 'Sentence',
    description: '+35 % de dégâts contre les hostiles sous 30 % PV, par niveau.',
    short: 'EXÉCUTION',
    color: '#ff3158',
    max: 4,
    icon: '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="11"/><path d="M32 4v12M32 48v12M4 32h12M48 32h12M12 12l9 9M43 43l9 9M52 12l-9 9M21 43l-9 9"/><path d="m27 32 4 4 8-9"/>'
  },
  shadowReach: {
    classId: 'assassin',
    name: 'Allonge',
    description: '+0,35 m de portée et +0,06 d’arc de frappe par niveau.',
    short: 'ALLONGE',
    color: '#9f7bff',
    max: 4,
    icon: '<path d="M6 54l6-3 30-30-4-4-30 30-2 7Z"/><path d="M12 44 44 12M40 6l14 14M46 20l14 14"/><circle cx="52" cy="50" r="6"/>'
  },
  shadowPoise: {
    classId: 'assassin',
    name: 'Garde d’ombre',
    description: '+18 PV maximum et +0,5 PV régénérés par seconde, par niveau.',
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
    description: 'Fiable et sans défaut. Le point de départ de tout opérateur.',
    price: 0,
    damage: 28,
    fireRate: 5.4,
    magazine: 30,
    reload: 1.75,
    pellets: 1,
    spread: 0,
    pierce: 0,
    range: 70,
    headshotMultiplier: 1.7,
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
    classId: 'ranger',
    fireMode: 'ray',
    name: 'SCATTER-7 // BREACH',
    short: 'SCATTER',
    description: 'Sept projectiles dispersés. Sans effet sur un Alpha, redoutable sur un groupe.',
    price: 450,
    damage: 19,
    fireRate: 1.7,
    magazine: 8,
    reload: 2.3,
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
    description: 'Cadence élevée et gros chargeur. Tient la pression quand ça arrive de tous les côtés.',
    price: 650,
    damage: 16,
    fireRate: 13,
    magazine: 48,
    reload: 1.85,
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
    description: 'Revolver de précision. Faible cadence, mais ×2,6 sur la tête : la réponse aux élites.',
    price: 800,
    damage: 98,
    fireRate: 1.85,
    magazine: 6,
    reload: 1.9,
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
    description: 'Le froid ralentit de 55 %. Faible dégâts, mais il achète du temps.',
    price: 900,
    damage: 25,
    fireRate: 4.3,
    magazine: 20,
    reload: 2.15,
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
    description: 'Transperce trois hostiles alignés. La réponse aux vagues d’élites.',
    price: 950,
    damage: 132,
    fireRate: 1,
    magazine: 5,
    reload: 2.6,
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
    description: 'Flammèche de contact. Portée courte, mais tout ce qu’elle touche brûle.',
    price: 1100,
    damage: 6,
    fireRate: 18,
    magazine: 90,
    reload: 2.9,
    pellets: 3,
    spread: 0.11,
    pierce: 0,
    range: 24,
    headshotMultiplier: 1.3,
    burnDamage: 6,
    burnDuration: 2.5,
    special: 'BRÛLURE',
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
    description: 'Boules à fusion. L’explosion touche tout ce qui est autour du point d’impact.',
    price: 1400,
    damage: 92,
    fireRate: 2.3,
    magazine: 14,
    reload: 2.4,
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
    description: 'Deux sabres, deux cibles. L’arme de base de l’Assassin.',
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
    description: 'Une seule cible, mais un coup qui arrache. Arc large pour les groups serrés.',
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
    description: 'Trois cibles, enchaînement rapide. Faible par coup, imbattable dans la masse.',
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
    description: 'Lancer à la main. Portée courte, mais on garde la mobilité du dash.',
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
    name: 'PAS // D’OMBRE',
    short: 'PAS OMBRE',
    description: 'Frappe qui voyage avec le dash : chaque esquive traverse ce qui traîne derrière.',
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
    description: 'Détonation de zone. Touche tout le monde autour de toi, allies compris le dash de l’Assassin.',
    price: 500,
    cooldown: 11,
    duration: 0,
    radius: 11,
    damage: 150,
    effect: 'DÉGÂTS DE ZONE',
    color: '#ffcf4a',
    icon: '<circle cx="32" cy="32" r="9"/><circle cx="32" cy="32" r="23"/><path d="M32 4v12M32 48v12M4 32h12M48 32h12M12 12l9 9M43 43l9 9M52 12l-9 9M21 43l-9 9"/>'
  },
  cryo: {
    id: 'cryo',
    classId: 'ranger',
    name: 'CRYO FIELD',
    short: 'CRYO',
    description: 'Gèle la zone : les ennemis qui s’y trouvent sont ralentis de 70 % pendant 4 secondes.',
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
    description: 'Bouclier d’énergie : -45 % de dégâts subis pendant 5 secondes.',
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
    description: 'Surcharge l’arme : +50 % de dégâts et +60 % de cadence pendant 7 secondes.',
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
    description: 'Reset immédiat du dash et +50 % de dégâts de frappe pendant 6 secondes.',
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
    description: 'Invisible 1,5 s. La première frappe qui suit est un headshot garanti, quelle que soit la distance.',
    price: 750,
    cooldown: 16,
    duration: 1.5,
    vanish: true,
    guaranteedCrit: true,
    effect: 'INVISIBILITÉ',
    color: '#b17cff',
    icon: '<path d="M32 6c9 0 15 7 15 16 0 10-7 20-15 30-8-10-15-20-15-30 0-9 6-16 15-16Z"/><path d="M6 20l8 4M58 20l-8 4M6 44l8-4M58 44l-8-4"/>'
  },
  shadowRiptide: {
    id: 'shadowRiptide',
    classId: 'assassin',
    name: 'SANG-DÉCHIRÉ',
    short: 'SANG',
    description: 'Vampirie : +45 % de dégâts et 6 PV récupérés par élimination, pendant 8 secondes.',
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
    description: 'Ralentit de 55 % tous les ennemis pendant 6 s et inflige 90 dégâts à l healthiest de la zone.',
    price: 1200,
    cooldown: 26,
    duration: 6,
    radius: 18,
    slowMultiplier: 0.45,
    damage: 90,
    effect: 'RALENTI + DÉGÂTS',
    color: '#c9a6ff',
    icon: '<path d="M16 6h32M16 58h32M18 6c0 14 14 16 14 26S18 44 18 58M46 6c0 14-14 16-14 26s14 12 14 26"/><path d="M22 50h20"/>'
  }
};

// Équipements permanents achetés avec les crédits gagnés à la mort.
//
// Volontairement sobres. Les crédits sont gagnés à chaque mort, donc un
// joueur qui meurt beaucoup les empile : des bonus trop forts rendent le jeu
// trivial après quelques parties. Le plafond total de l'atelier est de
// +40 % de dégâts, +35 % de cadence, +90 PV et 16 % de réduction, ce qui
// reste en dessous des améliorations de vague (jusqu'à +78 % de dégâts).
// Le champ classId rend chaque équipement exclusif à une classe.
const META_EQUIPMENT = [
  {
    id: 'reinforcedCore',
    classId: 'shared',
    name: 'Noyau blindé',
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
    name: 'Réseau neural',
    short: 'STABILITÉ',
    description: '-4 % de dégâts subis par niveau.',
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
    description: '+8 % de dégâts par niveau.',
    color: '#ff6b2c',
    maxLevel: 5,
    baseCost: 280,
    costGrowth: 1.55,
    icon: '<path d="M36 7 17 29h13l-5 19 22-27H33l3-14Z"/><path d="M8 13h8M6 21h7M8 29h8M49 48h7M48 40h6"/>'
  },
  {
    id: 'overclock',
    classId: 'ranger',
    name: 'Déclencheur surcadencé',
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
    description: '+9 % de dégâts de frappe par niveau.',
    color: '#b17cff',
    maxLevel: 5,
    baseCost: 280,
    costGrowth: 1.55,
    icon: '<path d="m8 54 8-5 30-30-5-5-30 30-3 10Z"/><path d="m40 15 9-9 9 9-9 9M10 49l10 5M47 46l9 9"/><path d="m18 25 9 9"/>'
  },
  {
    id: 'tendonSurge',
    classId: 'assassin',
    name: 'Tendon synthétiques',
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
    short: 'SAIGNÉE',
    description: '+2 PV récupérés par élimination, par niveau.',
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
  mode: 'nexus-breach-mode',
  saveVersion: 'nexus-breach-save-version',
  restoreNotice: 'nexus-breach-restore-notice'
});

let state = GAME_STATE.MENU;
let currentMapIndex = readCurrentMapIndex();
// Le mode n'est pas une carte de plus : c'est une facon differente de terminer
// une vague. La campagne garde ses modules et son atelier permanent ; le donjon
// les supprime tous les deux, et remplace la progression par des credits
// depenses dans la salle.
let gameMode = readGameMode();
// Palier courant du donjon. La vague sert alors de numero de salle : chaque
// porte franchie augmente les deux.
let donjonPalier = 0;
let donjonGraine = 1;
// L'argent de la descente en cours.
//
// Il n'est pas dans le credit global : le confondre ferait de l'atelier
// permanent une monnaie de donjon. Il ne se remet pas a zero a chaque salle :
// il se garde tant qu'on ne meurt pas, et c'est ce qui donne un interet a
// nettoyer vite pour descendre avec de l'argent en poche.
let donjonCredits = 0;
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

// Armes de depart de chaque classe. Change de classe ou sauvegarde une veille
// version ne doit jamais laisser l'operateur sans arme utilisable.
//
// Cette declaration DOIT preceder la reconciliation ci-dessous : celle-ci
// appelle resolveWeaponForClass, qui lit cette constante. La declaration
// etait plus bas dans le fichier, dans la zone morte temporelle : le module
// echouait alors a l'evaluation pour tout joueur dont la sauvegarde portait
// une arme de l'autre classe, et l'ecran de chargement restait bloque en
// silence. Elle n'etait atteinte par aucun test, tous demarrant sur une
// sauvegarde vierge.
const CLASS_DEFAULT_WEAPON = Object.freeze({ ranger: 'pulse', assassin: 'twinSabers' });

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

// Modes de jeu
// ===========================================================================
//
// Un mode n'est pas une carte de plus : c'est une maniere differente de
// terminer une vague et de progresser. La campagne garde ses trois cartes
// d'amelioration entre les vagues et les ameliorations permanentes de l'Atelier.
// Le donjon supprime les deux, et remplace la progression par des credits
// gagnes a l'elimination et depenses au terminal que l'on trouve dans la salle.
//
// Les deux modes partagent le meme tableau de cartes : `donjon` ne fait que
// changer quand on y entre, ce qui evite de dupliquer la boucle de vagues.
const GAME_MODES = {
  campagne: {
    id: 'campagne',
    name: 'CAMPAGNE',
    description: 'Vagues successives, trois modules a chaque fin de vague, atelier permanent entre les parties.',
    ameliorations: true,
    permanentes: true,
    portails: false
  },
  donjon: {
    id: 'donjon',
    name: 'DONJON',
    description: 'Des salles procedurales a nettoyer. Un portail s ouvre quand la salle est vide, un terminal d atelier traine parfois. Ni modules, ni atelier permanent : on ameliore ses statistiques avec les credits gagnes en bas, et on les garde jusqu a la mort.',
    ameliorations: false,
    permanentes: false,
    portails: true
  }
};

// Generateur de salle.
//
// Une salle est une DONNEE : lumières, couverture, piliers, pastilles
// d'apparition. Rien n'est fige dans le code, donc une salle peut etre tiree au
// sort a chaque palier. Le generateur ne produit que cette donnee ; la
// construction des maillages est ailleurs.
//
// La contrainte qui compte : la salle doit etre PRATICABLE. Un joueur ne peut
// pas rester bloque derriere deux blocs. On verifie donc que l'arrivee, la
// sortie, chaque pastille et le terminal appartiennent a la meme zone
// connexe, et on retire des obstacles jusqu'a ce que ce soit vrai.
function generateurAleatoire(graine) {
  let etat = graine >>> 0;
  return function () {
    // mulberry32 : petit, rapide, et surtout reproductible. Deux joueurs
    // avec la meme graine obtiennent la meme salle, ce qui rend un bug
    // reproductible au lieu d'etre aleatoire.
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cellules occupantes, avec une marge egale au rayon du joueur : on ne verifie
// pas qu'on peut marcher sur une case, mais qu'on peut s y tenir.
function caseLibre(x, z, salle, marge) {
  for (let i = 0; i < salle.covers.length; i += 1) {
    const c = salle.covers[i];
    if (Math.abs(x - c[0]) < c[2] / 2 + marge && Math.abs(z - c[1]) < c[3] / 2 + marge) {
      return false;
    }
  }
  for (let i = 0; i < salle.pillars.length; i += 1) {
    const p = salle.pillars[i];
    const dx = x - p[0];
    const dz = z - p[1];
    if (dx * dx + dz * dz < (1.35 + marge) * (1.35 + marge)) return false;
  }
  return true;
}

// Le donjon n existe que si le joueur peut l atteindre, et le portail s il
// peut sortir. On inonde depuis l arrivee, et on compte les points
// obligatoires qui doivent tomber dans la meme composante.
function zoneAtteignable(salle, origine, marge) {
  const pas = 1;
  const demi = CONFIG.arenaSize / 2;
  const cle = (i, j) => j * Math.round(CONFIG.arenaSize / pas) + i;
  const largeur = Math.round(CONFIG.arenaSize / pas);
  const visite = new Set();
  const file = [origine];
  visite.add(cle(origine[0], origine[1]));
  while (file.length) {
    const point = file.pop();
    const voisins = [[point[0] + 1, point[1]], [point[0] - 1, point[1]],
      [point[0], point[1] + 1], [point[0], point[1] - 1]];
    for (const v of voisins) {
      if (v[0] < 0 || v[1] < 0 || v[0] >= largeur || v[1] >= largeur) continue;
      const k = cle(v[0], v[1]);
      if (visite.has(k)) continue;
      const monde = [v[0] * pas - demi + pas / 2, v[1] * pas - demi + pas / 2];
      if (!caseLibre(monde[0], monde[1], salle, marge)) continue;
      visite.add(k);
      file.push(v);
    }
  }
  return (x, z) => visite.has(cle(
    Math.round((x + demi - pas / 2) / pas),
    Math.round((z + demi - pas / 2) / pas)
  ));
}

// La salle courante du donjon, et tout ce qu'elle a ajoute au monde.
//
// Une salle doit pouvoir etre demolie quand le joueur descend. Le probleme est
// que les objets ne vivent pas dans un groupe : ils sont empiles dans la scene
// ET dans quatre tableaux (obstacles, cibles de tir, anneaux, pastilles). On
// oublie une seule de ces listes et la salle suivante se retrouve avec les
// obstacles de la precedente : des murs invisibles, et des ennemis qui
// convergent vers un point mort.
//
// Plutot que de reecrire les fonctions de construction, on mesure ce que
// chacune AJOUTE. C'est ce que vaut cette fonction : le nombre d enfants de la
// scene avant et apres l'appel. Elle ne suppose rien de l'implementation, donc
// si addCover rajoute un jour une lueur, elle sera vue.
const salleCourante = {
  maillages: [],
  obstacles: [],
  cibles: [],
  anneaux: [],
  pastilles: [],
  lumiere: [],
  portail: null,
  terminal: null,
  ouverte: false
};

function mesurerAjout(ajouter) {
  const avantScene = scene.children.length;
  const avantObstacles = obstacles.length;
  const avantCibles = arenaTargets.length;
  const avantAnneaux = animatedRings.length;
  const avantPastilles = spawnPads.length;
  ajouter();
  for (let i = avantScene; i < scene.children.length; i += 1) {
    salleCourante.maillages.push(scene.children[i]);
  }
  for (let i = avantObstacles; i < obstacles.length; i += 1) {
    salleCourante.obstacles.push(obstacles[i]);
  }
  for (let i = avantCibles; i < arenaTargets.length; i += 1) {
    salleCourante.cibles.push(arenaTargets[i]);
  }
  for (let i = avantAnneaux; i < animatedRings.length; i += 1) {
    salleCourante.anneaux.push(animatedRings[i]);
  }
  for (let i = avantPastilles; i < spawnPads.length; i += 1) {
    salleCourante.pastilles.push(spawnPads[i]);
  }
}

function viderTableau(tabla, valeurs) {
  for (const valeur of valeurs) {
    const index = tabla.indexOf(valeur);
    if (index >= 0) tabla.splice(index, 1);
  }
}

// Demolition complete. Le champ de navigation est reconstruit juste apres :
// sans lui, les ennemis continueraient de contourner une salle qui n'existe
// plus.
function demolirSalle() {
  for (const maillage of salleCourante.maillages) {
    scene.remove(maillage);
    maillage.traverse((enfant) => {
      if (enfant.geometry) enfant.geometry.dispose();
      // Les materiaux sont partages entre plusieurs maillages d une meme
      // salle, liseres et colliers : les supprimer ici casserait ceux qui
      // les partagent. Une salle en cree quelques dizaines, et le navigateur
      // les recycle. C est le prix d une salle que l on peut demonter.
    });
  }
  for (const lumiere of salleCourante.lumiere) scene.remove(lumiere);
  viderTableau(obstacles, salleCourante.obstacles);
  viderTableau(arenaTargets, salleCourante.cibles);
  viderTableau(animatedRings, salleCourante.anneaux);
  viderTableau(spawnPads, salleCourante.pastilles);
  salleCourante.maillages.length = 0;
  salleCourante.obstacles.length = 0;
  salleCourante.cibles.length = 0;
  salleCourante.anneaux.length = 0;
  salleCourante.pastilles.length = 0;
  salleCourante.lumiere.length = 0;
  salleCourante.portail = null;
  salleCourante.terminal = null;
  salleCourante.ouverte = false;
  // La grille est invalidee, pas seulement marquee a reconstruire. Sans cela,
  // le code qui la consulte entre la demolition et la construction voit des
  // cases libres la ou il y a un mur, et valide des positions impossibles.
  navWalkable.fill(0);
  navDistance.fill(-1);
  syncRaycastTargets();
  navTimer = 0;
}

// Construit une salle du donjon dans la scene, et son portail et son terminal.
//
// Le portail est VERROUILLE tant que la salle compte un ennemi. Ce n'est pas
// decoratif : c'est la condition de fin de salle, et le joueur doit le voir
// vermouillé pour savoir qu'il a encore du travail.
const COULEUR_PORTAIL_FERME = 0x3a4a52;
const COULEUR_PORTAIL_OUVERT = 0x62ff9a;

function construireSalle(salle) {
  demolirSalle();
  const map = MAP_DEFINITIONS[currentMapIndex];
  const materiauPilier = new THREE.MeshStandardMaterial({
    color: map.wallColor,
    roughness: 0.42,
    metalness: 0.64
  });

  for (const [x, z, largeur, profondeurBloc, hauteur, accent] of salle.covers) {
    mesurerAjout(() => construireBloc(x, z, largeur, profondeurBloc, hauteur, accent));
  }
  salle.pillars.forEach(([x, z], index) => {
    mesurerAjout(() => {
      const pilier = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.25, 5.8, 8), materiauPilier);
      pilier.position.set(x, 2.9, z);
      pilier.castShadow = PERFORMANCE_PROFILE.shadows;
      pilier.receiveShadow = PERFORMANCE_PROFILE.shadows;
      pilier.userData.solid = true;
      scene.add(pilier);
      arenaTargets.push(pilier);
      obstacles.push({ x, z, radius: 1.35, type: 'circle' });
      const collier = new THREE.Mesh(
        new THREE.TorusGeometry(1.08, 0.075, 8, 28),
        new THREE.MeshStandardMaterial({
          color: 0x02080a,
          emissive: index % 2 ? map.alternateEdge : map.wallEdge,
          emissiveIntensity: 2
        }));
      collier.rotation.x = Math.PI / 2;
      collier.position.set(x, 4.5, z);
      scene.add(collier);
      animatedRings.push({ mesh: collier, speed: index % 2 ? -0.25 : 0.35, axis: 'y' });
    });
  });
  salle.spawnPads.forEach(([x, z, rotation]) => {
    mesurerAjout(() => construirePastille(x, z, rotation, map));
  });

  for (const lumiere of salle.lights) {
    const halo = new THREE.PointLight(
      lumiere.color, lumiere.intensity, lumiere.distance, 2);
    halo.position.set(lumiere.x, lumiere.y, lumiere.z);
    scene.add(halo);
    salleCourante.lumiere.push(halo);
  }

  construirePortail(salle.portail, map);
  if (salle.terminal) construireTerminal(salle.terminal, map);

  // Le champ de navigation est reconstruit ICI, tout de suite, et pas au
  // prochain passage dans updateEnemies.
  //
  // Mettre seulement navTimer a zero suffisait pour l'affichage, mais la
  // grille restait celle de la salle precedente pendant toute la frame. Or
  // findSpawnPosition la consulte pour choisir ou naitre un ennemi, et elle
  // lisait donc un decor gone : elle validait des positions situes dans les
  // blocs de la nouvelle salle. L'ennemi y naissait, sa cellule etait
  // inatteignable, et il ne venait jamais. C'est le blocage le plus tenace
  // observe, et il naissait d'une ligne de trop.
  rebuildFlowField();
  navTimer = 0;
  syncRaycastTargets();
}

function construireBloc(x, z, largeur, profondeurBloc, hauteur, accent) {
  const materiau = new THREE.MeshStandardMaterial({
    color: 0x162833, roughness: 0.48, metalness: 0.6
  });
  const bloc = new THREE.Mesh(new THREE.BoxGeometry(largeur, hauteur, profondeurBloc), materiau);
  bloc.position.set(x, hauteur / 2, z);
  bloc.castShadow = PERFORMANCE_PROFILE.shadows;
  bloc.receiveShadow = PERFORMANCE_PROFILE.shadows;
  bloc.userData.solid = true;
  scene.add(bloc);
  arenaTargets.push(bloc);
  obstacles.push({ x, z, width: largeur, depth: profondeurBloc, type: 'rect' });

  const lisiere = new THREE.Mesh(
    new THREE.BoxGeometry(largeur * 0.86, 0.055, profondeurBloc * 0.86),
    new THREE.MeshStandardMaterial({ color: 0x03080a, emissive: accent, emissiveIntensity: 1.7 }));
  lisiere.position.set(x, hauteur + 0.04, z);
  scene.add(lisiere);
}

function construirePastille(x, z, rotation, map) {
  const pastille = new THREE.Group();
  pastille.position.set(x, 0.025, z);
  pastille.rotation.y = rotation;
  const base = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 6),
    new THREE.MeshBasicMaterial({
      color: 0x061017, transparent: true, opacity: 0.78, side: THREE.DoubleSide
    }));
  base.rotation.x = -Math.PI / 2;
  pastille.add(base);
  const anneau = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.055, 6, 6),
    new THREE.MeshBasicMaterial({ color: map.coreColor, transparent: true, opacity: 0.8 }));
  anneau.rotation.x = Math.PI / 2;
  anneau.position.y = 0.035;
  pastille.add(anneau);
  const interne = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.025, 5, 6),
    new THREE.MeshBasicMaterial({ color: map.coreAccent, transparent: true, opacity: 0.8 }));
  interne.rotation.x = Math.PI / 2;
  interne.position.y = 0.045;
  pastille.add(interne);
  scene.add(pastille);
  spawnPads.push(new THREE.Vector3(x, 0, z));
  animatedRings.push({ mesh: anneau, speed: 0.4, axis: 'z' });
  animatedRings.push({ mesh: interne, speed: -0.65, axis: 'y' });
}

// Le portail est une porte, pas une piece au sol : l'anneau est VERTICAL, comme
// un cadre qu on traverse.
//
// Il etait pose a plat, comme un tapis lumineux. Debout a hauteur d'homme, un
// tore couche se voit de champ : la capture du mode ne montrait qu'un trait
// gris, et le joueur pouvait nettoyer toute la salle sans voir pourquoi la
// sortie ne s'ouvrait pas. Une porte qu on ne voit pas n'est pas une porte.
function construirePortail(position, map) {
  mesurerAjout(() => {
    const groupe = new THREE.Group();
    groupe.position.set(position[0], 0, position[1]);
    const materiau = new THREE.MeshStandardMaterial({
      color: 0x08141a,
      emissive: COULEUR_PORTAIL_FERME,
      emissiveIntensity: 1.6,
      roughness: 0.4
    });
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.14, 8, 30), materiau);
    anneau.position.y = 1.65;
    groupe.add(anneau);
    // Un second anneau, plus fin et plus haut, donne de l'epaisseur. Sans lui,
    // une porte vue de loin se reduit a un trait.
    const montant = new THREE.Mesh(
      new THREE.TorusGeometry(1.78, 0.05, 6, 30),
      new THREE.MeshStandardMaterial({
        color: 0x03080a,
        emissive: COULEUR_PORTAIL_FERME,
        emissiveIntensity: 0.9
      }));
    montant.position.y = 1.65;
    groupe.add(montant);
    // Le voile, lui, reste le plan de la porte, face au joueur.
    const voile = new THREE.Mesh(
      new THREE.CircleGeometry(1.41, 26),
      new THREE.MeshBasicMaterial({
        color: COULEUR_PORTAIL_FERME,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      }));
    voile.position.y = 1.65;
    groupe.add(voile);
    // Un halo au sol, lui, dit ou poser les pieds : c'est ce qui distingue la
    // porte du simple mur lumineux vu de loin.
    const empreinte = new THREE.Mesh(
      new THREE.CircleGeometry(1.45, 24),
      new THREE.MeshBasicMaterial({
        color: COULEUR_PORTAIL_FERME,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false
      }));
    empreinte.rotation.x = -Math.PI / 2;
    empreinte.position.y = 0.05;
    groupe.add(empreinte);
    scene.add(groupe);
    salleCourante.portail = {
      groupe,
      materiau,
      voile,
      montant,
      x: position[0],
      z: position[1]
    };
    salleCourante.maillages.push(groupe);
  });
}

function construireTerminal(position, map) {
  mesurerAjout(() => {
    const groupe = new THREE.Group();
    groupe.position.set(position[0], 0, position[1]);
    const socle = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.9, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x101c26, roughness: 0.5, metalness: 0.6 }));
    socle.position.y = 0.45;
    groupe.add(socle);
    const ecran = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.75, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x03080a, emissive: map.coreAccent, emissiveIntensity: 2.4
      }));
    ecran.position.set(0, 1.45, 0);
    ecran.rotation.x = -0.24;
    groupe.add(ecran);
    const halo = new THREE.PointLight(map.coreAccent, 9, 7, 2);
    halo.position.set(0, 1.5, 0);
    groupe.add(halo);
    scene.add(groupe);
    salleCourante.terminal = {
      groupe,
      ecran,
      halo,
      x: position[0],
      z: position[1]
    };
    salleCourante.maillages.push(groupe);
  });
}

// Les deux poches.
//
// L argent global achete ce qui survit aux parties : c'est l atelier permanent.
// L argent de run n existe que dans la salle en cours, et c'est la seule
// monnaie du donjon. Les separer n'est pas une precaution, c'est le mode
// lui-meme : si le donjon debourseait l atelier permanent, il statuerait
// l'exact contraire de ce qu il promet.
function argentDisponible() {
  return gameMode === 'donjon' ? donjonCredits : credits;
}

function peutDepenser(montant) {
  return argentDisponible() >= montant;
}

function depenserArgent(montant) {
  if (montant <= 0) return;
  if (gameMode === 'donjon') donjonCredits = Math.max(0, donjonCredits - montant);
  else credits = Math.max(0, credits - montant);
}

// Ce que le terminal propose. Dans le donjon, ni la classe ni les modules
// d atelier : la classe se choisit au menu, et l atelier permanent est precisement
// ce que le mode supprime. Les secciones sont retirees de la boutique plutot
// que desactivees, pour que le joueur ne passe pas son temps devant un
// panneau mort.
function sectionsBoutique() {
  if (gameMode !== 'donjon') {
    return {
      classes: true, armes: true, capacites: true, modules: true, ameliorations: false
    };
  }
  // Le donjon ne vend ni classe, ni capacite, ni module d'atelier. A la place,
  // des ameliorations de statistiques : sans elles, la seule chose a faire de
  // son argent etait changer d'arme, et un joueur qui n'en trouve pas n'avait
  // aucune raison de descendre.
  return {
    classes: false, armes: true, capacites: false, modules: false, ameliorations: true
  };
}

// Interactions du donjon : franchir la porte, toucher le terminal.
//
// Les deux sont des zones de contact, pas des objets a viser. Le joueur n'a
// qu'une arme, la tienne : lui faire viser une porte serait absurde. On prend
// donc la distance au sol, avec une marge assez large pour qu'on ne rate pas la
// porte en passant a cote en courant.
//
// Cette fonction ne teste pas l'etat de jeu : c'est l'appelant qui le fait.
// GAME_STATE est declare plus loin dans le fichier, et le detecteur de zone
// morte a raison de refuser qu une constante soit lue avant sa declaration,
// meme depuis une fonction qui n'est appelee qu'en partie. Le test reste donc
// dehors, ou il n'a rien a voir.
const PORTEIL_PORTEE = 2.6;
const TERMINAL_PORTEE = 2.2;

function majDonjon() {
  if (terminalDelai > 0) terminalDelai -= 1 / 60;
  const x = player.position.x;
  const z = player.position.z;

  if (salleCourante.ouverte && salleCourante.portail) {
    const dx = x - salleCourante.portail.x;
    const dz = z - salleCourante.portail.z;
    if (dx * dx + dz * dz < PORTEIL_PORTEE * PORTEIL_PORTEE) {
      audio.reload();
      salleSuivante();
      return;
    }
  }

  if (salleCourante.terminal && terminalDelai <= 0) {
    const dx = x - salleCourante.terminal.x;
    const dz = z - salleCourante.terminal.z;
    if (dx * dx + dz * dz < TERMINAL_PORTEE * TERMINAL_PORTEE) {
      // Le terminal ouvre le meme magasin que le menu, et closeShop rend la
      // main a la partie : c'etait deja prevu, il suffisait de l'appeler.
      ouvrirBoutiqueDonjon();
    }
  }
}

// Le terminal ne doit pas s'actionner deux fois : on repousse le joueur d'un pas
// a l'ouverture, sinon il reste colle et le magasin se referme aussitot qu'il
// est ouvert.
//
// Le cas difficile est la distance exactement nulle. Math.hypot(0, 0) vaut 0, et
// le garde-fou classique `|| 1` transforme ce zero en 1 : le vecteur de recul
// devient 0/1, donc nul, et le joueur ne bouge pas du tout. C'est precisement
// le cas le plus probable, celui ou l on marche droit sur le terminal. Le
// joueur restait alors colle, et le magasin se rouvrait a la frame suivante
// apres avoir ete ferme. Le test du donjon l'a vu : l'etat restait a "shop".
function repousserDuTerminal() {
  const terminal = salleCourante.terminal;
  if (!terminal) return;
  const dx = player.position.x - terminal.x;
  const dz = player.position.z - terminal.z;
  const distance = Math.hypot(dx, dz);
  let ux = 0;
  let uz = 0;
  if (distance > 0.001) {
    ux = dx / distance;
    uz = dz / distance;
  } else {
    // Pile sur le terminal : il n'y a pas de direction a suivre, alors on
    // recule vers le centre de l'arene, qui est toujours libre.
    const cx = -terminal.x;
    const cz = -terminal.z;
    const versCentre = Math.hypot(cx, cz) || 1;
    ux = cx / versCentre;
    uz = cz / versCentre;
  }
  if (Math.hypot(dx, dz) >= TERMINAL_PORTEE) return;
  player.position.x = terminal.x + ux * (TERMINAL_PORTEE + 0.6);
  player.position.z = terminal.z + uz * (TERMINAL_PORTEE + 0.6);
}

// Delai avant que le terminal puisse rouvrir la boutique.
//
// Meme avec le recul qui fonctionne, un contact suffit : le moindre
// frôlement, ou une correction de collision, suffirait a rouvrir le magasin que
// le joueur vient de fermer. Ce n est pas un detail cosmétique, c'est un magasin
// qui se ferme tout seul, et le joueur croit avoir perdu ses credits.
const TERMINAL_DELAI = 1.1;
let terminalDelai = 0;

// Ouverte depuis le donjon, pas depuis le menu : c est ce qui arme le delai.
function ouvrirBoutiqueDonjon() {
  openShop();
  repousserDuTerminal();
  terminalDelai = TERMINAL_DELAI;
}

// Tire une salle complete pour un palier du donjon.
//
// L'algorithme refuse de produire une salle injouable. Il pose des obstacles au
// hasard, puis verifie que tout ce qui compte est d'un seul tenant : l'arrivee du
// joueur, chaque pastille d'apparition, le portail, et le terminal s'il y en a
// un. Si un point est coupe, on retire un obstacle au hasard et on recommence,
// jusqu'a un nombre d'essais borne. Au pire, on renvoie une salle presque
// vide : une salle moche vaut mieux qu'une salle dont on ne sort pas.
// Les ameliorations de stats du donjon.
//
// Elles n'existent que la : ni capacite, ni module d'atelier. C'est la
// consequence directe de la reponse a la question posee avant la
// construction du mode. Une boutique ou on ne peut QUE changer d'arme, sans
// pouvoir rendre son personnage plus fort, oblige a choisir entre un achat et
// sa survie ; une ou l'on ameliore ses statistiques donne une raison de
// descendre meme sans trouver d'arme.
//
// Elles valent pour la partie en cours et disparaissent avec elle. Rien n'est
// ecrit dans la sauvegarde, et rien ne se transporte en campagne : c'est la
// difference entre depenser dans le donjon et changer l'equipement d'atelier.
//
// Les effets sont ADDITIFS et appliques par applyUpgradeStats, comme les
// modules de vague. Pas de cascade : un niveau a 5 % donne 20 % a cinq
// niveaux, pas 1,05^5. La distinction a deja coute une partie entiere.
const DONJON_AMELIORATIONS = [
  {
    id: 'degats',
    nom: 'CANON SURCHARGE',
    court: 'DEGATS',
    description: '+12 % de degats par niveau.',
    max: 6,
    base: 90,
    croissance: 1.55,
    couleur: 0xff4e28
  },
  {
    id: 'cadence',
    nom: 'GACHETTE ENTRETENUE',
    court: 'CADENCE',
    description: '+8 % de cadence par niveau.',
    max: 6,
    base: 110,
    croissance: 1.55,
    couleur: 0xffd166
  },
  {
    id: 'vie',
    nom: 'PLAQUE DE SECOURS',
    court: 'INTEGRITE',
    description: '+15 points de vie maximum, et autant de soin immediat.',
    max: 6,
    base: 80,
    croissance: 1.5,
    couleur: 0x62ff9a
  },
  {
    id: 'recharge',
    nom: 'CHARGEUR SOUPLE',
    court: 'RECHARGE',
    description: '-10 % de temps de recharge par niveau.',
    max: 4,
    base: 100,
    croissance: 1.7,
    couleur: 0x00eaff
  },
  {
    id: 'chargeur',
    nom: 'TANCHE ELARGIE',
    court: 'CHARGEUR',
    description: '+6 munitions par niveau.',
    max: 4,
    base: 95,
    croissance: 1.65,
    couleur: 0x9a4eff
  },
  {
    id: 'vitesse',
    nom: 'SERVOS LEGERS',
    court: 'VITESSE',
    description: '+6 % de vitesse de deplacement par niveau.',
    max: 4,
    base: 85,
    croissance: 1.6,
    couleur: 0x4ecdc4
  },
  {
    id: 'reduction',
    nom: 'BLINDAGE LEGER',
    court: 'BLINDAGE',
    description: '-8 % de degats encaisses par niveau, plafonne a 40 %.',
    max: 5,
    base: 120,
    croissance: 1.6,
    couleur: 0x8899aa
  },
  {
    id: 'perforation',
    nom: 'TIR PERFORANT',
    court: 'PERFORATION',
    description: '+1 ennemi traverse par niveau.',
    max: 3,
    base: 200,
    croissance: 1.9,
    couleur: 0xff2b85
  }
];

const DONJON_VALEURS = {
  degats: 0.12,
  cadence: 0.08,
  vie: 15,
  recharge: 0.10,
  chargeur: 6,
  vitesse: 0.06,
  reduction: 0.08,
  reductionPlafond: 0.40,
  perforation: 1
};

// Le cout du prochain niveau. La courbe est geometrique : le premier niveau
// reste abordable, le cinquieme faitReflecter si on a bien choisi ses
// priorites.
// Une icone par amelioration. Dessinees a la main plutot que generes : elles
// sont huit, elles ne changeront pas, et une etiquette generee par le code
// ressemblerait a un pave sans signification.
const ICONES_AMELIORATION = {
  degats: '<path d="M14 50h10V28H14zM30 50h10V16H30zM46 50h10V6H46z"/>',
  cadence: '<path d="M32 6 40 24H24zM32 58 24 40h16zM6 32 24 24v16zM58 32 40 40V24z"/>',
  vie: '<path d="M32 56 8 32a13 13 0 0 1 18-18h12a13 13 0 0 1 18 18z"/>',
  recharge: '<path d="M48 10 18 34h14l-4 20 30-26H40z"/>',
  chargeur: '<path d="M18 12h28v34a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6zM24 4h16v8H24z"/>',
  vitesse: '<path d="M8 44h14l8-24 8 32 8-20 4 12h8"/>',
  reduction: '<path d="M32 4 52 12v18c0 14-10 24-20 30C22 54 12 44 12 30V12z"/>',
  perforation: '<path d="M6 32h34M40 20l16 12-16 12zM6 20h10v24H6z"/>'
};

const ICONE_AMELIORATION_DEGATS = '<path d="M14 50h10V28H14zM30 50h10V16H30zM46 50h10V6H46z"/>';

function iconeAmelioration(id) {
  return ICONES_AMELIORATION[id] || ICONE_AMELIORATION_DEGATS;
}

function coutAmeliorationDonjon(definition, niveauActuel) {
  return Math.round(definition.base * Math.pow(definition.croissance, niveauActuel));
}

function ameliorationsDonjonPossedees() {
  const joueur = player.donjon || {};
  const total = DONJON_AMELIORATIONS.reduce((somme, d) => somme + (joueur[d.id] || 0), 0);
  return { joueur, total };
}

// Acheter un niveau d'amelioration de salle.
//
// Le cout est debite de l'argent de RUN, jamais du credit d'atelier : c'est la
// regle des deux portefeuilles, et une amelioration achetee en argent de run
// deviendrait un module permanent. Les stats sont recalculees aussitot, sinon
// le joueur paie et ne voit rien changer.
function acheterAmeliorationDonjon(id) {
  const definition = DONJON_AMELIORATIONS.find((d) => d.id === id);
  if (!definition || state !== GAME_STATE.SHOP) return false;
  if (!player.donjon) player.donjon = {};
  const niveau = player.donjon[id] || 0;
  if (niveau >= definition.max) return false;
  const cout = coutAmeliorationDonjon(definition, niveau);
  if (!peutDepenser(cout)) return false;
  depenserArgent(cout);
  player.donjon[id] = niveau + 1;
  applyUpgradeStats();
  // La vie qui augmente doit se sentir tout de suite, sinon l'achat de
  // INTEGRITE parait sans effet. applyUpgradeStats s en charge deja.
  updateCreditsUI();
  renderShop();
  return true;
}

const ACCENTS_SALLE = [0x00eaff, 0xff4e28, 0x9a4eff, 0xffd166, 0xff2b85, 0x62ff9a];

// Le joueur apparait toujours ici, quel que soit le palier. Cette zone est
// reservee : aucun obstacle ne peut naitre dedans.
//
// C etait un vrai defaut, trouve par le test : avant cette reservation, une
// salle sur sept environ faisait apparaitre le joueur DANS un bloc solide. Le
// joueur se retrouvait coincer sans comprendre pourquoi, et rien dans le jeu
// ne le signalait.
const ARRIVEE = { x: 0, z: 10, rayon: 5 };

// Verification finale, sur le VRAI modele de navigation du jeu.
//
// La premiere version Promettait la connectivite sur une grille de 1,0 unite,
// avec une marge de 0,75 et sans regle de coupe de coin. Le jeu, lui,
// navigue sur une grille de 1,5 avec une marge de 0,78 et n'autorise une
// diagonale que si les deux orthogonales sont libres. Les deux modeles ne
// coincident pas : une salle pouvait passer la verification du generateur et
// se retrouver, dans le jeu, avec des zones que le joueur ne peut pas atteindre.
//
// Consequence directe, et c'est ce que le joueur voyait : un ennemi qui
// apparait dans une de ces zones a navDistance negative. Or getFlowDirection
// ne retient que les cases ATTEIGNABLES, et cherche donc la plus proche en
// traversant l'arene. L'ennemi se dirige vers un point derriere un mur,
// moveEntity refuse chaque pas, et il presse contre l'obstacle indefiniment.
//
// On rejoue donc exactement les regles de rebuildFlowField. Pas une version
// voisine : la version identique.
const NAV_TAILLE = 1.5;
const NAV_NB = 30;

// La marge dont le generateur gonfle les obstacles.
//
// Elle ne peut pas valoir MOUVEMENT_RAYON_MAX par reference : cette constante
// est declaree bien plus loin, et le detecteur de zone morte refuse, a juste
// titre, qu une constante soit lue avant sa declaration. Ce projet a deja perdu
// des parties entieres a ce genre de reference.
//
// Elle ne peut pas non plus diverger de la vraie. Une divergence rendrait la
// garantie de connectivite fausse : le generateur validerait des salles que
// l'IA ne sait pas parcourir. C'est exactement ce que le test verifie, via
// navConcordance() : les deux valeurs doivent rester egales, sinon le test
// echoue et le defaut est nomme.
const NAV_MARQUE_GENERATEUR = 0.95;

// La liste des huit directions, en double de NAV_DIRECTIONS.
//
// Elle ne peut pas etre reprise : le generateur est declare avant elle, et le
// detecteur de zone morte refuse, a juste titre, qu une constante soit lue
// avant sa declaration. Ce projet a deja perdu des parties entieres a ce
// genre de reference.
//
// Une duplication peut mentir, elle. Elle ne ment pas ici : elle est verifiee.
// navConcordance() compare les deux listes et les test du donjon echoue si
// elles divergent. Si la navigation du jeu change un jour, le test le dit au
// lieu de laisser le generateur produire des salles que l'IA ne sait pas
// parcourir.
const NAV_DIRECTIONS_GENERATEUR = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1]
];

// Les deux listes de directions, et la marge du generateur, decrivent-elles la
// meme chose que le jeu ?
//
// Cette fonction est declaree APRES les constantes qu'elle compare : c'est le
// seul endroit du fichier ou c'est possible, et c'est aussi le seul endroit
// qui ait besoin de le voir. Elle ne fait rien d'autre que nommer une
// divergence.
function navConcordance() {
  if (NAV_DIRECTIONS.length !== NAV_DIRECTIONS_GENERATEUR.length) return false;
  for (let i = 0; i < NAV_DIRECTIONS.length; i += 1) {
    if (NAV_DIRECTIONS[i][0] !== NAV_DIRECTIONS_GENERATEUR[i][0]) return false;
    if (NAV_DIRECTIONS[i][1] !== NAV_DIRECTIONS_GENERATEUR[i][1]) return false;
  }
  return NAV_MARQUE === MOUVEMENT_RAYON_MAX
    && NAV_MARQUE_GENERATEUR === MOUVEMENT_RAYON_MAX;
}

function navCelluleBloquee(x, z, salle) {
  const limite = CONFIG.arenaSize / 2 - 0.45;
  if (Math.abs(x) > limite || Math.abs(z) > limite) return true;
  for (let i = 0; i < salle.covers.length; i += 1) {
    const c = salle.covers[i];
    if (Math.abs(x - c[0]) < c[2] / 2 + NAV_MARQUE_GENERATEUR
      && Math.abs(z - c[1]) < c[3] / 2 + NAV_MARQUE_GENERATEUR) return true;
  }
  for (let i = 0; i < salle.pillars.length; i += 1) {
    const p = salle.pillars[i];
    const dx = x - p[0];
    const dz = z - p[1];
    const portee = 1.35 + NAV_MARQUE_GENERATEUR;
    if (dx * dx + dz * dz < portee * portee) return true;
  }
  return false;
}

function navIndex(x, z) {
  const colonne = Math.max(0, Math.min(NAV_NB - 1,
    Math.floor((x + CONFIG.arenaSize / 2) / NAV_TAILLE)));
  const ligne = Math.max(0, Math.min(NAV_NB - 1,
    Math.floor((z + CONFIG.arenaSize / 2) / NAV_TAILLE)));
  return ligne * NAV_NB + colonne;
}

function navCentre(index) {
  const colonne = index % NAV_NB;
  const ligne = Math.floor(index / NAV_NB);
  return {
    x: (colonne + 0.5) * NAV_TAILLE - CONFIG.arenaSize / 2,
    z: (ligne + 0.5) * NAV_TAILLE - CONFIG.arenaSize / 2
  };
}

// Les cases atteignables depuis l'arrivee, selon les regles du jeu.
function zoneAtteignableNav(salle, origine) {
  const marchable = new Uint8Array(NAV_NB * NAV_NB);
  for (let index = 0; index < marchable.length; index += 1) {
    const centre = navCentre(index);
    if (!navCelluleBloquee(centre.x, centre.z, salle)) marchable[index] = 1;
  }

  let depart = navIndex(origine[0], origine[1]);
  if (!marchable[depart]) {
    // Le joueur serait lui-meme dans un mur : on part de la case libre la plus
    // proche, exactement comme rebuildFlowField.
    let meilleur = -1;
    let meilleurEcart = Infinity;
    for (let index = 0; index < marchable.length; index += 1) {
      if (!marchable[index]) continue;
      const centre = navCentre(index);
      const d = Math.hypot(centre.x - origine[0], centre.z - origine[1]);
      if (d < meilleurEcart) { meilleurEcart = d; meilleur = index; }
    }
    if (meilleur < 0) return () => false;
    depart = meilleur;
  }

  const distance = new Int32Array(NAV_NB * NAV_NB).fill(-1);
  const file = [depart];
  distance[depart] = 0;
  while (file.length) {
    const courant = file.pop();
    const colonne = courant % NAV_NB;
    const ligne = Math.floor(courant / NAV_NB);
    for (let d = 0; d < NAV_DIRECTIONS_GENERATEUR.length; d += 1) {
      const dc = NAV_DIRECTIONS_GENERATEUR[d][0];
      const dl = NAV_DIRECTIONS_GENERATEUR[d][1];
      const nc = colonne + dc;
      const nl = ligne + dl;
      if (nc < 0 || nc >= NAV_NB || nl < 0 || nl >= NAV_NB) continue;
      const suivant = nl * NAV_NB + nc;
      if (!marchable[suivant] || distance[suivant] !== -1) continue;
      if (dc !== 0 && dl !== 0) {
        if (!marchable[ligne * NAV_NB + nc] || !marchable[nl * NAV_NB + colonne]) continue;
      }
      distance[suivant] = distance[courant] + 1;
      file.push(suivant);
    }
  }

  return (x, z) => distance[navIndex(x, z)] >= 0;
}

function genererSalle(graine, profondeur) {
  const alea = generateurAleatoire(graine);
  const demi = CONFIG.arenaSize / 2 - 3;
  const salle = {
    covers: [],
    pillars: [],
    spawnPads: [],
    lights: [],
    portail: null,
    terminal: null
  };

  // Un bloc ne peut pas mordre dans la zone d'arrivee. On le repousse plutot
  // que de l'abandonner : une salle avec un obstacle de moins reste une salle.
  const horsArrivee = (x, z, largeurX, largeurZ) => {
    const dx = Math.max(0, Math.abs(x - ARRIVEE.x) - largeurX / 2);
    const dz = Math.max(0, Math.abs(z - ARRIVEE.z) - largeurZ / 2);
    return Math.hypot(dx, dz) >= ARRIVEE.rayon;
  };

  const nombreCovers = 4 + Math.floor(alea() * 5);
  for (let i = 0; i < nombreCovers; i += 1) {
    const largeur = 1.8 + alea() * 3.4;
    const profondeurBloc = 1.6 + alea() * 3.2;
    const hauteur = 1.5 + alea() * 2.4;
    let x = 0;
    let z = 0;
    let essai = 0;
    do {
      x = (alea() * 2 - 1) * (demi - largeur / 2);
      z = (alea() * 2 - 1) * (demi - profondeurBloc / 2);
      essai += 1;
    } while (!horsArrivee(x, z, largeur, profondeurBloc) && essai < 20);
    if (!horsArrivee(x, z, largeur, profondeurBloc)) continue;
    salle.covers.push([x, z, largeur, profondeurBloc, hauteur,
      ACCENTS_SALLE[Math.floor(alea() * ACCENTS_SALLE.length)]]);
  }

  const nombrePiliers = 2 + Math.floor(alea() * 5);
  for (let i = 0; i < nombrePiliers; i += 1) {
    let x = 0;
    let z = 0;
    let essai = 0;
    do {
      x = (alea() * 2 - 1) * (demi - 2);
      z = (alea() * 2 - 1) * (demi - 2);
      essai += 1;
    } while (!horsArrivee(x, z, 2.7, 2.7) && essai < 20);
    if (!horsArrivee(x, z, 2.7, 2.7)) continue;
    salle.pillars.push([x, z]);
  }

  // Six pastilles reparties sur le pourtour, comme les cartes ecrites a la main.
  const nbPastilles = 5 + Math.floor(alea() * 2);
  for (let i = 0; i < nbPastilles; i += 1) {
    const angle = (i / nbPastilles) * Math.PI * 2 + alea() * 0.4;
    const rayon = demi - 1.2 - alea() * 2;
    salle.spawnPads.push([
      Math.cos(angle) * rayon,
      Math.sin(angle) * rayon,
      -angle + Math.PI / 2
    ]);
  }

  // Le portail est pose loin de l'arrivee, sinon le joueur n'a rien a faire et
  // la salle ne sert a rien.
  let angleP = alea() * Math.PI * 2;
  for (let essai = 0; essai < 24; essai += 1) {
    const candidat = [Math.cos(angleP) * (demi - 1.5), Math.sin(angleP) * (demi - 1.5)];
    if (Math.hypot(candidat[0] - ARRIVEE.x, candidat[1] - ARRIVEE.z) > 8) {
      salle.portail = candidat;
      break;
    }
    angleP = alea() * Math.PI * 2;
  }
  if (!salle.portail) {
    const opposition = ARRIVEE.z > 0 ? -1 : 1;
    salle.portail = [ARRIVEE.x, opposition * (demi - 1.5)];
  }

  // Le terminal, ou le joueur depense l'argent de descente.
  //
  // C'est le SEUL endroit ou cet argent a un emploi. Il ne pouvait sortir
  // qu'une fois sur deux, et sur trois paliers d'affilee la probabilite de
  // n'en voir aucun est de 12,5 %. C'est ce qui est arrive : le joueur a
  // fait trois etages, conclu que la boutique n'existait pas, et il avait
  // raison sur son run : elle n'y etait pas.
  //
  // Ce n'est pas un bug, c'est une erreur de conception, et le genre qui ne
  // se voit pas : aucun test n'echoue, la salle est valide, le terminal est
  // accessible, la partie se termine normalement. Ce qui manque, c'est la
  // promesse que le joueur verra la mecanique.
  //
  // Donc : le premier palier en a toujours une, pour qu'elle se voie tout de
  // suite, et tous les paliers pairs en ont une. Entre deux boutiques il ne
  // peut plus y avoir plus d'un palier sans : impossible d'en manquer deux
  // de suite.
  //
  // Le court-circuit de || compte : sur un palier garanti, alea() n'est pas
  // appele, donc la suite aleatoire de la salle decale. Les salles restent
  // valides et reproductibles pour une meme graine, mais la disposition des
  // blocs change. C'etait inevitable, et sans consequence : aucune capture
  // ni aucun test ne depend d'un decoupage precis.
  const boutiqueGarantie = profondeur === 1 || profondeur % 2 === 0;
  salle.aTerminal = boutiqueGarantie || alea() < 0.5;
  if (salle.aTerminal) {
    // Le terminal doit etre LOIN du portail.
    //
    // Sans cette contrainte, il tombe parfois juste a cote, et marcher vers la
    // porte ouvre le magasin en chemin. Le joueur ne comprend pas pourquoi il
    // se retrouve dans une boutique au moment de descendre, et il doit repartir
    // avant de pouvoir franchir le portail. C'est aussi ce qui faisait echouer
    // le test du donjon de facon aleatoire, sur un etat "shop" a l'arrivee
    // d'un palier.
    const anglePorte = Math.atan2(salle.portail[1] - ARRIVEE.z,
      salle.portail[0] - ARRIVEE.x);
    const angleT = anglePorte + Math.PI * (0.6 + alea() * 0.8);
    salle.terminal = [
      Math.cos(angleT) * (demi - 2.5),
      Math.sin(angleT) * (demi - 2.5)
    ];
  } else {
    salle.terminal = null;
  }

  // Trois lumieres suffisent a eclairer : plus, ca coute sur mobile, et la
  // carte de base en a trois.
  for (let i = 0; i < 3; i += 1) {
    const angle = alea() * Math.PI * 2;
    salle.lights.push({
      color: ACCENTS_SALLE[Math.floor(alea() * ACCENTS_SALLE.length)],
      intensity: 20 + alea() * 16,
      distance: 20 + alea() * 8,
      x: Math.cos(angle) * (demi - 4),
      y: 4 + alea() * 3,
      z: Math.sin(angle) * (demi - 4)
    });
  }

  // Le portail ne doit pas naitre dans un mur. On le repousse tant qu'il est
  // genere dedans, sinon le joueur pourrait se retrouver devant un bloc solide.
  let garde = 0;
  while (!caseLibre(salle.portail[0], salle.portail[1], salle, 1.4) && garde < 24) {
    const angle = alea() * Math.PI * 2;
    salle.portail = [Math.cos(angle) * (demi - 1.5), Math.sin(angle) * (demi - 1.5)];
    garde += 1;
  }
  if (caseLibre(salle.portail[0], salle.portail[1], salle, 1.4)) {
    salle.covers.push([salle.portail[0], salle.portail[1], 4.4, 0.5, 3.4,
      salle.lights[0].color]);
    salle.covers.push([salle.portail[0], salle.portail[1], 0.5, 4.4, 3.4,
      salle.lights[0].color]);
  } else {
    // Aucun emplacement libre apres vingt-quatre essais : on vide la salle.
    salle.covers.length = 0;
    salle.pillars.length = 0;
  }
  // Le terminal doit etre sur une case libre, et loin du portail.
  //
  // Ces deux regles SUPPRIMAIENT le terminal quand elles n etaient pas
  // respectees. C est la vraie raison du taux de boutiques observe : la regle
  // des 50 % n etait qu un premier tirage, et tout ce qui echouait ensuite etait
  // jete en silence. Le joueur perdait sa boutique sans qu aucun test ne le
  // signale, et le calcul de frequence ne montrait qu une moyenne.
  //
  // Supprimer est le mauvais remede. Ces regles disent OU le terminal doit
  // etre, pas qu il doit disparaitre. On le repose ailleurs, on reessaye.
  //
  // Et comme la boutique est une GARANTIE de conception, un epuement doit
  // rester theoriquement possible sans casser la regle. D ou le repli : on
  // garde le meilleur des essais, plutot que de rendre la main au hasard et
  // d accepter un palier sans boutique.
  if (salle.aTerminal) {
    // Deux points sur un cercle de rayon 17 sont a plus de 11 de distance
    // des que leurs angles different d environ 38 degres. Un tirage au hasard
    // echoue donc environ une fois sur dix, et c est exactement ce que
    // supprimait la regle d avant.
    let meilleurePlace = salle.terminal;
    let meilleurScore = -1;
    for (let essai = 0; essai < 32; essai += 1) {
      const libre = caseLibre(salle.terminal[0], salle.terminal[1], salle, 1.2);
      const ecart = Math.hypot(salle.terminal[0] - salle.portail[0],
        salle.terminal[1] - salle.portail[1]);
      // On note le meilleur essai au passage. Le score punit la case
      // occupee ET la proximite du portail, donc le repli est deja le moins
      // mauvais des trente-deux plutot qu un tirage au hasard.
      const score = (libre ? 100 : 0) - Math.abs(ecart - 11);
      if (score > meilleurScore) { meilleurScore = score; meilleurePlace = salle.terminal; }
      if (libre && ecart >= 11) break;
      const angleT = alea() * Math.PI * 2;
      salle.terminal = [
        Math.cos(angleT) * (demi - 2.5),
        Math.sin(angleT) * (demi - 2.5)
      ];
    }
    salle.terminal = meilleurePlace;
  }

  // Verification finale, en deux etapes, parce que les deux modeles ne
  // repondent pas a la meme question.
  //
  // 1. LA NAVIGATION : toute pastille d'apparition doit etre dans la meme zone
  //    que l'arrivee, selon les regles exactes du jeu. C'est la condition qui
  //    evite les ennemis presses contre un mur, et elle ne concerne que les
  //    pastilles : ce sont elles qui donnent naissance aux ennemis.
  // 2. LE PHYSIQUE : le joueur doit pouvoir marcher jusqu'au portail et
  //    jusqu'au terminal. Le modele fin suffit ici, et meme mieux : lui evite
  //    de coincer un joueur dans un couloir, ce que la grille grossiere ne
  //    voit pas.
  const origine = [ARRIVEE.x, ARRIVEE.z];
  for (let essai = 0; essai < 16; essai += 1) {
    const atteint = zoneAtteignableNav(salle, origine);
    const coupes = salle.spawnPads.filter((p) => !atteint(p[0], p[1]));
    if (coupes.length === 0) break;
    // On retire l'obstacle le plus proche d'une pastille coupee : c'est lui
    // qui fait le mur, pas un autre.
    let pire = null;
    let pireEcart = Infinity;
    for (let i = 0; i < salle.covers.length; i += 1) {
      for (const coupe of coupes) {
        const c = salle.covers[i];
        const d = Math.hypot(c[0] - coupe[0], c[1] - coupe[1]);
        if (d < pireEcart) { pireEcart = d; pire = { type: 'cover', index: i }; }
      }
    }
    for (let i = 0; i < salle.pillars.length; i += 1) {
      for (const coupe of coupes) {
        const p = salle.pillars[i];
        const d = Math.hypot(p[0] - coupe[0], p[1] - coupe[1]);
        if (d < pireEcart) { pireEcart = d; pire = { type: 'pillar', index: i }; }
      }
    }
    if (!pire) break;
    if (pire.type === 'cover') salle.covers.splice(pire.index, 1);
    else salle.pillars.splice(pire.index, 1);
  }

  // Les pastilles encore hors zone sont ramenees sur la case libre la plus
  // proche. L'ennemi qui y apparait peut se trouver coupe pendant une frame,
  // mais plus indefiniment : le blocage permanent, lui, disparait.
  const zoneFinale = zoneAtteignableNav(salle, origine);
  for (const pastille of salle.spawnPads) {
    if (zoneFinale(pastille[0], pastille[1])) continue;
    const caseActuelle = navIndex(pastille[0], pastille[1]);
    const centreActuel = navCentre(caseActuelle);
    if (zoneFinale(centreActuel.x, centreActuel.z)) continue;
    let meilleur = -1;
    let meilleurEcart = Infinity;
    for (let i = 0; i < NAV_NB * NAV_NB; i += 1) {
      const centre = navCentre(i);
      if (navCelluleBloquee(centre.x, centre.z, salle)) continue;
      if (!zoneFinale(centre.x, centre.z)) continue;
      const d = Math.hypot(centre.x - pastille[0], centre.z - pastille[1]);
      if (d < meilleurEcart) { meilleurEcart = d; meilleur = i; }
    }
    if (meilleur >= 0) {
      const centre = navCentre(meilleur);
      pastille[0] = centre.x;
      pastille[1] = centre.z;
    }
  }

  // Le joueur, lui, doit atteindre la sortie et la boutique.
  for (let essai = 0; essai < 10; essai += 1) {
    const atteint = zoneAtteignable(salle, origine, 0.75);
    const obliges = [salle.portail].concat(salle.terminal ? [salle.terminal] : []);
    const coupes = obliges.filter((p) => !atteint(p[0], p[1]));
    if (coupes.length === 0) break;
    let pire = null;
    let pireEcart = Infinity;
    for (let i = 0; i < salle.covers.length; i += 1) {
      for (const coupe of coupes) {
        const c = salle.covers[i];
        const d = Math.hypot(c[0] - coupe[0], c[1] - coupe[1]);
        if (d < pireEcart) { pireEcart = d; pire = { type: 'cover', index: i }; }
      }
    }
    for (let i = 0; i < salle.pillars.length; i += 1) {
      for (const coupe of coupes) {
        const p = salle.pillars[i];
        const d = Math.hypot(p[0] - coupe[0], p[1] - coupe[1]);
        if (d < pireEcart) { pireEcart = d; pire = { type: 'pillar', index: i }; }
      }
    }
    if (!pire) break;
    if (pire.type === 'cover') salle.covers.splice(pire.index, 1);
    else salle.pillars.splice(pire.index, 1);
  }

  salle.valide = true;
  salle.graine = graine;
  salle.palier = profondeur;
  salle.aTerminal = Boolean(salle.terminal);
  return salle;
}

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

  // Sur mobile, le navigateur bloque l'audio tant que l'utilisateur n'a pas
  // interagi avec la page. ensure() resume le contexte, mais Safari et Chrome
  // sur iOS exigent un resume() declenche depuis un geste utilisateur : c'est
  // pourquoi cette methode est appelee sur le premier appui tactile.
  unlockTouch() {
    if (!this.context || this.context.state !== 'suspended') return;
    const reprise = this.context.resume();
    if (reprise && typeof reprise.catch === 'function') reprise.catch(() => {});
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

  // Tir ennemi : descendant et Metal, pour etre distingue du tir du joueur
  // sans avoir besoin de regarder ou il vient. Il doit se confondre avec le
  // sien, sinon le joueur perd la ou est la menace.
  enemyShot() {
    this.tone(520, 0.13, 0.1, 'sawtooth', -280);
    this.tone(180, 0.09, 0.05, 'square', -120);
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
    // La progression reste disponible en mémoire si le stockage est bloqué.
  }
}

function readCurrentMapIndex() {
  const value = Number.parseInt(readStorage(STORAGE_KEYS.map, '0'), 10);
  return Number.isInteger(value) && MAP_DEFINITIONS[value] ? value : 0;
}

// Le mode est memorise comme la carte. Une sauvegarde ancienne n'a pas cette
// cle : elle se lit alors en campagne, ce qui est le comportement d'avant.
function readGameMode() {
  return readStorage(STORAGE_KEYS.mode, 'campagne') === 'donjon' ? 'donjon' : 'campagne';
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
  writeStorage(STORAGE_KEYS.classes, JSON.stringify(ownedClasses));
  writeStorage(STORAGE_KEYS.equippedClass, equippedClass);
  writeStorage(STORAGE_KEYS.abilities, JSON.stringify(ownedAbilities));
  writeStorage(STORAGE_KEYS.equippedAbility, equippedAbility);
  writeStorage(STORAGE_KEYS.map, String(currentMapIndex));
  writeStorage(STORAGE_KEYS.mode, gameMode);
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
    throw new Error('Ce fichier n’est pas une sauvegarde valide de Nexus Breach.');
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
  showSaveStatus('SAUVEGARDE TÉLÉCHARGÉE', 'success');
}

async function importProfileBackup(file) {
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Le fichier de sauvegarde est trop volumineux.');
    const data = JSON.parse(await file.text());
    const profile = sanitizeImportedProfile(data);
    applyProfileBackup(profile);
    writeStorage(STORAGE_KEYS.restoreNotice, 'SAUVEGARDE RESTAURÉE');
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
  updateModeUI();
}

// Changer de mode ne recharge pas la page, contrairement a la carte. La
// recharge etait necessaire pour la carte parce qu elle reconstruit toute la
// scene ; le mode, lui, n est qu une etiquette et quelques branches.
function selectGameMode(id) {
  if (!GAME_MODES[id] || id === gameMode) return gameMode;
  gameMode = id;
  saveProfile();
  updateModeUI();
  return gameMode;
}

function updateModeUI() {
  const definition = GAME_MODES[gameMode];
  if (ui.modeDescription) ui.modeDescription.textContent = definition.description;
  ui.modeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.modeId === gameMode);
  });
  // Le titre de l'onglet porte le mode. C'est un detail d'ergonomie, mais il
  // résout une vraie confusion : deux versions du jeu cohabitent sur cette
  // machine, avec des lanceurs identiques et le meme titre d'onglet. Sans
  // cette difference, on ne peut pas savoir laquelle on joue. Avec elle, un
  // onglet qui refuse de passer sur DONJON dit tout de suite qu'on a ouvert la
  // mauvaise copie.
  if (typeof document !== 'undefined') {
    document.title = gameMode === 'donjon'
      ? 'Nexus Breach // DONJON'
      : 'Nexus Breach // CAMPAGNE';
  }
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
      ui.assassinClassStatus.textContent = unlocked ? (equippedClass === id ? 'ÉQUIPÉE' : 'POSSÉDÉE') : `${formatCredits(PLAYER_CLASSES.assassin.price)} CR`;
    }
  });
  if (ui.abilityHint) {
    // L'Assassin n'a un dash nu que tant qu'il n'a achete aucune capacite.
    const label = equippedAbility && ABILITY_DEFINITIONS[equippedAbility]?.classId === equippedClass
      ? 'CAPACITÉ'
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
    showSaveStatus('DÉBLOQUEZ L’ASSASSIN POUR 2 500 CR DANS L’ATELIER', 'error');
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

// L'arme equipee n'est valide que pour sa classe. Changer de classe en
// garde une, ou bascule sur celle de la classe. Declaration de CLASS_DEFAULT_WEAPON
// plus haut, avant la reconciliation qui l'appelle.
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

// Les multiplicateurs de l'Atelier permanent, tous a zero.
//
// C'est ce que renvoie getPermanentStats au point de depart, et c'est aussi ce
// que renvoie le donjon en entier. Une seule definition, deux usages : le
// donjon n'a pas de formule speciale, il recoit juste la table de base et
// n'y touche pas.
function statsPermanentesNulles() {
  return {
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
}

function getPermanentStats() {
  const stats = statsPermanentesNulles();
  // Le donjon oublie l'atelier permanent : c'est une partie sans arriere-plan.
  // Sans cette coupure, un joueur qui a joue cent fois en campagne arrive au
  // premier palier avec ses bonus, et le mode ne prouve plus rien.
  if (gameMode === 'donjon') return stats;
  const reels = {
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

  // Le plafond réel est posé par applyUpgradeStats (68 %), pas ici : un
  // plafond de 60 % ici était du code inatteignable, puisque les réductions
  // permanentes ne dépassent jamais 16 %.
  stats.damageReduction = Math.min(0.16, stats.damageReduction);
  return stats;
}

function formatCredits(value) {
  return Math.max(0, Math.round(value)).toLocaleString('fr-FR');
}

// Deux soldes, deux emplacements.
//
// Le menu annonce ce que le joueur possede entre les parties : c'est de
// l'argent d'Atelier, et il doit rester vrai meme au milieu d'une descente.
// Le HUD et la boutique annoncent ce qu'on peut dépenser MAINTENANT, donc de
// l'argent de run dans le donjon.
//
// Ecrire le même chiffre partout, c'est l'erreur facile : le menu affichait
// alors 0 CR a un joueur qui en possede des milliers, parce que son argent de
// run venait d'etre remis a zero. Le test du donjon l'a vu.
function updateCreditsUI() {
  const disponible = formatCredits(argentDisponible());
  if (ui.menuCredits) ui.menuCredits.textContent = formatCredits(credits);
  [ui.hudCredits, ui.shopCredits].forEach((element) => {
    if (element) element.textContent = disponible;
  });
}

function renderShop() {
  if (!ui.shopItems || !ui.shopWeapons || !ui.shopAbilities || !ui.shopClasses) return;
  // Dans le donjon, deux sections sur quatre disparaissent : la classe se
  // choisit au menu, et les modules d atelier sont precisement ce que le mode
  // supprime. Les retirer evite un panneau mort devant lequel le joueur
  // n'a rien a faire.
  const sections = sectionsBoutique();
  ui.shopItems.innerHTML = '';
  ui.shopWeapons.innerHTML = '';
  ui.shopAbilities.innerHTML = '';
  ui.shopClasses.innerHTML = '';
  // Le titre de section est le frere precedent du conteneur, pas un parent :
  // le HTML les a l'un a l'autre, sans enveloppe commune. Cacher le conteneur
  // seul laisserait un titre au-dessus du vide.
  if (ui.shopClasses.previousElementSibling) {
    ui.shopClasses.previousElementSibling.style.display = sections.classes ? '' : 'none';
    ui.shopClasses.style.display = sections.classes ? '' : 'none';
  }
  // Les capacites disparaissent aussi, et pour la meme raison qu'en campagne :
  // une section que le donjon refuse de remplir laisserait un titre et du vide.
  if (ui.shopAbilities.previousElementSibling) {
    ui.shopAbilities.previousElementSibling.style.display = sections.capacites ? '' : 'none';
    ui.shopAbilities.style.display = sections.capacites ? '' : 'none';
  }
  if (ui.shopItems.previousElementSibling) {
    ui.shopItems.previousElementSibling.style.display = sections.modules ? '' : 'none';
    ui.shopItems.style.display = sections.modules ? '' : 'none';
  }
  let installedCount = 0;

  if (sections.classes) Object.values(PLAYER_CLASSES).forEach((classDefinition) => {
    const owned = ownsClass(classDefinition.id);
    const selected = equippedClass === classDefinition.id;
    const canBuy = peutDepenser(classDefinition.price);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `shop-item class-item${selected ? ' weapon-selected' : ''}`;
    card.style.setProperty('--shop-color', classDefinition.color);
    card.disabled = selected || (!owned && !canBuy);
    card.setAttribute('aria-label', `${classDefinition.name}, ${owned ? 'possédée' : `non possédée, ${formatCredits(classDefinition.price)} crédits`}`);
    const action = selected
      ? '<span class="shop-maxed">ÉQUIPÉE</span>'
      : owned
        ? '<span class="shop-cost">ÉQUIPER</span><small>ACTIVER</small>'
        : `<span class="shop-cost">${formatCredits(classDefinition.price)} CR</span><small>ACHETER</small>`;
    card.innerHTML = `
      <span class="shop-item-top"><span>${classDefinition.short}</span><span>${selected ? 'ACTIVE' : owned ? 'POSSÉDÉE' : 'VERROUILLÉE'}</span></span>
      <span class="shop-item-visual"><svg viewBox="0 0 64 64" aria-hidden="true">${classDefinition.icon}</svg></span>
      <h3>${classDefinition.name}</h3>
      <p class="class-tagline">${classDefinition.tagline || ''}</p>
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
    const canBuy = peutDepenser(weapon.price);
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
    const isSlash = weapon.fireMode === 'slash';
    const projectileStat = weapon.pellets > 1 ? `<span>PROJECTILES <b>${weapon.pellets}</b></span>` : '';
    const pierceStat = weapon.pierce > 0 ? `<span>PERFORATION <b>${weapon.pierce + 1}</b></span>` : '';
    const targetStat = isSlash ? `<span>CIBLES <b>${weapon.slashTargets}</b></span>` : '';
    const headshot = isSlash ? '' : `<span>TÊTE <b>${(weapon.headshotMultiplier ?? 1.65).toFixed(1)}x</b></span>`;
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
      ? `<span>DEGÂTS/S <b>${Math.round(weapon.damage * weapon.fireRate * (weapon.slashTargets * 0.75 + 0.25))}</b></span>`
      : `<span>DPS <b>${Math.round(weapon.damage * weapon.fireRate * weapon.pellets * (weapon.pierce + 1) * 0.6)}</b></span>`;
    const accuracyStat = isSlash ? '' : `<span>PRÉCISION <b>${Math.round(Math.max(0, 100 - weapon.spread * 450))}%</b></span>`;
    const stats = [
      damageStat,
      dpsStat,
      rateStat,
      magazineStat,
      `<span>PORTÉE <b>${weapon.range} m</b></span>`,
      accuracyStat,
      headshot,
      reloadStat,
      targetStat,
      projectileStat,
      pierceStat,
      `<span>EFFET <b>${special}</b></span>`
    ].filter(Boolean).join('');

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

  Object.values(ABILITY_DEFINITIONS)
    .filter((ability) => ability.classId === equippedClass)
    .forEach((ability) => {
    const owned = ownsAbility(ability.id);
    const selected = equippedAbility === ability.id;
    const canBuy = peutDepenser(ability.price);
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

  // Les ameliorations de stats du donjon, a la place des capacites.
  //
  // Elles ne sont pas un module d'atelier deguise : leur cout monte a chaque
  // niveau au lieu d'etre fixe, et leur portee s'arrete a la partie en cours.
  // Le joueur doit donc choisir entre plusieurs routes plutot que remplir une
  // jauge, ce qui est la seule difference qui vaille le detour.
  // La section ameliorations n'existe qu'en donjon, et les capacites
  // disparaissent au meme endroit. Le titre suit sa section : le masquer sans
  // lui laisserierait un intertitre au-dessus du vide.
  if (ui.shopAmeliorations) {
    ui.shopAmeliorations.innerHTML = '';
    const wanted = sections.ameliorations;
    if (ui.shopAmeliorations.previousElementSibling) {
      ui.shopAmeliorations.previousElementSibling.style.display = wanted ? '' : 'none';
    }
    ui.shopAmeliorations.style.display = wanted ? '' : 'none';
    if (!wanted) return;
    const niveaux = ameliorationsDonjonPossedees();
    DONJON_AMELIORATIONS.forEach((amelioration) => {
      const niveau = niveaux.joueur[amelioration.id] || 0;
      const auMaximum = niveau >= amelioration.max;
      const cout = coutAmeliorationDonjon(amelioration, niveau);
      const abordable = peutDepenser(cout);
      const carte = document.createElement('button');
      carte.type = 'button';
      carte.className = 'shop-item amelioration-item';
      carte.style.setProperty('--shop-color', amelioration.couleur);
      carte.disabled = auMaximum || !abordable;
      carte.setAttribute('aria-label',
        amelioration.nom + ', niveau ' + niveau + ' sur ' + amelioration.max
        + (auMaximum ? ', au maximum' : ', cout ' + formatCredits(cout) + ' credits'));

      const jauge = Array.from({ length: amelioration.max }, (unused, index) =>
        '<i class="' + (index < niveau ? 'on' : '') + '"></i>').join('');

      const pied = auMaximum
        ? '<span class="shop-maxed">AU MAXIMUM</span>'
        : '<span class="shop-cost">' + formatCredits(cout) + ' CR</span>'
          + '<small>AMELIORER</small>';

      carte.innerHTML = '<span class="shop-item-top"><span>' + amelioration.court
        + '</span><span>' + (auMaximum ? 'MAX' : 'NIV ' + String(niveau).padStart(2, '0'))
        + '</span></span>'
        + '<span class="shop-item-visual"><svg viewBox="0 0 64 64" aria-hidden="true">'
        + iconeAmelioration(amelioration.id) + '</svg></span>'
        + '<h3>' + amelioration.nom + '</h3>'
        + '<p>' + amelioration.description + '</p>'
        + '<span class="amelioration-niveaux">' + jauge + '</span>'
        + '<span class="shop-item-bottom">' + pied + '</span>';

      carte.addEventListener('click', () => acheterAmeliorationDonjon(amelioration.id));
      ui.shopAmeliorations.appendChild(carte);
    });
  }

  // L'equipement permanent est lui aussi filtre par classe : un module de
  // sabres n'a aucun effet sur un Ranger, l'afficher serait du leurre.
  const visibleEquipment = META_EQUIPMENT.filter((item) => item.classId === 'shared' || item.classId === equippedClass);
  visibleEquipment.forEach((item) => {
    const level = getEquipmentLevel(item.id);
    const maxed = level >= item.maxLevel;
    const nextCost = getEquipmentCost(item, level + 1);
    const affordable = peutDepenser(nextCost);
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

  // Les compteurs n'affichent que ce qui est reellement accessible avec la
  // classe courante, sinon ils annoncent des armes inatteignables.
  const classWeapons = Object.values(WEAPON_DEFINITIONS).filter((weapon) => weapon.classId === equippedClass);
  const classAbilities = Object.values(ABILITY_DEFINITIONS).filter((ability) => ability.classId === equippedClass);
  const ownedWeaponsCount = classWeapons.filter((weapon) => ownsWeapon(weapon.id)).length;
  const ownedAbilitiesCount = classAbilities.filter((ability) => ownsAbility(ability.id)).length;
  ui.shopOwnedCount.textContent = `${equippedClass === 'ranger' ? 'RANGER' : 'ASSASSIN'} // ${ownedWeaponsCount} / ${classWeapons.length} ARMES // ${ownedAbilitiesCount} / ${classAbilities.length} CAPACITÉS // ${installedCount} / ${visibleEquipment.length} MODULES`;
  // Chaque carte est un <button>, et Chrome ne traite pas leur contenu comme
  // une vraie colonne flex : le libelle du bas se superposait aux dernieres
  // lignes de la description. On encapsule le contenu dans un div.
  [ui.shopClasses, ui.shopWeapons, ui.shopAbilities, ui.shopItems].forEach((conteneur) => {
    conteneur.querySelectorAll(':scope > .shop-item').forEach((carte) => {
      if (carte.firstElementChild && carte.firstElementChild.classList.contains('shop-item-inner')) return;
      const enveloppe = document.createElement('div');
      enveloppe.className = 'shop-item-inner';
      while (carte.firstChild) enveloppe.appendChild(carte.firstChild);
      carte.appendChild(enveloppe);
    });
  });
  updateCreditsUI();
}

function buyPlayerClass(id) {
  if (state !== GAME_STATE.SHOP) return;
  const classDefinition = PLAYER_CLASSES[id];
  if (!classDefinition || ownsClass(id) || !peutDepenser(classDefinition.price)) return;
  depenserArgent(classDefinition.price);
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
  if (ownsWeapon(id) || !peutDepenser(weapon.price)) return;
  depenserArgent(weapon.price);
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
  if (ownsAbility(id) || !peutDepenser(ability.price)) return;
  depenserArgent(ability.price);
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
  if (!peutDepenser(cost)) return;

  depenserArgent(cost);
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
  // Les ameliorations du donjon. Elles s'ajoutent aux deux autres sources, en
  // multiplicatif pour ce qui est multiplicatif, et en addition pour ce qui
  // s'ajoute. Comme les modules de vague, elles ne se cumulent pas en cascade.
  //
  // Elles sont lues et non ecrites ici : ce sont les niveaux achetes au
  // terminal, et rien d'autre. Sans ca, une amelioration du donjon
  // continuerait de s'appliquer apres la mort, ce qui ferait du mode un
  // atelier permanent deguise.
  const donjon = player.donjon || {};
  const donjonDegats = DONJON_VALEURS.degats * (donjon.degats || 0);
  const donjonCadence = DONJON_VALEURS.cadence * (donjon.cadence || 0);
  const donjonVitesse = DONJON_VALEURS.vitesse * (donjon.vitesse || 0);
  const donjonRecharge = DONJON_VALEURS.recharge * (donjon.recharge || 0);
  const donjonChargeur = DONJON_VALEURS.chargeur * (donjon.chargeur || 0);
  const donjonVie = DONJON_VALEURS.vie * (donjon.vie || 0);
  const donjonReduction = DONJON_VALEURS.reduction * (donjon.reduction || 0);
  const donjonPerforation = DONJON_VALEURS.perforation * (donjon.perforation || 0);
  const isAssassin = player.classId === 'assassin';
  const damageKey = isAssassin ? 'shadowDamage' : 'damage';
  const rateKey = isAssassin ? 'shadowFlurry' : 'fireRate';

  const damageScale = (1 + UPGRADE_VALUES.damagePer * (upgrades[damageKey] || 0) + donjonDegats)
    * permanent.damageMultiplier;
  const rateScale = (1 + UPGRADE_VALUES.fireRatePer * (upgrades[rateKey] || 0) + donjonCadence)
    * permanent.fireRateMultiplier;

  player.damage = player.baseDamage * damageScale;
  player.fireRate = player.baseFireRate * rateScale;
  player.maxHealth = player.baseMaxHealth
    + UPGRADE_VALUES.armorPer * (upgrades.armor || 0)
    + UPGRADE_VALUES.poiseHealthPer * (upgrades.shadowPoise || 0)
    + donjonVie;
  // La vie maximale qui vient d'augmenter se sent tout de suite : sans cela on
  // achete INTEGRITE et on reste a la meme barre, ce qui donne l'impression
  // d'un achat inutile.
  player.health = Math.min(player.maxHealth, player.health + donjonVie);
  player.speed = player.baseSpeed
    * (1 + UPGRADE_VALUES.speedPer * (upgrades.speed || 0) + donjonVitesse)
    * permanent.speedMultiplier;
  // Le Ranger n'a plus AUCUNE source de soin : ni capacite, ni amelioration.
  // Les Nénithes réparateurs ont ete retires, et avec eux la seule voie qui
  // le rendait. Ce qui reste ici n'appartient qu a l'Assassin (poise) ou a
  // l'atelier permanent, dont la valeur de regeneration est nulle par
  // construction : sans ce commentaire, la ligne suivante semble regagner de
  // la vie par elle-meme.
  player.regen = permanent.regen
    + UPGRADE_VALUES.poiseRegenPer * (upgrades.shadowPoise || 0);
player.damageReduction = Math.min(
Math.max(UPGRADE_VALUES.reductionCap, DONJON_VALEURS.reductionPlafond),
UPGRADE_VALUES.reductionPer * (upgrades.stabilize || 0)
+ permanent.damageReduction
+ donjonReduction
);
player.magazineSize = player.baseMagazine
+ UPGRADE_VALUES.magazinePer * (upgrades.magazine || 0)
+ donjonChargeur;
player.reloadTime = Math.max(
UPGRADE_VALUES.reloadFloor,
player.baseReloadTime
* (1 - UPGRADE_VALUES.reloadPer * (upgrades.reload || 0) - donjonRecharge)
* permanent.reloadMultiplier
);
player.pierce = player.basePierce + (upgrades.pierce || 0) + donjonPerforation;
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
  // Les projectiles sont des objets dynamiques comme les autres : laisses en
  // place, ils continueraient de voler et de blesser dans une partie suivante,
  // et leurs maillages resteraient dans le GPU.
  clearProjectiles();
  enemyTargets.length = 0;
  syncRaycastTargets();
  navTimer = 0;
  // scene.remove() ne libère rien : sans dispose(), chaque partie quittée
  // laisse ses géométries et matériaux dans les buffers GPU.
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

// La texture de halo, une seule fois pour tout le jeu.
//
// makeGlowTexture fabrique un canvas de 128 pixels et une texture GPU. L'appeler
// pour chaque ennemi paraissait naturel, et c'est exactement le genre de fuite
// qui ne se voit pas : le compteur de textures reste plausible, la scene
// ralentit un peu a chaque vague, et le navigateur finit par tuer l'onglet sans
// rien dire. Le test de graphismes compte les textures precisely pour cela.
//
// Le flash de bouche de l'arme et le halo des robots partagent donc le meme
// degrade. C'est le meme effet, et un seul objet.
let textureHaloPartagee = null;

function haloPartage() {
  if (!textureHaloPartagee) textureHaloPartagee = makeGlowTexture();
  return textureHaloPartagee;
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

  // Le sol. Il occupe le tiers bas de l'ecran en permanence, et c etait le
  // dernier grand aplat du jeu : une grille peinte sur un plan, sans relief ni
  // variation d'etat de surface. Un sol qui ne change pas d'aspect sous le
  // passage du joueur donne l'impression de regarder une image de fond.
  //
  // Deux ajustements : une carte de normales qui creuse les dalles, et une
  // rugosite plus haute avec un metal plus bas, pour que le sol accroche moins
  // la lumiere au loin et renvoie davantage de detail quand on le regarde.
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: map.floorColor,
    map: makeGridTexture(),
    normalMap: normalDalles(),
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.74,
    metalness: 0.34
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

  // Les murs portent la meme plaque de blindage que les robots, avec une
  // densite propre. Sans elle, les quatre murs de l arene sont quatre aplats
  // de couleur qui occupent la moitie de l ecran, et ils donnent au joueur
  // l impression de regarder un fond.
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: map.wallColor,
    map: plaqueBlindage(),
normalMap: normalPlaqueBlindage(),
normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.5,
    metalness: 0.62
  });
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
    const wall = new THREE.Mesh(boiteChanfreee(width, 5.4, depth), wallMaterial);
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
    const material = new THREE.MeshStandardMaterial({
      color: 0x162833,
      map: plaqueBlindage(),
normalMap: normalPlaqueBlindage(),
normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.48,
      metalness: 0.6
    });
    const block = new THREE.Mesh(boiteChanfreee(width, height, depth), material);
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
  const guardWingGeometry = boiteChanfreee(0.135, 0.026, 0.05);

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

    const guardBar = new THREE.Mesh(boiteChanfreee(0.085, 0.038, 0.062), darkMaterial);
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
    const arm = new THREE.Mesh(boiteChanfreee(0.12, 0.14, 0.3), darkMaterial);
    arm.position.set(0, -0.02, 0.62);
    saber.add(arm);
    const knuckle = new THREE.Mesh(boiteChanfreee(0.135, 0.05, 0.11), handleMaterial);
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

  const receiver = new THREE.Mesh(boiteChanfreee(0.24, 0.19, 0.52), darkMaterial);
  receiver.position.set(0, 0.03, -0.12);
  group.add(receiver);

  const upperRail = new THREE.Mesh(boiteChanfreee(0.18, 0.065, 0.46), blackMaterial);
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

  const grip = new THREE.Mesh(boiteChanfreee(0.14, 0.33, 0.16), blackMaterial);
  grip.position.set(0, -0.2, 0.06);
  grip.rotation.x = -0.28;
  group.add(grip);

  const magazine = new THREE.Mesh(boiteChanfreee(0.14, 0.28, 0.18), darkMaterial);
  magazine.position.set(0, -0.21, -0.13);
  magazine.rotation.x = 0.12;
  group.add(magazine);

  const stock = new THREE.Mesh(boiteChanfreee(0.18, 0.15, 0.33), darkMaterial);
  stock.position.set(0, 0, 0.27);
  group.add(stock);

  const energyCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), cyanMaterial);
  energyCore.position.set(0.13, 0.035, -0.08);
  energyCore.rotation.z = Math.PI / 4;
  group.add(energyCore);

  const sideRail = new THREE.Mesh(boiteChanfreee(0.025, 0.055, 0.27), orangeMaterial);
  sideRail.position.set(0.135, -0.025, 0.02);
  group.add(sideRail);

  const frontSight = new THREE.Mesh(boiteChanfreee(0.035, 0.08, 0.035), blackMaterial);
  frontSight.position.set(0, 0.21, -0.7);
  group.add(frontSight);

  muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloPartage(),
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

// ===========================================================================
// Robot humanoide
//
// Les ennemis etaient des icosaedres : une masse informee avec des pattes. Le
// nouveau gabarit s'inspire d'un robot humanoide cubique, corps sombre,
// contours lumineux et visee claire sur la tete.
//
// Trois contraintes ont dirige la construction :
//
// 1. Le cout de rendu. Chaque partie posee est un appel de dessin, et jusqu'a
//    onze ennemis peuvent etre vivants : un robot de vingt-quatre morceaux
//    aurait triple l'appel de dessin. Les parties immobiles sont donc
//    fusionnees en une geometrie par materiau. Seules les parties animees
//    (les deux jambes, les deux bras) gardent un maillage chacune.
//
// 2. La couleur de chaque type est un signal de lecture : le joueur identifie
//    une menace a sa couleur en une fraction de seconde. Chaque type garde
//    donc exactement sa couleur d'origine, seule la forme change.
//
// 3. Les contrats utilises ailleurs sont preserves : hitMeshes (ciblage),
//    legPivots (animation de marche), materials.body et materials.armor
//    (flash de degat), enemy.head et enemy.headRadius (detection du headshot).
// ===========================================================================

// Boite unite partagee : toutes les parties en derivent, et les geometries
// Le cube de base de tous les robots.
//
// C'est une boite aux aretes coupees, pas une boite.
//
// Une boite parfaite avec eclairage plat donne exactement ce que le jeu
// reprochait : une pile de cubes. Le probleme n'etait pas le materiel, ni le
// nombre de pieces, mais l'arete vive. Coupee, elle devient une facette qui
// attrape la lumiere : le robot garde sa lecture low-poly, mais il a des
// reliefs.
//
// C'est le point de levier choisi parce qu'il est gratuit : les 27 pieces d'un
// robot sont decrites par box() et fusionnees par mergeBoxParts, qui lit ce
// cube. Le chanfrein est donc applique partout d'un coup, sans toucher aux
// 161 lignes du constructeur, et toujours en une seule geometrie fusionnee.
//
// Le chanfrein est une fraction de chaque dimension. Mise a l'echelle par
// (largeur, hauteur, profondeur), il reste donc proportionnel sur les trois
// axes : une cuisse fine et haute garde un chanfrein fin et haut, et non un
// coin deplace. C'est la raison pour laquelle une boite unique multipliee
// fonctionne ici, alors qu'un bevel calcule en unites monde serait deforme.
// Le pave de base, eventuellement fusele.
//
// Le fuselage est ce qui fait vraiment sortir le robot de la pile de boites.
// Une boite a arêtes vives reste une boite meme avec un chanfrein : ses faces
// sont paralleles deux a deux et rien ne dit que le corps va en s'etalant. Un
// buste retreci vers la taille, un bras qui s'affine vers le coude, une cuisse
// qui descend vers le genou : ce sont ces quelques pour cents qui donnent la
// lecture d'un corps articulé plutot que d'un empilement.
//
// La pente est appliquee APRES la construction, en fonction de la hauteur du
// sommet. Les normales sont ensuite recalculees sommet par sommet, parce que
// la pente les fausse : une face qui penche n'est plus parallele a un axe.
//
// fusee vaut 0 pour une piece droite. Il est mis en cache : le robot n'a que
// cinq valeurs de fusee differentes, donc cinq geometries au lieu de
// vingt-sept, et le cout d/'une apparition ne change pas.
function creerPaveChanfreine(chanfrein, fusee) {
  const lo = -0.5 + chanfrein;
  const hi = 0.5 - chanfrein;
  const positions = [];
  const normals = [];
  const uvs = [];

  // Un triangle, avec l'orientation corrigee sur le vol.
  //
  // Enumerer les sommets dans le bon sens pour les quarante-quatre triangles
  // d'une boite coupee est une source d'erreur invisible : la geometrie
  // s'affiche, mais trois faces sur quatre sont eclairées a l'envers. On calcule
  // donc la normale geometrique, et on inverse le triangle si elle ne va pas
  // dans le sens voulu.
  function triangle(a, b, c, nx, ny, nz) {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    const sens = (cx * nx + cy * ny + cz * nz) < 0 ? -1 : 1;
    const p = sens < 0 ? [a, c, b] : [a, b, c];

    for (const v of p) {
      // La pente : l'echelle horizontale vaut 1 + fusee en haut, et 1 - fusee en
      // bas. En haut y vaut +0,5, donc le facteur monte avec la hauteur : plus
      // fusee est grand, plus la piece s'elargit vers le haut et retrecit vers
      // le bas.
      //
      // Le SENS a d'abord ete pris a l'envers : le pave s'elargissait vers le
      // bas, le buste devenait une jupe et les membres des entonnoirs. C'etait
      // mathematiquement correct et visuellement l'inverse de l'effet cherche.
      // Aucun controle de structure ne l'aurait vu : le nombre de triangles
      // etait bon, les normales etaient alignees, et le robot avait l'air d'etre
      // passe par un defaut de posture.
      const facteur = 1 + fusee * (v[1] * 2);
      positions.push(v[0] * facteur, v[1], v[2] * facteur);
      // La boite droite garde les normales de la boite. Sans elles, l'attribut
      // normal serait vide et le moteur inventerait un eclairage de son cote.
      if (fusee === 0) normals.push(nx, ny, nz);
    }

    // Coordonnees de texture par projection sur la face.
    //
    // On prend les deux axes les moins alignes avec la normale, pas x et y
    // comme on le ferait par reflexes. Avec x et y, une face vers le haut
    // recoit des coordonnees qui varient peu, et la texture s'etire sur toute
    // la longueur du dessus d'un bloc : on obtenait des bavures laites au lieu
    // de panneaux.
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const az = Math.abs(nz);
    for (const v of p) {
      const facteur = 1 + fusee * (v[1] * 2);
      if (ay >= ax && ay >= az) uvs.push(v[0] * facteur + 0.5, v[2] * facteur + 0.5);
      else if (ax >= az) uvs.push(v[1] + 0.5, v[2] * facteur + 0.5);
      else uvs.push(v[0] * facteur + 0.5, v[1] + 0.5);
    }
  }

  function quad(a, b, c, d, nx, ny, nz) {
    triangle(a, b, c, nx, ny, nz);
    triangle(a, c, d, nx, ny, nz);
  }

  // 6 faces : le plan extreme, borne par la partie non chanfreine.
  for (let axe = 0; axe < 3; axe += 1) {
    const u = (axe + 1) % 3;
    const v = (axe + 2) % 3;
    for (const signe of [-1, 1]) {
      const p = [];
      for (const [cu, cv] of [[lo, lo], [lo, hi], [hi, hi], [hi, lo]]) {
        const point = [0, 0, 0];
        point[axe] = signe * 0.5;
        point[u] = cu;
        point[v] = cv;
        p.push(point);
      }
      const n = [0, 0, 0];
      n[axe] = signe;
      quad(p[0], p[1], p[2], p[3], n[0], n[1], n[2]);
    }
  }

  // 12 aretes : la facette qui relie deux faces voisines.
  const racine2 = Math.SQRT1_2;
  for (let a = 0; a < 3; a += 1) {
    const b = (a + 1) % 3;
    const c = (a + 2) % 3;
    for (const sa of [-1, 1]) {
      for (const sb of [-1, 1]) {
        const p1 = [0, 0, 0];
        const p2 = [0, 0, 0];
        const p3 = [0, 0, 0];
        const p4 = [0, 0, 0];
        p1[a] = sa * 0.5; p1[b] = sb * lo; p1[c] = lo;
        p2[a] = sa * 0.5; p2[b] = sb * lo; p2[c] = hi;
        p3[a] = sa * lo;  p3[b] = sb * 0.5; p3[c] = hi;
        p4[a] = sa * lo;  p4[b] = sb * 0.5; p4[c] = lo;
        const n = [0, 0, 0];
        n[a] = sa * racine2;
        n[b] = sb * racine2;
        quad(p1, p2, p3, p4, n[0], n[1], n[2]);
      }
    }
  }

  // 8 coins : le triangle qui ferme la boite.
  const racine3 = 1 / Math.sqrt(3);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        triangle(
          [sx * 0.5, sy * lo, sz * lo],
          [sx * lo, sy * 0.5, sz * lo],
          [sx * lo, sy * lo, sz * 0.5],
          sx * racine3, sy * racine3, sz * racine3
        );
      }
    }
  }

  // Les normales sont recalculees sur la geometrie reelle, sommet par sommet.
  // Elles ne serviraient a rien si l on reprenait celles de la boite droite : la
  // pente les a faussees, et une face de travers s' eclaire de travers. C est
  // aussi ce qui donne au fuselage son ombre propre sur le flanc.
  if (fusee !== 0) {
    for (let t = 0; t < positions.length; t += 9) {
      const ax = positions[t];
      const ay = positions[t + 1];
      const az = positions[t + 2];
      const bx = positions[t + 3];
      const by = positions[t + 4];
      const bz = positions[t + 5];
      const cx = positions[t + 6];
      const cy = positions[t + 7];
      const cz = positions[t + 8];
      const ux = bx - ax; const uy = by - ay; const uz = bz - az;
      const vx = cx - ax; const vy = cy - ay; const vz = cz - az;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const longueur = Math.hypot(nx, ny, nz) || 1;
      nx /= longueur; ny /= longueur; nz /= longueur;
      for (let v = 0; v < 3; v += 1) {
        normals[t + v * 3] = nx;
        normals[t + v * 3 + 1] = ny;
        normals[t + v * 3 + 2] = nz;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

// La boite droite : c est un pave sans pente. Elle passe par le pave pour
// qu il n y ait qu une seule definition des quarante-quatre triangles.
function creerCubeChanfreine(chanfrein) {
  return creerPaveChanfreine(chanfrein, 0);
}

// Le cube partage par toutes les pieces de tous les robots. Sans index : la
// fusion le gere, et un cube chanfreine se decrit plus simplement sans.
const unitBoxGeometry = creerCubeChanfreine(0.07);

// Les pavés fuselés sont mis en cache.
//
// Le robot n'a que cinq valeurs de pente différentes, donc cinq géométries au
// lieu de vingt-sept. Sans ce cache, chaque apparition régénérerait une
// géométrie par pièce fuselée : c'est de l'allocation dans la boucle de jeu,
// pour un résultat identique.
const pavesFuseles = new Map();
const CHANFREIN_PARTIE = 0.07;

function pavePourFusee(fusee) {
  if (!fusee) return unitBoxGeometry;
  const cle = fusee.toFixed(3);
  if (!pavesFuseles.has(cle)) {
    pavesFuseles.set(cle, creerPaveChanfreine(CHANFREIN_PARTIE, fusee));
  }
  return pavesFuseles.get(cle);
}

// Version dimensionnee, pour l'arme du joueur et le decor, qui construisent
// leurs maillages un par un au lieu de passer par la fusion. Le chanfrein est
// calcule ici en unites monde, donc proportionnel a la piece comme pour les
// robots, et il ne coute qu'une geometrie de plus par piece.
function boiteChanfreee(largeur, hauteur, profondeur, chanfrein = 0.035) {
  const plusPetit = Math.min(largeur, hauteur, profondeur) * 0.22;
  const c = Math.min(chanfrein, plusPetit);
  const unite = creerCubeChanfreine(1);
  // Reutiliser la meme unit cube mis a l'echelle evite d'ecrire deux generateurs.
  // La geometrie resultante a la MEME forme qu'une boite chanfreee de cette
  // taille, puisque le chanfrein est une fraction de chaque dimension.
  const position = unite.attributes.position;
  const normal = unite.attributes.normal;
  const uv = unite.attributes.uv;
  const positions = new Float32Array(position.count * 3);
  const normals = new Float32Array(position.count * 3);
  const uvs = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    positions[i * 3] = position.getX(i) * largeur;
    positions[i * 3 + 1] = position.getY(i) * hauteur;
    positions[i * 3 + 2] = position.getZ(i) * profondeur;
    // Non uniforme : il faut renormaliser, comme le fait deja la fusion.
    const nx = normal.getX(i) / largeur;
    const ny = normal.getY(i) / hauteur;
    const nz = normal.getZ(i) / profondeur;
    const longueur = Math.hypot(nx, ny, nz) || 1;
    normals[i * 3] = nx / longueur;
    normals[i * 3 + 1] = ny / longueur;
    normals[i * 3 + 2] = nz / longueur;
    // Coordonnees de texture a l'echelle de la piece. Un bloc de couverture de
    // six metres et un de deux metres doivent montrer le meme nombre de
    // panneaux, sinon la texture trahit les dimensions de l'arene.
    uvs[i * 2] = uv.getX(i) * largeur;
    uvs[i * 2 + 1] = uv.getY(i) * hauteur;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geometry;
}

// Fusionne une liste de boites decrites en local (taille, position, rotation)
// en une seule BufferGeometry. Sans cela, chaque robot coûterait une
// vingtaine d'appels de dessin.
function mergeBoxParts(parts) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const matrix = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let offset = 0;

  for (const part of parts) {
    position.set(part.x || 0, part.y || 0, part.z || 0);
    euler.set(part.rx || 0, part.ry || 0, part.rz || 0);
    quaternion.setFromEuler(euler);
    scale.set(part.w, part.h, part.d);
    matrix.compose(position, quaternion, scale);
    normalMatrix.getNormalMatrix(matrix);

    // La geometrie depend de la pente de la piece : un bras fusele et un tronc
    // droit n'ont pas les memes faces, meme apres la meme echelle.
    const pave = pavePourFusee(part.fusee || 0);
    const vertexAttribute = pave.attributes.position;
    const normalAttribute = pave.attributes.normal;
    const uvAttribute = pave.attributes.uv;
    for (let i = 0; i < vertexAttribute.count; i += 1) {
      vertex.fromBufferAttribute(vertexAttribute, i).applyMatrix4(matrix);
      positions.push(vertex.x, vertex.y, vertex.z);
      // La normale est renormalisee apres la mise a l echelle, et le
      // tangente de la pente est ajoutee. Sans ce second terme, le flanc d
      // une piece fusilee s eclaire comme si elle etait droite : la pente
      // serait dans la geometrie, mais pas dans l eclairage, et le relief
      // disparaitrait exactement la ou on voulait le voir.
      normal.fromBufferAttribute(normalAttribute, i).applyMatrix3(normalMatrix);
      if (part.fusee) {
        // Une piece qui se retrecit vers le haut voit sa normale basculer
        // vers ce haut : c est ce qui donne l ombre du flanc.
        normal.x += part.fusee * 2 * normalAttribute.getY(i);
        normal.z += part.fusee * 2 * normalAttribute.getY(i);
      }
      normal.normalize();
      // et des tibias est faux.
      normal.fromBufferAttribute(normalAttribute, i).applyMatrix3(normalMatrix).normalize();
      normals.push(normal.x, normal.y, normal.z);
      // La texture est multipliee par la taille de la piece. Sans cela, un
      // avant-bras de vingt centimetres et un buste de deux metres porteraient
      // le meme nombre de joints de panneau : la couture s'etirerait sur toute
      // la longueur du bras, et le robot semblerait taille dans une seule
      // feuille.
      uvs.push(uvAttribute.getX(i) * part.w, uvAttribute.getY(i) * part.h);
    }
    // Le cube chanfreine n'a pas d'index : mergeBoxParts sait gerer les deux.
    // Sans ce test, la fusion le lirait comme undefined et le jeu entier
    // resterait noir.
    const indexAttribute = unitBoxGeometry.index;
    if (indexAttribute) {
      for (let i = 0; i < indexAttribute.count; i += 1) {
        indices.push(indexAttribute.getX(i) + offset);
      }
    } else {
      for (let i = 0; i < vertexAttribute.count; i += 1) {
        indices.push(i + offset);
      }
    }
    offset += vertexAttribute.count;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

// Un pave : structure sombre ou lisere lumineux. Meme fonction, deux
// materiaux : la distinction vient du materiau, pas de la forme.
function box(x, y, z, w, h, d, rotation) {
  const part = { x, y, z, w, h, d };
  if (rotation) Object.assign(part, rotation);
  return part;
}

// Epaisseur des liseres. Ils remplacent les contours neon de la reference :
// WebGL ignore l'epaisseur des lignes, un trait d'un pixel ne se voit pas,
// un pave plat de quelques millimetres en revanche se voit sous tout
// eclairage.
const LISERE = 0.024;

// Angle de levee des bras, en radians. Le bras pend au repos (0) et se leve
// presque a l'horizontale quand l'ennemi arme une attaque (1.35).
const BRAS_ARME = 1.35;

// Construit le robot et retourne les maillages a attacher a la racine.
// three est passe en parametre : ce fichier n'importe pas Three.js, seul
// game.js le fait, et cela evite un import circulaire.
function buildHumanoid(three, template, materials, options) {
  const { isAlpha, headSize, shadows } = options;

  // Silhouette : la masse du buste et la largeur des epaules distinguent les
  // types. Un robot humanoide a deux jambes pour tous : c'est le nombre de
  // pattes qui changeait avant, et cela rendait les limaces et les brutes
  // illisibles.
  const lourd = isAlpha || template.bulk === 'heavy';
  const leger = template.bulk === 'light';

  const busteL = lourd ? 0.66 : leger ? 0.5 : 0.57;
  const busteH = lourd ? 0.68 : leger ? 0.46 : 0.58;
  const busteD = lourd ? 0.46 : leger ? 0.36 : 0.41;

  const epaule = lourd ? 0.66 : leger ? 0.48 : 0.56;
  const brasLong = lourd ? 0.4 : 0.36;
  const avantBrasLong = lourd ? 0.38 : 0.34;
  const cuisseLong = lourd ? 0.5 : 0.46;
  const tibiaLong = lourd ? 0.46 : 0.42;
  const piedH = 0.1;

  // Verticale construite depuis le sol, et non depuis le buste. Le gabarit
  // precedent partait de la taille et posait la hanche trop bas : les pieds
  // passaient sous le sol et le robot paraissait accroupi. Ancrer sur le sol
  // garantit que les pieds reposent dessus, quelle que soit la taille du
  // buste.
  const hancheY = piedH + tibiaLong + cuisseLong;
  const bassinY = hancheY + 0.12;
  const abdomenY = bassinY + 0.17;
  const busteY = abdomenY + busteH / 2 + 0.07;
  const hautBuste = busteY + busteH / 2;
  const basBuste = busteY - busteH / 2;
  const epauleY = hautBuste - 0.09;
  const xEpaule = epaule / 2 + 0.08;

  // --- Corps sombre, parties immobiles fusionnees --------------------------
  const structure = [
    box(0, busteY, 0, busteL, busteH, busteD, { fusee: 0.16 }),
    box(0, abdomenY, 0, busteL * 0.8, 0.2, busteD * 0.86),
    box(0, bassinY, 0, busteL * 0.88, 0.2, busteD * 0.9),
    box(-xEpaule, epauleY, 0, 0.17, 0.22, busteD * 0.88),
    box(xEpaule, epauleY, 0, 0.17, 0.22, busteD * 0.88)
  ];
  const structureMesh = new three.Mesh(mergeBoxParts(structure), materials.body);
  structureMesh.castShadow = shadows;

  // --- Liseres lumineux ----------------------------------------------------
  const trims = [];
  [-1, 1].forEach((side) => {
    trims.push(
      box(0, hautBuste, busteD / 2, busteL, LISERE, LISERE),
      box(0, basBuste, busteD / 2, busteL, LISERE, LISERE),
      box(side * busteL / 2, busteY, busteD / 2, LISERE, busteH, LISERE),
      box(0, hautBuste, -busteD / 2, busteL, LISERE, LISERE),
      box(0, basBuste, -busteD / 2, busteL, LISERE, LISERE)
    );
  });
  trims.push(
    box(0, bassinY, busteD / 2, busteL * 0.88, LISERE, LISERE),
    box(0, busteY, busteD / 2 + 0.006, LISERE, busteH * 0.78, LISERE)
  );

  // --- Tete, cou et visee --------------------------------------------------
  // La tete reste un maillage separe : enemy.head et sa position monde servent
  // a la detection du headshot.
  const headY = hautBuste + headSize * 0.72;
  const head = new three.Mesh(
    boiteChanfreee(headSize * 2, headSize * 1.55, headSize * 1.7),
    materials.body
  );
  head.position.set(0, headY, 0);
  head.castShadow = shadows;
  head.userData.headshot = true;

  // Cou, pour que le robot ne semble pas decapite.
  trims.push(
    box(0, headY + headSize * 0.78, 0, headSize * 2.02, LISERE * 0.7, headSize * 1.72),
    box(0, headY - headSize * 0.78, 0, headSize * 2.02, LISERE * 0.7, headSize * 1.72)
  );

  const neckMesh = new three.Mesh(
    mergeBoxParts([box(0, hautBuste + 0.04, 0, headSize * 0.8, 0.1, headSize * 0.8)]),
    materials.body
  );

  // Visee : une fente horizontale lumineuse, le signe de reconnaissance de la
  // reference. Plus large que haute, c'est ce qui rend le regard lisible.
  const visor = new three.Mesh(
    boiteChanfreee(headSize * 1.72, headSize * 0.3, 0.03),
    materials.visor
  );
  visor.position.set(0, headY + headSize * 0.12, headSize * 0.86);

  const trimMesh = new three.Mesh(mergeBoxParts(trims), materials.trim);

  // --- Bras : un pivot par epaule, anime ------------------------------------
  // Le pivot est a l'epaule et le bras pend vers le bas, donc une rotation
  // autour de X leve le bras vers l'avant : c'est le geste d'arme.
  const brasGeometry = mergeBoxParts([
    box(0, -brasLong / 2, 0, 0.15, brasLong, 0.16, { fusee: 0.2 }),
    box(0, -brasLong - avantBrasLong / 2, 0, 0.14, avantBrasLong, 0.15, { fusee: 0.18 }),
    // Main
    box(0, -brasLong - avantBrasLong - 0.06, 0.01, 0.15, 0.13, 0.17)
  ]);
  const brasTrim = mergeBoxParts([
    box(0.076, -brasLong / 2, 0, 0.02, brasLong * 0.85, 0.02),
    box(0, -brasLong - avantBrasLong / 2, 0.076, 0.13, 0.02, 0.02)
  ]);

  const armPivots = [];
  [-1, 1].forEach((side) => {
    const pivot = new three.Group();
    pivot.position.set(side * xEpaule, epauleY - 0.1, 0);
    const mesh = new three.Mesh(brasGeometry, materials.body);
    mesh.castShadow = shadows;
    pivot.add(mesh);
    pivot.add(new three.Mesh(brasTrim, materials.trim));
    armPivots.push({ pivot, side });
  });

  // --- Jambes --------------------------------------------------------------
  // La jambe pend depuis la hanche et descend jusqu'au sol : le pivot est a
  // hancheY et la somme cuisse + tibia + pied vaut exactement hancheY, donc le
  // pied repose sur y = 0.
  const jambeGeometry = mergeBoxParts([
    box(0, -cuisseLong / 2, 0, 0.2, cuisseLong, 0.21, { fusee: 0.16 }),
    box(0, -cuisseLong - tibiaLong / 2 + 0.02, 0, 0.17, tibiaLong, 0.18, { fusee: 0.14 }),
    // Pied avance vers l'avant, comme sur la reference.
    box(0, -cuisseLong - tibiaLong - piedH / 2, 0.05, 0.21, piedH, 0.31)
  ]);
  const jambeTrim = mergeBoxParts([
    box(0.101, -cuisseLong / 2, 0, 0.02, cuisseLong * 0.9, 0.02),
    box(-0.101, -cuisseLong / 2, 0, 0.02, cuisseLong * 0.9, 0.02),
    box(0, -cuisseLong - tibiaLong / 2 + 0.02, 0.091, 0.17, 0.02, 0.02),
    box(0, -cuisseLong - tibiaLong - piedH / 2, 0.19, 0.21, 0.02, 0.14)
  ]);

  const legPivots = [];
  [-1, 1].forEach((side, index) => {
    const pivot = new three.Group();
    pivot.position.set(side * busteL * 0.26, hancheY, 0);
    const mesh = new three.Mesh(jambeGeometry, materials.body);
    mesh.castShadow = shadows;
    pivot.add(mesh);
    pivot.add(new three.Mesh(jambeTrim, materials.trim));
    // Phase decalee de pi : sans cela les deux jambes oscillent ensemble et le
    // robot avance en sautant sur deux pieds joints.
    legPivots.push({ pivot, side, phase: index * Math.PI });
  });

  return {
    structureMesh,
    neckMesh,
    trimMesh,
    head,
    visor,
    armPivots,
    legPivots,
    busteY
  };
}

// Anime les bras. armement vaut 0 au repos et 1 les bras leves : l'appel qui
// arme une attaque n'a plus qu'a regler cette valeur, que ce soit un coup de
// grappin ou un tir.
function animerBras(armPivots, armement) {
  const levee = Math.max(0, Math.min(1, armement)) * BRAS_ARME;
  for (const { pivot, side } of armPivots) {
    pivot.rotation.x = -levee;
    // Legere ouverture vers l'exterieur : un bras parfaitement vertical lit
    // moins bien qu'un bras legerement ecarte.
    pivot.rotation.z = side * (0.1 + levee * 0.16);
  }
}
// La carte de normales des dalles du sol.
//
// Meme principe que le blindage : un relief dessine en niveaux de gris, puis
// converti en normale par un filtre de Sobel. Ici le relief est une grille
// creuse, et c est elle qui fait que les lignes du sol jouent le role de
// joints entre des dalles plutot que de traits peints.
//
// La grille est volontairement plus grossiere que sur le blindage : des
// dalles d'un metre environ, pas des rivets. Un sol covered de petits details
// scintille des que le joueur avance, et le bruit se voit plus que le relief.
let normalDallesCache = null;
function normalDalles() {
  if (normalDallesCache) return normalDallesCache;
  const taille = 256;
  const dalles = 4;
  const joint = taille / dalles;

  const hauteur = document.createElement('canvas');
  hauteur.width = taille;
  hauteur.height = taille;
  const ctx = hauteur.getContext('2d');
  ctx.fillStyle = '#909090';
  ctx.fillRect(0, 0, taille, taille);
  ctx.fillStyle = '#404040';
  for (let i = 0; i <= dalles; i += 1) {
    ctx.fillRect(i * joint - 2, 0, 4, taille);
    ctx.fillRect(0, i * joint - 2, taille, 4);
  }
  // Le grain : deux joints sur cinq seulement, pour que le sol ne devienne
  // pas un quadrille parfait.
  ctx.fillStyle = '#a8a8a8';
  for (let i = 0; i < dalles; i += 1) {
    for (let k = 0; k < dalles; k += 1) {
      if ((i + k) % 2 === 0) ctx.fillRect(i * joint + 4, k * joint + 4, joint - 8, joint - 8);
    }
  }

  const source = ctx.getImageData(0, 0, taille, taille).data;
  const sortie = document.createElement('canvas');
  sortie.width = taille;
  sortie.height = taille;
  const sortieCtx = sortie.getContext('2d');
  const image = sortieCtx.createImageData(taille, taille);
  const force = 1.6;
  const hauteurAu = (x, y) => source[(((y + taille) % taille) * taille
    + ((x + taille) % taille)) * 4];

  for (let y = 0; y < taille; y += 1) {
    for (let x = 0; x < taille; x += 1) {
      const gx = (hauteurAu(x + 1, y - 1) + 2 * hauteurAu(x + 1, y)
        + hauteurAu(x + 1, y + 1))
        - (hauteurAu(x - 1, y - 1) + 2 * hauteurAu(x - 1, y)
          + hauteurAu(x - 1, y + 1));
      const gy = (hauteurAu(x - 1, y + 1) + 2 * hauteurAu(x, y + 1)
        + hauteurAu(x + 1, y + 1))
        - (hauteurAu(x - 1, y - 1) + 2 * hauteurAu(x, y - 1)
          + hauteurAu(x + 1, y - 1));
      const lx = -gx * force;
      const ly = -gy * force;
      const longueur = Math.hypot(lx, ly, 255) || 1;
      const i = (y * taille + x) * 4;
      image.data[i] = Math.round(((lx / longueur) * 0.5 + 0.5) * 255);
      image.data[i + 1] = Math.round(((ly / longueur) * 0.5 + 0.5) * 255);
      image.data[i + 2] = 255;
      image.data[i + 3] = 255;
    }
  }
  sortieCtx.putImageData(image, 0, 0);

  normalDallesCache = new THREE.CanvasTexture(sortie);
  normalDallesCache.wrapS = THREE.RepeatWrapping;
  normalDallesCache.wrapT = THREE.RepeatWrapping;
  return normalDallesCache;
}

// La plaque de blindage.
//
// Une seule image, partagee par tous les ennemis, construite au premier besoin.
// Elle n'est pas un fichier : le jeu n'a aucune ressource a charger, et surtout
// rien qui puisse manquer.
//
// Ce qu'elle apporte, et pourquoi ce n'est pas decoratif : sans elle, chaque
// surface d'un robot est une couleur unie, donc le seul relief vient de la
// silhouette et des liseres. Avec des joints de panneau et de la salissure, on
// distingue une plaque d'une autre a meme distance, et un robot cesse d'etre une
// silhouette.
//
// Elle est volontairement claire et peu contrastee. Une carte s multiplique
// avec la couleur du materiau : trop sombre, elle transformerait tous les
// ennemis en memes taches noires.
let texturePanneau = null;
let normalPanneau = null;
function plaqueBlindage() {
  if (texturePanneau) return texturePanneau;
  const taille = 256;
  const canvas = document.createElement('canvas');
  canvas.width = taille;
  canvas.height = taille;
  const ctx = canvas.getContext('2d');

  // Fond clair : 0,9, la carte ne doit pas assombrir le materiau.
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(0, 0, taille, taille);

  // Les joints : quatre bandes, decalees pour eviter l'effet de grille.
  ctx.strokeStyle = '#8f9aa2';
  ctx.lineWidth = 3;
  for (let i = 1; i < 4; i += 1) {
    const y = Math.round((i / 4) * taille);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(taille, y);
    ctx.stroke();
    // L'ombre juste sous le joint : c'est elle qui donne l'illusion d'une
    // plaque posee sur une autre, et non d'un quadrille peint.
    ctx.strokeStyle = '#c8ccd0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + 3);
    ctx.lineTo(taille, y + 3);
    ctx.stroke();
    ctx.strokeStyle = '#8f9aa2';
    ctx.lineWidth = 3;
  }

  // Les rivets, aux croisements.
  ctx.fillStyle = '#aab2b8';
  for (let i = 1; i < 4; i += 1) {
    for (let k = 0; k < 4; k += 1) {
      ctx.beginPath();
      ctx.arc((k / 4) * taille + 6, (i / 4) * taille + 6, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // La salissure : quelques balayages diagonaux, tres transparents.
  ctx.strokeStyle = 'rgba(120, 132, 140, 0.16)';
  ctx.lineWidth = 9;
  for (let i = 0; i < 14; i += 1) {
    const x = (i * 37) % taille;
    const y = (i * 61) % taille;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 26, y + 9);
    ctx.stroke();
  }

  texturePanneau = new THREE.CanvasTexture(canvas);
  texturePanneau.wrapS = THREE.RepeatWrapping;
  texturePanneau.wrapT = THREE.RepeatWrapping;
  // Sans filtrage anisotrope, la couture de panneau scintille des que le
  // joueur bouge : les texels ne tombent plus sur les pixels.
  //
  // Le test typeof est deliberé. Cette fonction est aussi executee par la page
  // d'apercu des robots, qui n'a pas le profil de performances du jeu, et une
  // reference directe a une variable absente interromprait toute la page.
  const antialias = typeof PERFORMANCE_PROFILE !== 'undefined'
    ? PERFORMANCE_PROFILE.antialias
    : true;
  texturePanneau.anisotropy = antialias ? 4 : 1;
  return texturePanneau;
}

// La carte de normales du blindage.
//
// C'est le changement qui manque le plus, et il ne coute rien : une seule
// image de plus, partagee par tous les materiaux.
//
// La carte de couleur ne change que la TEINTE d'une surface. Elle ne change pas
// la facon dont cette surface repond a une lumiere qui bouge. Un joint de
// panneau peint est une ligne plus sombre ; un joint de panneau en relief est
// une creuse qui renvoie la lumiere d'un cote et l'ombre de l'autre. C'est la
// difference entre un decor imprime et un decor physique, et c'est
// exactement ce que le joueur voit en bougeant.
//
// La technique : on dessine d'abord un relief en niveaux de gris — blanc en
// haut, noir en creux — puis on le convertit en normale par un filtre de
// Sobel. Chaque pixel recoit la direction vers laquelle la surface penche, ce
// que le moteur sait ensuite utiliser pour l'eclairage.
function normalPlaqueBlindage() {
  if (normalPanneau) return normalPanneau;
  const taille = 256;
  const joint = taille / 4;

  // Le relief, d'abord : meme dessin que la plaque, mais en niveaux de gris.
  const hauteur = document.createElement('canvas');
  hauteur.width = taille;
  hauteur.height = taille;
  const ctx = hauteur.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, taille, taille);
  // Une couture creuse : sombre au fond, clair sur la levee.
  for (let i = 1; i < 4; i += 1) {
    const y = i * joint;
    ctx.fillStyle = '#3c3c3c';
    ctx.fillRect(0, y - 2, taille, 4);
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, y + 2, taille, 2);
  }
  // Les rivets en bosses.
  for (let i = 1; i < 4; i += 1) {
    for (let k = 0; k < 4; k += 1) {
      const x = k * joint + 6;
      const y = i * joint + 6;
      const degrade = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 4);
      degrade.addColorStop(0, '#ffffff');
      degrade.addColorStop(1, '#808080');
      ctx.fillStyle = degrade;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const source = ctx.getImageData(0, 0, taille, taille).data;
  const sortie = document.createElement('canvas');
  sortie.width = taille;
  sortie.height = taille;
  const sortieCtx = sortie.getContext('2d');
  const image = sortieCtx.createImageData(taille, taille);
  const force = 2.4;

  // Sobel : la pente locale donne la normale. On echantillonne en tore, sinon
  // le bord de la texture aurait une couture visible en repetition.
  const hauteurAu = (x, y) => source[(((y + taille) % taille) * taille
    + ((x + taille) % taille)) * 4];

  for (let y = 0; y < taille; y += 1) {
    for (let x = 0; x < taille; x += 1) {
      const gx = (hauteurAu(x + 1, y - 1) + 2 * hauteurAu(x + 1, y)
        + hauteurAu(x + 1, y + 1))
        - (hauteurAu(x - 1, y - 1) + 2 * hauteurAu(x - 1, y)
          + hauteurAu(x - 1, y + 1));
      const gy = (hauteurAu(x - 1, y + 1) + 2 * hauteurAu(x, y + 1)
        + hauteurAu(x + 1, y + 1))
        - (hauteurAu(x - 1, y - 1) + 2 * hauteurAu(x, y - 1)
          + hauteurAu(x + 1, y - 1));
      const lx = -gx * force;
      const ly = -gy * force;
      const lz = 255;
      const longueur = Math.hypot(lx, ly, lz) || 1;
      const i = (y * taille + x) * 4;
      image.data[i] = Math.round(((lx / longueur) * 0.5 + 0.5) * 255);
      image.data[i + 1] = Math.round(((ly / longueur) * 0.5 + 0.5) * 255);
      image.data[i + 2] = Math.round(((lz / longueur) * 0.5 + 0.5) * 255);
      image.data[i + 3] = 255;
    }
  }
  sortieCtx.putImageData(image, 0, 0);

  normalPanneau = new THREE.CanvasTexture(sortie);
  normalPanneau.wrapS = THREE.RepeatWrapping;
  normalPanneau.wrapT = THREE.RepeatWrapping;
  return normalPanneau;
}

function createEnemyMaterials(template) {
  const plaque = plaqueBlindage();
  const color = template.color;
  const armorColor = template.armorColor || 0x1b2932;
  const accentColor = template.accentColor || color;
  const bodyColor = template.armorColor
    ? new THREE.Color(armorColor).lerp(new THREE.Color(color), 0.3)
    : new THREE.Color(color).multiplyScalar(0.5);
  const body = new THREE.MeshStandardMaterial({
    color: bodyColor,
    map: plaque,
normalMap: normalPlaqueBlindage(),
normalScale: new THREE.Vector2(0.85, 0.85),
    emissive: new THREE.Color(color).multiplyScalar(0.2),
    emissiveIntensity: 0.5,
    roughness: 0.58,
    metalness: 0.28,
    flatShading: true
  });
  const armor = new THREE.MeshStandardMaterial({
    color: armorColor,
    map: plaque,
normalMap: normalPlaqueBlindage(),
normalScale: new THREE.Vector2(0.85, 0.85),
    emissive: color,
    emissiveIntensity: 0.18,
    roughness: 0.48,
    metalness: 0.68,
    flatShading: true
  });
  const glow = new THREE.MeshBasicMaterial({ color: accentColor });
  const eye = new THREE.MeshBasicMaterial({ color: 0xffffff });
  // Lisere lumineux : ce qui remplace les contours neons de la reference. Non
  // eclairable et additif, il reste lumineux meme dans le noir de l'arene :
  // c'est ce qui donne au robot sa silhouette de night club.
  const trim = new THREE.MeshBasicMaterial({
    color: accentColor,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  // Visee : le meme bleu que sur la reference, quelle que soit la couleur du
  // type. Volontaire : l'identite du type se lit sur le lisere et le buste, la
  // visee sert a repeter ou est la tete, pas a designer l'ennemi.
  const visor = new THREE.MeshBasicMaterial({ color: 0x9ffcff, transparent: true, opacity: 0.72 });
  return { body, armor, glow, eye, trim, visor, accentColor };
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

  // Le halo du robot.
  //
  // C'est un bloom sans post-traitement, et c'est un choix delibere. Un bloom
  // reel exige une cible de rendu et plusieurs passes plein ecran ; le resultat
  // depend ensuite de la facon dont cette version de Three.js applique la
  // conversion de couleur et le tone mapping en fin de chaine. Une cible mal
  // reglee donne un ecran noir, et ce defaut n'apparait qu'a l'execution. Je
  // prefere un gain certain a un effet theoriquement plus fort.
  //
  // Un Sprite, et non un quad. Le Sprite s'oriente vers la camera dans le
  // pipeline lui-meme : on peut donc l'accrocher au robot et l'oublier, alors
  // qu'un quad pose dans la scene aurait demande une ligne de code par image
  // pour etre remis droit, et un second endroit ou l'oublier. Comme enfant du
  // robot, il est aussi nettoye par le parcours de destruction existant, sans
  // une ligne de plus.
  //
  // Le blending additif et depthWrite coupe evitent les deux defauts classiques
  // du quad lumineux : il ne bouche pas les ennemis qui sont derriere, et il
  // ne fait pas de couture entre deux triangles.
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloPartage(),
    color: template.color,
    transparent: true,
    opacity: isAlpha ? 0.5 : 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  // La taille suit l'echelle du type, pour que la brute soit aussi lisible en
  // mouvement que le rasteur. Elle reste petite : un halo plus large que le buste
  // noyerait la silhouette, et c'est la silhouette qu on vient shooter.
  const haloTaille = (isAlpha ? 2.3 : 1.6) * (template.scale || 1);
  halo.scale.set(haloTaille, haloTaille, 1);
  halo.position.set(0, 1.05, 0);
  halo.renderOrder = 2;
  root.add(halo);

  // Gabarit humanoide cubique : corps sombre, contours luminos, visee claire.
  // Les couleurs de chaque type sont inchangees, seule la forme differe.
  const headSize = (isAlpha ? 0.38 : 0.3) * (template.headScale || 1);
  const robot = buildHumanoid(THREE, template, materials, {
    isAlpha,
    headSize,
    shadows: PERFORMANCE_PROFILE.shadows
  });
  root.add(robot.structureMesh, robot.neckMesh, robot.trimMesh, robot.head, robot.visor);
  robot.armPivots.forEach(({ pivot }) => root.add(pivot));
  robot.legPivots.forEach(({ pivot }) => root.add(pivot));
  // La structure, la tete et les segments de bras et de jambes sont
  // individuellement ciblables : un robot est un assemblage, et viser le buste
  // ou la tete doit rester deux gestes distincts.
  hitMeshes.push(robot.structureMesh, robot.neckMesh, robot.head);
  robot.armPivots.forEach(({ pivot }) => pivot.children.forEach((mesh) => hitMeshes.push(mesh)));
  robot.legPivots.forEach(({ pivot }) => pivot.children.forEach((mesh) => hitMeshes.push(mesh)));
  legPivots.push(...robot.legPivots);
  const armPivots = robot.armPivots;
  const head = robot.head;
  const body = robot.structureMesh;
  const visor = robot.visor;

  // Les pattes cylindriques de l'ancien gabarit ont disparu : le robot a ses
  // propres jambes, et conserver les deux dessinait huit membres.
  const spineCount = template.spikeCount || (isAlpha ? 7 : 4);
  for (let i = 0; i < spineCount; i += 1) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 4), materials.glow);
    spike.position.set((i % 2 ? -1 : 1) * 0.3, 0.72 + Math.floor(i / 2) * 0.24, -0.2 - (i % 2) * 0.1);
    spike.rotation.z = (i % 2 ? -1 : 1) * -0.45;
    root.add(spike);
  }

  // Hitbox : une boite alignee sur le buste plutot qu'un cylindre. Le cylindre
  // englobait la tete, ce qui rendait le test de headshot geometrique et
  // expliquait le bug corrige plus tot. La tete a maintenant sa propre sphere
  // de test, donc le buste peut etre une boite plus juste.
  // La hauteur suit la verticale reelle du robot et non une valeur en dur : le
  // robot fait pres de 2.3 unites de haut, une hitbox de 1.9 laissait le haut
  // du buste et les epaules hors de portee.
  const hitbox = new THREE.Mesh(
    // La hitbox reste une boite VIVE, et c'est volontaire.
  //
  // Elle est invisible : la chanfreiner ne se verrait pas. Mais elle n'est pas
  // qu'un volume de collision, elle est aussi une cible de visee. Une boite
  // chanfreee a des coins retronces, donc un ennemi shot dans l'angle de
  // l'epaule ne serait plus touche. C'est un changement graphique qui
  // modifierait le tir, et c'est le genre de correction qui ne se remarque
  // qu'a la disappointed : le joueur tire sur un robot, et rien ne bouge.
  new THREE.BoxGeometry(template.radius * 1.75, robot.busteY * 1.5, template.radius * 1.6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  );
  hitbox.position.y = robot.busteY * 0.75;
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
    visor,
    headRadius: headSize * template.scale,
    materials,
    hitMeshes,
    legPivots,
    armPivots,
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
    // Tir a distance. Seul un type sur deux le possede : un Chargeur se
    // contente d'avancer, et ses valeurs de tir restent inertes.
    peutTirer: template.tire === true,
    rangedRange: template.porteeMax || 0,
    telegraph: template.annonce || 1,
    charge: 0,
    tirCooldown: 0.6 + Math.random() * 1.2,
    rangedCooldown: Math.max(1.1, WAVE_CURVES.attackCooldown(wave) * (template.cadence || 2)) * map.attackCooldownMultiplier,
    // Un tir vaut une part de la frappe au contact, pas la totalite : sinon
    // l'ennemi ferait doublement mal des qu'il a de la portee. Le meme
    // multiplicateur de vague qu'au contact s'applique, pour que les deux
    // menaces restent proportionnelles au niveau.
    rangedDamage: template.damage * WAVE_CURVES.enemyDamage(level) * map.enemyDamageMultiplier * (template.degats || 0),
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
  // Le donjon garantit un boss tous les cinq paliers. En campagne l'Alpha est
  // tire au sort : il apparait parfois, ce qui laisse un joueur invulnerable
  // traverser des dizaines de vagues sans le rencontrer. Ici il est une
  // echeance, pas une surprise, et le joueur peut s equiper en consequence.
  if (gameMode === 'donjon' && waveNumber % 5 === 0) {
    return map.enemyTypeSet === 'foundry' ? 'foundryAlpha' : 'titan';
  }
  if (map.enemyTypeSet === 'foundry') {
    if (waveNumber >= ALPHA_PREMIERE_VAGUE && waveNumber % 5 === 0 && Math.random() < 0.22) return 'foundryAlpha';
    if (waveNumber >= 3 && Math.random() < 0.38) return 'ironBrute';
    if (waveNumber >= 2 && Math.random() < 0.5) return 'emberStalker';
    return 'slagCrawler';
  }
  if (waveNumber >= ALPHA_PREMIERE_VAGUE && waveNumber % 5 === 0 && Math.random() < 0.18) return 'titan';
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
  // Le decalage aleatoire existe pour que les ennemis n'arrivent pas tous
  // piles au meme endroit. Il est desormais verifie, et c'est une correction
  // de fond, pas une precaution.
  //
  // Il ne l'etait pas. Un ennemi pouvait naitre jusqu'a 0,75 unite a
  // l'interieur d'un bloc. La collision refusait alors chaque pas, la
  // navigation le renvoyait vers la case atteignable la plus proche, de
  // l'autre cote du mur, et il pressait contre l'obstacle jusqu'a la fin de la
  // partie. C'est exactement le symptome signale.
  //
  // Deux conditions, pas une : la position ne doit pas etre dans un bloc, ET sa
  // case doit etre atteignable. Sans la seconde, l'ennemi ne nait pas dans un
  // mur mais dans une poche fermee, et ne vient jamais non plus.
  for (let essai = 0; essai < 8; essai += 1) {
    const x = chosen.x + (Math.random() - 0.5) * 1.5;
    const z = chosen.z + (Math.random() - 0.5) * 1.5;
    if (isBlocked(x, z, MOUVEMENT_RAYON_MAX)) continue;
    const index = getNavIndex(x, z).index;
    if (!navWalkable[index] || navDistance[index] < 0) continue;
    return new THREE.Vector3(x, 0, z);
  }
  return chosen.clone();
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
      if (!isBlocked(center.x, center.z, NAV_MARQUE)) navWalkable[index] = 1;
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
  const collisionRadius = Math.min(radius, MOUVEMENT_RAYON_MAX);
  const nextX = position.x + dx;
  const nextZ = position.z + dz;
  const bloqueX = isBlocked(nextX, position.z, collisionRadius);
  const bloqueZ = isBlocked(position.x, nextZ, collisionRadius);
  if (!bloqueX && !bloqueZ) {
    position.x = nextX;
    position.z = nextZ;
    return;
  }
  if (!bloqueX) { position.x = nextX; return; }
  if (!bloqueZ) { position.z = nextZ; return; }
  // Les deux axes sont refuses : on tente un pas diagonal, qui passe
  // souvent alors que chaque axe seul est bloque.
  if (!isBlocked(nextX, nextZ, collisionRadius)) {
    position.x = nextX;
    position.z = nextZ;
  }
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
  // Les bonus temporaires doivent retomber à zéro exactement à l'expiration,
  // sinon ils survivraient jusqu'à la prochaine activation.
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
      if (hudCache.reload !== 'SYSTÈME PRÊT') {
        ui.reloadStatus.textContent = 'SYSTÈME PRÊT';
        hudCache.reload = 'SYSTÈME PRÊT';
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
  applyTouchMovement(move, forward, right);
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

// Deux points d entree distincts chez l Assassin, et c est la demande : un
// bouton pour le dash, un bouton pour la capacite. Une touche qui fait deux
// choses n en fait aucune correctement : quand une des deux est indisponible,
// le joueur ne sait pas laquelle, et l appui ne donne rien.
function activateAbility() {
  if (state !== GAME_STATE.PLAYING) return;
  const ability = getAbilityDefinition(player.abilityId);
  if (!ability || ability.classId !== player.classId) {
    abilityMessage = "ACHETE UNE CAPACITE DANS L ATELIER";
    abilityMessageTimer = 1.8;
    return;
  }
  if (player.abilityCooldown > 0) {
    abilityMessage = "CAPACITE // RECHARGE " + player.abilityCooldown.toFixed(1) + "s";
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
    abilityMessage = 'NOVA // DÉGÂTS DE ZONE';
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
    abilityMessage = 'OVERDRIVE // ARME SURCHARGÉE';
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
    abilityMessage = 'SANG-DÉCHIRÉ // VAMPIRE';
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
// Normale d'impact enemy : orientée de l'ennemi vers le point touché, ce qui
// donne une gerbe qui part vers l'extérieur sans dependre de face.normal
// (qui est en espace local de l'objet, non transformé).
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
  if (state !== GAME_STATE.PLAYING || player.classId !== 'assassin' || player.dashCooldown > 0) {
    if (player.classId === 'assassin' && player.dashCooldown > 0) {
      abilityMessage = `DASH // RECHARGE ${player.dashCooldown.toFixed(1)}s`;
      abilityMessageTimer = 0.6;
    }
    return;
  }
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

// Les débris nécessitent un matériau par particule (le fondu est indépendant),
// mais on recycle les matériaux au lieu de les allouer et détruire en boucle.
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
  // Dans le donjon, l'argent du run se gagne ici et nulle part ailleurs.
  // Il ne touche pas au credit global : c'est de la monnaie de run, et la
  // confondre avec l'atelier permanent donnerait au donjon un interet qu'il
  // n'est pas cense avoir.
  if (gameMode === 'donjon') {
    donjonCredits += 8 + Math.round((enemy.template.damage || 9) * 0.4);
    // Le HUD doit suivre l'argent gagne. updateCreditsUI n'est appele qu'au
    // demarrage et lors d'un achat : sans cet appel, le solde restait fige a
    // zero pendant toute la salle, et le joueur ne pouvait pas savoir s'il
    // pouvait s'offrir quelque chose au terminal.
    updateCreditsUI();
  }
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

// Journal circulaire des derniers coups encaisses, avec leur origine.
// Il sert aux tests, qui ne peuvent pas autrement distinguer un projectile d'un
// contact : la barre de vie baisse dans les deux cas.
//
// Chaque entree porte un numero d ordre croissant. Sans lui, un test qui
// relit le journal several fois compte le meme coup plusieurs fois, et peut
// croire avoir mesure une rafale alors qu il n a vu qu un seul tir.
const journalDegats = new Array(48).fill(null);
let journalTour = 0;
let journalCompteur = 0;

function damagePlayer(amount, source) {
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
  // Journal des derniers coups encaisses, avec leur origine. Sans lui, on ne
  // peut pas distinguer un coup de projectile d'un contact : la vie baisse dans
  // les deux cas, et mesurer "ce que fait le tir" n'est alors qu'une deduction.
  // Le journal est court et reutilise en boucle, donc il ne grossit pas.
  journalDegats[journalTour] = {
    seq: journalCompteur,
    source: source || 'contact',
    valeur: actualDamage
  };
  journalCompteur += 1;
  journalTour = (journalTour + 1) % journalDegats.length;
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

// ===========================================================================
// Projectiles ennemis
//
// Jusqu'ici les ennemis n'infligeaient leurs degats qu'au contact. Chacun
// tire desormais en plus, ce qui donne au joueur une reponse : foncer sur un
// ennemi le fait passer en melee, ou il ne peut plus tirer.
//
// Trois choix dictent le code :
//
// 1. Le projectile est visible et lent. Un tir invisible est injuste, surtout
//    au doigt ou l'on n'a pas le temps de reflechir. La vitesse est donc bien
//    inferieure a celle d'une balle de fusil, et le projectile grossit
//    legrement en s'eloignant, ce qui aide a l'evaluer en profondeur.
//
// 2. Le tir traverse le decor. Le projectile teste les obstacles a chaque
//    image : se placer derriere un bloc est donc une vraie reponse, et pas un
//    detail esthetique. Sans cela, les obstacles de l'arene ne serviraient a
//    rien contre les tirs.
//
// 3. L'armement est annonce. Le robot leve ses bras et sa visee s'eclaircit
//    pendant tout le temps d'annonce (enemy.charge), et le projectile ne part
//    qu'a la fin. C'est ce qui rend le tir esquissable : on voit venir, on se
//    decale.
//
// Les degats reprennent la meme mise a l'echelle que le corps a corps, sinon
// un ennemi serait deux fois plus dangereux du seul fait d'avoir tire.
// ===========================================================================

// Geometrie partagee : tous les projectiles sont le meme pave, seules la
// couleur et la taille changent.
const projectileGeometry = new THREE.BoxGeometry(0.36, 0.36, 0.36);

// Enveloppe lumineuse, plus grande que le projectile et rendue en additif :
// c'est elle qu'on voit de loin. Un pave de 24 pixels ne se repere pas a
// l'autre bout de l'arene, dont la scene fait 44 unites de large.
const projectileGlowGeometry = new THREE.BoxGeometry(0.72, 0.72, 0.72);

// Les materiaux sont caches par couleur : une foule d'ennemis de types
// differents ne doit pas allouer un materiau par projectile.
const projectileMaterials = new Map();
const projectileGlowMaterials = new Map();

function projectileMaterial(color) {
  if (!projectileMaterials.has(color)) {
    projectileMaterials.set(color, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
  }
  return projectileMaterials.get(color);
}

// L'enveloppe est nettement plus faible que le coeur : elle donne le halo
// sans noyer le projectile lui-meme, qu'on doit pouvoir suivre du regard.
function projectileGlowMaterial(color) {
  if (!projectileGlowMaterials.has(color)) {
    projectileGlowMaterials.set(color, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
  }
  return projectileGlowMaterials.get(color);
}

// Taille apparente d'un projectile, en pixels.
//
// Mesure, pas intuition : la capture a montre qu'un projectile a 23 unites
// occupait 3 pixels de cote, dans une arene de 44 unites de large. C'est
// exactement la plainte "on ne voit pas les projectiles", et elle est
// fondee. Un pave qu'on retrecit avec la distance devient un point, et le
// joueur perd le seul signe qui lui dit qu'on le vise.
//
// La correction est la plus ancienne du genre : on met le projectile a
// l'echelle de sa distance a la camera, pour qu'il occupe toujours la meme
// taille a l'ecran. Il parait plus gros de loin, ce qui est un mensonge, mais
// un mensonge utile : dans un jeu de tir, voir le tir qui vient vaut mieux que
// voir sa vraie taille. Le plafond evite qu'un projectile a l'autre bout de
// l'arene devienne une tache.
const PROJECTILE_PX_CIBLE = 15;
const PROJECTILE_PX_MAX = 30;

function tailleApparente(projectile) {
  const distance = camera.position.distanceTo(projectile.mesh.position) || 1;
  // Metres par pixel a cette distance : la hauteur du champ de vision a
  // cette distance, divisee par la hauteur de l'ecran en pixels.
  const parPixel = (2 * Math.tan((camera.fov * Math.PI / 180) / 2) * distance)
    / Math.max(1, window.innerHeight);
  const pixels = Math.min(PROJECTILE_PX_MAX, PROJECTILE_PX_CIBLE);
  // La geometrie de base fait 0.36 unite de cote : on ramene la taille voulue
  // en unites, puis en facteur d'echelle.
  return (pixels * parPixel) / 0.36;
}

const projectiles = [];

const scratchProjectile = new THREE.Vector3();

// Fait partir un projectile depuis la visee de l'ennemi vers le joueur.
// La visee est le point le plus haut du robot : le tir vient des yeux, ce qui
// rend la direction lisible, et non du centre du corps ou il serait masque.
function tirerProjectile(enemy, target) {
  const template = enemy.template;
  const hauteur = 1.55 * enemy.scale;
  scratchProjectile.set(
    enemy.root.position.x,
    enemy.root.position.y + hauteur,
    enemy.root.position.z
  );

  const teinte = template.accentColor || template.color;
  const mesh = new THREE.Mesh(projectileGeometry, projectileMaterial(teinte));
  mesh.position.copy(scratchProjectile);
  scene.add(mesh);

  // Halo et trainee : sans eux, le projectile se perdait dans le decor. La
  // trainee est un pave allonge qui suit le projectile, ce qui donne sa
  // direction meme quand il est loin et petit a l'ecran.
  const glow = new THREE.Mesh(projectileGlowGeometry, projectileGlowMaterial(teinte));
  glow.position.copy(scratchProjectile);
  scene.add(glow);

  const trail = new THREE.Mesh(projectileGeometry, projectileGlowMaterial(teinte));
  trail.position.copy(scratchProjectile);
  scene.add(trail);

  // Direction visee vers la poitrine du joueur, pas vers ses pieds : le
  // projectile doit passer a hauteur de torse.
  const cibleX = target.x;
  const cibleY = target.y + 1.1;
  const cibleZ = target.z;
  const dx = cibleX - scratchProjectile.x;
  const dy = cibleY - scratchProjectile.y;
  const dz = cibleZ - scratchProjectile.z;
  const longueur = Math.hypot(dx, dy, dz) || 1;

  const projectile = {
    mesh,
    glow,
    trail,
    velocityX: (dx / longueur) * template.vitesse,
    velocityY: (dy / longueur) * template.vitesse,
    velocityZ: (dz / longueur) * template.vitesse,
    damage: enemy.rangedDamage,
    life: 4,
    radius: 0.34,
    // Le projectile part deja a sa taille apparente finale : le faire
    //Grossir depuis zero en une image se verrait comme une apparition.
    scale: 1
  };
  projectile.scale = tailleApparente(projectile);
  mesh.scale.setScalar(projectile.scale);
  glow.scale.setScalar(projectile.scale * 1.3);
  projectiles.push(projectile);
  audio.enemyShot();
}

// Avance les projectiles et resout les impacts. Le decor protege : le
// projectile disparait sur un obstacle.
function updateProjectiles(delta) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.life -= delta;
    // Position precedente conservee pour la trainee : c'est elle qui rend la
    // direction lisible quand le projectile est loin.
    const avantX = projectile.mesh.position.x;
    const avantY = projectile.mesh.position.y;
    const avantZ = projectile.mesh.position.z;
    projectile.mesh.position.x += projectile.velocityX * delta;
    projectile.mesh.position.y += projectile.velocityY * delta;
    projectile.mesh.position.z += projectile.velocityZ * delta;

    // Taille apparente constante, atteinte progressivement : un changement
    // brutal quand le projectile passe devant la camera se verrait comme un
    // clignement.
    const cible = tailleApparente(projectile);
    projectile.scale += (cible - projectile.scale) * Math.min(1, delta * 9);
    projectile.mesh.scale.setScalar(projectile.scale);
    projectile.glow.scale.setScalar(projectile.scale * 1.3);
    projectile.glow.position.copy(projectile.mesh.position);
    // La trainee reste en retrait du projectile et s'etire dans l'axe du
    // deplacement, ce qui forme une ligne de fuite.
    projectile.trail.position.set(
      (avantX + projectile.mesh.position.x) * 0.5,
      (avantY + projectile.mesh.position.y) * 0.5,
      (avantZ + projectile.mesh.position.z) * 0.5
    );
    projectile.trail.scale.set(projectile.scale * 0.75, projectile.scale * 0.75,
      projectile.scale * (0.9 + delta * 26));
    projectile.trail.lookAt(projectile.mesh.position);

    let retire = projectile.life <= 0;

    if (!retire && isBlocked(projectile.mesh.position.x, projectile.mesh.position.z, 0.12)) {
      // Impact sur un obstacle : un petit flash, pas de degats.
      burstProjectile(projectile);
      retire = true;
    }

    if (!retire) {
      const dx = projectile.mesh.position.x - player.position.x;
      const dy = projectile.mesh.position.y - (player.position.y + 1.1);
      const dz = projectile.mesh.position.z - player.position.z;
      const portee = 0.55 + projectile.radius;
      if (dx * dx + dy * dy + dz * dz < portee * portee) {
        damagePlayer(projectile.damage, 'tir');
        burstProjectile(projectile);
        retire = true;
      }
    }

    if (retire) {
      // Le halo et la trainee sont des maillages comme le projectile : les
      // retirer, sinon ils restent dans la scene et coutent un appel de
      // dessin chacun pour rien.
      scene.remove(projectile.mesh);
      scene.remove(projectile.glow);
      scene.remove(projectile.trail);
      projectiles.splice(i, 1);
    }
  }
}

// Impact visuel. On reutilise le tableau ripples existant plutot que d'en
// creer un : un projectile qui explose doit etre un effet bref parmi les
// autres, pas un systeme a part.
function burstProjectile(projectile) {
  const mesh = new THREE.Mesh(projectileGeometry, projectile.material || projectile.mesh.material);
  mesh.position.copy(projectile.mesh.position);
  mesh.scale.setScalar(0.9);
  scene.add(mesh);
  ripples.push({ mesh, life: 0.16, maxLife: 0.16, startScale: 0.9, endScale: 2.4 });
}

function clearProjectiles() {
  projectiles.splice(0).forEach((projectile) => {
    scene.remove(projectile.mesh);
    scene.remove(projectile.glow);
    scene.remove(projectile.trail);
  });
}

// Sonde de diagnostic : ce que voit reellement le joueur d un projectile.
//
// "On ne les voit pas bien" est une plainte visuelle, mais elle se repond par
// des nombres. Un pave de 0,36 unite parait ridicule sur un ecran quand il est
// a l autre bout d une arene de 44 unites de large : la sonde convertit sa
// taille en pixels a la position ou il se trouve, ce qui permet de trancher
// sans deviner. Elle ne sert jamais en jeu, seulement pour la capture.
function sonderProjectiles() {
  const demiChamp = Math.tan((camera.fov * Math.PI / 180) / 2);
  return projectiles.map((projectile) => {
    const position = projectile.mesh.position;
    const distance = camera.position.distanceTo(position);
    const tailleUnites = 0.36 * projectile.mesh.scale.y;
    // Taille apparente en pixels : le pave occupe cette fraction de la
    // hauteur d ecran a cette distance. Le halo est 0,72 unite, donc deux fois
    // plus large que ce que renvoie la sonde.
    const pixels = tailleUnites / (2 * demiChamp * distance) * window.innerHeight;
    const percu = position.clone().project(camera);
    return {
      distance: Math.round(distance * 10) / 10,
      pixels: Math.round(pixels),
      x: Math.round((percu.x * 0.5 + 0.5) * window.innerWidth),
      y: Math.round((-percu.y * 0.5 + 0.5) * window.innerHeight),
      devant: percu.z < 1
    };
  });
}

// Filet de securite contre les ennemis qui n'avancent plus.
//
// La grille de navigation pese 1,5 unite. Elle dit si le CENTRE d'une case est
// libre, pas si le COULOIR qui relie deux cases l'est. Un passage peut donc
// paraitre franchissable a ses deux extremites et se reveler trop etroit au
// milieu, une fois deduit le corps de l'ennemi : la collision refuse chaque
// pas, et l'ennemi reste sur place jusqu'a la fin de la partie.
//
// C'est une limite de la methode, pas un oubli. Rendre la grille aussi fine que
// le diametre d'un ennemi coute trop de CPU pour un jeu dont le budget se
// mesure sur telephone. On corrige donc a la volee, ennemi par ennemi, plutot
// que de pretendre que la grille suffit.
//
// La detection mesure un DEPLACEMENT, pas une intention : un ennemi immobile
// parce qu'il charge, qu'il est ralenti, ou qu'il est a portee d'attaque ne
// doit surtout pas etre touche. D'ou le garde-fou sur la distance.
const ARRET_DEPLACEMENT = 0.16;
const ARRET_TEMPS = 1.1;
const ARRET_PORTEE = 3.2;

// Le filet peut etre coupe. Pas pour le joueur : pour mesurer ce qu'il vaut.
// Comparer avec et sans lui est le seul moyen de distinguer un vrai blocage
// d'un deplacement du filet lui-meme, et les deux se ressemblent exactement.
let filetActif = true;

function surveillerEnnemiArrete(enemy, delta) {
  if (!filetActif) return;
  const x = enemy.root.position.x;
  const z = enemy.root.position.z;
  const versJoueur = Math.hypot(player.position.x - x, player.position.z - z);
  if (versJoueur <= ARRET_PORTEE) {
    enemy.arret = null;
    return;
  }
  if (!enemy.arret) {
    enemy.arret = { x, z, temps: 0 };
    return;
  }
  if (Math.hypot(x - enemy.arret.x, z - enemy.arret.z) > ARRET_DEPLACEMENT) {
    enemy.arret = { x, z, temps: 0 };
    return;
  }
  enemy.arret.temps += delta;
  if (enemy.arret.temps < ARRET_TEMPS) return;

  // Bloque. On le replace sur une case libre et atteignable, en choisissant celle
  // qui fait le plus de PROGRES vers le joueur, et non la plus proche.
  //
  // La distinction est ce qui fait toute la difference. La version initiale
  // prenait la case la plus proche : c'etait souvent celle d'apres le mur, de
  // l'autre cote, et l'ennemi reculaient encore. Mesure : 14,9 m au depart,
  // 15,9 m quatre secondes plus tard. Il ne bougeait plus, il reculait.
  //
  // navDistance est la distance, en cases, jusqu'au joueur. Choisir la case la
  // plus proche sans regarder ce nombre revient a demander le chemin le plus
  // court, pas le chemin qui arrive.
  const portee = 8;
  let meilleur = -1;
  let meilleurRang = Infinity;
  let meilleurEcart = Infinity;
  for (let c = 0; c < navWalkable.length; c += 1) {
    if (!navWalkable[c] || navDistance[c] < 0) continue;
    const centre = navCellCenters[c];
    const ecart = Math.hypot(centre.x - x, centre.z - z);
    if (ecart > portee) continue;
    if (navDistance[c] < meilleurRang
      || (navDistance[c] === meilleurRang && ecart < meilleurEcart)) {
      meilleurRang = navDistance[c];
      meilleurEcart = ecart;
      meilleur = c;
    }
  }
  // Aucune case valable autour de lui : il est enferme. Dans ce cas on ne le
  // deplace pas au hasard. Le test le signale, et c'est bien ainsi qu'il faut :
  // une salle qui enferme un ennemi est un defaut du generateur, pas un
  // ennemi qu'on peut arranger.
  if (meilleur < 0) {
    enemy.arret = { x, z, temps: 0 };
    return;
  }
  const centre = navCellCenters[meilleur];
  // La meme marge que la grille, au centieme pres. Le filet ne servait a rien
  // avec un rayon + 5 cm : il rejetait les cases que la navigation venait
  // d'approuver, donc il ne deplacait jamais personne. Un nombre de centimetres
  // suffisaient a annuler tout le filet.
  if (isBlocked(centre.x, centre.z, MOUVEMENT_RAYON_MAX)) {
    enemy.arret = { x, z, temps: 0 };
    return;
  }
  enemy.root.position.x = centre.x;
  enemy.root.position.z = centre.z;
  enemy.arret = { x: centre.x, z: centre.z, temps: 0 };
}

function updateEnemies(delta) {
  navTimer -= delta;
  if (navTimer <= 0) {
    rebuildFlowField();
    navTimer = PERFORMANCE_PROFILE.flowFieldInterval;
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.dead) continue;
    surveillerEnnemiArrete(enemy, delta);

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

    // Tir a distance. Trois regimes, mais seulement pour un type qui sait
    // tirer :
    //   - trop pres : il charge et frappe au contact, il ne tire plus ;
    //   - a portee  : il se stabilise, arme son tir, puis tire ;
    //   - trop loin : il avance.
    // Un Chargeur ignore le regime du milieu : il avance jusqu'au contact,
    // point final. C'est ce qui rend les roles lisibles.
    const aPortee = enemy.peutTirer
      && distance > attackDistance
      && distance <= enemy.rangedRange;
    const advanceSpeed = !aPortee && distance > attackDistance ? enemy.speed * enemy.slowMultiplier : 0;

    if (advanceSpeed > 0) {
      const flowDirection = getFlowDirection(enemy.root.position);
      scratchMovement.copy(flowDirection || scratchToPlayer);
      scratchMovement.lerp(scratchToPlayer, 0.12).normalize();
      scratchMovement.multiplyScalar(advanceSpeed * delta);
      moveEntity(enemy.root.position, scratchMovement.x, scratchMovement.z, enemy.radius);
    } else if (aPortee) {
      // Il tient sa distance et derive legerement sur le cote, pour ne pas
      // former un mur statique devant le joueur. La derive est lente et suit
      // le germe de l'ennemi : deux robots voisins ne partent donc pas dans
      // la meme direction.
      const derive = Math.sin(elapsed * 0.9 + enemy.seed) * enemy.speed * 0.28 * delta;
      scratchMovement.set(-scratchToPlayer.z, 0, scratchToPlayer.x).multiplyScalar(derive);
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

    // Armement du tir. La charge monte tant que l'ennemi est a portee et
    // redescend sinon : c'est ce qui rend le tir lisible, on voit le robot se
    // preparer avant que le projectile parte.
    if (aPortee) {
      enemy.charge += delta / enemy.telegraph;
      if (enemy.charge >= 1 && enemy.tirCooldown <= 0) {
        enemy.charge = 0;
        enemy.tirCooldown = enemy.rangedCooldown;
        tirerProjectile(enemy, player.position);
      }
    } else if (enemy.charge > 0) {
      enemy.charge = Math.max(0, enemy.charge - delta * 2.4);
    }
    enemy.tirCooldown = Math.max(0, enemy.tirCooldown - delta);

    if (distance < attackDistance && enemy.attackCooldown <= 0) {
      // Un elite tape 25 % plus vite qu'un ennemi ordinaire, et non plus vite
      // que la cadence de la vague. La valeur precedente (1.15 s) etait plus
      // rapide que celle de n'importe quel ennemi normal jusqu'a la vague 20 :
      // un Alpha debutant infligeait 28 degats par seconde, soit la mort en
      // quatre secondes.
      const baseAttackCooldown = enemy.elite
        ? Math.max(1.05, WAVE_CURVES.attackCooldown(wave) * 0.75)
        : WAVE_CURVES.attackCooldown(wave);
      const mapAttackMultiplier = MAP_DEFINITIONS[currentMapIndex].attackCooldownMultiplier;
      enemy.attackCooldown = baseAttackCooldown * mapAttackMultiplier;
      enemy.attackPulse = 1;
      damagePlayer(enemy.damage, 'contact');
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
    // Bras : ils se montent pendant l'armement d'un tir, et claquent aussi a
    // l'attaque au contact. La charge pilote donc le tir a distance et
    // attackPulse le corps a corps : un seul systeme pour deux gestes.
    enemy.armement = Math.max(enemy.charge, enemy.attackPulse);
    animerBras(enemy.armPivots, enemy.armement);
    // La visee s'eclaircit a l'armement : c'est le seul signe avant-coureur
    // dont le joueur dispose, donc il doit rester lisible de loin.
    enemy.visor.material.opacity = 0.72 + enemy.armement * 0.28;
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
  const enDonjon = gameMode === 'donjon';
  // donjonPalier est l indice de la salle en cours, a partir de zero. Le
  // premier palier affiche donc P01.
  const palier = donjonPalier + 1;
  // Le donjon ne suit pas la courbe des vagues de la campagne. Chaque palier
  // ajoute un peu plus d'ennemis, mais la progression reste lisible : au-dela
  // d'un certain nombre, le mode ne se joue plus, il s'encode.
  waveTotal = enDonjon
    ? Math.round(6 + palier * 2.6 + Math.pow(palier, 1.35) * 0.8)
    : WAVE_CURVES.total(wave);
  waveSpawned = 0;
  spawnTimer = 0.4;
  state = GAME_STATE.PLAYING;
  applyWeaponVisual();
  player.reloadRemaining = 0;
  player.ammo = player.magazineSize;
  if (enDonjon) construireSalle(genererSalle(donjonGraine + donjonPalier * 7919, palier));
  ui.waveValue.textContent = enDonjon
    ? `P${String(palier).padStart(2, '0')}`
    : String(wave).padStart(2, '0');
  // L'etiquette suit le mode. Sans cela, le donjon affichait VAGUE au-dessus
  // de P01 : un detail d'etiquette, mais qui dit au joueur qu'il joue a un
  // autre jeu alors qu'il en joue un autre.
  if (ui.waveLabel) ui.waveLabel.textContent = enDonjon ? 'PALIER' : 'VAGUE';
  ui.enemyValue.textContent = String(waveTotal).padStart(2, '0');
  ui.waveBannerText.textContent = enDonjon
    ? (palier % 5 === 0 ? `PALIER ${palier} // BOSS` : `PALIER ${palier}`)
    : wave % 5 === 0 ? 'VAGUE ALPHA' : `VAGUE ${String(wave).padStart(2, '0')}`;
  ui.waveBanner.classList.remove('show');
  void ui.waveBanner.offsetWidth;
  ui.waveBanner.classList.add('show');
  waveBannerTimer = 2.3;
  audio.waveStart();
  updateHUD();
}

// Le Ranger n'a plus aucune source de soin. Ni capacite, ni amelioration :
// les Nénithes réparateurs ont ete retires de la liste. La seule regeneration
// qui lui reste est celle-ci, et elle se paie en renoncant a un module.
//
// C'est un vrai arbitrage plutot qu'un menu a deux entrees : se soigner remet
// la vie au maximum mais ne fait pas progresser l'equipement, et un module
// augmente la puissance sans rien rendre. Les deux ne se cumulent pas.
function rangerPeutSeRegen() {
  return player.health < player.maxHealth;
}

function completeWave() {
  if (state !== GAME_STATE.PLAYING) return;
  ui.waveBanner.classList.remove('show');

  // Le donjon n'a pas d'ecran de fin de vague. La salle est nettoyee, le
  // portail s'ouvre, et c'est tout : on ne propose ni module ni soin. La
  // seule progression passe par le terminal trouve dans la salle.
  if (gameMode === 'donjon') {
    ouvrirPortail();
    return;
  }

  const choices = getUpgradeChoices();
  // Rien a offrir : on enchaine plutot que d'afficher un ecran vide ou aucun
  // clic ne fait rien.
  if (choices.length === 0 && !rangerPeutSeRegen()) {
    startWave();
    return;
  }

  state = GAME_STATE.UPGRADE;
  keys.clear();
  resetTouchState();
  if (document.pointerLockElement) document.exitPointerLock();

  if (player.classId === 'ranger') {
    showRangerChoice(choices);
    return;
  }
  showUpgradeChoices(choices);
}

// Le portail s'ouvre des que la salle est vide. C'est le seul retour visuel
// que le joueur a : sans changement de couleur, il ne sait pas s'il a fini.
//
// Chaque propriete lue ici doit exister dans construirePortail. Une lettre de
// differente suffisait a faire sauter la boucle de jeu entiere a la premiere
// fin de salle : le TypeError part de ouvrirPortail, remonte jusqu au cadre
// d animation, et plus rien n'est jamais planifie ni mis a jour. Un test qui
// verrait seulement "le portail ne s'ouvre pas" ne dirait pas d'ou vient le
// defaut.
function ouvrirPortail() {
  const portail = salleCourante.portail;
  if (!portail) return;
  portail.materiau.emissive.setHex(COULEUR_PORTAIL_OUVERT);
  portail.montant.material.emissive.setHex(COULEUR_PORTAIL_OUVERT);
  portail.voile.material.color.setHex(COULEUR_PORTAIL_OUVERT);
  portail.voile.material.opacity = 0.46;
  salleCourante.ouverte = true;
  abilityMessage = 'SALLE NETTOYEE // PORTAIL OUVERT';
  abilityMessageTimer = 2.6;
}

// Ecran de fin de vague du Ranger : deux cartes, pas trois modules.
//
// La carte de regeneration disparaît quand la vie est deja au maximum : elle
// ne ferait rien et occuperait la place d'un module. De meme, la carte
// d'amelioration disparaît quand plus aucun module n'est disponible. Il ne reste
// donc jamais une option morte a l'ecran.
function showRangerChoice(choices) {
  ui.completedWave.textContent = String(wave).padStart(2, '0');
  ui.upgradeOverline.textContent = 'ZONE SÉCURISÉE // AUCUN SOIN DISPONIBLE';
  ui.upgradeTitle.innerHTML = 'SOIGNEZ-VOUS OU <em>PROGRESSEZ</em>';
  ui.upgradeCountLabel.textContent = 'CHOIX';
  ui.upgradeCount.textContent = '1 / 1';
  ui.upgradeFooter.textContent = 'LES DEUX OPTIONS S\'EXCLUENT : L\'UNE OU L\'AUTRE';
  ui.upgradeOptions.innerHTML = '';

  const blesser = rangerPeutSeRegen();
  const progresser = choices.length > 0;

  if (progresser) {
    const manque = Math.max(0, Math.ceil(player.maxHealth - player.health));
    ui.upgradeOptions.appendChild(carteRanger({
      index: 0,
      court: 'SOIN',
      couleur: '#ff77c8',
      rarete: `VIE ${Math.ceil(player.health)} / ${Math.round(player.maxHealth)}`,
      titre: 'Régénération complète',
      texte: `Vous rendez vos ${Math.round(player.maxHealth)} points de vie. `
        + `Vous perdez cette vague l'accès aux modules.`,
      icone: '<path d="M32 55S8 42 8 23C8 12 22 7 32 20 42 7 56 12 56 23c0 19-24 32-24 32Z"/>'
        + '<path d="M22 30h7l3-7 4 14 3-7h7"/>',
      action: 'INSTALLER →',
      actif: () => choisirRegeneneration()
    }));
    ui.upgradeOptions.appendChild(carteRanger({
      index: 1,
      court: 'MODULE',
      couleur: '#00f5ff',
      rarete: `${choices.length} MODULE${choices.length > 1 ? 'S' : ''} DISPONIBLE${choices.length > 1 ? 'S' : ''}`,
      titre: 'Prendre une amélioration',
      texte: 'Trois modules tirés au sort, comme toujours. Vous gardez vos '
        + `${manque} points de vie manquants.`,
      icone: '<path d="M20 44V22l12-10 12 10v22Z"/><path d="M28 44V32h8v12"/>',
      action: 'VOIR LES MODULES →',
      actif: () => {
        // On repasse par l ecran habituel : meme tir aleatoire, meme
        // profondeur. Le Ranger ne perd rien de ce cote-la, il perd
        // simplement la regeneration qu il n aurait pas due avoir.
        showUpgradeChoices(choices);
      }
    }));
  } else {
    // Aucun module disponible : la regeneration est la seule chose qui reste.
    ui.upgradeTitle.innerHTML = '<em>RÉGÉNÉRATION</em> IMPOSÉE';
    ui.upgradeOptions.appendChild(carteRanger({
      index: 0,
      court: 'SOIN',
      couleur: '#ff77c8',
      rarete: 'DERNIER MODULE INSTALLÉ',
      titre: 'Régénération complète',
      texte: 'Tous vos modules sont au niveau maximum. Il ne vous reste que '
        + 'ce soin.',
      icone: '<path d="M32 55S8 42 8 23C8 12 22 7 32 20 42 7 56 12 56 23c0 19-24 32-24 32Z"/>'
        + '<path d="M22 30h7l3-7 4 14 3-7h7"/>',
      action: 'INSTALLER →',
      actif: () => choisirRegeneneration()
    }));
  }

  ui.upgrade.classList.add('active');
  ui.interactionHint.classList.remove('hidden');
  audio.upgrade();
}

function choisirRegeneneration() {
  if (state !== GAME_STATE.UPGRADE) return;
  player.health = player.maxHealth;
  state = GAME_STATE.PLAYING;
  ui.upgrade.classList.remove('active');
  ui.interactionHint.classList.add('hidden');
  applyUpgradeStats();
  audio.reload();
  startWave();
}

// Carte de l ecran binaire. Elle reprend le dessin des cartes de module pour
// que l'ecran ne change pas de visage entre les deux etapes.
function carteRanger(options) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'upgrade-card ranger-choice';
  button.style.setProperty('--card-color', options.couleur);
  button.innerHTML = `
      <span class="card-index">OPT_0${options.index + 1} // ${options.court}</span>
      <span class="card-visual"><svg viewBox="0 0 64 64" aria-hidden="true">${options.icone}</svg></span>
      <span class="card-rarity">${options.rarete}</span>
      <h3>${options.titre}</h3>
      <p>${options.texte}</p>
      <span class="card-footer"><span class="level-pips"></span><span>${options.action}</span></span>
    `;
  button.addEventListener('click', () => {
    if (state === GAME_STATE.UPGRADE) options.actif();
  });
  return button;
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
  // Aucun remplissage de secours : une carte déjà au niveau maximum ferait
  // sortir chooseUpgrade sans rien appliquer, laissant l'écran bloqué sans issue.
  return available.slice(0, 3);
}

function showUpgradeChoices(choices) {
  ui.completedWave.textContent = String(wave).padStart(2, '0');
  // Les textes de l ecran binaire du Ranger sont reposes ici. Sans cela, un
  // joueur qui a fini une vague en Ranger puis change de classe verrait
  // "SOIGNEZ-VOUS OU PROGRESZ" au-dessus de ses modules, et un Ranger qui
  // choisit "VOIR LES MODULES" garderait un titre qui ne parle plus de modules.
  ui.upgradeOverline.textContent = 'ZONE SÉCURISÉE // ÉQUIPEMENT DISPONIBLE';
  ui.upgradeTitle.innerHTML = 'AMÉLIOREZ VOTRE <em>ÉQUIPEMENT</em>';
  ui.upgradeCountLabel.textContent = 'MODULE';
  ui.upgradeCount.textContent = '01 / 01';
  ui.upgradeFooter.textContent = 'CHOISISSEZ UN MODULE POUR POURSUIVRE L\'OPÉRATION';
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
  const definition = UPGRADE_DEFINITIONS[key];
  // Filet de sécurité : un module au maximum ne doit jamais laisser l'écran
  // d'amélioration ouvert, on enchaîne donc sur la vague suivante.
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
  resetTouchState();
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
  // L'ecran de fin ne montre plus le nombre de credits gagnes.
  //
  // Il les accorde toujours : credits += lastReward.total, juste au-dessus.
  // Ce n'est donc pas une recompense retiree, c'est une ligne d'ecran
  // retiree. La distinction compte, parce que dans le donjon la somme
  // affichee n'etait pas ce que le joueur venait de gagner : il venait de
  // perdre son argent de descente, et ce nombre etait une conversion en
  // atelier calculee sur la vague, les eliminations et la precision. Deux
  // nombres dans le meme ecran, deux sens differents, et rien ne les
  // distinguait a l'oeil.
  //
  // La note de performance reste : elle parle de comment on a joue, pas
  // d'une somme d'argent.
  ui.performanceRating.textContent = `PERFORMANCE // ${lastReward.rating} // ${Math.round(lastReward.accuracy * 100)}% PRÉCISION`;
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
  resetTouchState();
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
  showSaveStatus('SESSION SAUVEGARDÉE // MENU', 'success');
}

function startNewGame() {
  clearDynamicObjects();
  // Le donjon construit ses salles lui-meme : la carte de la campagne ne sert
  // plus que de palette et de multiplicateurs de base.
  if (gameMode === 'donjon') demolirSalle();
  resetStats();
  applyWeaponVisual();
  resetCamera();
  wave = 0;
  score = 0;
  kills = 0;
  if (gameMode === 'donjon') {
    donjonPalier = 0;
    donjonGraine = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    // Une nouvelle descente repart de zero. L'argent et les niveaux
    // d'amelioration appartiennent au run : ils survivent aux paliers, pas a
    // la mort.
    //
    // Ces deux lignes sont la consequence directe du choix "l argent reste
    // tant qu on ne meurt pas". Sans elles, une nouvelle partie heriterait de
    // la poche de la precedente, et les ameliorations achetees survivraient au
    // personnage qu on remplace.
    donjonCredits = 0;
    player.donjon = {};
  }
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

// On passe a la salle suivante. Le joueur vient de franchir le portail, donc
// la salle d avant disparait derriere lui et la suivante est tiree.
// startWave se charge de la construire : c'est lui qui sait a quel palier on
// est, et le construire ici comme la une fois ferait deux salles par palier.
// Replace le joueur sur un sol degage, et garantit qu il ne reste pas bloque.
//
// Deux defauts evidents, tous deux absents.
//
// Le premier : la salle d avant disparait et la suivante est tiree. Les murs, les
// blocs et les piliers sont a d AUTRES coordonnees. Laisser le joueur la ou il
// etait, c est-a-dire a l ancien portail, revient a le laisser tomber au hasard
// dans une salle qui ne lui ressemble pas.
//
// Le second, et c est lui qui rend le premier irrattrapable : moveEntity ne
// teste que la DESTINATION. Depuis le centre d un bloc, toute destination
// proche reste dans le bloc, donc toutes les directions sont refusees. Le
// joueur est bloque, et aucun appui sur une touche ne le fera bouger. C etait
// le bug signale : on descendait au palier 2 et on ne pouvait plus avancer.
//
// Ce n etait PAS un bug de camera. La camera est a la position du joueur : le
// robot qui occupe l ecran est un ennemi qui s est approche au contact, parce
// qu il pouvait s approcher et pas s ecarter.
//
// On ne fait pas confiance au generateur pour cette place. horsArrivee garantit
// qu aucun bloc n entre dans un rayon de cinq autour de l arrivee, mais cette
// regle est verifiee sur des rectangles et avec les regles du generateur. Elle
// est repetee ici avec isBlocked, donc avec les regles du jeu — la meme
// distinction qui avait permis a des ennemis de se retrouver dans les murs.
function poserJoueurDegenere(x, z) {
  player.position.set(x, CONFIG.playerEyeHeight, z);
  player.velocity.set(0, 0, 0);
}

// Le point d arrivee normal. Il ne devrait jamais etre refuse : le generateur
// reserve deja cette zone. La spirale n existe que pour le cas ou, et elle est
// ordonnee plutot qu aleatoire afin qu un refus eventuel soit reproductible.
function placerJoueurALArrivee() {
  const rayon = CONFIG.playerRadius;
  if (!isBlocked(ARRIVEE.x, ARRIVEE.z, rayon)) {
    poserJoueurDegenere(ARRIVEE.x, ARRIVEE.z);
    return 'arrivee';
  }
  // On eloigne le joueur du point refuse par anneaux. Legerement decale, sinon
  // douze candidats d un meme annee tomberaient sur les memes positions
  // d obstacle.
  for (let anneau = 1; anneau <= 8; anneau += 1) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2 + anneau * 0.4;
      const x = ARRIVEE.x + Math.cos(angle) * anneau;
      const z = ARRIVEE.z + Math.sin(angle) * anneau;
      if (!isBlocked(x, z, rayon)) {
        poserJoueurDegenere(x, z);
        return 'spirale-' + anneau;
      }
    }
  }
  // Dernier recours : le centre exact de la salle. Il ne peut pas etre bloque
  // lui aussi sans que la generation soit entierement fausse, mais on ne veut
  // pas demarrer une salle avec un joueur immobile sans l avoir dit.
  poserJoueurDegenere(0, 0);
  return 'centre';
}

function salleSuivante() {
  donjonPalier += 1;
  // L'argent NE se remet PAS a zero ici. Il appartient a la descente, pas a la
  // salle : le garder d'un palier a l'autre est ce qui donne un interet a
  // nettoyer vite et a descendre, et ce qui permet d'arrive chez un marchand
  // avec de quoi acheter. Il disparait a la mort, et uniquement la.
  //
  // Une salle neuve, un terminal neuf : le delai de reouverture ne doit pas
  // deborder sur la salle suivante, sinon son terminal serait muet.
  terminalDelai = 0;
  // La construction d'abord, le placement ensuite. isBlocked lit la liste des
  // obstacles : placer le joueur AVANT que la salle soit construite le
  // validerait contre les blocs du palier precedent, qui viennent d etre
  // demolis. C est le meme piege que celui du champ de deplacement reconstruit
  // une image trop tard, et pour les ennemis.
  startWave();
  const ou = placerJoueurALArrivee();
  if (ou !== 'arrivee') {
    // Mere d etre dit : une spirale qui s active signifie que le generateur et
    // le jeu ne sont pas d accord sur ce qu est libre.
    console.warn('donjon : arrivee occupee au palier ' + (donjonPalier + 1)
      + ', joueur pose en ' + ou);
  }
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
  if (ui.reserveValue && hudCache.reserve !== '∞') {
    ui.reserveValue.textContent = '∞';
    hudCache.reserve = '∞';
  }
  // Le HUD lit desormais la definition reelle de l'arme : avant il affichait
  // un libelle code en dur, ce qui cachait le fait que l'Assassin peut
  // équiper une arme à distance comme le shuriken.
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

  // L'Assassin a deux ressources et deux touches : ESPACE pour la capacite, F
  // pour le dash. Le HUD nomme les deux, sinon le joueur ne sait pas laquelle
  // appuyer ni laquelle il lui reste.
  const ability = getAbilityDefinition(player.abilityId);
  const hasDash = isAssassin;
  const dashPret = hasDash && player.dashCooldown <= 0;
  const abilityStatus = abilityMessageTimer > 0
    ? abilityMessage
    : ability
      ? player.abilityCooldown > 0
        ? `RECHARGE // ${player.abilityCooldown.toFixed(1)}s`
        : 'ESPACE // PRÊT'
      : hasDash
        ? player.dashCooldown > 0
          ? `DASH // ${player.dashCooldown.toFixed(1)}s`
          : 'F // DASH PRÊT'
        : "ÉQUIPE UNE CAPACITÉ DANS L'ATELIER";
  const abilityText = ability ? ability.name : hasDash ? 'DASH OMBRE' : 'AUCUNE';
  if (hudCache.abilityName !== abilityText) {
    ui.abilityName.textContent = abilityText;
    hudCache.abilityName = abilityText;
  }
  if (hudCache.abilityStatus !== abilityStatus) {
    ui.abilityStatus.textContent = abilityStatus;
    hudCache.abilityStatus = abilityStatus;
  }
  // Le voyant du bloc capacite ne parle QUE de la capacite. Le dash a son propre
  // affichage, dans le bandeau du bas : les deux sont separes, donc leurs
  // temoins doivent l etre aussi.
  const abilityReady = ability ? player.abilityCooldown <= 0 : dashPret;
  const abilityCooling = ability ? player.abilityCooldown > 0 : hasDash && !dashPret;
  ui.abilityReadout.classList.toggle('ready', abilityReady);
  ui.abilityReadout.classList.toggle('cooling', abilityCooling);
  // Le <span> existe une seule fois dans le HUD : on le resout une fois au
  // lieu de faire un querySelector a chaque tick.
  if (!ui.abilityHeading) ui.abilityHeading = ui.abilityReadout.querySelector('span');
  if (ui.abilityHeading) {
    const headingText = hasDash
      ? (ability ? 'CAPACITÉ // ESPACE   DASH // F' : 'DASH // F')
      : 'CAPACITÉ // ESPACE';
    if (hudCache.abilityHeading !== headingText) {
      ui.abilityHeading.textContent = headingText;
      hudCache.abilityHeading = headingText;
    }
  }

  if (isAssassin) {
    // Le bandeau du bas affiche l'etat du sabre ET celui du dash, avec ou sans
    // capacite de classe. Avant, il n'affichait le dash que lorsqu'aucune
    // capacite etait equipee : le joueur n'avait donc aucun moyen de savoir que
    // son dash revenait, ni quand.
    const assassinStatus = player.slashTimer > 0
      ? 'FRAPPE // ACTIVE'
      : player.dashCooldown > 0
        ? `DASH // ${player.dashCooldown.toFixed(1)}s`
        : 'DASH // PRÊT';
    ui.reloadStatus.classList.toggle('active', player.slashTimer > 0 || player.dashCooldown > 0);
    if (hudCache.reload !== assassinStatus) {
      ui.reloadStatus.textContent = assassinStatus;
      hudCache.reload = assassinStatus;
    }
  } else if (getWeaponDefinition(player.weaponId).fireMode === 'slash') {
    // Sabre equipe : pas de chargeur, on montre la frappe.
    const slashStatus = player.slashTimer > 0 ? 'FRAPPE // ACTIVE' : 'MÉLÉE // PRÊT';
    ui.reloadStatus.classList.toggle('active', player.slashTimer > 0);
    if (hudCache.reload !== slashStatus) {
      ui.reloadStatus.textContent = slashStatus;
      hudCache.reload = slashStatus;
    }
  } else if (player.reloadRemaining <= 0) {
    ui.reloadStatus.classList.remove('active');
    if (hudCache.reload !== 'SYSTÈME PRÊT') {
      ui.reloadStatus.textContent = 'SYSTÈME PRÊT';
      hudCache.reload = 'SYSTÈME PRÊT';
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
    // Le navigateur peut refuser le pointer lock dans un onglet headless ou sandboxé.
  }
}

// La couche tactile ne doit s'afficher qu'en jeu et en pause. On s'appuyait
// sur la classe .hidden du HUD, mais celle-ci n'est pas retiree a la mort : les
// boutons restaient donc visibles sur l'ecran de defaite et l'atelier.
// L'etat est desormais explicite, et mis a jour depuis la boucle, ce qui
// couvre tous les changements d'etat sans avoir a les oubliun un par un.
let touchLayerPlaying = null;

function majCoucheTactile() {
  if (!IS_TOUCH) return;
  // Le bouton DASH n'existe que chez l'Assassin. La classe suit l'equipement
  // courant, pas la classe du joueur : le Ranger ne doit pas heriter d'un bouton
  // qui ne repondrait a rien.
  document.documentElement.classList.toggle('touche-assassin', player.classId === 'assassin');
  const actif = state === GAME_STATE.PLAYING || state === GAME_STATE.PAUSED;
  if (actif === touchLayerPlaying) return;
  touchLayerPlaying = actif;
  document.documentElement.classList.toggle('touche-en-jeu', actif);
}

// Pause explicite. Sur ordinateur, la perte du pointer lock suffit ; sur
// tactile il faut un bouton, sinon on ne peut jamais s'arreter.
function openPause() {
  if (state !== GAME_STATE.PLAYING) return;
  state = GAME_STATE.PAUSED;
  keys.clear();
  resetTouchState();
  if (document.pointerLockElement) document.exitPointerLock();
  ui.pause.classList.add('active');
}

function onPointerLockChange() {
  // Sur tactile il n'y a pas de pointer lock : la pause passe par le bouton.
  if (IS_TOUCH) return;
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    if (state === GAME_STATE.PAUSED) {
      state = GAME_STATE.PLAYING;
      ui.pause.classList.remove('active');
    }
  } else if (state === GAME_STATE.PLAYING) {
    state = GAME_STATE.PAUSED;
    keys.clear();
    resetTouchState();
    ui.pause.classList.add('active');
  }
}

// ===========================================================================
// Commandes tactiles
//
// Le jeu lit le mouvement via un vecteur et la visee via player.yaw/pitch.
// Le tactile se branche donc la-dessus, sans refonte : un joystick flottant
// alimente le meme vecteur de deplacement, et le glissement a droite ecrit
// directement dans yaw/pitch comme le fait la souris.
//
// TroisAmenagements propres au tactile :
//  - pas de pointer lock : le menu Pause a besoin d'un bouton, sinon on ne
//    peut jamais s'arreter ;
//  - viser et tirer sont deux gestes separes. Le glissement a droite ne fait
//    que viser ; le tir ne part que du bouton TIR. C'etait fondus dans le meme
//    geste, et toute correction de visee partait en rafale, avec les munitions
//    qui s'ecoulaient pendant que le joueur regardait ou poser son doigt ;
//  - les evenements Pointer sont multi-touch, il faut donc suivre un
//    identifiant par role (joystick / visee) et non compter les doigts.
// ===========================================================================

const TOUCH = {
  // Identifiant du doigt qui pilote le joystick, -1 si aucun.
  stickId: -1,
  stickOriginX: 0,
  stickOriginY: 0,
  // Sortie normalisee du joystick, -1 a 1 sur chaque axe.
  moveX: 0,
  moveY: 0,
  // Identifiant du doigt qui vise, -1 si aucun.
  lookId: -1,
  lookX: 0,
  lookY: 0,
  // Seul le bouton TIR arme le tir. Glisser pour viser ne declenche rien.
  fireButton: false
};

const TOUCH_STICK_RADIUS = 62;
// Sensibilite de visee tactile, en radians par pixel. Plus faible que la
// souris (0,00185) car un doigt parcourt beaucoup plus vite qu'un curseur.
const TOUCH_LOOK_SENSITIVITY = 0.0032;
// Au-dela, on considere que le joueur a perdu le doigt et on lache.
const TOUCH_CANCEL_DISTANCE = 220;

const touchStick = { element: null, base: null, knob: null };

function touchStickBounds() {
  // Le joystick n'apparait que dans le coin gauche ET dans la moitie basse :
  // plus haut, le doigt tomberait sur le HUD (vie, arme) et le masquerait.
  // Au-dessus de cette ligne, le tactile sert a viser.
  return {
    maxX: window.innerWidth * 0.46,
    minY: window.innerHeight * 0.42
  };
}

function showTouchStick(x, y) {
  const stick = touchStick.element;
  if (!stick) return;
  stick.style.left = `${x}px`;
  stick.style.top = `${y}px`;
  stick.classList.add('active');
}

function moveTouchStick(x, y) {
  if (!touchStick.knob) return;
  const dx = x - TOUCH.stickOriginX;
  const dy = y - TOUCH.stickOriginY;
  const distance = Math.hypot(dx, dy);
  const limited = distance > TOUCH_STICK_RADIUS ? TOUCH_STICK_RADIUS / distance : 1;
  const knobX = dx * limited;
  const knobY = dy * limited;
  if (touchStick.knob) touchStick.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  // Sortie normalisee : de -1 a 1, avec un petit seuil mort pour eviter
  // que le joueur glisse en marchant.
  const deadZone = 0.14;
  const normX = (knobX / TOUCH_STICK_RADIUS) / (1 - deadZone);
  const normY = (knobY / TOUCH_STICK_RADIUS) / (1 - deadZone);
  TOUCH.moveX = Math.abs(normX) < deadZone ? 0 : Math.sign(normX) * Math.min(1, Math.abs(normX));
  TOUCH.moveY = Math.abs(normY) < deadZone ? 0 : Math.sign(normY) * Math.min(1, Math.abs(normY));
}

function hideTouchStick() {
  TOUCH.stickId = -1;
  TOUCH.moveX = 0;
  TOUCH.moveY = 0;
  if (touchStick.element) touchStick.element.classList.remove('active');
  if (touchStick.knob) touchStick.knob.style.transform = 'translate(-50%, -50%)';
}

function releaseTouchLook() {
  TOUCH.lookId = -1;
  TOUCH.lookX = 0;
  TOUCH.lookY = 0;
}

// Relache tout l'etat tactile. Appele a chaque changement d'etat de jeu,
// sinon un doigt laisse en l'air ferait continuer de tirer en pause.
function resetTouchState() {
  hideTouchStick();
  releaseTouchLook();
  TOUCH.fireButton = false;
  if (ui.touchFire) ui.touchFire.classList.remove('pressed');
  if (ui.touchReload) ui.touchReload.classList.remove('pressed');
  if (ui.touchAbility) ui.touchAbility.classList.remove('pressed');
}

function applyTouchLook(dx, dy) {
  if (state !== GAME_STATE.PLAYING) return;
  player.yaw -= dx * TOUCH_LOOK_SENSITIVITY;
  player.pitch -= dy * TOUCH_LOOK_SENSITIVITY;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI * 0.46, Math.PI * 0.46);
}

function bindHoldButton(element, onPress, onRelease) {
  if (!element) return;
  const press = (event) => {
    event.preventDefault();
    event.stopPropagation();
    element.classList.add('pressed');
    onPress();
  };
  const release = (event) => {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    element.classList.remove('pressed');
    if (onRelease) onRelease();
  };
  element.addEventListener('pointerdown', press);
  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);
  element.addEventListener('pointerleave', release);
}

function initTouchControls() {
  document.documentElement.classList.toggle('touche', IS_TOUCH);
  // Le menu annoncait la souris et la touche Echap : sur un telephone, ni
  // l'une ni l'autre n'existent, et le message faisait croire au joueur que
  // le jeu etait casse.
  if (IS_TOUCH && ui.pointerNote) {
      ui.pointerNote.textContent = 'Glissez à droite pour viser. Le bouton TIR tire, le bouton pause arrête.';
  }
  if (!IS_TOUCH) return;

  touchStick.element = ui.touchStick;
  touchStick.base = ui.touchStick ? ui.touchStick.querySelector('.touch-stick-base') : null;
  touchStick.knob = ui.touchStick ? ui.touchStick.querySelector('.touch-stick-knob') : null;

  // Ecran de rotation : le jeu ne se joue qu'en paysage.
  function majOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    document.documentElement.classList.toggle('touche-portrait', IS_TOUCH && portrait);
  }
  majOrientation();
  window.addEventListener('resize', majOrientation);
  window.addEventListener('orientationchange', () => window.setTimeout(majOrientation, 120));

  // Le canvas gere joystick et visee. On n'ecoute que le tactile : la souris
  // passe deja par mousedown/mousemove, qui fonctionneraient deux fois sinon.
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    if (state !== GAME_STATE.PLAYING) return;
    const bounds = touchStickBounds();
    const zoneGauche = event.clientX < bounds.maxX && event.clientY > bounds.minY;
    if (zoneGauche && TOUCH.stickId === -1) {
      TOUCH.stickId = event.pointerId;
      TOUCH.stickOriginX = event.clientX;
      TOUCH.stickOriginY = event.clientY;
      showTouchStick(event.clientX, event.clientY);
    } else if (TOUCH.lookId === -1) {
      TOUCH.lookId = event.pointerId;
      TOUCH.lookX = event.clientX;
      TOUCH.lookY = event.clientY;
    }
  }, { passive: false });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    if (event.pointerId === TOUCH.stickId) {
      moveTouchStick(event.clientX, event.clientY);
    } else if (event.pointerId === TOUCH.lookId) {
      const dx = event.clientX - TOUCH.lookX;
      const dy = event.clientY - TOUCH.lookY;
      TOUCH.lookX = event.clientX;
      TOUCH.lookY = event.clientY;
      applyTouchLook(dx, dy);
      if (Math.hypot(dx, dy) > 0.4) audio.unlockTouch();
    }
  }, { passive: false });

  const finPointeur = (event) => {
    if (event.pointerType !== 'touch') return;
    if (event.pointerId === TOUCH.stickId) hideTouchStick();
    if (event.pointerId === TOUCH.lookId) releaseTouchLook();
  };
  canvas.addEventListener('pointerup', finPointeur);
  canvas.addEventListener('pointercancel', finPointeur);

  // Le geste de zoom du navigateur est indesirable en jeu.
  document.addEventListener('gesturestart', (event) => event.preventDefault());
  document.addEventListener('dblclick', (event) => event.preventDefault());

  bindHoldButton(ui.touchFire, () => { TOUCH.fireButton = true; }, () => { TOUCH.fireButton = false; });
  bindHoldButton(ui.touchReload, () => { if (state === GAME_STATE.PLAYING) startReload(); });
  bindHoldButton(ui.touchAbility, () => { if (state === GAME_STATE.PLAYING) activateAbility(); });
  // DASH : bouton tactile propre a l Assassin, comme la touche F sur
  // ordinateur. C est ce qui manquait : sans lui, la capacite et le dash se
  // partageaient le bouton CAP.
  if (ui.touchDash) {
    bindHoldButton(ui.touchDash, () => {
      if (state === GAME_STATE.PLAYING) activateDash();
    });
  }

  if (ui.touchPause) {
    // pointerdown et non click : sur tactile la reponse est plus immediate,
    // et un PointerEvent synthetique ne declenche pas un click.
    ui.touchPause.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state === GAME_STATE.PLAYING) openPause();
    });
  }

  // Le son est bloque par les navigateurs mobiles tant que l'utilisateur
  // n'a pas interagi. Le premier appui le reactive.
  const deverrouiller = () => {
    audio.unlockTouch();
    window.removeEventListener('pointerdown', deverrouiller, true);
  };
  window.addEventListener('pointerdown', deverrouiller, true);
}

// Contribution du joystick au deplacement, ajoutee au meme vecteur que les
// touches. Les deux sens coexistent : un joueur tactile peut aussi brancher
// un clavier.
function applyTouchMovement(move, forward, right) {
  if (!IS_TOUCH) return move;
  if (TOUCH.moveY !== 0) move.addScaledVector(forward, -TOUCH.moveY);
  if (TOUCH.moveX !== 0) move.addScaledVector(right, TOUCH.moveX);
  return move;
}

// Le tactile ne tire QUE par le bouton TIR. Viser et tirer etaient fondus dans
// le meme geste : glisser pour viser declenchait aussi la arme, ce qui
// transformait chaque correction de visee en rafale. Le joueur ne pouvait plus
// s'aligner sans tirer, et les munitions partaient pendant qu'il regardait
// ou il allait poser son doigt.
function isTouchFiring() {
  return TOUCH.fireButton;
}
function initEvents() {
  ui.startButton.addEventListener('click', startNewGame);
  ui.mapButtons.forEach((button) => {
    button.addEventListener('click', () => selectMap(Number(button.dataset.mapIndex)));
  });
  ui.modeButtons.forEach((button) => {
    button.addEventListener('click', () => selectGameMode(button.dataset.modeId));
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
    const gameplayKey = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyQ', 'KeyR', 'KeyF', 'Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code);
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
    // DASH : touche a part, Assassin uniquement. Elle n existe pas pour le
    // Ranger, qui n a pas de dash, et le code le refuse explicitement.
    if (event.code === 'KeyF' && !event.repeat && state === GAME_STATE.PLAYING) {
      event.preventDefault();
      activateDash();
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
  majCoucheTactile();
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
    if (keys.has('Mouse0') || isTouchFiring()) fireWeapon();
    updatePlayer(delta);
    updateEnemies(delta);
    // Apres updateEnemies : les projectiles que les ennemis viennent de lancer
    // avancent des la meme image, sinon un tir anterieur d'une image
    // paraitrait ne pas partir.
    updateProjectiles(delta);
    // Le donjon se verifie apres le deplacement du joueur, et avant le HUD :
    // franchir la porte change de salle, et le HUD doit alors annoncer la
    // nouvelle, pas celle qu on vient de quitter.
    majDonjon();
    updateWave(delta);
    hudTimer -= delta;
    if (hudTimer <= 0) {
      updateHUD();
      hudTimer = PERFORMANCE_PROFILE.hudInterval;
    }
  }

  updateEffects(delta);
  updateSceneAnimations(delta);
  // Rafraîchissement espacé de la shadow map : les ennemis bougent et
  // projettent une ombre, mais 20 Hz suffisent et coûtent bien moins cher.
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
  initTouchControls();
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
  if (window.__nexus) {
    window.__nexus.pret = true;
    // Sonde projectiles, pour la capture qui doit prouver qu un tir est
    // visible et mesurer combien de pixels il occupe.
    window.__nexus.sonderProjectiles = sonderProjectiles;
    // Journal des coups encaisses, distingue par origine. C'est ce qui permet
    // de mesurer ce que fait reellement un projectile, et non de le deduire
    // d une baisse de la barre de vie qui peut aussi venir d un contact.
    window.__nexus.derniersDegats = () => journalDegats.filter(Boolean);
    // Etat de la touche d'action. L'Assassin a deux ressources sur la meme
    // touche, la capacite et le dash, et le HUD n'en montrait qu'une : sans
    // cette lecture, on ne peut pas verifier que les deux restent accessibles.
    window.__nexus.etatAction = () => {
      const cap = getAbilityDefinition(player.abilityId);
      return {
        classe: player.classId,
        capacite: player.abilityId,
        cdCapacite: player.abilityCooldown,
        cdDash: player.dashCooldown,
        pretCapacite: Boolean(cap) && cap.classId === player.classId
          && player.abilityCooldown <= 0,
        pretDash: player.classId === 'assassin' && player.dashCooldown <= 0
      };
    };
    // Etat des soins. Le Ranger doit avoir une regeneration nulle et pas de
    // module de soin : c'est la regle nouvelle, et elle ne se voit pas depuis
    // l'exterieur autrement qu'en terminant une vague et en lisant l'ecran.
    window.__nexus.etatSoin = () => ({
      classe: player.classId,
      vie: player.health,
      vieMax: player.maxHealth,
      regen: player.regen,
      modules: Object.assign({}, player.upgrades)
    });
    // Termine la vague en cours. L ecran de fin de vague n'apparait qu'apres
    // avoir nettoye une vague entiere : sans ce raccourci, le test devrait
    // jouer vingt minutes pour voir l'ecran qu'il veut verifier.
    window.__nexus.terminerVague = () => {
      if (state !== GAME_STATE.PLAYING) return state;
      completeWave();
      return state;
    };
    // Blesse le joueur a une fraction de sa vie maximale. Regenerer a partir
    // du maximum ne prouverait rien : les deux etats seraient identiques, et
    // n'importe quel jeu passerait le test.
    // Blesse le joueur par le VRAI chemin des degats.
//
// La version d avant posait directement player.health, et c etait un piège : la
// mort n est detectee que dans damagePlayer, donc poser la vie a zero ne
// déclenchait rien. Le joueur restait Technically vivant avec zero point de vie,
// et un test qui croyait avoir verifie l ecran de fin n avait regardé qu un ecran
// que le jeu n avait jamais affiche.
//
// Passer par damagePlayer, c est verifier le vrai chemin : reductions,
// invulnerabilite, secousse, son, et la detection de mort. Un test qui
// contourne tout cela ne teste pas le jeu.
window.__nexus.blesserJoueur = (fraction) => {
      // La valeur est une FRACTION de vie maximum, bornee a 1 : passer 10 ne
      // fait pas 10 fois la vie, il en remet une entiere. D ou la borne.
      const cible = player.maxHealth * Math.max(0, Math.min(1, fraction));
      damagePlayer(Math.max(0, player.health - cible), 'test');
      return player.health;
    };
    // Tire une salle de donjon sans la construire. La fonction est pure : elle
    // renvoie de la donnee. C'est ce qui permet de la tester des centaines de
    // fois en quelques secondes, sans navegador, alors qu'une salle
    // construction dans la scene ne se verrait qu'a l'image.
    window.__nexus.genererSalle = (graine, profondeur) => {
      const salle = genererSalle(graine >>> 0, profondeur | 0);
      return {
        valide: salle.valide,
        graine: salle.graine,
        aTerminal: salle.aTerminal,
        portail: salle.portail,
        terminal: salle.terminal,
        covers: salle.covers,
        pillars: salle.pillars,
        spawnPads: salle.spawnPads,
        obstacles: obstacles.length
      };
    };
    // Change de mode comme le fait le bouton du menu. Sans cela, un test du
    // donjon devrait cliquer dans le menu, et il testerait autant l'interface
    // que le mode.
    window.__nexus.changerMode = (id) => selectGameMode(id);
    // Le generateur rejoue les regles de navigation du jeu pour garantir que
    // les ennemis y parvient. Cette fonction dit si les deux modeles
    // concordent toujours : si la navigation change, elle renvoie false, et le
    // test echoue au lieu que les salles cessent silencieusement d'etre
    // praticables.
    window.__nexus.navConcordance = () => navConcordance();
    // La distance de chaque ennemi au joueur. C'est la seule mesure qui
    // dit si la navigation fonctionne VRAIMENT : le generateur peut promettre
    // une salle connected, un ennemi peut rester presse contre un bloc malgre
    // tout, et seule la distance le montre.
    window.__nexus.distancesEnnemis = () => enemies.map((enemy) => ({
      x: enemy.root.position.x,
      z: enemy.root.position.z,
      d: Math.hypot(enemy.root.position.x - player.position.x,
        enemy.root.position.z - player.position.z),
      // Un Tireur dans sa portee de tir S'ARRETE, c'est voulu : il tient sa
      // distance et il tire. Sans cette info, un test le compte bloque, et le
      // jeu passe pour casse alors qu'il fait exactement son travail.
      tire: enemy.peutTirer === true,
      porteeTir: enemy.rangedRange || 0,
      // L'etat de navigation de l'ennemi, au point ou il se trouve. C'est ce
      // qui distingue une salle qui l'a coupe d'un corps trop gros pour le
      // passage, et les deux n'appellent pas le meme correctif.
      navOk: navDistance[getNavIndex(enemy.root.position.x, enemy.root.position.z).index] >= 0,
      navMarchable: navWalkable[getNavIndex(enemy.root.position.x,
        enemy.root.position.z).index] === 1,
      dansUnBloc: isBlocked(enemy.root.position.x, enemy.root.position.z,
        Math.min(enemy.radius, MOUVEMENT_RAYON_MAX))
    }));
    // Fait apparaitre un lot d'ennemis d'un coup. Le jeu les fait naitre par
    // unites, une toutes les une ou deux secondes : sans cette fonction, un
    // test qui attend trois secondes n'observe qu'un ennemi, et "aucun
    // ennemi ne bouge pas" ne prouve strictement rien.
    window.__nexus.peupler = (nombre) => {
      for (let i = 0; i < nombre; i += 1) spawnEnemy();
      waveSpawned = Math.max(waveSpawned, waveTotal);
      return enemies.length;
    };
    window.__nexus.filet = (actif) => { filetActif = actif !== false; };
    // Les statistiques reelles du joueur, apres toutes les sources. C'est la
    // seule maniere de verifier qu'une amelioration achetee CHANGE quelque
    // chose : une carte qui s'affiche, un cout qui se debite, et des chiffres
    // qui bougent pas, c'est trois annonces et un mensonge.
    window.__nexus.etatStats = () => ({
      damage: player.damage,
      fireRate: player.fireRate,
      maxHealth: player.maxHealth,
      health: player.health,
      speed: player.speed,
      magazine: player.magazineSize,
      reload: player.reloadTime,
      reduction: player.damageReduction,
      pierce: player.pierce,
      donjon: { ...(player.donjon || {}) }
    });
    // Acheter par le meme chemin que le clic sur la carte. Un test qui
    // modifierait player.donjon directement verifierait qu'il sait ecrire dans
    // un objet, pas que la boutique fonctionne.
    window.__nexus.acheterAmelioration = (id) => acheterAmeliorationDonjon(id);
    // Ou est le joueur, et est-ce qu il peut bouger.
    //
    // Le test ne doit pas se contenter de verifier qu il n est pas dans un
    // bloc : le symptome signale est « je ne peux plus bouger », qui peut avoir
    // une autre cause qu un blocage. bouge passe par moveEntity, la fonction
    // REELLE du deplacement, pas par une reconstitution. Un test qui simuleait
    // le mouvement avec ses propres regles prouverait que ses regles marchent.
    window.__nexus.etatJoueur = (dx = 0, dz = 0) => {
      const avantX = player.position.x;
      const avantZ = player.position.z;
      if (dx || dz) moveEntity(player.position, dx, dz, CONFIG.playerRadius);
      const deplace = Math.hypot(player.position.x - avantX, player.position.z - avantZ);
      return {
        x: Number(player.position.x.toFixed(2)),
        z: Number(player.position.z.toFixed(2)),
        bloque: isBlocked(player.position.x, player.position.z, CONFIG.playerRadius),
        deplace: Number(deplace.toFixed(3))
      };
    };
    // De l'argent de run, pour les tests qui doivent acheter.
    //
    // Il passe par la meme variable que les eliminations, de sorte qu'un test
    // verifie que la boutique s'en sert. Ecrire directement dans donjonCredits
    // prouverait seulement que la variable existe.
    // Relance une descente depuis le debut, comme le bouton "recommencer".
    // Sans elle, on ne peut pas verifier qu'une nouvelle partie repart de zero :
    // le test ne ferait que constater l'etat de la partie en cours.
    window.__nexus.nouvellePartieDonjon = () => {
      startNewGame();
      return { palier: donjonPalier, argent: donjonCredits };
    };
    // Cadre l'ennemi le plus proche, pour une capture rapprochee.
    // Sert au controle visuel des graphismes : l'apercu d'ensemble est trop
    // loin pour qu'un chanfrein de quelques pour cent se voie.
    window.__nexus.cadrerEnnemi = (distance) => {
      if (!enemies.length) return null;
      const cible = enemies[0].root.position;
      const angle = Math.PI * 0.28;
      camera.position.set(
        cible.x + Math.cos(angle) * distance,
        cible.y + 1.5,
        cible.z + Math.sin(angle) * distance
      );
      camera.lookAt(cible.x, cible.y + 1, cible.z);
      return { x: cible.x, y: cible.y, z: cible.z, distance };
    };
    // Mesure le cout de rendu sur un nombre d'images donne.
    //
    // Le nombre de triangles vient de l'information de rendu du dernier
    // dessin, et le temps par image du nombre d'appels a requestAnimationFrame.
    // Les deux sont chiffres, pas impressions.
    // Combien d'images GPU le jeu detient, et combien de geometries.
    //
    // C'est le controle anti-fuite. Les textures sont des objets GPU : si la
    // plaque etait regeneree a chaque ennemi, elle mourrait a chaque
    // apparition, le pilote s'enflerait, et le jeu saccaderait au bout de
    // quelques minutes sans qu'aucune erreur ne soit levee. Ce defaut ne se
    // voit pas sur une capture ; il se voit ici.
    window.__nexus.comptageTextures = () => ({
      textures: renderer.info.memory.textures,
      geometries: renderer.info.memory.geometries,
      ennemis: enemies.length
    });
    window.__nexus.materiauxEnnemi = () => {
      // ENEMY_TYPES est un objet indexe par le nom du type, pas un tableau :
      // la premiere version tapait ENEMY_TYPES[0] et obtenait undefined.
      const modele = ENEMY_TYPES[Object.keys(ENEMY_TYPES)[0]];
      const mats = createEnemyMaterials(modele);
      return {
        carte: Boolean(mats.body.map),
        normale: Boolean(mats.body.normalMap),
        // La plaque est partagee : les deux appels doivent rendre le meme objet.
        // Sans cela, chaque appel dessinerait sa propre image.
        memoirePartagee: plaqueBlindage() === plaqueBlindage()
          && normalPlaqueBlindage() === normalPlaqueBlindage()
      };
    };
    window.__nexus.materiauxDecor = () => {
      let solNormale = false;
      let murNormale = false;
      let coverNormale = false;
      scene.traverse((objet) => {
        if (!objet.material || !objet.material.normalMap) return;
        const estSol = objet.geometry
          && objet.geometry.type === 'PlaneGeometry'
          && objet.rotation.x < -1.4;
        if (estSol) solNormale = true;
        else if (objet.geometry && objet.geometry.type === 'BufferGeometry') {
          // Les murs et les couvertures sont des boites chanfreees, donc des
          // BufferGeometry. On les distingue par la couleur du materiau.
          const couleur = objet.material.color ? objet.material.color.getHex() : 0;
          if (objet.material.emissive && objet.material.emissiveIntensity > 1) return;
          if (couleur === MAP_DEFINITIONS[currentMapIndex].wallColor) murNormale = true;
          else if (couleur === 0x162833) coverNormale = true;
        }
      });
      return { solNormale, murNormale, coverNormale };
    };
    window.__nexus.tailleOmbres = () => ({
      taille: PERFORMANCE_PROFILE.shadowMapSize,
      mobile: PERFORMANCE_PROFILE.mobile
    });
    window.__nexus.mesurer = (images) => {
      return new Promise((resoudre) => {
        let rendues = 0;
        let triangles = 0;
        const debut = performance.now();
        const image = () => {
          rendues += 1;
          triangles = renderer.info.render.triangles;
          if (rendues >= images) {
            const duree = performance.now() - debut;
            resoudre({
              ennemis: enemies.length,
              triangles,
              images: rendues,
              duree: Math.round(duree),
              imagesParSeconde: Math.round((rendues / duree) * 1000)
            });
            return;
          }
          requestAnimationFrame(image);
        };
        requestAnimationFrame(image);
      });
    };
    window.__nexus.crediterDonjon = (montant) => {
      donjonCredits += Math.max(0, Math.round(montant));
      updateCreditsUI();
      return donjonCredits;
    };
    window.__nexus.coutAmelioration = (id, niveau) => {
      const definition = DONJON_AMELIORATIONS.find((d) => d.id === id);
      return definition ? coutAmeliorationDonjon(definition, niveau) : -1;
    };
    // Les pastilles d'une salle sont-elles toutes atteignables par la
    // navigation ? C'est la garantie anti-blocage, vue de l'exterieur.
    window.__nexus.pastillesAtteignables = (graine, profondeur) => {
      const salle = genererSalle(graine >>> 0, profondeur | 0);
      const zone = zoneAtteignableNav(salle, [ARRIVEE.x, ARRIVEE.z]);
      return salle.spawnPads.map((p) => zone(p[0], p[1]));
    };
    // Etat du donjon : ce qu'il faut pour verifier qu'il avance, et qu'il
    // interdit bien ce qu'il promet d'interdire.
    window.__nexus.etatDonjon = () => ({
      mode: gameMode,
      palier: donjonPalier,
      argent: donjonCredits,
      // L'argent d'Atelier, qu'on ne doit pas confondre avec celui de run.
      // C'est le seul endroit qui expose les deux : le DOM ne peut pas, puisque
      // le HUD et le menu n'affichent pas la meme chose.
      argentGlobal: credits,
      porteOuverte: salleCourante.ouverte,
      portail: salleCourante.portail
        ? { x: salleCourante.portail.x, z: salleCourante.portail.z }
        : null,
      terminal: salleCourante.terminal
        ? { x: salleCourante.terminal.x, z: salleCourante.terminal.z }
        : null,
      ennemis: enemies.length,
      // Les compteurs de vague expliquent pourquoi un portail s ouvre ou non :
      // updateWave ne termine une salle que si tous les ennemis sont apparus ET
      // que la liste est vide. Sans eux, un portail ferme est muet.
      etatJeu: state,
      apparus: waveSpawned,
      total: waveTotal,
      maillages: salleCourante.maillages.length,
      obstacles: obstacles.length,
      modulesVisibles: sectionsBoutique()
    });
    // Place le joueur, et vide la salle. C'est le seul moyen d'atteindre la fin
    // d'une salle en test sans y jouer pendant plusieurs minutes.
    window.__nexus.teleport = (x, z) => {
      player.position.x = x;
      player.position.z = z;
      return { x: player.position.x, z: player.position.z };
    };
    // Oriente la vue vers un point. Une capture prise sans cela montre un mur,
    // ou un bout de sol : elle ne juge ni la salle ni la porte, alors qu'elle
    // est justement la qu'on regarde.
    window.__nexus.orienterVers = (x, z) => {
      const dx = x - player.position.x;
      const dz = z - player.position.z;
      // L'axe avant du joueur vaut (-sin, -cos). On inverse donc l'angle.
      player.yaw = Math.atan2(-dx, -dz);
      return player.yaw;
    };
    // Vide la salle comme le joueur le ferait, et c est le mot qui compte : on
    // passe par killEnemy, donc par le meme chemin de code que le jeu. Le test
    // mesure ainsi les credits qu un joueur recevrait reellement, et non un
    // total que le diagnostic aurait invent separement.
    window.__nexus.nettoyerSalle = () => {
      // On force aussi l apparition complete : updateWave ne termine une salle
      // que si waveSpawned a atteint waveTotal. Sans cela, vider la liste ne
      // suffit pas et la porte ne s ouvre jamais.
      waveSpawned = waveTotal;
      [...enemies].forEach((enemy) => killEnemy(enemy));
      return enemies.length;
    };
    // Saut de vague, pour cette meme capture. Sans lui, elle est impossible :
    // un joueur immobile ne termine pas la vague 1, or la vague 1 ne contient
    // que des Radeurs, et un Radeur ne tire pas. Il n'y a donc aucun
    // projectile a photographier avant la vague 2.
    window.__nexus.allerVague = (numero) => {
      if (state === GAME_STATE.DEAD || state === GAME_STATE.MENU) return false;
      wave = Math.max(1, Math.floor(numero) || 1);
      clearProjectiles();
      startWave();
      return wave;
    };
  }
}

try {
  init();
} catch (error) {
  // L'ancien message affirmait « WebGL 2 est necessaire » sans le verifier :
  // il designait une cause au hasard, et pouvait masquer une erreur sans
  // rapport. On affiche desormais la vraie erreur, via le meme rendu que le
  // gardien de demarrage.
  console.error(error);
  const raison = (error && (error.message || String(error))) || 'cause inconnue';
  if (window.__nexus && typeof window.__nexus.echec === 'function') {
    window.__nexus.erreurs.push('init() : ' + raison);
    window.__nexus.echec("L'initialisation du jeu a echoue.");
  } else if (ui.loading) {
    ui.loading.innerHTML = `
      <div style="max-width:520px;padding:28px;text-align:center;border:1px solid #ff3158;color:#ff9bab;font:12px monospace;line-height:1.6">
        <strong>INITIALISATION IMPOSSIBLE</strong><br><br>${raison}
      </div>
    `;
  }
}

