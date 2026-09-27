// Verifie que les ennemis tirent reellement, et mesure ce que le tir inflict.
//
// Ce test a ete reecrit sur le pilote DevTools. La version precedente lisait son
// verdict sur une capture d ecran, passait par --virtual-time-budget, et sortait
// toujours en code 0 - y compris quand elle n avait produit aucune capture. Un
// test qui ne peut pas echouer ne prouve rien ; c est exactement ce qui s est
// passe, et c est pour cela qu on ne savait pas si le tir faisait mal.
//
// Il mesure la chute de vie reelle, en distinguant un coup de projectile d un
// contact. Sans cette distinction la mesure ne prouverait rien : la vie baisse
// dans les deux cas, et un test qui ignore d ou vient le coup ne mesure pas le
// tir. Le jeu tient un journal des coups encaisses avec leur origine, expose
// sur __nexus.derniersDegats.
//
// Le test ne tire jamais. Il saute a une vague ou les Tireurs sont frequents,
// puis attend que le journal recueille des coups de projectile.
//
// Deux controles negatifs, parce qu ils ne verifient pas la meme chose :
//   --stub       la sonde devient aveugle, donc aucun projectile n est vu en
//                vol. Le test doit echouer sur l observation.
//   --attendu=N  la valeur attendue est forcee a N, sans toucher au jeu. Le
//                test doit alors echouer sur la COMPARAISON des degats, ce qui
//                prouve que la mesure des degats a des dents et qu elle ne se
//                contente pas de recopier le modele.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__tir.html';
const STUB = process.argv.includes('--stub');
const FORCE = (process.argv.find((a) => a.startsWith('--attendu=')) || '').split('=')[1];
const VAGUE = Number((process.argv.find((a) => a.startsWith('--vague=')) || '').split('=')[1]) || 6;
const ATTENTE_MS = 150000;

// Les ecrans du jeu se montrent avec la classe "active", pas avec "hidden".
// Chercher "hidden" ici disait "mort" en permanence, et le test relancait une
// partie qui n avait jamais eu lieu : il ne trouvait donc aucun projectile
// parce qu il ne regardait jamais une vraie partie.
const ECRAN_FIN = "document.getElementById('gameover-screen').classList.contains('active')";

(async () => {
  // Ce que le modele annonce pour un projectile de Chasseur a cette vague. On
  // l importe plutot que de l ecrire en dur : si le modele bouge, la borne suit,
  // et le test continue de mesurer du vrai plutot qu une constante oubliee.
  const modele = await import('./balance.model.mjs');
  const calcule = 7 * modele.CURVES.dmgMult(VAGUE + 1) * modele.TIR.swift.degats;
  const attendu = FORCE !== undefined ? Number(FORCE) : calcule;

  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));

  let session = null;
  const problemes = [];
  const tirs = [];
  let imagesAvecProjectile = 0;
  let contacts = 0;
  let morts = 0;
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 640, hauteur: 400, query: 'tactile=1' });
    const pret = await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    if (!pret) throw new Error("le jeu ne s'initialise pas");

    if (STUB) {
      await session.evaluer('window.__nexus.sonderProjectiles = function () { return []; };');
    }

    await session.evaluer("document.getElementById('start-button').click(); true");
    const enJeu = await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    if (!enJeu) throw new Error('la partie ne demarre pas');
    const vague = await session.evaluer(`window.__nexus.allerVague(${VAGUE})`);
    console.log(`  vague atteinte : ${vague}   (aucun Tirer avant la vague 2 :`
      + ' la 1 ne contient que des Chargeurs, qui n ont pas de tir)');
    console.log(`  degats attendus pour un projectile de Chasseur : ${attendu.toFixed(2)}`);

    // Le joueur ne bouge pas et ne tire pas : il meurt, et c est normal. Plutot
    // que d abandonner, on relance et on recommence, en cumulant les coups de
    // projectile vus a chaque tentative.
    const limite = Date.now() + ATTENTE_MS;
    // Le journal est circulaire et n est jamais vide apres quelques coups. Sans
    // dedupliquer par numero d ordre, une relance relirait les memes coups et le
    // test croirait avoir mesure une rafale alors qu il n a vu qu un seul tir.
    const vusSeq = new Set();
    while (Date.now() < limite && (tirs.length < 6 || imagesAvecProjectile < 5)) {
      const etat = await session.evaluer(`(() => ({
        projectiles: window.__nexus.sonderProjectiles().filter(p => p.devant).length,
        degats: window.__nexus.derniersDegats(),
        mort: ${ECRAN_FIN}
      }))()`);
      if (etat.projectiles > 0) imagesAvecProjectile += 1;
      for (const coup of etat.degats) {
        if (vusSeq.has(coup.seq)) continue;
        vusSeq.add(coup.seq);
        if (coup.source === 'tir') tirs.push(coup.valeur);
        else if (coup.source === 'contact') contacts += 1;
      }
      if (etat.mort) {
        morts += 1;
        if (morts >= 6 || Date.now() > limite - 20000) break;
        await session.evaluer("document.getElementById('retry-button').click(); true");
        await attendre(500);
        await session.evaluer(`window.__nexus.allerVague(${VAGUE})`);
        continue;
      }
      await attendre(50);
    }

    console.log(`  morts du joueur : ${morts}   images avec projectile : ${imagesAvecProjectile}`);
    console.log(`  coups distincts encaisses : ${tirs.length} de projectile, ${contacts} de contact`);
    if (imagesAvecProjectile === 0) problemes.push('aucun projectile detecte en vol');
    if (tirs.length === 0) {
      problemes.push('aucun projectile n a inflige de degats');
    } else {
      const moyen = tirs.reduce((a, b) => a + b, 0) / tirs.length;
      const mini = Math.min(...tirs);
      const maxi = Math.max(...tirs);
      console.log(`  degats par projectile : moyenne ${moyen.toFixed(2)},`
        + ` de ${mini.toFixed(0)} a ${maxi.toFixed(0)}`);
      if (Math.abs(moyen - attendu) > 1.2) {
        problemes.push(`degats par projectile : ${moyen.toFixed(2)}`
          + ` alors que le modele annonce ${attendu.toFixed(2)}`);
      }
    }
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) {}
  }

  if (problemes.length === 0) {
    console.log('\n  LE TIR INFLIGE REELLEMENT DES DEGATS, ET ILS SONT MESURES.');
    process.exit(STUB || FORCE !== undefined ? 1 : 0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  if (STUB) {
    console.log('\n  (controle negatif 1 : le test echoue bien quand la sonde est aveugle)');
    process.exit(0);
  }
  if (FORCE !== undefined) {
    console.log(`\n  (controle negatif 2 : le test echoue bien quand on attend`
      + ` ${Number(FORCE).toFixed(2)} au lieu de ${calcule.toFixed(2)})`);
    process.exit(0);
  }
  process.exit(1);
})();
