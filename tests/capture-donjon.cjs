// Photographie le mode DONJON : le menu avec son selecteur, puis une salle
// construite, puis la porte ouverte.
//
// Les autres tests mesurent des nombres. Celui-la regarde, parce que deux
// defauts ne se voient qu'a l'image : une salle qui existe mais ne ressemble a
// rien, et un portail ouvert que personne ne distingue d'un portail ferme. Un
// nombre dit "la porte est ouverte", il ne dit pas "on la voit".
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__donjon-capture.html';

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));
  let session = null;
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1100, hauteur: 720 });

    // 1. Le menu, avec le selecteur de mode. C'est la que l on voit si le mode
    //    a ete ajoute proprement, ou simplye empile sous la carte.
    await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    let octets = await session.capturer(path.join(__dirname, 'donjon-menu.png'));
    console.log('  menu           : donjon-menu.png, ' + octets + ' octets');

    // 2. Le selecteur de mode doit reagir au clic, pas seulement au diagnostic.
    //    On passe par le bouton, comme un joueur, et on photographie.
    const parBouton = await session.evaluer(`(() => {
      const b = document.querySelector('[data-mode-id="donjon"]');
      if (!b) return 'bouton absent';
      b.click();
      const actif = b.classList.contains('active');
      const texte = (document.getElementById('mode-description') || {}).textContent || '';
      return { actif, description: texte.slice(0, 46) };
    })()`);
    console.log('  clic sur DONJON : ' + JSON.stringify(parBouton));
    octets = await session.capturer(path.join(__dirname, 'donjon-menu-selection.png'));
    console.log('  menu selection : donjon-menu-selection.png, ' + octets + ' octets');

    // 3. Une salle, vue de l'arrivee.
    await session.evaluer("document.getElementById('start-button').click(); true");
    await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    await attendre(900);
    const salle = await session.evaluer('window.__nexus.etatDonjon()');
    octets = await session.capturer(path.join(__dirname, 'donjon-salle.png'));
    console.log('  salle          : donjon-salle.png, ' + octets + ' octets');
    console.log('    obstacles ' + salle.obstacles + ', portail '
      + (salle.portail ? 'en ' + Math.round(salle.portail.x) + ','
        + Math.round(salle.portail.z) : 'ABSENT')
      + ', terminal ' + (salle.terminal ? 'en ' + Math.round(salle.terminal.x) + ','
        + Math.round(salle.terminal.z) : 'absent'));
    console.log('    HUD : ' + await session.evaluer(
      "document.getElementById('wave-value').textContent"));

    // 4. Le portail ouvert, et vu d'assez pres pour juger s'il se remarque.
    await session.evaluer('window.__nexus.nettoyerSalle(); true');
    const limite = Date.now() + 5000;
    let ouverte = false;
    while (Date.now() < limite && !ouverte) {
      ouverte = await session.evaluer('window.__nexus.etatDonjon().porteOuverte');
      if (!ouverte) await attendre(80);
    }
    if (ouverte) {
      const p = await session.evaluer('window.__nexus.etatDonjon().portail');
      // On se place en face de la porte, en la regardant. Sans cela, la
      // capture montrait un mur : on verrait le joueur qui s'approche d'une
      // porte sans la regarder, ce qui ne juge rien du tout.
      await session.evaluer(`(() => {
        const l = Math.hypot(${p.x}, ${p.z}) || 1;
        return window.__nexus.teleport(
          ${p.x} + ${p.x} / l * 5, ${p.z} + ${p.z} / l * 5);
      })(); true`);
      await attendre(500);
      await session.evaluer(
        `window.__nexus.orienterVers(${p.x}, ${p.z}); true`);
      await attendre(600);
      octets = await session.capturer(path.join(__dirname, 'donjon-porte.png'));
      console.log('  porte ouverte  : donjon-porte.png, ' + octets + ' octets');
      const etiquette = await session.evaluer(
        "document.getElementById('wave-label').textContent");
      console.log('    etiquette HUD : ' + etiquette);
    } else {
      console.log('  porte ouverte  : NON, la porte ne s est pas ouverte');
    }
  } catch (e) {
    console.log('  ERREUR : ' + e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) { }
  }
})();
