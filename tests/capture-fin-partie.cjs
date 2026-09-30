// Photographie l ecran de fin, pour verifier qu il n a pas reste de trou.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__fin-capture.html';

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));
  let session = null;
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1100, hauteur: 720 });
    await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    await session.evaluer("document.getElementById('start-button').click(); true");
    await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    await attendre(1500);
    await session.evaluer('window.__nexus.blesserJoueur(0); true');
    await attendre(1800);
    await session.capturer(path.join(__dirname, 'fin-partie.png'));
    const bilan = await session.evaluer(`(() => {
      const ids = ['gameover-screen', 'performance-rating', 'best-score', 'retry-button'];
      const r = {};
      for (const id of ids) {
        const e = document.getElementById(id);
        if (!e) { r[id] = 'ABSENT'; continue; }
        const b = e.getBoundingClientRect();
        r[id] = Math.round(b.top) + '..' + Math.round(b.bottom)
          + '  h=' + Math.round(b.height);
      }
      return r;
    })()`);
    for (const [k, v] of Object.entries(bilan)) {
      console.log('  ' + k.padEnd(20) + v);
    }
  } catch (e) {
    console.log('  ERREUR : ' + e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) { }
  }
})();