// Verifie que l'Assassin a DEUX actions separees : ESPACE pour la capacite,
// F pour le dash, et un bouton tactile pour chacune.
//
// Ce que le code faisait avant : une seule touche pour deux ressources, et la
// capacite la prenait des qu'elle etait achetee. Pendant sa recharge, l'appui
// ne faisait RIEN, et le dash devenait injoignable pendant 12 a 26 secondes
// d'affilee. Le PAS OMBRE promettait un dash libre pendant 6 s : il remettait le
// compteur a zero, puis bloquait la touche qui sert a s'en servir.
//
// Une touche qui fait deux choses n'en fait aucune correctement : quand une des
// deux est indisponible, le joueur ne sait pas laquelle, et l'appui ne donne
// rien. D'ou la separation demandee.
//
// Le test presse les deux touches par de VRAIS evenements clavier, et compte ce
// que chacune declenche. Controle negatif dans le meme passage : si une touche
// declenche l'autre ressource, le test echoue. C'est ce qui le distingue d'un
// simple "le dash fonctionne".
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__dash.html';
const APPUIS = 5;

const ETAT = 'window.__nexus.etatAction()';

async function appuyer(session, touche, code, vk) {
  await session.envoyer('Input.dispatchKeyEvent', {
    type: 'keyDown', code, key: touche, windowsVirtualKeyCode: vk
  });
  await session.envoyer('Input.dispatchKeyEvent', {
    type: 'keyUp', code, key: touche, windowsVirtualKeyCode: vk
  });
  await attendre(140);
}

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));

  let session = null;
  const problemes = [];
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 900, hauteur: 520, query: 'tactile=1' });
    // Deux sessions plutot qu'une avec deux rechargements : apres un reload,
    // le premier Runtime.evaluate vise parfois l'ancien document, ou
    // localStorage est inaccessible ("Access is denied for this document").
    // Une session par classe evite le probleme entier.
    // Tout se passe par la boutique, comme pour un joueur. Ecrire la classe dans
    // le stockage ne suffit pas : au chargement, l'equipement retombe sur le
    // Ranger des que la classe sauvegardee n'est pas possedee, et la possession
    // elle-meme vit dans la sauvegarde, qui prevaut sur la cle du stockage.
    async function demarrer(uneClasse, carteCapacite) {
      const s = await ouvrir(PAGE, RACINE, { largeur: 900, hauteur: 520, query: 'tactile=1' });
      await s.evaluer("localStorage.setItem('nexus-breach-credits', '999999'); true");
      await s.envoyer('Page.reload');
      const pret = await s.attendre(
        'Boolean(window.__nexus && window.__nexus.pret)', 60000);
      if (!pret) throw new Error("le jeu ne s'initialise pas");

      const achat = await s.evaluer(`(() => {
        document.getElementById('shop-button').click();
        const parNom = (selecteur, nom) => Array.from(document.querySelectorAll(selecteur))
          .find((c) => (c.querySelector('h3') || {}).textContent === nom);
        const credits = document.getElementById('shop-credits').textContent;
        const classe = parNom('#shop-classes .class-item', ${JSON.stringify(uneClasse === 'assassin' ? 'Assassin' : 'Ranger')});
        if (!classe) return 'carte de classe introuvable';
        // Une carte desactivee n'est pas forcément une erreur : la classe deja
        // active est desactivee, c'est normal. On ne reclique que si la classe
        // visee n'est pas deja equipee.
        if (classe.disabled && window.__nexus.etatAction().classe !== ${JSON.stringify(uneClasse)}) {
          return 'carte ' + ${JSON.stringify(uneClasse)} + ' desactivee (credits ' + credits + ')';
        }
        if (!classe.disabled) classe.click();
        let capacite = 'aucune';
        ${carteCapacite ? `
        const capaciteCarte = parNom('#shop-abilities .ability-item', 'PAS OMBRE');
        if (!capaciteCarte) return 'carte de capacite introuvable';
        if (capaciteCarte.disabled) return 'carte PAS OMBRE desactivee';
        capaciteCarte.click();
        capacite = 'PAS OMBRE';
        ` : ''}
        document.getElementById('shop-close-button').click();
        return { classe: window.__nexus.etatAction().classe, capacite, credits };
      })()`);
      if (typeof achat === 'string') throw new Error(achat);
      if (achat.classe !== uneClasse) {
        throw new Error('la classe ' + uneClasse + ' n a pas pris : lu = ' + achat.classe);
      }
      if (carteCapacite) {
        const etatApres = await s.evaluer(ETAT);
        if (etatApres.capacite !== 'shadowStep') {
          throw new Error('la capacite PAS OMBRE n a pas pu etre equipee : lu = '
            + etatApres.capacite);
        }
      }
      await s.evaluer("document.getElementById('start-button').click(); true");
      const enJeu = await s.attendre(
        "!document.getElementById('hud').classList.contains('hidden')", 30000);
      if (!enJeu) throw new Error('la partie ne demarre pas');
      return s;
    }

    const lireBouton = (s) => s.evaluer(`(() => {
      const b = document.getElementById('touch-dash');
      return b ? { existe: true, visible: getComputedStyle(b).display !== 'none' } : { existe: false };
    })()`);

    // D'abord le Ranger : le bouton DASH ne doit pas exister pour lui.
    const sessionRanger = await demarrer('ranger', false);
    const chezRanger = await lireBouton(sessionRanger);
    console.log('  Ranger   : bouton DASH ' + (chezRanger.existe ? 'present' : 'absent')
      + ', visible : ' + chezRanger.visible);
    if (chezRanger.visible) problemes.push('le bouton DASH reste visible chez le Ranger');
    await sessionRanger.fermer();

    session = await demarrer('assassin', true);

    const etat0 = await session.evaluer(ETAT);
    console.log(`  Assassin : classe ${etat0.classe}, capacite ${etat0.capacite}`);
    if (etat0.classe !== 'assassin') throw new Error("la classe n'est pas l'Assassin");
    if (!etat0.capacite) throw new Error('aucune capacite equipee : le test ne mesurerait rien');

    const boutonDash = await lireBouton(session);
    console.log('  bouton DASH tactile : ' + (boutonDash.existe ? 'present' : 'ABSENT')
      + ', visible : ' + boutonDash.visible);
    if (!boutonDash.existe) problemes.push('le bouton tactile DASH est absent du DOM');
    else if (!boutonDash.visible) problemes.push('le bouton DASH reste masque chez l Assassin');

    const journal = { espace: [], toucheF: [] };

    for (let i = 0; i < APPUIS; i += 1) {
      if (i > 0) {
        // On attend que le dash redevienne pret, sinon les appuis suivants
        // seraient refuses pour une raison banale et ne mesureraient rien.
        await session.attendre(
          'window.__nexus.etatAction().pretDash || window.__nexus.etatAction().pretCapacite',
          6000, 100);
        await attendre(120);
      }

      // ESPACE doit declencher la capacite, et rien d autre.
      const avantEspace = await session.evaluer(ETAT);
      await appuyer(session, ' ', 'Space', 32);
      const apresEspace = await session.evaluer(ETAT);
      journal.espace.push({
        capacitePartie: apresEspace.cdCapacite > avantEspace.cdCapacite + 0.01,
        dashParti: apresEspace.cdDash > avantEspace.cdDash + 0.01
      });

      // F doit declencher le dash, et rien d autre. On laisse d'abord la
      // recharge du dash partir, sinon F serait refuse a juste titre.
      await attendre(2800);
      const avantF = await session.evaluer(ETAT);
      await appuyer(session, 'f', 'KeyF', 70);
      const apresF = await session.evaluer(ETAT);
      journal.toucheF.push({
        capacitePartie: apresF.cdCapacite > avantF.cdCapacite + 0.01,
        dashParti: apresF.cdDash > avantF.cdDash + 0.01
      });
    }

    const compte = (liste, cle) => liste.filter((j) => j[cle]).length;
    const espace = {
      capacites: compte(journal.espace, 'capacitePartie'),
      dashes: compte(journal.espace, 'dashParti')
    };
    const toucheF = {
      capacites: compte(journal.toucheF, 'capacitePartie'),
      dashes: compte(journal.toucheF, 'dashParti')
    };

    console.log(`  ${APPUIS} cycles, deux touches par cycle :`);
    console.log(`    ESPACE  -> capacite ${espace.capacites}/${APPUIS}, dash ${espace.dashes}/${APPUIS}`);
    console.log(`    touche F -> capacite ${toucheF.capacites}/${APPUIS}, dash ${toucheF.dashes}/${APPUIS}`);

    // ESPACE declenche la capacite et jamais le dash.
    if (espace.capacites === 0) problemes.push('ESPACE ne declenche plus la capacite');
    if (espace.dashes > 0) {
      problemes.push(`ESPACE a declenche le dash ${espace.dashes} fois :`
        + ' les deux ressources sont supposedes etre separees');
    }
    // F declenche le dash et jamais la capacite.
    if (toucheF.dashes === 0) problemes.push('la touche F ne declenche jamais le dash');
    if (toucheF.capacites > 0) {
      problemes.push(`F a declenche la capacite ${toucheF.capacites} fois :`
        + ' les deux ressources sont supposees etre separees');
    }
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) {}
  }

  if (problemes.length === 0) {
    console.log('\n  ESPACE TIRE LA CAPACITE, F TIRE LE DASH, ET ILS NE SE MELANGENT PAS.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
