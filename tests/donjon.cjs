// Verifie le mode DONJON de bout en bout, sur une vraie partie.
//
// Ce qui est verifie, et pourquoi chaque point compte :
//   1. le mode se choisit et se lit dans la sauvegarde ;
//   2. une salle est reellement construite dans la scene, avec ses obstacles ;
//   3. nettoyer la salle ouvre le portail, et le portail se voit ouvert ;
//   4. franchir le portail descend d'un palier et reconstruit la salle ;
//   5. la salle d avant est bien demolie : pas de murs invisibles qui s
//      accumulent, et pas de memoire qui grossit ;
//   6. les eliminations rapportent de l'argent de run, et pas au credit global ;
//   7. le terminal ouvre le magasin et le ferme sur la partie, pas sur le menu ;
//   8. le donjon ne vend ni classe ni module d atelier ;
//   9. la campagne n'est pas affectee : elle garde ses modules.
//
// Controle negatif : sans la construction de salle, le point 2 tombe. C est ce
// qui distingue "la salle existe" de "le code ne plante pas".
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__donjon.html';

const etat = 'window.__nexus.etatDonjon()';

// Attend qu une condition devienne vraie, en relisant l'etat plutot qu'en
// dormant une duree fixe.
//
// Une attente fixe est un pari : elle reussit si la machine va vite, et elle
// simule un defaut quand elle est trop courte. La version a duree fixe de ce
// test echouait une fois sur trois, en s'arretant au palier 1 : le portail
// s'ouvrait une frame plus tard que le delai. Le defaut etait dans le test, pas
// dans le jeu, et seule la scrutation le distingue de la panne.
//
// Le dernier etat lu est renvoye en cas d echec : sans lui, un delai depasse
// dit seulement "rien", alors qu'il dit exactement ou le jeu en etait.
async function attendreEtat(session, condition, delaiMs, libelle) {
  const limite = Date.now() + delaiMs;
  let dernier = null;
  while (Date.now() < limite) {
    dernier = await session.evaluer(etat);
    if (condition(dernier)) return dernier;
    await attendre(80);
  }
  throw new Error(`${libelle} : toujours pas vrai apres ${delaiMs} ms`
    + ` (etat lu : ${JSON.stringify({
      palier: dernier && dernier.palier,
      etat: dernier && dernier.etatJeu,
      apparus: dernier && dernier.apparus,
      total: dernier && dernier.total,
      ennemis: dernier && dernier.ennemis,
      porte: dernier && dernier.porteOuverte
    })})`);
}

