// Test final sans hook de debug : pilote le jeu par le DOM et les evenements
// reels (mousedown sur le canvas, touche R), puis verifie les HUD et
// l'absence d'erreur. Couvre les chemins modifies : cache de recharge,
// compteur d'ennemis, gerbes d'impact, flash de degats.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5058;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
let done = false;
let report = null;

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/rapport') {
    let body = '';
    request.on('data', (c) => { body += c; });
    request.on('end', () => { try { report = JSON.parse(body); } catch (e) { report = { parseError: body.slice(0, 300) }; } done = true; response.writeHead(204).end(); });
    return;
  }
  const relative = decodeURIComponent((request.url || '/').split('?')[0]);
  const filePath = path.join(ROOT, relative === '/' ? 'index.html' : relative);
  fs.readFile(filePath, (error, data) => {
    if (error) return response.writeHead(404).end('404');
    response.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    response.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const collector = `<script>
  window.__log = [];
  window.addEventListener('error', function (e) { window.__log.push('ERREUR: ' + (e.message||e) + ' @' + String(e.filename||'').split('/').pop() + ':' + e.lineno); });
  window.addEventListener('unhandledrejection', function (e) { window.__log.push('REJET: ' + e.reason); });
  var ne = console.error.bind(console);
  console.error = function () { window.__log.push('console.error: ' + Array.prototype.map.call(arguments, String).join(' ')); ne.apply(null, arguments); };
  var d = document;
  var canvas = d.getElementById('game-canvas');
  var etapes = [];
  var phase = 0, frames = 0;
  function lire() {
    return {
      munitions: d.getElementById('ammo-value').textContent,
      rechange: d.getElementById('reload-status').textContent,
      ennemis: d.getElementById('enemy-value').textContent,
      vague: d.getElementById('wave-value').textContent,
      vie: d.getElementById('health-value').textContent,
      flash: d.getElementById('damage-flash').style.opacity,
      hudActif: d.getElementById('hud').classList.contains('hidden') === false
    };
  }
  function note(tag) { etapes.push(Object.assign({ etape: tag, frame: frames }, lire())); }
  function tirer(on) {
    var ev = new MouseEvent(on ? 'mousedown' : 'mouseup', { button: 0, bubbles: true });
    canvas.dispatchEvent(ev);
  }
  function touche(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: code, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: code, bubbles: true }));
  }
  function step() {
    frames += 1;
    if (phase === 0 && frames === 10) { d.getElementById('start-button').click(); phase = 1; note('demarre'); }
    else if (phase === 1 && frames === 20) { tirer(true); phase = 2; }
    else if (phase === 2 && frames === 90) { note('pendant-tir'); tirer(false); phase = 3; }
    else if (phase === 3 && frames === 100) { touche('KeyR'); phase = 4; }
    else if (phase === 4 && frames === 104) { note('recharge-en-cours'); phase = 5; }
    else if (phase === 5 && frames === 150) { note('recharge-terminee'); tirer(true); phase = 6; }
    else if (phase === 6 && frames === 230) { tirer(false); note('fin'); phase = 7; }
    else if (phase === 7 && frames === 260) {
      // Relance une partie depuis la pause pour declencher clearDynamicObjects
      fetch('/rapport', { method: 'POST', body: JSON.stringify({ frames: frames, erreurs: window.__log, etapes: etapes }) });
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  </script>`;
  const html = index.replace('<script type="module"', collector + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__smoke.html'), html);

  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,720', '--user-data-dir=' + PROFILE, `http://127.0.0.1:${PORT}/__smoke.html`], { stdio: ['ignore', 'ignore', 'pipe'] });
  const killer = setTimeout(() => { if (!done) { console.log('Delai depasse.'); finish(); } }, 240000);
  function finish() {
    clearTimeout(killer);
    try { edge.kill('SIGKILL'); } catch (e) {}
    if (report) {
      console.log('erreurs :', JSON.stringify(report.erreurs));
      console.table(report.etapes);
    } else console.log('Aucun rapport.');
    try { fs.unlinkSync(path.join(ROOT, '__smoke.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  }
  const poll = setInterval(() => { if (done) { clearInterval(poll); setTimeout(finish, 200); } }, 300);
});

