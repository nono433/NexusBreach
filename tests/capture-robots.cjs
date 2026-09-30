// Deux captures de l'apercu de robots : la rangee, puis un gros plan.
//
// La rangee sert a comparer les gabarits. Le gros plan sert a juger la
// matiere — aretes, texture, relief. Les deux ensemble, parce qu'une capture
// qui ne montre qu'une des deux ne prouve que la moitie de ce qu'on avance.
//
// La seconde existe parce que l'apercu d'ensemble ne peut pas montrer un
// chanfrein : a quinze metres, sept pour cent d'arete font un pixel. C'est le
// piege du controle visuel, une image qui ne peut pas soutenir la comparaison
// qu'on lui demande.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const PAGE = 'tests/apercu-robots.html';

const VUES = [
  { nom: 'preview-robots.png', largeur: 1100, hauteur: 560, gros: false },
  { nom: 'gros-plan-robot.png', largeur: 900, hauteur: 700, gros: true }
];

(async () => {
  // On regenere TOUJOURS, et on echoue si la generation echoue.
  //
  // La premiere version ne generait que si le fichier manquait. Or les ancres
  // du generateur pointaient sur une ligne de game.js qui n'existait plus : la
  // generation echouait en silence, l'ancien HTML restait sur le disque, et les
  // deux captures photographiaient l'ancien code en annonçant que tout allait
  // bien. Le pire genre de test : il ne peut pas echouer.
  //
  // Regenerer systematiquement rend l'echec visible. Et l'HTML supprime est
  // verifie : s'il differe de ce qu'on vient d'ecrire, on a photographié autre
  // chose que le jeu.
  const cheminHtml = path.join(__dirname, 'apercu-robots.html');
  try {
    require('node:child_process').execFileSync(process.execPath,
      [path.join(__dirname, 'generer-apercu-robots.cjs')], { stdio: 'pipe' });
  } catch (e) {
    const detail = (e.stderr || Buffer.from('')).toString().split('\n')
      .filter((l) => l.trim())[0] || e.message;
    console.log('\n  PROBLEMES :');
    console.log('   - la generation de l apercu a echoue : ' + detail);
    process.exit(1);
  }
  if (!fs.existsSync(cheminHtml)) {
    console.log('\n  PROBLEMES :');
    console.log('   - l apercu n a pas ete genere');
    process.exit(1);
  }
  const taille = fs.statSync(cheminHtml).mtimeMs;
  if (Date.now() - taille > 120000) {
    console.log('\n  PROBLEMES :');
    console.log('   - l apercu est plus vieux que la generation qui vient de reussir');
    process.exit(1);
  }

  let session = null;
  const problemes = [];
  try {
    for (const vue of VUES) {
      // Une session par vue : la page d'apercu lit l'adresse au chargement pour
      // choisir la camera, on ne peut donc pas changer de vue sur la meme page.
      if (session) await session.fermer();
      const cible = vue.gros ? PAGE + '?gros=1' : PAGE;
      session = await ouvrir(cible, RACINE,
        { largeur: vue.largeur, hauteur: vue.hauteur });

      const dessine = await session.attendre(
        "(() => { const c = document.querySelector('canvas'); return Boolean(c) && c.width > 0; })()",
        45000);
      if (!dessine) {
        problemes.push("l'apercu n'a pas produit de canvas pour " + vue.nom);
        continue;
      }
      await attendre(1200);

      const erreurs = await session.evaluer(
        '(window.__erreursApercu || []).join(" | ")');
      if (erreurs) problemes.push('erreurs JS dans l apercu : ' + erreurs);

      const octets = await session.capturer(path.join(__dirname, vue.nom));
      console.log('  ' + vue.nom.padEnd(24) + octets + ' octets'
        + (vue.gros ? '   (gros plan)' : '   (rangee)'));
    }
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
  }

  if (problemes.length === 0) {
    console.log('\n  LES DEUX VUES SONT RENDUES.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