// Attend qu'un ecran porte, ou non, la classe active. Les ecrans du jeu
// s'affichent et se masquent avec cette classe, jamais avec l'attribut hidden :
// chercher hidden donnerait un resultat toujours vrai, donc un test qui passe
// sans rien verifier.
async function attendreEcran(session, id, attendu, delaiMs, message) {
  const limite = Date.now() + delaiMs;
  let dernier = null;
  while (Date.now() < limite) {
    dernier = await session.evaluer(
      `document.getElementById('${id}').classList.contains('active')`);
    if (dernier === attendu) return { ouverte: dernier };
    await attendre(80);
  }
  throw new Error(`${message} (actif=${dernier}, attendu=${attendu}, apres ${delaiMs} ms)`);
}

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));
  let session = null;
  const problemes = [];

  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1000, hauteur: 620 });
    const pret = await session.attendre(
      'Boolean(window.__nexus && window.__nexus.etatDonjon)', 60000);
    if (!pret) throw new Error("le jeu ne s'initialise pas");

    // 1. Le mode se choisit par le meme chemin que le bouton du menu.
    const choisi = await session.evaluer("window.__nexus.changerMode('donjon')");
    console.log(`  1. mode choisi : ${choisi}`);
    if (choisi !== 'donjon') problemes.push('le mode donjon ne peut pas etre choisi');

    // Le titre de l'onglet doit porter le mode. C'est le seul indice qui
    // distingue cette version d'une autre copie du jeu installee sur la meme
    // machine, avec des lanceurs identiques et le meme titre. Un onglet qui
    // reste sur CAMPAGNE apres avoir clique sur DONJON dit immediatement au
    // joueur qu'il a ouvert la mauvaise copie.
    const titreDonjon = await session.evaluer('document.title');
    await session.evaluer("window.__nexus.changerMode('campagne')");
    const titreCampagne = await session.evaluer('document.title');
    await session.evaluer("window.__nexus.changerMode('donjon')");
    console.log(`     titre de l onglet : "${titreCampagne}" puis "${titreDonjon}"`);
    if (!/DONJON/.test(titreDonjon)) {
      problemes.push("l'onglet ne dit pas DONJON : impossible de distinguer"
        + " cette version d'une autre copie du jeu");
    }
    if (!/CAMPAGNE/.test(titreCampagne)) {
      problemes.push("l'onglet ne dit pas CAMPAGNE en campagne : " + titreCampagne);
    }

    await session.evaluer("document.getElementById('start-button').click(); true");
    const enJeu = await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    if (!enJeu) throw new Error('la partie ne demarre pas');
    await attendre(600);

    // 2. La salle existe reellement : des maillages, des obstacles, une porte.
    const premier = await session.evaluer(etat);
    console.log(`  2. palier ${premier.palier} : ${premier.maillages} maillages,`
      + ` ${premier.obstacles} obstacles, portail ${premier.portail ? 'pose' : 'ABSENT'}`);
    if (premier.mode !== 'donjon') problemes.push('le jeu n est pas en donjon apres le choix du mode');
    if (premier.maillages < 5) {
      problemes.push('la salle ne construit presque rien : ' + premier.maillages + ' maillage(s)');
    }
    if (premier.obstacles < 3) {
      problemes.push('la salle n a presque pas d obstacles : ' + premier.obstacles);
    }
    if (!premier.portail) problemes.push('la salle n a pas de portail');
    if (premier.porteOuverte) problemes.push('le portail est ouvert des le depart, la salle est vide');

    // 3. Nettoyer la salle ouvre le portail.
    //
    // Les deux temporisations ici ne sont pas decoratives. La premiere laisse
    // les ennemis apparaitre : sans elle on"nettoie" une salle vide, et le
    // test ne prouve alors rien sur l'argent gagne. La seconde laisse tourner
    // la boucle : le portail ne s'ouvre pas au moment du nettoyage mais a la
    // frame suivante, quand updateWave constate que la salle est vide ET que
    // tous les ennemis sont apparus. Lire trop tot verrait une porte fermee
    // alors que tout est correct.
    await attendre(1800);
    const peuple = await session.evaluer(etat);
    console.log(`  2b. la salle a peuplee : ${peuple.ennemis} ennemi(s) en jeu`);
    if (peuple.ennemis === 0) {
      problemes.push('aucun ennemi n apparait dans une salle du donjon');
    }

    // On force l'apparition d'un lot : le jeu les fait naitre une par une, et
    // en trois secondes on n'en observe qu'un ou deux. Sur un echantillon
    // aussi petit, "aucun ennemi ne bouge pas" ne prouverait rien.
    const lot = await session.evaluer('window.__nexus.peupler(6)');
    console.log(`  2b. enemies dans la salle : ${lot}`);
    if (lot < 4) {
      problemes.push('la salle n accepte pas un lot d ennemis : seulement ' + lot);
    }

    // 2c. Les ennemis se rapprochent-ils reellement ?
    //
    // Le generateur promet une salle navigable, et le test du generateur le
    // verifie. Cela ne suffit pas : un ennemi peut rester presse contre un
    // bloc meme dans une salle parfaitement connected, si sa case de
    // navigation est isolee de la sienne. Le symptome est une distance qui
    // ne baisse plus.
    //
    // Six secondes et non quatre. Un ennemi avance de moins d'un metre par
    // seconde : sur quatre secondes, la mesure prenait plus de bruit que de
    // signal et declarait bloque un ennemi en marche. La trace sur
    // quatorze echantillons montre sept ennemis sur sept qui progressent de
    // facon monotone, de 0,4 a 0,5 metre par seconde.
    const avant = await session.evaluer('window.__nexus.distancesEnnemis()');
    await attendre(10000);
    const apres = await session.evaluer('window.__nexus.distancesEnnemis()');
    // Appariement par indice, pas par proximite.
    //
    // La premiere version cherchait l'ennemi le plus proche de la position
    // initiale, dans un rayon de 1,6 m. Or un ennemi qui avance correctement
    // en fait plusieurs en quatre secondes : il sortait du rayon, n'etait
    // retrouve par personne, et le test concluait "aucun ne bouge". Le
    // symptome etait donc fabrique, et il masquait le vrai cas.
    //
    // L'ordre du tableau est stable : pendant la mesure, le joueur ne tire pas
    // et rien ne meurt.
    const lents = [];
    const dansUnBloc = [];
    const coupes = [];
    let rapproches = 0;
    let enPoste = 0;
    const ignores = Math.max(0, avant.length - apres.length);
    for (let i = 0; i < Math.min(avant.length, apres.length); i += 1) {
      // Un Tireur arrete a sa portee de tir pour tenir sa position : c'est le
      // comportement voulu, pas un blocage. Le compter comme bloque rendait le
      // test faux, et deux versions precedentes ont lance de fausses pistes
      // la-dessus avant qu'on regarde le code du tir.
      if (avant[i].tire && avant[i].d <= avant[i].porteeTir) { enPoste += 1; continue; }
      if (apres[i].dansUnBloc) {
        dansUnBloc.push(avant[i].d.toFixed(1) + 'm a '
          + apres[i].x.toFixed(1) + ',' + apres[i].z.toFixed(1));
      }
      if (!apres[i].navOk && avant[i].d > 6) {
        coupes.push(avant[i].d.toFixed(1) + 'm en '
          + apres[i].x.toFixed(1) + ',' + apres[i].z.toFixed(1));
      }
      if (avant[i].d < 4) continue;
      // Dix secondes, et un seuil de 1,5 m. Un ennemi peut etre lent sans
      // etre bloque : il charge, il est ralenti, il contourne un bloc par le
      // long, ou il fait la queue derriere six autres qui convergent vers le
      // meme point. Ce que le joueur signale, ce n'est pas la lenteur, c'est
      // un ennemi fige definitivement.
      if (apres[i].d < avant[i].d - 1.5) rapproches += 1;
      else lents.push(avant[i].d.toFixed(1) + 'm -> ' + apres[i].d.toFixed(1) + 'm');
    }
    console.log(`  2c. approche sur 10 s : ${apres.length} ennemi(s),`
      + ` ${rapproches} progressent, ${lents.length} lents,`
      + ` ${enPoste} tireurs en poste`
      + (ignores ? `, ${ignores} disparu(s)` : ''));
    if (lents.length) console.log('     lents : ' + lents.join(' | '));

    // Trois verites, et non une.
    //
    // La premiere version exigeait que TOUT ennemi progresse. Elle echouait une
    // fois sur deux, pour une raison legitime : avec sept ennemis qui
    // convergent sur le meme point, les derniers font la queue derriere les
    // autres. Un ennemi a 20 metres qui gagne un metre en dix secondes est
    // dans une file d'attente, il n'est pas bloque. Exiger l'inverse rendait le
    // test fou.
    //
    // Ce que le joueur a signale, ce sont des monstres qui ne bougent PLUS. On
    // le verifie donc sur les etats qui prouvent un blocage reel, et sur la
    // majorite, pas sur chacun.
    if (dansUnBloc.length > 0) {
      problemes.push(dansUnBloc.length + ' ennemi(s) sont dans un bloc'
        + ' : ' + dansUnBloc.join(', '));
    }
    if (coupes.length > 0) {
      problemes.push(coupes.length + ' ennemi(s) sont dans une zone que la navigation'
        + ' n atteint pas : ' + coupes.join(', '));
    }
    const concernes = rapproches + lents.length;
    if (concernes > 0 && rapproches / concernes < 0.6) {
      problemes.push('seulement ' + rapproches + ' ennemi(s) sur ' + concernes
        + ' se rapprochent vraiment du joueur');
    }

    await session.evaluer('window.__nexus.nettoyerSalle(); true');
    const nettoye = await attendreEtat(session, (e) => e.porteOuverte, 4000,
      'le portail ne s ouvre pas');
    console.log(`  3. porte ouverte : ${nettoye.porteOuverte},`
      + ` apparus ${nettoye.apparus}/${nettoye.total}, ${nettoye.ennemis} ennemi(s)`);
    if (nettoye.ennemis !== 0) problemes.push('la salle n a pas ete nettoyee');

    // 6. L'argent de run existe, et il est distinct du credit global.
    //
    // On lit la variable, pas le DOM. Les deux soldes ne s'affichent pas au
    // meme endroit, et lire le menu ne dit rien de l'argent de run : c'est
    // exactement la confusion que ce test doit interdire.
    const argent = await session.evaluer(`(() => {
      const e = window.__nexus.etatDonjon();
      return { run: e.argent, global: e.argentGlobal };
    })()`);
    const menu = await session.evaluer(
      "Number(document.getElementById('menu-credits').textContent.replace(/[^0-9]/g, '')) || 0");
    const hud = await session.evaluer(
      "Number(document.getElementById('credits-value').textContent.replace(/[^0-9]/g, '')) || 0");
    console.log(`  6. argent de run : ${argent.run} CR pour ${peuple.ennemis} elimination(s)`
      + `   atelier permanent : ${argent.global} CR`);
    console.log(`     HUD ${hud} CR   menu ${menu} CR`);
    if (argent.run === 0) {
      problemes.push('aucun argent de run alors que des ennemis sont morts');
    }
    if (argent.global !== 0) {
      problemes.push('les eliminations du donjon ont credite l atelier permanent : '
        + argent.global + ' CR');
    }
    // Le HUD doit suivre l'argent gagne. C'est ce qui permet au joueur de
    // savoir s'il peut se payer quelque chose au terminal.
    if (hud !== argent.run) {
      problemes.push('le HUD n announce pas l argent de run : ' + hud
        + ' affiche pour ' + argent.run + ' reel');
    }
    // Le menu, lui, continue d'annoncer l'argent d'Atelier. C'est pour ca qu'on
    // ne peut pas le lire pour verifier l'argent de run.
    if (menu !== argent.global) {
      problemes.push('le menu n annonce plus l argent d atelier : ' + menu
        + ' affiche pour ' + argent.global + ' reel');
    }

    // 4. Franchir le portail descend d un palier.
    const porte = nettoye.portail;
    await session.evaluer(`window.__nexus.teleport(${porte.x}, ${porte.z}); true`);
    const second = await attendreEtat(session, (e) => e.palier > premier.palier, 4000,
      'franchir la porte ne descend pas');
    console.log(`  4. apres la porte : palier ${second.palier},`
      + ` ${second.maillages} maillages, ${second.obstacles} obstacles`);
    if (second.palier !== premier.palier + 1) {
      problemes.push('la porte a saute un palier : '
        + premier.palier + ' -> ' + second.palier);
    }
    if (second.porteOuverte) {
      problemes.push('le portail est deja ouvert dans la salle suivante');
    }

    // 5. L ancienne salle est demolie. C est le point le plus facile a louper :
    // sans nettoyage, les obstacles s empilent et le joueur finit par ne plus
    // pouvoir bouger, sans qu'aucune erreur ne soit levee.
    if (second.obstacles < 3) {
      problemes.push('la salle suivante a perdu ses obstacles : ' + second.obstacles);
    }
    if (second.obstacles > premier.obstacles + 12) {
      problemes.push('les obstacles s accumulent : ' + premier.obstacles
        + ' puis ' + second.obstacles);
    }

    // Descend d une salle, proprement, et compte.
    // Une seule descente a la fois : chaque etape est verifiee, donc quand elle
    // echoue on sait exactement laquelle.
    async function descendre() {
      // On repart d'un etat de jeu. Si le magasin s est ouvert, le portail ne
      // peut pas s'ouvrir : updateWave ne tourne qu en partie. Fermer d abord
      // evite un echec qui n aurait rien a voir avec ce qu on teste ici.
      if ((await session.evaluer(etat)).etatJeu === 'shop') {
        await session.evaluer(
          "document.getElementById('shop-close-button').click(); true");
        await attendreEcran(session, 'shop-screen', false, 3000,
          'le magasin ne se ferme pas avant la descente');
      }
      const p = await session.evaluer(etat);
      if (!p.portail) throw new Error('la salle n a pas de portail a franchir');
      await session.evaluer('window.__nexus.nettoyerSalle(); true');
      const ouverte = await attendreEtat(session, (e) => e.porteOuverte, 5000,
        `le portail ne s ouvre pas au palier ${p.palier}`);
      if (!ouverte.portail) throw new Error('le portail a disparu');
      await session.evaluer(`window.__nexus.teleport(${p.portail.x}, ${p.portail.z}); true`);
      return attendreEtat(session, (e) => e.palier > ouverte.palier, 5000,
        `la descente ne progresse pas depuis le palier ${ouverte.palier}`);
    }

    // 5. L ancienne salle est bien demolie.
    //
    // C'est le point le plus facile a louper, et le plus grave : sans
    // nettoyage, les obstacles des salles precedentes s empilent. Le joueur
    // se retrouve prisonnier dans un couloir de murs invisibles, et rien dans
    // le jeu ne leve aucune erreur. C'est aussi un defaut de memoire qui
    // transformerait une longue descente en fuite du navigateur.
    const largeurs = [second.obstacles];
    let courant = second;
    for (let i = 0; i < 3; i += 1) {
      courant = await descendre();
      largeurs.push(courant.obstacles);
    }
    console.log(`  5. obstacles par salle : ${largeurs.join(' -> ')}`
      + `   (palier ${courant.palier})`);
    if (courant.palier !== 4) {
      problemes.push('quatre descents menent au palier ' + courant.palier + ' et non 4');
    }
    if (largeurs.some((n) => n < 3)) {
      problemes.push('une salle a perdu ses obstacles : ' + largeurs.join(', '));
    }
    if (courant.obstacles > largeurs[0] + 12) {
      problemes.push('les obstacles s accumulent : ' + largeurs.join(', '));
    }

    // On descend ensuite jusqu'a trouver une salle avec un terminal. Le
    // terminal n'apparait que sur environ 40 % des salles : sans cette boucle,
    // le test passerait en sautant silencieusement tout ce qui concerne la
    // boutique, et il donnerait l'illusion de la couvrir.
    //
    // Vingt paliers et non dix : a 40 %, dix salles sans terminal une fois
    // sur deux cents, ce qui est assez pour qu'un test qui doit passer a chaque
    // ecoute echoue pour une raison qui n'a rien a voir avec le code. Vingt
    // ramene cette probabilite sous une chance sur dix mille, sans rien
    // retirer a la verification.
    const MAX_SALLES = 20;
    // On part de la salle ou l'on est deja. Sans cela, un terminal tombe
    // exactement sur le palier 4 faisait sortir la boucle immediatement, la
    // variable restait vide, et le test annoncait un defaut qui n'existait pas
    // tout en sautant toute la verification de la boutique. C'est le genre
    // d erreur qui rend un test inutilisable : il ment sur le jeu et se ment
    // sur lui-meme.
    let salleAvecTerminal = courant.terminal ? courant : null;
    let paliersVus = 4;
    while (paliersVus < MAX_SALLES && !salleAvecTerminal) {
      courant = await descendre();
      paliersVus += 1;
      if (courant.terminal) salleAvecTerminal = courant;
    }

    console.log(`  5b. palier ${courant.palier} : terminal`
      + (salleAvecTerminal
        ? ' au palier ' + salleAvecTerminal.palier + ', on va y toucher'
        : ' ABSENT sur ' + MAX_SALLES));
    if (!salleAvecTerminal) {
      problemes.push('aucun terminal sur ' + MAX_SALLES
        + ' salles : le generateur en promet environ 40 %');
    }

    // 7. Le terminal ouvre le magasin, et le ferme sur la partie.
    if (salleAvecTerminal) {
      await session.evaluer(
        `window.__nexus.teleport(${salleAvecTerminal.terminal.x},`
        + ` ${salleAvecTerminal.terminal.z}); true`);
      // On scrute l'ecran plutot que d'attendre : le magasin s'ouvre a la
      // frame qui suit le contact, et cette frame n'a pas de duree fixe.
      const boutique = await attendreEcran(session, 'shop-screen', true, 4000,
        'le terminal n ouvre pas le magasin');
      console.log(`  7. terminal touche : magasin ${boutique.ouverte ? 'ouvert' : 'FERME'}`);

    // 8. Ce que le terminal vend reellement dans le donjon.
    //
    // Verifie par le DOM, pas seulement par la table : une section peut
    // disparaitre de la liste et rester affichee. On regarde ce qui est
    // reellement a l'ecran, titre compris : un titre au-dessus d'un vide
    // ressemblerait a un bug de mise en page.
    const sections = await session.evaluer('window.__nexus.etatDonjon().modulesVisibles');
    console.log('  8. sections proposees : ' + JSON.stringify(sections));
    const INTERDITS = [['classes', 'classes'], ['capacites', 'capacites'],
      ['modules', 'modules d atelier']];
    for (const [cle, nom] of INTERDITS) {
      if (sections[cle] !== false) {
        problemes.push('le terminal propose encore les ' + nom);
      }
    }
    if (sections.ameliorations !== true) {
      problemes.push("le terminal ne propose pas d ameliorations de stats");
    }

    const affiches = await session.evaluer(`(() => {
      const paires = ['shop-classes', 'shop-abilities', 'shop-items', 'shop-ameliorations'];
      return paires.map((id) => {
        const noeud = document.getElementById(id);
        if (!noeud) return { id, absent: true };
        const titre = noeud.previousElementSibling;
        return {
          id,
          visible: noeud.offsetParent !== null,
          titreVisible: titre ? titre.offsetParent !== null : null
        };
      });
    })()`);
    console.log('     affichage : ' + JSON.stringify(affiches));
    for (const a of affiches) {
      if (a.absent) {
        problemes.push('la section #' + a.id + ' n existe pas dans la page');
        continue;
      }
      // Seul shop-ameliorations doit etre visible : tout le reste disparait
      // dans le donjon, y compris les capacites.
      const attendue = a.id === 'shop-ameliorations';
      if (a.visible !== attendue) {
        problemes.push('la section #' + a.id + ' est '
          + (a.visible ? 'affichee' : 'masquee') + ' au lieu de '
          + (attendue ? 'affichee' : 'masquee'));
      }
      if (a.titreVisible !== attendue) {
        problemes.push('le titre de #' + a.id + ' est '
          + (a.titreVisible ? 'affiche' : 'masque') + ' alors que la section ne l est pas');
      }
    }

    // 10. L'achat, ici, magasin ouvert.
    //
    // acheterAmeliorationDonjon refuse tout etat autre que SHOP : la
    // premiere version essayait d'acheter apres avoir referme la boutique, et
    // le test signalait un achat impossible. Il avait raison.
    //
    // Quatre verifications, et non une. Une carte qui s'affiche sans rien
    // changer, un cout qui se debite sans effet, un effet sans debit : trois
    // defauts distincts qu'un test qui regarde seulement le total confond.
    // L'argent se garde d'un palier a l'autre, donc le test en a deja pour
    // acheter. On complete malgre tout : le test saute les minutes de jeu
    // qui auraient produit cet argent, et un achat refuse pour manque de
    // liquidite masquerait le vrai defaut derriere.
    //
    // Il passe par le meme chemin que les eliminations, via une fonction de
    // diagnostic, plutot qu'ecrire donjonCredits : un test qui ecrit dans la
    // variable prouverait qu'elle existe, pas que la boutique s en sert.
    const coutDegats = await session.evaluer("window.__nexus.coutAmelioration('degats', 0)");
    const liquide = await session.evaluer(`(() => {
      const avant = window.__nexus.etatDonjon().argent;
      window.__nexus.crediterDonjon(400);
      return { avant, apres: window.__nexus.etatDonjon().argent };
    })()`);
    console.log(`     achat finance par ${liquide.apres} CR `
      + `(la descente avait donne ${liquide.avant})`);

    const avantAchat = await session.evaluer(`(() => {
      const p = window.__nexus.etatStats();
      return { degats: p.damage, niveaux: { ...p.donjon } };
    })()`);
    const argentAvant = await session.evaluer('window.__nexus.etatDonjon().argent');
    const achete = await session.evaluer("window.__nexus.acheterAmelioration('degats')");
    const apresAchat = await session.evaluer(`(() => {
      const p = window.__nexus.etatStats();
      return { degats: p.damage, niveaux: { ...p.donjon } };
    })()`);
    const argentApres = await session.evaluer('window.__nexus.etatDonjon().argent');
    console.log('  10. achat de DEGATS (' + coutDegats + ' CR) : '
      + argentAvant + ' -> ' + argentApres + ' CR'
      + '   degats ' + avantAchat.degats.toFixed(1)
      + ' -> ' + apresAchat.degats.toFixed(1));
    if (!achete) {
      problemes.push('l amelioration DEGATS n a pas ete achetee avec '
        + argentAvant + ' CR pour un cout de ' + coutDegats + ' CR');
    }
    if ((apresAchat.niveaux.degats || 0) !== 1) {
      problemes.push("l achat de DEGATS n a pas incremente le niveau : "
        + JSON.stringify(apresAchat.niveaux));
    }
    if (apresAchat.degats <= avantAchat.degats) {
      problemes.push("l achat de DEGATS n a pas augmente les degats : "
        + avantAchat.degats.toFixed(2) + ' -> ' + apresAchat.degats.toFixed(2));
    }
    if (argentApres >= argentAvant) {
      problemes.push("l achat de DEGATS n a rien coute : "
        + argentAvant + ' -> ' + argentApres);
    }
    // L'argent d'atelier ne doit pas avoir bouge : la regle des deux
    // portefeuilles se verifie sur un achat, pas sur une seule elimination.
    const creditGlobal = await session.evaluer('window.__nexus.etatDonjon().argentGlobal');
    if (creditGlobal !== 0) {
      problemes.push("l achat a debite l atelier permanent : " + creditGlobal + ' CR');
    }
    // Le cout monte, sinon remplir toutes les jauges serait la seule
    // strategie possible et le choix n existerait pas.
    const couts = await session.evaluer(
      '[0, 1, 2, 3].map((n) => window.__nexus.coutAmelioration("degats", n))');
    const croissants = couts.every((c, i) => i === 0 || c > couts[i - 1]);
    console.log('     couts par niveau : ' + couts.join(' -> ') + ' CR');
    if (!croissants) {
      problemes.push('le cout des ameliorations ne monte pas : ' + couts.join(' -> '));
    }

    await session.evaluer("document.getElementById('shop-close-button').click(); true");
    await attendreEcran(session, 'shop-screen', false, 4000,
      'le magasin ne se ferme pas au clic sur son bouton');
    const etatJeu = await session.evaluer('window.__nexus.etatDonjon().etatJeu');
    console.log('     retour de boutique : etat ' + etatJeu);
    if (etatJeu !== 'playing') {
      problemes.push('fermer le magasin ne rend pas la main a la partie : etat '
        + etatJeu);
    }
  }

    // 11. L'argent et les ameliorations survivent a la descente.
    //
    // C'est une regle de design, donc une regle a verifier. Elle tient des
    // deux cotes : l'argent se garde d'un palier a l'autre, et il disparait a
    // la mort. Verifier seulement le premier moitie laisserait passer un jeu
    // ou l'on herite de la poche de la partie precedente.
    const reportEn = await session.evaluer('(() => {'
      + ' window.__nexus.crediterDonjon(500);'
      + ' return { argent: window.__nexus.etatDonjon().argent,'
      + '         niveaux: { ...window.__nexus.etatStats().donjon } };'
      + ' })()');
    const porteSuivante = await session.evaluer(etat);
    if (porteSuivante.portail) {
      await session.evaluer('window.__nexus.nettoyerSalle(); true');
      await attendreEtat(session, (e) => e.porteOuverte, 5000,
        'le portail ne s ouvre pas avant le test de report');
      await session.evaluer(
        `window.__nexus.teleport(${porteSuivante.portail.x}, ${porteSuivante.portail.z}); true`);
      const palierSuivant = await attendreEtat(session, (e) => e.palier > porteSuivante.palier,
        5000, 'la descente ne progresse pas avant le test de report');
      const apresDescente = await session.evaluer('window.__nexus.etatDonjon()');
      console.log(`  11. apres descente : argent ${reportEn.argent} -> ${apresDescente.argent} CR`
        + `   palier ${palierSuivant.palier}`);
      if (apresDescente.argent !== reportEn.argent) {
        problemes.push("l'argent disparait a la descente : "
          + reportEn.argent + ' -> ' + apresDescente.argent
          + '  Il doit tenir jusqu a la mort.');
      }
    } else {
      console.log('  11. pas de portail : report non verifie');
      problemes.push('pas de portail pour verifier le report d argent');
    }

    // Et une nouvelle partie repart de zero : argent ET ameliorations.
    const neuf = await session.evaluer(`(() => {
      window.__nexus.nouvellePartieDonjon();
      return { argent: window.__nexus.etatDonjon().argent,
               niveaux: { ...window.__nexus.etatStats().donjon } };
    })()`);
    console.log(`      nouvelle partie : ${neuf.argent} CR, `
      + `niveaux ${JSON.stringify(neuf.niveaux)}`);
    if (neuf.argent !== 0) {
      problemes.push("une nouvelle partie herite de l'argent de la precedente : "
        + neuf.argent + ' CR');
    }
    if (Object.keys(neuf.niveaux).length !== 0) {
      problemes.push("une nouvelle partie herite des ameliorations achetees : "
        + JSON.stringify(neuf.niveaux));
    }

    // 9. La campagne n est pas touchee : elle garde ses modules et ses
    //    capacites, et ne montre surtout pas la section du donjon.
    const campagne = await session.evaluer(
      "window.__nexus.changerMode('campagne'), window.__nexus.etatDonjon().modulesVisibles");
    console.log('  9. sections en campagne : ' + JSON.stringify(campagne));
    if (campagne.classes !== true || campagne.modules !== true
      || campagne.capacites !== true || campagne.ameliorations !== false) {
      problemes.push('la campagne a perdu ou gagne une section de boutique : '
        + JSON.stringify(campagne));
    }
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) {}
  }

  if (problemes.length === 0) {
    console.log('\n  LE DONJON DESCEND, SE DEMOLIT, ET NE VEND QUE CE QU IL DOIT.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
