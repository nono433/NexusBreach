// Photographie l ecran de fin de vague du Ranger, pour voir ce que le joueur
// voit reellement. Les autres tests mesurent des nombres, celui-la regarde.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__soin-capture.html';
const SHOT = path.join(__dirname, 'soin-ranger.png');

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));
  let session = null;
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1100, hauteur: 700 });
    await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    await session.evaluer("document.getElementById('start-button').click(); true");
    await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    // Blesse a un tiers : la carte de soin doit montrer un vrai manque, et le
    // texte doit annoncer les points de vie rendus.
    await session.evaluer('window.__nexus.blesserJoueur(0.34); true');
    await session.evaluer('window.__nexus.terminerVague(); true');
    await attendre(700);
    const octets = await session.capturer(SHOT);
    console.log('  capture : ' + path.relative(path.join(__dirname, '..'), SHOT)
      + ', ' + octets + ' octets');
    const etat = await session.evaluer(`(() => ({
      titre: (document.getElementById('upgrade-title') || {}).textContent || '',
      surline: (document.getElementById('upgrade-overline') || {}).textContent || '',
      pied: (document.getElementById('upgrade-footer') || {}).textContent || '',
      colonnes: getComputedStyle(document.getElementById('upgrade-options'))
        .gridTemplateColumns.split(' ').length
    }))()`);
    console.log('  sur-titre : ' + etat.surline);
    console.log('  titre     : ' + etat.titre);
    console.log('  pied      : ' + etat.pied);
    console.log('  colonnes  : ' + etat.colonnes);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) {}
  }
  process.exit(0);
})();
