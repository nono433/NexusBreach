// Verifie le gardien de demarrage dans les DEUX sens :
//  - quand tout va bien, aucun panneau d'erreur ne doit apparaître ;
//  - quand game.js est casse, le panneau doit s'afficher avec une cause
//    explicite, au lieu de laisser l'ecran de chargement tourner en silence.
// Le second cas est exactement le symptome signale : un module qui ne
// s'execute pas laissait un chargement infini sans aucun message.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5105;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-garde-fonction');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
let done = false;
let report = null;

// game.js casse : le module ne sera pas execute, ce qui reproduit le symptome.
// Actif avec --casser.
const CASSER = process.argv.includes('--casser');

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/rapport') {
    let body = '';
    request.on('data', (c) => { body += c; });
    request.on('end', () => { try { report = JSON.parse(body); } catch (e) { report = { erreur: body.slice(0, 300) }; } done = true; response.writeHead(204).end(); });
    return;
  }
  const relative = decodeURIComponent((request.url || '/').split('?')[0]);
  if (relative === '/game.js' && CASSER) {
    // Erreur de parse : le module est telecharge mais ne s'execute pas.
    return response.writeHead(200, { 'Content-Type': MIME['.js'] }).end('const x = ;\nfunction (){\n');
  }
  const filePath = path.join(ROOT, relative === '/' ? 'index.html' : relative);
  let data = null;
  try { data = fs.readFileSync(filePath); } catch (e) { data = null; }
  if (!data) return response.writeHead(404).end('404');
  response.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  response.end(data);
});

server.listen(PORT, '127.0.0.1', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // Le collecteur attend le temps necessaire au gardien (9 s) puis interroge
  // l'etat. requestAnimationFrame suffit : le jeu fait tourner la boucle.
  const collecteur = `<script>
  window.addEventListener('error', function () {});
  var d = document, n = 0;
  function etat() {
    var ecran = d.getElementById('loading-screen');
    var termine = ecran && ecran.classList.contains('done');
    var texte = ecran ? ecran.textContent.replace(/\\s+/g, ' ').trim().slice(0, 200) : '(absent)';
    var menu = d.getElementById('menu-screen');
    return {
      chargementTermine: Boolean(termine),
      moduleTouche: Boolean(window.__nexus && window.__nexus.moduleTouched) || Boolean(window.__nexus && window.__nexus.moduleTouche),
      pret: Boolean(window.__nexus && window.__nexus.pret),
      erreurs: (window.__nexus && window.__nexus.erreurs) || [],
      texteEcran: texte,
      menuActif: Boolean(menu && menu.classList.contains('active'))
    };
  }
  // setTimeout et non requestAnimationFrame : quand game.js ne s'execute pas,
  // plus rien ne pilote requestAnimationFrame en headless, et la mesure ne
  // partirait jamais. Le budget de temps virtuel fait avancer les minuteries.
  setTimeout(function () {
    fetch('/rapport', { method: 'POST', body: JSON.stringify({ etat: etat() }) });
  }, 12000);
  </script>`;
  const html = index.replace('<script type="module"', collecteur + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__smoke.html'), html);

  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--virtual-time-budget=30000', '--window-size=800,500', '--user-data-dir=' + PROFILE, `http://127.0.0.1:${PORT}/__smoke.html`], { stdio: ['ignore', 'ignore', 'ignore'] });
  const killer = setTimeout(() => { if (!done) { console.log('Delai depasse.'); finish(); } }, 180000);
  function finish() {
    clearTimeout(killer);
    try { edge.kill('SIGKILL'); } catch (e) {}
    if (report && report.etat) {
      const e = report.etat;
      console.log(`  chargement termine   : ${e.chargementTermine}`);
      console.log(`  module touche       : ${e.moduleTouche}`);
      console.log(`  pret                : ${e.pret}`);
      console.log(`  menu actif          : ${e.menuActif}`);
      console.log(`  erreurs             : ${JSON.stringify(e.erreurs).slice(0, 300)}`);
      console.log(`  texte ecran         : ${e.texteEcran.slice(0, 160)}`);
    } else {
      console.log('  aucun rapport :', report ? JSON.stringify(report).slice(0, 200) : 'rien');
    }
    try { fs.unlinkSync(path.join(ROOT, '__smoke.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  }
  const poll = setInterval(() => { if (done) { clearInterval(poll); setTimeout(finish, 400); } }, 300);
});
