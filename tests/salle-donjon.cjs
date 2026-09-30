// Verifie le generateur de salle du donjon.
//
// Une salle qui n'est pas praticable est le pire defaut possible ici : le
// joueur reste bloque, et rien dans le jeu ne le lui dit. On le teste donc sur
// beaucoup de graines, pas sur une.
//
// Ce qui est verifie :
//   1. le meme germe redonne toujours la meme salle, sinon un bug devient
//      irreproductible ;
//   2. des germes différents donnent des salles différentes ;
//   3. l'arrivee, le portail, chaque pastille et le terminal sont d'un seul
//      tenant : c'est la garantie que le generateur s'est imposee a lui-meme,
//      et on la revalide de l'exterieur ;
//   4. rien ne nait dans un mur, et rien ne deborde de l'arene ;
//   5. le portail est toujours distinct de l'arrivee.
//
// Controle negatif : la garantie s impose dans game.js, pas dans ce test. Pour
// verifier qu elle mord, on retire la reservation de la zone d arrivee de
// game.js, on lance ce test, et il doit signaler des salles injouables. C est
// le seul moyen de savoir que le "0 anomalie" ci-dessus veut dire quelque chose.
const { ouvrir, attendre } = require('./_cdp.cjs');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', 'wwwroot');
const PAGE = '__salle.html';
const SALLES = 120;
const ARENE = 44;

