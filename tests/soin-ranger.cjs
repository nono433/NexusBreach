// Verifie la nouvelle regle du Ranger : plus aucune source de soin, et un
// choix entre se soigner ou progresser a chaque fin de vague.
//
// Ce qui est verifie, et pourquoi chacune de ces lignes compte :
//   1. l amelioration "Nénithes réparateurs" n existe plus du tout ;
//   2. le Ranger a regen (soin par seconde) strictement nul ;
//   3. apres une vague, le Ranger voit DEUX options, pas trois modules ;
//   4. se soigner remet la vie au maximum et enchaîne sur la vague suivante ;
//   5. "prendre une amélioration" ouvre bien les trois cartes habituelles ;
//   6. l'Assassin n'est pas touché : il garde ses trois cartes direct.
//
// Controle negatif : les six points sont faux sur l'ancien code, et le test
// echoue. C'est ce qui le distingue d'un simple constat.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__soin.html';

// Les libelles sont compares sans accents. Un "Régénération" devient
// "regeneration", et le motif de recherche n'a plus a prevoir chaque accent :
// un accent perdu ne doit pas faire echouer un test qui mesure autre chose.
const sansAccents = (texte) => String(texte || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

(async () => {
  const source = fs.readFileSync(path.join(RACINE, 'game.js'), 'utf8');
  const problemes = [];

  // 1. Plus aucune trace du module de soin du Ranger.
  const resteSoin = /repair:\s*\{|regenPer/.test(source);
  if (resteSoin) {
    problemes.push('le Ranger a encore une amelioration de soin'
      + ' (declaration repair ou valeur regenPer)');
  }
  console.log('  1. module de soin du Ranger absent        : ' + !resteSoin);

  // 2. player.regen ne recoit plus rien du Ranger.
  const somme = source.match(/player\.regen = permanent\.regen[\s\S]{0,200};/);
  const code = somme ? somme[0] : '';
  const contributionRanger = /repair|regenPer/.test(code);
  if (contributionRanger) {
    problemes.push('player.regen recoit encore une contribution du Ranger : ' + code.trim());
  }
  console.log('  2. regen alimentee par l Assassin seul   : ' + !contributionRanger);

  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));

  let session = null;
  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 1000, hauteur: 640 });
    const pret = await session.attendre('Boolean(window.__nexus && window.__nexus.pret)', 60000);
    if (!pret) throw new Error("le jeu ne s'initialise pas");

    await session.evaluer("document.getElementById('start-button').click(); true");
    const enJeu = await session.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    if (!enJeu) throw new Error('la partie ne demarre pas');

    // On blesse le joueur : regenerer alors qu il est au maximum ne prouverait
    // rien, puisque les deux etats sont indistinguables.
    await session.evaluer('window.__nexus.blesserJoueur(0.4); true');

    const avant = await session.evaluer('window.__nexus.etatSoin()');
    console.log(`  vie avant fin de vague : ${Math.round(avant.vie)} / ${Math.round(avant.vieMax)}`);
    if (avant.vie >= avant.vieMax) {
      problemes.push('le joueur n a pas ete blesse : le test ne prouverait rien');
    }
    if (avant.regen !== 0) {
      problemes.push(`le Ranger a encore une regeneration passive : ${avant.regen}/s`);
    }
    console.log(`  3. regeneration passive du Ranger        : ${avant.regen}/s`);

    await session.evaluer('window.__nexus.terminerVague(); true');
    const ecran = await session.evaluer(`(() => ({
      titre: (document.getElementById('upgrade-title') || {}).textContent || '',
      pied: (document.getElementById('upgrade-footer') || {}).textContent || '',
      cartes: Array.from(document.querySelectorAll('#upgrade-options button')).map((b) => ({
        index: ((b.querySelector('.card-index') || {}).textContent || '').trim(),
        titre: ((b.querySelector('h3') || {}).textContent || '').trim()
      }))
    }))()`);
    console.log(`  4. ecran de fin de vague : ${ecran.cartes.length} carte(s)`);
    ecran.cartes.forEach((c) => console.log(`       ${c.index}  ->  ${c.titre}`));

    if (ecran.cartes.length !== 2) {
      problemes.push('le Ranger devrait voir 2 options, il en voit ' + ecran.cartes.length);
    }
    const soin = ecran.cartes.find((c) => /regeneration/i.test(sansAccents(c.titre)));
    const module = ecran.cartes.find((c) => /amelioration/i.test(sansAccents(c.titre)));
    if (!soin) problemes.push("l'option de regeneration est absente de l'ecran");
    if (!module) problemes.push("l'option d'amelioration est absente de l'ecran");
    if (!/EXCLUENT|OU L.AUTRE/i.test(sansAccents(ecran.pied).toUpperCase())) {
      problemes.push('le pied de page ne dit pas que les options s excluent : "'
        + ecran.pied + '"');
    }

    // 5. Prendre une amelioration ouvre les trois cartes habituelles.
    if (module) {
      await session.evaluer(`(() => {
        const b = Array.from(document.querySelectorAll('#upgrade-options button'))
          .find((x) => {
            const t = (x.querySelector('h3') || {}).textContent || '';
            return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
              .indexOf('amelioration') >= 0;
          });
        b.click();
        return true;
      })()`);
      await attendre(300);
      const cartes = await session.evaluer(`(() => {
        const sansA = (t) => (t || '').normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return {
          titre: sansA((document.getElementById('upgrade-title') || {}).textContent),
          pied: sansA((document.getElementById('upgrade-footer') || {}).textContent),
          n: document.querySelectorAll('#upgrade-options button').length,
          estSoin: Array.from(document.querySelectorAll('#upgrade-options button'))
            .some((b) => sansA((b.querySelector('h3') || {}).textContent)
              .indexOf('regeneration') >= 0)
        };
      })()`);
      console.log(`  5. apres "prendre une amelioration" : ${cartes.n} carte(s),`
        + ` option de soin encore presente : ${cartes.estSoin}`);
      if (cartes.n !== 3) {
        problemes.push('l ecran d amelioration ne montre pas 3 cartes mais ' + cartes.n);
      }
      if (cartes.estSoin) {
        problemes.push("l'option de soin est encore proposee apres avoir choisi"
          + " l'amelioration : les deux options ne s'excluent pas");
      }
      if (/progressez/.test(cartes.titre)) {
        problemes.push('le titre reste celui de l ecran binaire : '
          + cartes.titre + ' (les options ne se remettent pas a zero)');
      }

      // La vie ne doit pas avoir bouge : c est le prix de l amelioration.
      const apres = await session.evaluer('window.__nexus.etatSoin()');
      console.log(`     vie apres : ${Math.round(apres.vie)} / ${Math.round(apres.vieMax)}`
        + ' (le soin n etait pas choisi)');
      if (apres.vie > avant.vie + 0.5) {
        problemes.push('la vie a monte en choisissant une amelioration : '
          + Math.round(apres.vie) + ' au lieu de ' + Math.round(avant.vie));
      }

      // On installe le module pour revenir en jeu, puis on re-blesse et on
      // prend l'autre chemin : la regeneration.
      await session.evaluer(`(() => {
        const b = document.querySelector('#upgrade-options button');
        if (b) b.click();
        return true;
      })()`);
      await attendre(400);
      await session.evaluer('window.__nexus.blesserJoueur(0.3); true');
      await session.evaluer('window.__nexus.terminerVague(); true');
      await attendre(200);

      const choix = await session.evaluer(`(() => {
        const sansA = (t) => (t || '').normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const b = Array.from(document.querySelectorAll('#upgrade-options button'))
          .find((x) => sansA((x.querySelector('h3') || {}).textContent)
            .indexOf('regeneration') >= 0);
        if (!b) return { erreur: 'option de regeneration absente au second passage' };
        b.click();
        return { ok: true };
      })()`);
      if (choix.erreur) problemes.push(choix.erreur);
      else {
        await attendre(300);
        const final = await session.evaluer(`({
          soin: window.__nexus.etatSoin(),
          ecran: document.getElementById('upgrade-screen').classList.contains('active')
        })`);
        console.log(`  6. regeneration choisie : vie ${Math.round(final.soin.vie)}`
          + ` / ${Math.round(final.soin.vieMax)}, ecran encore ouvert : ${final.ecran}`);
        if (final.soin.vie < final.soin.vieMax - 0.5) {
          problemes.push('la regeneration n a pas remis la vie au maximum : '
            + Math.round(final.soin.vie) + ' / ' + Math.round(final.soin.vieMax));
        }
        if (final.ecran) {
          problemes.push("l'ecran de fin de vague est toujours ouvert apres la regeneration");
        }
      }
    }
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
  }

  // 7. L'Assassin n'est pas touche : il garde ses trois cartes direct, et
  // aucune option de regeneration a la place. Une session separee, parce
  // qu'une partie ne peut pas changer de classe en cours de vague.
  let sessionAssassin = null;
  try {
    sessionAssassin = await ouvrir(PAGE, RACINE, { largeur: 1000, hauteur: 640 });
    // La session est neuve : l'Assassin n'est pas possede et coute 2 500 CR.
    // Sans credits, sa carte de boutique est desactivee et le clic ne fait rien,
    // ce qui ressemblerait a un bug du jeu.
    //
    // Les credits sont ecrits AVANT que le jeu ne lise son stockage. Une
    // ecriture apres coup se fait ecraser par le profil que le jeu enregistre
    // au premier chargement, et le resultat devient intermittent.
    await sessionAssassin.preparerStockage({ 'nexus-breach-credits': '999999' });
    await sessionAssassin.attendre(
      'Boolean(window.__nexus && window.__nexus.pret)', 60000);
    await sessionAssassin.evaluer(`(() => {
      document.getElementById('shop-button').click();
      const carte = Array.from(document.querySelectorAll('#shop-classes .class-item'))
        .find((c) => (c.querySelector('h3') || {}).textContent === 'Assassin');
      if (carte && !carte.disabled) carte.click();
      document.getElementById('shop-close-button').click();
      document.getElementById('start-button').click();
      return true;
    })()`);
    const enJeu = await sessionAssassin.attendre(
      "!document.getElementById('hud').classList.contains('hidden')", 30000);
    if (!enJeu) throw new Error("la partie de l'Assassin ne demarre pas");
    const classe = await sessionAssassin.evaluer('window.__nexus.etatSoin().classe');
    if (classe !== 'assassin') throw new Error('la classe Assassin n a pas ete equiptee');

    await sessionAssassin.evaluer('window.__nexus.terminerVague(); true');
    const ecranAssassin = await sessionAssassin.evaluer(`(() => {
      const sansA = (t) => (t || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return {
        n: document.querySelectorAll('#upgrade-options button').length,
        estSoin: Array.from(document.querySelectorAll('#upgrade-options button'))
          .some((b) => sansA((b.querySelector('h3') || {}).textContent)
            .indexOf('regeneration') >= 0),
        regen: window.__nexus.etatSoin().regen
      };
    })()`);
    console.log(`  7. Assassin : ${ecranAssassin.n} carte(s),`
      + ` option de soin presente : ${ecranAssassin.estSoin},`
      + ` regen ${ecranAssassin.regen}/s`);
    if (ecranAssassin.n !== 3) {
      problemes.push("l'Assassin ne voit plus ses 3 cartes mais " + ecranAssassin.n);
    }
    if (ecranAssassin.estSoin) {
      problemes.push("l'Assassin voit une option de regeneration :"
        + " le choix etait limite au Ranger");
    }
  } catch (e) {
    problemes.push("classe Assassin : " + e.message);
  } finally {
    if (sessionAssassin) await sessionAssassin.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) {}
  }

  if (problemes.length === 0) {
    console.log('\n  LE RANGER N A PLUS AUCUN SOIN, ET LE CHOIX EST REEL.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
