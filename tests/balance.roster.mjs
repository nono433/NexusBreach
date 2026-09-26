 //_stats reelles des ennemis, par carte. Sert au modele d'equilibrage et a
 // l'implementation dans game.js (les memes chiffres doivent servir).
export const ENEMIES = {
  nexus: {
    trash: { key: 'crawler', name: 'Rôdeur', hp: 48, damage: 9, speed: 2.35, radius: 0.62, scale: 0.88, score: 100 },
    swift: { key: 'hunter', name: 'Chasseur', hp: 36, damage: 7, speed: 3.65, radius: 0.5, scale: 0.78, score: 130 },
    tank: { key: 'brute', name: 'Brute', hp: 145, damage: 19, speed: 1.58, radius: 0.95, scale: 1.28, score: 260 },
    elite: { key: 'titan', name: 'Alpha', hp: 680, damage: 29, speed: 1.18, radius: 1.45, scale: 2.05, score: 1200, elite: true }
  },
  foundry: {
    trash: { key: 'slagCrawler', name: 'Crawleur de Scorie', hp: 64, damage: 12, speed: 2.5, radius: 0.65, scale: 0.94, score: 145 },
    swift: { key: 'emberStalker', name: 'Rôdeur de Braise', hp: 48, damage: 9, speed: 4.05, radius: 0.54, scale: 0.82, score: 190 },
    tank: { key: 'ironBrute', name: 'Colosse de Laitier', hp: 230, damage: 28, speed: 1.66, radius: 1.08, scale: 1.42, score: 430 },
    elite: { key: 'foundryAlpha', name: 'Forge-Monarque', hp: 1080, damage: 43, speed: 1.26, radius: 1.58, scale: 2.2, score: 2100, elite: true }
  }
};

export const MAPS = {
  nexus: { hpMult: 1, dmgMult: 1, atkMult: 1 },
  foundry: { hpMult: 1.15, dmgMult: 1.22, atkMult: 0.88 }
};

export const WEAPONS = {
  pulse: { damage: 25, fireRate: 5.4, price: 0 },
  scatter: { damage: 16, fireRate: 1.65, pellets: 7, price: 450 },
  smg: { damage: 10, fireRate: 13, price: 650 },
  rail: { damage: 125, fireRate: 0.95, pierce: 2, price: 950 },
  vector: { damage: 72, fireRate: 1.8, price: 800 },
  inferno: { damage: 5, fireRate: 18, pellets: 3, price: 1200 },
  cryo: { damage: 14, fireRate: 4.2, pellets: 2, price: 1000 },
  plasma: { damage: 55, fireRate: 2.2, price: 1500 }
};