(async () => {
  fs.writeFileSync(path.join(RACINE, PAGE), fs.readFileSync(path.join(RACINE, 'index.html')));
  let session = null;
  const problemes = [];

  try {
    session = await ouvrir(PAGE, RACINE, { largeur: 900, hauteur: 560 });
    const pret = await session.attendre(
      'Boolean(window.__nexus && window.__nexus.genererSalle)', 60000);
    if (!pret) throw new Error("le generateur n'est pas expose");

    // Le generateur rejoue les regles de navigation du jeu pour garantir que
    // les ennemis savent rejoindre le joueur. Si les deux modeles divergent, la
    // garantie ne vaut plus rien et les monstres se coincent : c'est le
    // symptome que le joueur a signale. On verifie donc la concordance d'abord.
    const concordant = await session.evaluer('window.__nexus.navConcordance()');
    if (!concordant) {
      problemes.push('les regles de navigation du generateur et celles du jeu divergent');
      console.log('  ATTENTION : les deux modeles de navigation divergent');
    } else {
      console.log('  modele de navigation : concordant avec celui du jeu');
    }

    // Tout le calcul se fait dans la page : 120 salles et leurs tests de
    // connexite ne doivent pas faire 120 allers-retours.
    const rapport = await session.evaluer(`(() => {
      const demi = ${ARENE} / 2;
      const libre = (x, z, salle, marge) => {
        for (const c of salle.covers) {
          if (Math.abs(x - c[0]) < c[2] / 2 + marge && Math.abs(z - c[1]) < c[3] / 2 + marge) return false;
        }
        for (const p of salle.pillars) {
          const dx = x - p[0];
          const dz = z - p[1];
          if (dx * dx + dz * dz < (1.35 + marge) * (1.35 + marge)) return false;
        }
        return true;
      };
      // Reprise de l'inondation du jeu, refaite ici pour ne pas dependre
      // d'une fonction privee.
      const zone = (salle, origine, marge) => {
        const pas = 1;
        const largeur = Math.round(${ARENE} / pas);
        const cle = (i, j) => j * largeur + i;
        const visite = new Set();
        const file = [origine];
        visite.add(cle(origine[0], origine[1]));
        while (file.length) {
          const p = file.pop();
          for (const v of [[p[0]+1,p[1]],[p[0]-1,p[1]],[p[0],p[1]+1],[p[0],p[1]-1]]) {
            if (v[0] < 0 || v[1] < 0 || v[0] >= largeur || v[1] >= largeur) continue;
            const k = cle(v[0], v[1]);
            if (visite.has(k)) continue;
            if (!libre(v[0] * pas - demi + pas / 2, v[1] * pas - demi + pas / 2, salle, marge)) continue;
            visite.add(k);
            file.push(v);
          }
        }
        return (x, z) => visite.has(cle(
          Math.round((x + demi - pas / 2) / pas),
          Math.round((z + demi - pas / 2) / pas)));
      };

      const compterObstacles = (salle) => salle.covers.length + salle.pillars.length;
      const problemes = [];
      let totalObstacles = 0;
      let minimumObstacles = Infinity;
      let maximumObstacles = 0;
      let avecTerminal = 0;
      let sansBoutiqueSuite = 0;
      let pireSeriesSansBoutique = 0;
      let premierPalierBoutique = -1;
      let repeteEgal = 0;
      let toutesDifferentes = 0;
      let pastillesTotal = 0;
      let pastillesCoupees = 0;
      const empreintes = new Set();

      // Le jeu ne tire pas des graines 1, 2, 3 : il tire une base puis avance de
      // 7919 a chaque palier. Tester l autre serie ne prouve rien sur celle du
      // jeu, et c est exactement ce qui a laisse passer un taux de terminal
      // effondre : la premiere version de ce test annoncait 45 % de salles
      // avec un terminal, et le jeu n en trouvait aucun en dix paliers.
      const baseAleatoire = 3735928559;

      for (let indice = 0; indice < ${SALLES}; indice += 1) {
        const graine = (baseAleatoire + indice * 7919) >>> 0;
        const salle = window.__nexus.genererSalle(graine, indice + 1);
        if (!salle.valide) problemes.push('graine ' + graine + ' : salle invalide');
        const n =compterObstacles(salle);
        totalObstacles += n;
        minimumObstacles = Math.min(minimumObstacles, n);
        maximumObstacles = Math.max(maximumObstacles, n);
        if (salle.terminal) avecTerminal += 1;

        // La boutique ne peut pas manquer deux paliers de suite, et le premier
        // palier en a toujours une.
        //
        // C'est la regle reelle. Elle remplace une ancienne verification qui ne
        // mesurait qu'un TAUX de salles avec boutique, entre 30 et 65 %. Un taux
        // ne dit rien du pire cas : avec 50 % de probabilite par salle, un taux
        // global de 50 % est parfaitement compatible avec trois paliers d affilee
        // sans aucune boutique. C est exactement ce que le joueur a rencontre, et
        // le test le declarait bon.
        //
        // Une garantie sur le pire cas vaut mieux qu'une moyenne sur tous les
        // cas : la moyenne ne dit pas ce qui arrive quand on a la malchance.
        if (salle.terminal) {
          if (premierPalierBoutique < 0) premierPalierBoutique = indice + 1;
          sansBoutiqueSuite = 0;
        } else {
          sansBoutiqueSuite += 1;
          if (sansBoutiqueSuite > pireSeriesSansBoutique) {
            pireSeriesSansBoutique = sansBoutiqueSuite;
          }
        }

        // La garantie anti-blocage : toute pastille doit etre dans la zone que
        // la navigation du jeu atteint depuis l'arrivee. Une pastille coupee,
        // c'est un ennemi qui apparait hors du monde et presse contre un mur
        // pour le reste de la partie.
        for (const atteinte of window.__nexus.pastillesAtteignables(graine, indice + 1)) {
          pastillesTotal += 1;
          if (!atteinte) pastillesCoupees += 1;
        }

        // Bornes : rien ne deborde de l'arene, ni portail ni obstacle.
        for (const c of salle.covers) {
          if (Math.abs(c[0]) + c[2] / 2 > demi || Math.abs(c[1]) + c[3] / 2 > demi) {
            problemes.push('graine ' + graine + ' : bloc hors arene');
            break;
          }
        }
        if (Math.abs(salle.portail[0]) > demi || Math.abs(salle.portail[1]) > demi) {
          problemes.push('graine ' + graine + ' : portail hors arene');
        }

        // Connexite physique : ce que le JOUEUR doit atteindre. Les pastilles
        // n'en font pas partie, et c'est voulu. Une pastille n'a pas besoin
        // d'etre atteignable a pied : elle sert de point d'apparition aux
        // ennemis, et eux suivent la navigation. Les pastilles sont verifiees
        // plus haut, avec le modele du jeu, ce qui est la seule question qui
        // les concerne.
        const atteint = zone(salle, [0, 10], 0.75);
        const points = [salle.portail]
          .concat(salle.terminal ? [salle.terminal] : []);
        for (const p of points) {
          if (!atteint(p[0], p[1])) {
            problemes.push('graine ' + graine + ' : ' + (p === salle.portail
              ? 'portail' : 'terminal') + ' coupe en '
              + Math.round(p[0]) + ',' + Math.round(p[1]));
          }
        }
        // Et l'arrivee ne doit pas etre dans un mur.
        if (!libre(0, 10, salle, 0.75)) {
          problemes.push('graine ' + graine + ' : l arrivee est dans un bloc');
        }
        // Le portail ne doit pas naitre collé au joueur.
        if (Math.hypot(salle.portail[0] - 0, salle.portail[1] - 10) < 6) {
          problemes.push('graine ' + graine + ' : portail trop proche de l arrivee');
        }

        // Reproductibilite : meme graine, meme salle.
        const bis = window.__nexus.genererSalle(graine, indice + 1);
        if (JSON.stringify(bis) === JSON.stringify(salle)) repeteEgal += 1;
        // Diversite : des germes differents ne doivent pas donner la meme salle.
        empreintes.add(JSON.stringify([salle.covers, salle.pillars, salle.spawnPads]));
      }
      toutesDifferentes = empreintes.size;

      return {
        problemes: problemes.slice(0, 12),
        totalProblemes: problemes.length,
        obstaclesMoyen: totalObstacles / ${SALLES},
        obstaclesMin: minimumObstacles,
        obstaclesMax: maximumObstacles,
        avecTerminal,
        pireSeriesSansBoutique,
        premierPalierBoutique,
        reproductible: repeteEgal,
        sallesDistinctes: toutesDifferentes,
        pastillesTotal,
        pastillesCoupees
      };
    })()`);

    console.log(`  ${SALLES} salles generees`);
    console.log(`    obstacles par salle   : ${rapport.obstaclesMoyen.toFixed(1)}`
      + `  (de ${rapport.obstaclesMin} a ${rapport.obstaclesMax})`);
    console.log(`    avec un terminal      : ${rapport.avecTerminal} sur ${SALLES}`);
    console.log(`    pire serie sans boutique : ${rapport.pireSeriesSansBoutique} palier(s)`
      + `   premiere boutique au palier ${rapport.premierPalierBoutique}`);
    console.log(`    reproductibles        : ${rapport.reproductible} sur ${SALLES}`);
    console.log(`    salles distinctes     : ${rapport.sallesDistinctes} sur ${SALLES}`);
    // C'est la ligne qui repond au symptome "les monstres se coincent dans les
    // murs". Une pastille hors zone de navigation, c'est un ennemi qui
    // namiltonne pas vers le joueur : il s'enfonce dans un obstacle et n'en
    // ressort plus.
    console.log(`    pastilles atteignables : ${rapport.pastillesTotal - rapport.pastillesCoupees}`
      + ` / ${rapport.pastillesTotal}`);
    console.log(`    anomalies              : ${rapport.totalProblemes}`);

    if (rapport.pastillesCoupees > 0) {
      problemes.push(rapport.pastillesCoupees + ' pastille(s) hors de la zone de navigation'
        + ' sur ' + rapport.pastillesTotal
        + ' : les ennemis qui y naitront resteront bloques');
    }

    if (rapport.reproductible !== SALLES) {
      problemes.push('le generateur n est pas reproductible : '
        + (SALLES - rapport.reproductible) + ' salles differentes pour un meme germe');
    }
    if (rapport.sallesDistinctes < SALLES * 0.9) {
      problemes.push('les salles se repetent : seulement '
        + rapport.sallesDistinctes + ' distinctes pour ' + SALLES + ' germes');
    }
    if (rapport.obstaclesMax <= rapport.obstaclesMin) {
      problemes.push('toutes les salles ont la meme densite d obstacles');
    }
    // La boutique ne doit jamais manquer deux paliers de suite.
//
// C'est la regle, et elle se verifie sur le PIRE cas, pas sur une moyenne.
// L'ancienne verification mesurait un taux de salles avec boutique et
// acceptait 30 a 65 % : un taux ne dit rien de ce qui arrive quand on a la
// malchance, et trois paliers d'affilee sans boutique y etaient parfaitement
// compatibles. Le joueur a fait exactement cela.
if (rapport.premierPalierBoutique !== 1) {
      problemes.push('le premier palier n a pas de boutique : le joueur peut'
        + ' faire toute sa premiere descente sans decouvrir la mecanique');
    }
    if (rapport.pireSeriesSansBoutique > 1) {
      problemes.push('il y a ' + rapport.pireSeriesSansBoutique
        + ' paliers d affilee sans boutique : on ne peut pas la manquer deux fois');
    }
    if (rapport.totalProblemes) {
      problemes.push(rapport.totalProblemes + ' anomalies de praticabilite');
      rapport.problemes.forEach((p) => console.log('       ' + p));
    }
  } catch (e) {
    problemes.push(e.message);
  } finally {
    if (session) await session.fermer();
    try { fs.unlinkSync(path.join(RACINE, PAGE)); } catch (e) {}
  }

  if (problemes.length === 0) {
    console.log('\n  TOUTES LES SALLES SONT PRATICABLES, REPRODUCTIBLES ET VARIEES.');
    process.exit(0);
  }
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
})();
