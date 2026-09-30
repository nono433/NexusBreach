// Verifie que le site DEPLOYE demarre reellement, sur un ecran de telephone.
//
// Un HTTP 200 ne prouve rien : le jeu peut charger et rester bloque sur le
// menu, ou ne jamais signaler qu il est pret. Ce test ouvre donc l'URL
// deployee dans un vrai navigateur et joue le role d'un joueur : il appuie sur
// demarrer, puis regarde ce qui s'affiche.
//
// POURQUOI CE TEST A ETE REECRIT DE ZERO
//
// La version precedente chargeait le site dans un IFRAME pour l'observer.
// Trois defauts, dont deux mortels :
//
//   1. Un iframe cross-origin donne contentDocument === null. Le site est
//      chez github.io, la page de sonde etait chez 127.0.0.1. Le script
//      plantait donc sur un null, avant meme de pouvoir regarder quoi que ce
//      soit. Ce n'etait pas une limite de synchronisation : c'etait
//      impossible, par construction.
//
//   2. Son petit relais repondait 404 a tout sauf POST /rapport, donc y
//      compris a sa propre page. Il ne s'est jamais chargee.
//
//   3. Le plus grave : le test sortait avec le code 0 dans TOUS les cas. Il
//      pouvait donc etre rouge independamment du jeu, indefiniment, et
//      paraitre vert a quiconque regardait la sortie.
//
// Un test qui echoue en passant pour un succes est pire que pas de test : il
// donne une fausse assurance. Celui-la echoue pour de vrai, et il teste
// directement la page, sans intermediaire.
const { ouvrir, attendre } = require('./_cdp.cjs');
const path = require('node:path');

const SITE = 'https://nono433.github.io/NexusBreach/index.html';

// Format de telephone : c'est le cas que le joueur signale.
const LARGEUR = 390;
const HAUTEUR = 844;

(async () => {
  let session = null;
  const echecs = [];
  try {
    session = await ouvrir(SITE, path.join(__dirname, '..'),
      { largeur: LARGEUR, hauteur: HAUTEUR });

    // 1. Le jeu doit signaler qu il est pret. Un page qui charge sans cela
    //    reste bloquee sur l'ecran de chargement.
    let pret = false;
    const limite = Date.now() + 60000;
    while (Date.now() < limite && !pret) {
      pret = await session.evaluer('Boolean(window.__nexus && window.__nexus.pret)');
      if (!pret) await attendre(500);
    }
    console.log('  jeu pret          : ' + pret);
    if (!pret) echecs.push('le jeu n a jamais signale etre pret');

    // 2. La version servie. C'est le controle qui vaut : sans lui, on pourrait
    //    tester un cache du navigateur et conclure que le deploiement a marche.
    const version = await session.evaluer(
      "Array.from(document.querySelectorAll('script[src]'))"
      + ".map(function (s) { return s.getAttribute('src'); }).join(' ')");
    console.log('  scripts charges   : ' + version);
    const v = (version.match(/game\.js\?v=(\d+)/) || [])[1];
    const attendue = require('node:fs')
      .readFileSync(path.join(__dirname, '..', 'wwwroot', 'index.html'), 'utf8')
      .match(/game\.js\?v=(\d+)/)[1];
    console.log('  version deployee  : ' + (v || 'absente') + '   version locale : ' + attendue);
    if (v !== attendue) {
      echecs.push('le site sert game.js?v=' + (v || 'absent')
        + ' alors que la copie locale est en v=' + attendue
        + ' : le deploiement n est pas a jour, ou c est un cache');
    }

    if (pret) {
      // 3. Le selecteur de mode : c'est la fonctionnalite ajoutee depuis le
      //    dernier deploiement. Si elle est absente, le site est bien en
      //    retard, et le test doit le dire.
      const mode = await session.evaluer(`(() => ({
        donjon: Boolean(document.querySelector('[data-mode-id="donjon"]')),
        campagne: Boolean(document.querySelector('[data-mode-id="campagne"]'))
      }))()`);
      console.log('  selecteur de mode : ' + JSON.stringify(mode));
      if (!mode.donjon || !mode.campagne) {
        echecs.push('le selecteur de mode est absent du site deploye');
      }

      // 4. Jouer : on appuie sur demarrer et on regarde ce que devient l'ecran.
      const vieAvant = await session.evaluer(
        "document.getElementById('health-value').textContent");
      await session.evaluer("document.getElementById('start-button').click(); true");
      await attendre(3000);
      const apres = await session.evaluer(`(() => ({
        hudVisible: !document.getElementById('hud').classList.contains('hidden'),
        integrite: document.getElementById('health-value').textContent,
        vague: document.getElementById('wave-value').textContent,
        hostiles: document.getElementById('enemy-value').textContent,
        coucheTactile: Boolean(document.getElementById('touch-layer'))
      }))()`);
      console.log('  vie au menu       : ' + vieAvant);
      console.log('  apres demarrage    : ' + JSON.stringify(apres));
      if (!apres.hudVisible) echecs.push('le jeu ne demarre pas apres un clic sur demarrer');
      if (!apres.coucheTactile) echecs.push('aucune couche tactile sur un ecran de telephone');

      // 5. Les erreurs de la page. Le jeu les collecte lui-meme ; une exception
      //    lancee pendant l'initialisation y laisse une trace, alors que la
      //    page a l'air de charger normalement.
      const erreurs = await session.evaluer(
        'JSON.stringify((window.__nexus && window.__nexus.erreurs) || [])');
      console.log('  erreurs du jeu    : ' + erreurs);
      if (erreurs !== '[]') echecs.push('le jeu a enregistre des erreurs : ' + erreurs);
    }

    await session.capturer(path.join(__dirname, 'capture-enligne-telephone.png'));
    console.log('  capture           : tests/capture-enligne-telephone.png');
  } catch (e) {
    console.log('  ERREUR : ' + e.message);
    echecs.push(e.message);
  } finally {
    if (session) await session.fermer();
  }

  if (echecs.length) {
    console.log('\n  PROBLEMES :');
    echecs.forEach((e) => console.log('   - ' + e));
    process.exit(1);
  }
  console.log('\n  LE SITE DEPLOYE DEMARRE, SUR UN ECRAN DE TELEPHONE.');
})();