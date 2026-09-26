// Test dedie a la classe Assassin : il a ses propres armes, capacites,
// ameliorations et modules d'atelier. Ce test verifie que la separation est
// reelle et que la melee fonctionne (frappe, dash, capacites).
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5059;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-assassin');
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
  var etapes = [];
  function note(tag, extra) { etapes.push(Object.assign({ etape: tag }, extra || {})); }

  // Profil complet : credits, classe Assassin, toutes les armes/capacites
  // possedees. On veut tester les valeurs, pas l'economie.
  localStorage.setItem('nexus-breach-classes', JSON.stringify({ assassin: true }));
  localStorage.setItem('nexus-breach-equipped-class', 'assassin');
  localStorage.setItem('nexus-breach-credits', '999999');
  localStorage.setItem('nexus-breach-weapons', JSON.stringify({ twinSabers: true, heavySaber: true, twinFang: true, shuriken: true, shadowStep: true }));
  localStorage.setItem('nexus-breach-equipped-weapon', 'twinSabers');
  localStorage.setItem('nexus-breach-abilities', JSON.stringify({ shadowStep: true, shadowVeilField: true, shadowRiptide: true, shadowHourglass: true }));
  localStorage.setItem('nexus-breach-equipped-ability', 'shadowStep');
  localStorage.setItem('nexus-breach-equipment', JSON.stringify({ reinforcedCore: 2, neuralShield: 1, bladeEdge: 1, tendonSurge: 1, bloodPact: 1 }));

  var phase = 0, frames = 0;
  function posture() {
    return {
      arme: d.getElementById('weapon-name').textContent,
      classe: (d.querySelector('.class-button.active strong') || {}).textContent,
      capacite: d.getElementById('ability-name').textContent,
      vie: d.getElementById('health-value').textContent,
      hint: (d.getElementById('ability-hint') || {}).textContent
    };
  }
  function step() {
    frames += 1;
    if (phase === 0 && frames === 12) {
      note('menu-assassin', posture());
      // Ouuvre l'atelier pour verifier le contenu filtre par classe
      d.getElementById('shop-button').click();
      phase = 1;
    } else if (phase === 1 && frames === 20) {
      var shopArmes = Array.from(d.querySelectorAll('#shop-weapons h3')).map(function (n) { return n.textContent; });
      var shopCaps = Array.from(d.querySelectorAll('#shop-abilities h3')).map(function (n) { return n.textContent; });
      var shopMods = Array.from(d.querySelectorAll('#shop-items h3')).map(function (n) { return n.textContent; });
      note('atelier', {
        armes: shopArmes.join(' | '),
        capacites: shopCaps.join(' | '),
        modules: shopMods.join(' | '),
        compteur: d.getElementById('shop-owned-count').textContent
      });
      d.getElementById('shop-close-button').click();
      phase = 2;
    } else if (phase === 2 && frames === 30) {
      d.getElementById('start-button').click();
      phase = 3;
      note('partie-lancee', posture());
    } else if (phase === 3 && frames === 40) {
      // Frappe melee : on maintient le clic
      var c = d.getElementById('game-canvas');
      c.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      phase = 4;
    } else if (phase === 4 && frames === 120) {
      d.getElementById('game-canvas').dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
      note('apres-frappes', { arme: d.getElementById('weapon-name').textContent, vie: d.getElementById('health-value').textContent });
      phase = 5;
    } else if (phase === 5 && frames === 130) {
      // Dash + capacite
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
      phase = 6;
    } else if (phase === 6 && frames === 150) {
      note('apres-dash', { vie: d.getElementById('health-value').textContent });
      phase = 7;
    } else if (phase === 7 && frames === 200) {
      // Change d'arme melee : la grande lame
      d.getElementById('shop-button') && d.getElementById('pause-quit') ;
      phase = 8;
    } else if (phase === 8 && frames === 210) {
      fetch('/rapport', { method: 'POST', body: JSON.stringify({ frames: frames, erreurs: window.__log, etapes: etapes }) });
      phase = 9;
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  </script>`;
  const html = index.replace('<script type="module"', collector + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__smoke.html'), html);

  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,720', '--user-data-dir=' + PROFILE, `http://127.0.0.1:${PORT}/__smoke.html`], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  edge.stderr.on('data', (c) => { stderr += c.toString(); });
  const killer = setTimeout(() => { if (!done) { console.log('Delai depasse.'); finish(); } }, 240000);
  function finish() {
    clearTimeout(killer);
    try { edge.kill('SIGKILL'); } catch (e) {}
    if (report) {
      console.log('erreurs :', JSON.stringify(report.erreurs));
      for (const e of report.etapes) { console.log('\n' + e.etape); for (const k of Object.keys(e)) { if (k !== 'etape') console.log('   ' + k + ' : ' + e[k]); } }
    } else console.log('Aucun rapport.');
    const notable = stderr.split('\n').filter((l) => /uncaught|javascript/i.test(l));
    if (notable.length) console.log(notable.slice(0, 10).join('\n'));
    try { fs.unlinkSync(path.join(ROOT, '__smoke.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  }
  const poll = setInterval(() => { if (done) { clearInterval(poll); setTimeout(finish, 200); } }, 300);
});

