// Verification de bout en bout de la classe TANK et des nouvelles armes de
// l'Assassin.
//
// Ce test existe parce que la classe Tank touche dix endroits disperses
// (definition, achat, sauvegarde, import, HUD, ameliorations, atelier). Un
// oubli dans un seul de ces endroits ne casse rien a la compilation : le bouton
// devient simplement inerte, ou la classe se recharge en Ranger, et rien ne le
// signale. Ce test les traverse tous dans un vrai navigateur.
//
// Ce qu'il verifie :
//   1. le bouton TANK existe, annonce son prix et refuse de s'equiper sans
//      credits ;
//   2. achat puis selection : 120 PV, vitesse 4,8, reduction innate de 10 %,
//      arme de depart BULWARK ;
//   3. la classe survit a un rechargement de page (localStorage) ;
//   4. l'archive exportee puis reimportee conserve classe, arme et PV ;
//   5. une archive v1, anterieure au Tank, reste importable ;
//   6. les trois nouvelles armes de l'Assassin sont listees, achetables, et
//      l'equipement change bien le HUD.
//
// Sortie : 0 si tout passe, 1 sinon.
const path = require('node:path');
const { ouvrir } = require('./_cdp.cjs');

const RACINE = path.join(__dirname, '..', 'wwwroot');

const resultats = [];
function verifier(nom, condition, detail = '') {
  resultats.push({ nom, ok: Boolean(condition), detail });
  console.log(`${condition ? '  OK  ' : 'ECHEC'} ${nom}${detail ? ' // ' + detail : ''}`);
}

// Recharge la page et attend que le jeu soit de nouveau pilotable.
//
// On passe par DevTools et non par location.reload() appele depuis evaluer() :
// reload() detruit le contexte d'evaluation pendant l'appel, et la valeur de
// retour est alors perdue avec la page. C'est ce qui rendait la premiere
// version de ce test silencieusement fausse.
async function recharger(session) {
  await session.envoyer('Page.reload', { ignoreCache: true });
  const pret = await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
  if (!pret) throw new Error('le jeu ne redemarre pas apres un rechargement');
}

