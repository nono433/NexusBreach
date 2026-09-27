// Photographie la page d'apercu des robots.
//
// Elle passe par le pilote DevTools, comme les autres captures de jeu. Les
// anciennes utilisaient --virtual-time-budget, qui ne laisse passer que deux
// images : une scene animee sortait donc vide ou a moitie rendue, et le test
// pouvait passer sans avoir montre un robot.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const PAGE = 'tests/apercu-robots.html';
const SHOT = path.join(__dirname, 'preview-robots.png');

(async () => {
  if (!fs.existsSync(path.join(__dirname, 'apercu-robots.html'))) {
    require('node:child_process').execFileSync(process.execPath,
      [path.join(__dirname, 'generer-apercu-robots.cjs')], { stdio: 'ignore' });
  }

  let session = null;
  const problemes = [];
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1100, hauteur: 560 });

    // La page doit avoir dessine : sans cela on photographie le fond vide et le
    // test passe quand meme.
    const robots = await session.attendre(
      "(() => { const c = document.querySelector('canvas'); return Boolean(c) && c.width > 0; })()",
      45000);
    if (!robots) throw new Error("l'apercu n'a pas produit de canvas");
    // Une image de plus : le premier rendu peut avoir eu lieu avant que les
    // robots soient places.
    await attendre(1200);

    const erreurs = await session.evaluer(
      "(window.__erreursApercu || []).join(' | ')");
    if (erreurs) problemes.push('la page a signale : ' + erreurs);

    const octets = await session.capturer(SHOT);
    console.log('  capture :', path.relative(RACINE, SHOT), octets, 'octets');
    if (octets < 6000) problemes.push('capture trop petite, elle est probablement vide');
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
  }

  if (problemes.length === 0) {
    console.log('\n  L APERCU EST RENDU.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
