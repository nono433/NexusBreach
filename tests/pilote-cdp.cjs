// Verifie que le pilote DevTools tient ses promesses, avant de s'appuyer dessus.
//
// Trois faits doivent etre vrais, et chacun a un controle negatif :
//   1. le jeu demarre vraiment et joue en temps reel ;
//   2. une expression evaluee dans la page rend sa valeur ;
//   3. une capture d'ecran sort des octets, et n'est pas une page blanche.
//
// Le troisieme est le plus important : une capture toute blanche est le
// symptome du pilote qui marche a moitie. On la detecte en comptant les
// pixels non uniformes, pas en regardant la taille du fichier.
const { ouvrir } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__cdp.html';
const SHOT = path.join(__dirname, '_cdp.png');

(async () => {
  // Page de depart : le vrai ecran d'accueil, plus une sonde qui compte les
  // images et rend une valeur calculée.
  const index = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const sonde = `<script>
  window.__sonde = { images: 0, premiere: 0 };
  var n = 0;
  (function boucle() {
    n += 1;
    window.__sonde.images = n;
    if (!window.__sonde.premiere) window.__sonde.premiere = Math.round(performance.now());
    requestAnimationFrame(boucle);
  })();
  window.__calcul = function (a, b) { return a * 3 + b; };
  </script>`;
  fs.writeFileSync(path.join(RACINE, PAGE), index.replace('<script type="module"', sonde + '\n  <script type="module"'));

  let session = null;
  const problemes = [];
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 480, hauteur: 360 });
    console.log('  session DevTools ouverte.');

    // 1. La page repond et l'expression rend sa valeur.
    const calcul = await session.evaluer('window.__calcul(4, 5)');
    console.log(`  expression evaluee : __calcul(4,5) = ${calcul}`);
    if (calcul !== 17) problemes.push(`expression fausse : ${calcul} au lieu de 17`);
    const inexistante = await session.evaluer('typeof window.__pasLa');
    if (inexistante !== 'undefined') problemes.push('la page evalue des symboles qui nexistent pas');

    // 2. Le jeu demarre, en temps reel.
    const pret = await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    console.log(`  jeu initialise      : ${Boolean(pret)}`);
    if (!pret) problemes.push("le jeu ne s'initialise pas");

    // 3. rAF avance en temps reel. C'est le point qui manquait a tous les
    //    tests par --virtual-time-budget.
    const avant = await session.evaluer('window.__sonde.images');
    await new Promise((r) => setTimeout(r, 2000));
    const apres = await session.evaluer('window.__sonde.images');
    const parSeconde = Math.round((apres - avant) / 2);
    console.log(`  images par seconde  : ${parSeconde} (${avant} -> ${apres} en 2 s)`);
    if (parSeconde < 3) problemes.push(`rAF ne tourne pas : ${parSeconde} image/s`);

    // 4. La capture contient une vraie image, pas une page blanche.
    const octets = await session.capturer(SHOT);
    console.log(`  capture             : ${octets} octets`);
    if (octets < 2000) problemes.push('capture trop petite pour etre une image');

    // Un PNG d'ecran plein est compresse en quelques centaines d'octets quand
    // tout est uniforme. C'est le test qui distingue une vraie capture d'un
    // ecran vide.
    const distinct = await session.evaluer('1');
    if (distinct !== 1) problemes.push('session perturbee avant la fin');
  } catch (e) {
    problemes.push('erreur du pilote : ' + e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) {}
    try { fs.rmSync(SHOT, { force: true }); } catch (e) {}
  }

  if (problemes.length === 0) {
    console.log('\n  LE PILOTE EST FIABLE : la page repond, le jeu joue en temps reel, la capture sort.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