(async () => {
  const s = await ouvrir('index.html', RACINE, { largeur: 1280, hauteur: 800 });
  try {
    // --- Chargement -------------------------------------------------------
    const pret = await s.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    verifier('le jeu demarre', pret, pret ? '' : 'window.__nexus.pret jamais atteint');
    verifier('la sonde etatJoueur est exposee', await s.evaluer('typeof window.__nexus.etatJoueur === "function"'));

    // --- 1. Le bouton TANK existe et refuse de s'equiper ------------------
    const boutonTank = await s.evaluer(`(() => {
      const b = document.querySelector('[data-class-id="tank"]');
      if (!b) return { existe: false };
      return {
        existe: true,
        statut: (b.querySelector('small') || {}).textContent || '',
        verrouille: b.classList.contains('locked')
      };
    })()`);
    verifier('le bouton TANK existe', boutonTank.existe);
    // Le prix est affiche avec une espace insecable : on compare les chiffres,
    // pas l'espace qui les separe.
    verifier('le bouton TANK annonce 3 500 CR',
      String(boutonTank.statut || '').replace(/[^0-9]/g, '') === '3500', boutonTank.statut);
    verifier('le bouton TANK est verrouille au depart', boutonTank.verrouille === true);

    const avantAchat = await s.evaluer(`(() => {
      document.querySelector('[data-class-id="tank"]').click();
      return window.__nexus.etatAction().classe;
    })()`);
    verifier('le Tank reste verrouille sans credits', avantAchat === 'ranger', 'classe=' + avantAchat);

    // --- 2. Achat, selection, statistiques -------------------------------
    // On passe par l'import du jeu, et non par un localStorage.setItem suivi
    // d'un reload. Raison : le jeu enregistre sa progression sur 'pagehide',
    // et l'ancien ecran — dont les credits en memoire sont encore 0 — ecrase
    // alors la valeur fraichement ecrite avant meme que la nouvelle page ne la
    // lise. Un setItem suivi d'un reload ne peut donc jamais aboutir, et le
    // test passerait ou echouerait pour une raison qui n'a rien a voir avec le
    // code teste. L'import met a jour la memoire ET le stockage ensemble.
    const attribution = await s.evaluer(`(async () => {
      return await window.__nexus.importer(JSON.stringify({
        game: 'Nexus Breach',
        saveVersion: 2,
        progression: {
          bestScore: 0,
          credits: 9000,
          ownedEquipment: {},
          ownedWeapons: {},
          equippedWeapon: 'pulse',
          ownedClasses: { ranger: true, assassin: false, tank: false },
          equippedClass: 'ranger',
          ownedAbilities: {},
          equippedAbility: '',
          currentMapIndex: 0
        }
      }));
    })()`);
    verifier('une archive de depart avec 9 000 CR est acceptee',
      Boolean(attribution && attribution.ok), attribution ? String(attribution.erreur || '') : 'pas de reponse');
    await recharger(s);
    const creditsApres = await s.evaluer(
      `Number(localStorage.getItem('nexus-breach-credits'))`);
    verifier('les 9 000 CR survivent au rechargement', creditsApres === 9000, 'credits=' + creditsApres);

    const achat = await s.evaluer(`(() => {
      document.getElementById('shop-button').click();
      const carte = Array.from(document.querySelectorAll('#shop-classes .class-item'))
        .find((c) => (c.querySelector('h3') || {}).textContent === 'Tank');
      if (!carte) return { erreur: 'carte Tank absente de l atelier' };
      if (carte.disabled) return { erreur: 'carte Tank desactivee' };
      carte.click();
      return {
        classe: window.__nexus.etatAction().classe,
        credits: Number(localStorage.getItem('nexus-breach-credits'))
      };
    })()`);
    verifier('la classe Tank s achete dans l atelier', !achat.erreur, achat.erreur || '');
    verifier('la classe Tank est equipee', achat.classe === 'tank', 'classe=' + achat.classe);
    verifier('le prix du Tank est debite (9000 - 3500 = 5500)',
      achat.credits === 5500, 'credits=' + achat.credits);

    const auMenu = await s.evaluer(`(() => {
      document.getElementById('shop-close-button').click();
      return window.__nexus.etatJoueur();
    })()`);
    verifier('l arme de depart du Tank est BULWARK', auMenu.arme === 'bulwark', auMenu.arme);
    verifier('le Tank a bien 120 PV max', auMenu.vieMax === 120, 'vieMax=' + auMenu.vieMax);
    verifier('le Tank est plus lent que le Ranger (4,8 < 6,1)',
      auMenu.vitesse === 4.8, 'vitesse=' + auMenu.vitesse);
    verifier('le Tank a 10 % de reduction innate',
      Math.abs(auMenu.reduction - 0.1) < 0.001, 'reduction=' + auMenu.reduction);

    await s.evaluer(`(() => { document.getElementById('start-button').click(); return true; })()`);
    const enJeu = await s.evaluer(`(() => ({
      hudVie: Number((document.getElementById('health-value') || {}).textContent || 0),
      classe: window.__nexus.etatAction().classe,
      etat: window.__nexus.etatJoueur()
    }))()`);
    verifier('la classe Tank reste active en jeu', enJeu.classe === 'tank', enJeu.classe);
    verifier('le Tank demarre a 120 PV', enJeu.hudVie === 120, 'pv=' + enJeu.hudVie);
    verifier('l arme en main est bien BULWARK', enJeu.etat.arme === 'bulwark', enJeu.etat.arme);

    // --- 3. Persistance apres rechargement ---------------------------------
    await recharger(s);
    const apresRechargement = await s.evaluer(`(() => ({
      classe: window.__nexus.etatAction().classe,
      statut: (document.querySelector('#tank-class-status') || {}).textContent || ''
    }))()`);
    verifier('la classe Tank survit au rechargement',
      apresRechargement.classe === 'tank', 'classe=' + apresRechargement.classe);
    // Le statut est accentue ("ÉQUIPÉE") : on compare sans les accents plutot
    // que d'ecrire une regexp fragile qui dependrait de l'encodage de sortie.
    const sansAccent = (t) => String(t || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/[^A-Z]/g, '');
    verifier('le statut du bouton Tank devient EQUIPEE',
      sansAccent(apresRechargement.statut) === 'EQUIPEE', apresRechargement.statut);

    // --- 4. Aller-retour d'archive -----------------------------------------
    // L'archive est serialisee dans la page : evaluer() renvoie une valeur
    // JSON, et un objet construit par le jeu peut contenir des references
    // circulaires ou des valeurs non serialisables. JSON.stringify garantit
    // que l'on teste exactement ce qui sortirait du fichier de sauvegarde.
    const exporte = await s.evaluer(
      `JSON.stringify(window.__nexus.sauvegarde ? window.__nexus.sauvegarde() : null)`);
    verifier('la sonde de sauvegarde est exposee apres rechargement', exporte !== null && exporte !== undefined,
      'valeur=' + String(exporte));
    const archive = exporte ? JSON.parse(exporte) : null;
    verifier('l archive exportee contient la classe Tank',
      Boolean(archive && archive.progression && archive.progression.ownedClasses
        && archive.progression.ownedClasses.tank === true),
      archive ? JSON.stringify(archive.progression && archive.progression.ownedClasses) : 'archive illisible');
    verifier('l archive exportee contient l arme du Tank',
      Boolean(archive && archive.progression.equippedWeapon === 'bulwark'),
      'arme=' + (archive && archive.progression.equippedWeapon));
    verifier('l archive exportee est en version 2',
      Boolean(archive && archive.saveVersion === 2), 'version=' + (archive && archive.saveVersion));

    const reimport = await s.evaluer(`(async () => {
      const sauvegarde = ${exporte};
      // On ne vide pas localStorage : le jeu enregistre sa progression sur
      // 'pagehide', et un stockage vide serait immediatement rempli par
      // l'ancien ecran. L'import ecrase de toute facon chaque champ.
      const resultat = await window.__nexus.importer(JSON.stringify(sauvegarde));
      const etat = window.__nexus.etatJoueur();
      return { resultat, classe: etat.classe, arme: etat.arme, vieMax: etat.vieMax };
    })()`);
    verifier('l archive se reimporte sans erreur',
      Boolean(reimport && reimport.resultat && reimport.resultat.ok === true),
      reimport && reimport.resultat ? String(reimport.resultat.erreur || '') : 'pas de reponse');
    verifier('la classe Tank est conservee a l import',
      reimport.classe === 'tank', 'classe=' + reimport.classe);
    verifier('l arme du Tank est conservee a l import',
      reimport.arme === 'bulwark', 'arme=' + reimport.arme);
    verifier('les 120 PV du Tank sont restaures a l import',
      reimport.vieMax === 120, 'vieMax=' + reimport.vieMax);

    // Une archive v1, anterieure au Tank, doit encore s'importer : c'est
    // exactement la raison du passage de la version 1 a la version 2.
    const v1 = await s.evaluer(`(async () => {
      const ancien = {
        game: 'Nexus Breach',
        saveVersion: 1,
        progression: {
          bestScore: 1234,
          credits: 500,
          ownedEquipment: {},
          ownedWeapons: { pulse: true, twinSabers: true },
          equippedWeapon: 'twinSabers',
          ownedClasses: { assassin: true },
          equippedClass: 'assassin',
          ownedAbilities: {},
          equippedAbility: '',
          currentMapIndex: 0
        }
      };
      return await window.__nexus.importer(JSON.stringify(ancien));
    })()`);
    verifier('une archive v1 reste importable', Boolean(v1 && v1.ok),
      v1 ? String(v1.erreur || '') : 'pas de reponse');
    verifier('l archive v1 garde la classe Assassin',
      Boolean(v1 && v1.classe === 'assassin'), v1 ? 'classe=' + v1.classe : '');
    verifier('l archive v1 recoit l arme de depart de sa classe',
      Boolean(v1 && v1.arme === 'twinSabers'), v1 ? 'arme=' + v1.arme : '');

    // --- 5. Les nouvelles armes de l'Assassin ------------------------------
    // Meme raison qu au point 2 : l'import, et non un setItem suivi d'un
    // reload, sinon 'pagehide' reecrit les credits de l'ancien ecran.
    const attributionAssassin = await s.evaluer(`(async () => {
      return await window.__nexus.importer(JSON.stringify({
        game: 'Nexus Breach',
        saveVersion: 2,
        progression: {
          bestScore: 0,
          credits: 60000,
          ownedEquipment: {},
          ownedWeapons: {},
          equippedWeapon: 'pulse',
          ownedClasses: { ranger: true, assassin: true, tank: true },
          equippedClass: 'ranger',
          ownedAbilities: {},
          equippedAbility: '',
          currentMapIndex: 0
        }
      }));
    })()`);
    verifier('une archive avec la classe Assassin possedee est acceptee',
      Boolean(attributionAssassin && attributionAssassin.ok),
      attributionAssassin ? String(attributionAssassin.erreur || '') : 'pas de reponse');
    await recharger(s);

    const arsenal = await s.evaluer(`(() => {
      document.querySelector('[data-class-id="assassin"]').click();
      document.getElementById('shop-button').click();
      const cartes = Array.from(document.querySelectorAll('#shop-weapons .shop-item'));
      const noms = cartes.map((c) => (c.querySelector('h3') || {}).textContent);
      const attendus = ['SANG // CROCS', 'TEMPÊTE // ÉCLAIR', 'EXEC // FAUX'];
      const manquant = attendus.filter((n) => !noms.includes(n));
      const achetable = attendus.every((nom) => {
        const c = cartes.find((x) => (x.querySelector('h3') || {}).textContent === nom);
        return Boolean(c) && !c.disabled;
      });
      document.getElementById('shop-close-button').click();
      return { total: noms.length, manquant, achetable, noms };
    })()`);
    verifier('l atelier Assassin propose 8 armes', arsenal.total === 8,
      'trouvees=' + arsenal.total + ' ' + JSON.stringify(arsenal.noms));
    verifier('les 3 nouvelles armes sont listees', arsenal.manquant.length === 0,
      JSON.stringify(arsenal.manquant));
    verifier('les 3 nouvelles armes sont achetables', arsenal.achetable === true);

    const apresAchatArme = await s.evaluer(`(() => {
      document.getElementById('shop-button').click();
      const carte = Array.from(document.querySelectorAll('#shop-weapons .shop-item'))
        .find((c) => (c.querySelector('h3') || {}).textContent === 'TEMPÊTE // ÉCLAIR');
      if (!carte) return { erreur: 'carte TEMPETE absente' };
      if (carte.disabled) return { erreur: 'carte TEMPETE desactivee' };
      carte.click();
      document.getElementById('shop-close-button').click();
      return {
        etat: window.__nexus.etatJoueur(),
        hud: (document.getElementById('weapon-name') || {}).textContent || '',
        prix: Number(localStorage.getItem('nexus-breach-credits'))
      };
    })()`);
    verifier('TEMPETE // ECLAIR s equipe', /TEMP/.test(apresAchatArme.hud || ''), apresAchatArme.hud);
    verifier('son prix est debite (60000 - 3600 = 56400)',
      apresAchatArme.prix === 56400, 'credits=' + apresAchatArme.prix);
    verifier('TEMPETE // ECLAIR touche bien 3 cibles',
      apresAchatArme.etat.cibles === 3, 'cibles=' + apresAchatArme.etat.cibles);

    // La cadence et les degats de la TEMPETE doivent se lire dans le HUD : c est
    // le seul endroit ou le joueur peut verifier qu elle est reellement plus
    // rapide que les autres armes de l'Assassin.
    const statsHud = await s.evaluer(
      `(() => (document.getElementById('weapon-stats-hud') || {}).textContent || '')()`);
    verifier('le HUD annonce 3 cibles pour la TEMPETE',
      /3\s?CIBLES/.test(statsHud), statsHud);
    verifier('le HUD annonce les degats de la TEMPETE, pas ceux de la classe',
      /DMG\s?27\b/.test(statsHud), statsHud);
    verifier('le HUD annonce la cadence de la TEMPETE, pas celle de la classe',
      /CAD\s?4\.6\b/.test(statsHud), statsHud);
  } finally {
    await s.fermer();
  }

  const echecs = resultats.filter((r) => !r.ok);
  console.log('');
  console.log(`${resultats.length - echecs.length} / ${resultats.length} verifications reussies.`);
  if (echecs.length) {
    console.log('ECHECS :');
    echecs.forEach((e) => console.log(`  - ${e.nom}${e.detail ? ' // ' + e.detail : ''}`));
    process.exitCode = 1;
  }
})().catch((erreur) => {
  console.error('le test a leve :', erreur);
  process.exitCode = 1;
});
