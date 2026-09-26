// Reproduit le cas qui faisait planter le jeu : une sauvegarde anterieure au
// split des classes, qui porte une arme de l'autre classe.
//
// Tous les autres tests demarrent sur une sauvegarde vierge, donc la
// reconciliation ne s'execute jamais et le defaut passait inaperçu. Ce test
// plante le stockage local AVANT le chargement du jeu, avec plusieurs
// combinaisons d'arme et de classe, y compris celles que le joueur a
// reellement obtenues en jouant avant le split.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5106;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-sauvegarde-ancienne');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

// Toute la matrice arme x classe. La reconciliation ne s'execute que si le
// desaccord survit a la lecture de la sauvegarde : tester un seul couple
// laisse passer le cas que l'on cherche, comme cela m'est arrive une premiere
// fois.
const CAS = [
  { nom: 'pulse / ranger', arme: 'pulse', classe: 'ranger' },
  { nom: 'pulse / assassin', arme: 'pulse', classe: 'assassin' },
  { nom: 'twinSabers / assassin', arme: 'twinSabers', classe: 'assassin' },
  { nom: 'twinSabers / ranger', arme: 'twinSabers', classe: 'ranger' },
  { nom: 'rail / assassin', arme: 'rail', classe: 'assassin' },
  { nom: 'katana / ranger', arme: 'katana', classe: 'ranger' },
  { nom: 'inconnue / assassin', arme: 'vieilleArme', classe: 'assassin' }
];

let done = false;
let report = null;
let indexCourant = 0;

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/rapport') {
    let body = '';
    request.on('data', (c) => { body += c; });
    request.on('end', () => { try { report = JSON.parse(body); } catch (e) { report = { erreur: body.slice(0, 300) }; } done = true; response.writeHead(204).end(); });
    return;
  }
  const relative = decodeURIComponent((request.url || '/').split('?')[0]);
  // --avant sert une version ou la declaration est replacée apres son usage,
  // comme elle l'etait. Sans ce controle negatif, on ne peut pas affirmer que
  // le test detecte le defaut qu'il pretend couvrir. La transformation est
  // verifiee par tests/ordre-declaration.cjs.
  if (relative === '/game.js' && process.argv.includes('--avant')) {
    const { texte } = require('./ordre-declaration.cjs').remettrePlusBas(fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8'));
    return response.writeHead(200, { 'Content-Type': MIME['.js'] }).end(texte);
  }
  const filePath = path.join(ROOT, relative === '/' ? '__smoke.html' : relative);
  let data = null;
  try { data = fs.readFileSync(filePath); } catch (e) { data = null; }
  if (!data) return response.writeHead(404).end('404');
  response.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  response.end(data);
});

server.listen(PORT, '127.0.0.1', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const cas = JSON.stringify(CAS);
  const corps = (indexCas) => `<script>
  // La sauvegarde doit etre ecrite AVANT que le jeu ne la lise. Ce script
  // est injecte avant le module, et le module ne s'execute qu'apres, donc
  // l'ordre est garanti.
  var CAS = ${cas};
  var index = ${indexCas};
  try {
    // Les vraies cles de STORAGE_KEYS, et non des noms devines : une
    // mauvaise cle n'ecrirait rien et le test passerait a vide.
    localStorage.setItem('nexus-breach-equipped-weapon', CAS[index].arme);
    localStorage.setItem('nexus-breach-equipped-class', CAS[index].classe);
    localStorage.setItem('nexus-breach-classes', JSON.stringify([CAS[index].classe]));
    localStorage.setItem('nexus-breach-weapons', JSON.stringify([CAS[index].arme]));
  } catch (e) {}
  window.addEventListener('error', function (e) { window.__log = window.__log || []; window.__log.push('ERREUR: ' + (e.message || e)); });

  // setTimeout et non requestAnimationFrame : quand le module meurt a
  // l'evaluation, plus rien ne pilote les images en headless et la mesure ne
  // partirait jamais. C'est precisement l'etat que ce test cherche a voir.
  setTimeout(function () {
    var ecran = document.getElementById('loading-screen');
    fetch('/rapport', {
      method: 'POST',
      body: JSON.stringify({
        chargementTermine: Boolean(ecran && ecran.classList.contains('done')),
        pret: Boolean(window.__nexus && window.__nexus.pret),
        erreurs: (window.__nexus && window.__nexus.erreurs) || [],
        jsErreurs: window.__log || []
      })
    });
  }, 12000);
  </script>`;

  let resultats = [];
  let indexCasCourant = 0;

  function lancerUn(indexCas) {
    return new Promise((resoudre) => {
      done = false;
      report = null;
      const html = index.replace('<script type="module"', corps(indexCas) + '\n  <script type="module"');
      fs.writeFileSync(path.join(ROOT, '__smoke.html'), html);
      const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--virtual-time-budget=30000', '--window-size=800,500', '--user-data-dir=' + PROFILE, `http://127.0.0.1:${PORT}/__smoke.html`], { stdio: ['ignore', 'ignore', 'ignore'] });
      const killer = setTimeout(() => { if (!done) { done = true; try { edge.kill('SIGKILL'); } catch (e) {} resoudre(null); } }, 150000);
      const poll = setInterval(() => {
        if (!done) return;
        clearInterval(poll);
        clearTimeout(killer);
        try { edge.kill('SIGKILL'); } catch (e) {}
        resoudre(report);
      }, 250);
    });
  }

  (async () => {
    for (indexCasCourant = 0; indexCasCourant < CAS.length; indexCasCourant += 1) {
      const r = await lancerUn(indexCasCourant);
      const nom = CAS[indexCasCourant].nom;
      if (!r) { resultats.push({ nom, ok: false, detail: 'aucun rapport' }); continue; }
      const ok = r.chargementTermine && r.pret && (!r.erreurs || r.erreurs.length === 0) && (!r.jsErreurs || r.jsErreurs.length === 0);
      resultats.push({
        nom,
        ok,
        chargement: r.chargementTermine,
        erreurs: (r.erreurs || []).concat(r.jsErreurs || [])
      });
    }
    try { fs.unlinkSync(path.join(ROOT, '__smoke.html')); } catch (e) {}

    console.log(`  ${CAS.length} combinaisons arme x classe :`);
    let echecs = 0;
    for (const r of resultats) {
      if (!r.ok) echecs += 1;
      console.log(`   ${r.ok ? 'OK   ' : 'ECHEC'} ${r.nom}`);
      if (r.erreurs && r.erreurs.length) console.log(`          ${JSON.stringify(r.erreurs).slice(0, 200)}`);
    }
    console.log(`\n  ${echecs === 0 ? 'AUCUNE COMBINAISON NE BLOQUE LE CHARGEMENT.' : echecs + ' COMBINAISON(S) EN ECHEC.'}`);
    server.close();
    process.exit(echecs === 0 ? 0 : 1);
  })();
});
