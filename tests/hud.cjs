// Detecte les collisions entre blocs du HUD, en mode bureau et en mode
// tactile. Format 900x430 : c'est la taille d'un telephone en paysage, la
// seule ou les deux dispositions (bureau / tactile) doivent tenir.
//
// Les blocs compares sont des freres, jamais un parent avec son enfant : le
// HUD est en position fixed, ses conteneurs englobent donc volontairement
// leurs enfants et une comparaison parent/enfant signalerait toujours un
// faux positif.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5097;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-hud');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const TACTILE = process.argv.includes('--tactile');
let done = false;
let report = null;

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/rapport') {
    let body = '';
    request.on('data', (c) => { body += c; });
    request.on('end', () => { try { report = JSON.parse(body); } catch (e) { report = { erreur: body.slice(0, 300) }; } done = true; response.writeHead(204).end(); });
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

// Paires de blocs qui ne doivent jamais se toucher ni se chevaucher.
const PAIRS = [
  ['.sector-block', '.wave-readout'],
  ['.wave-readout', '.threat-readout'],
  ['.threat-readout', '.credits-readout'],
  ['.health-panel', '.ammo-panel'],
  ['.controls-hint', '.health-panel'],
  ['.controls-hint', '.ammo-panel'],
  ['#touch-pause', '.credits-readout'],
  ['.touch-actions', '.ammo-panel'],
  ['.touch-actions', '.health-panel'],
  ['.health-panel', '.sector-block']
];

server.listen(PORT, '127.0.0.1', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const paires = JSON.stringify(PAIRS);
  const collector = `<script>
  window.__log = [];
  window.addEventListener('error', function (e) { window.__log.push('ERREUR: ' + (e.message||e)); });
  var d = document;
  var PAIRS = ${paires};

  // Mesurer la boite d'un conteneur ne sert a rien : un element de grille est
  // etire sur toute sa cellule, donc deux freres voisins se touchent toujours
  // alors que leurs libelles sont separes de plusieurs pixels. On mesure donc
  // ce qui est reellement peint : la boite si l'element a un fond ou une
  // bordure (bouton, panneau), le texte seul sinon (libelle, chiffre).
  function inkBox(e) {
    var union = null;
    var walker = d.createTreeWalker(e, 4);
    var n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      var ps = d.defaultView.getComputedStyle(n.parentNode);
      if (ps.display === 'none' || ps.visibility === 'hidden') continue;
      var rg = d.createRange();
      rg.selectNode(n);
      var r = rg.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      union = union
        ? { left: Math.min(union.left, r.left), right: Math.max(union.right, r.right), top: Math.min(union.top, r.top), bottom: Math.max(union.bottom, r.bottom) }
        : { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }
    return union;
  }
  function mesure(sel) {
    var e = d.querySelector(sel);
    if (!e) return null;
    var cs = d.defaultView.getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    var r = e.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    var bg = cs.backgroundColor;
    var sansFond = !bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)';
    var bord = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderLeftWidth) || 0) > 0;
    if (!sansFond || bord) return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, mode: 'boite' };
    var encre = inkBox(e);
    return encre ? { left: encre.left, right: encre.right, top: encre.top, bottom: encre.bottom, mode: 'texte' } : null;
  }
  function mesurer() {
    var problemes = [];
    var manquant = [];
    var detail = [];
    for (var i = 0; i < PAIRS.length; i++) {
      var a = mesure(PAIRS[i][0]);
      var b = mesure(PAIRS[i][1]);
      var boites = {
        a: a ? [Math.round(a.left), Math.round(a.top), Math.round(a.right), Math.round(a.bottom), a.mode] : null,
        b: b ? [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom), b.mode] : null
      };
      detail.push({ paire: PAIRS[i].join(' / '), boites: boites });
      if (!a || !b) { manquant.push(PAIRS[i].join(' / ')); continue; }
      var dx = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      var dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (dx > 1 && dy > 1) {
        problemes.push({ paire: PAIRS[i].join(' / '), type: 'CHEVAUCHEMENT', dx: Math.round(dx), dy: Math.round(dy), modes: a.mode + '/' + b.mode });
      }
    }
    return { problemes: problemes, manquant: manquant, detail: detail, largeur: d.documentElement.clientWidth, hauteur: d.documentElement.clientHeight };
  }
  var n = 0;
  function step() {
    n += 1;
    var h = d.getElementById('hud');
    if (!h || h.classList.contains('hidden')) {
      d.getElementById('start-button').click();
      if (n < 200) requestAnimationFrame(step);
      return;
    }
    if (n < 25) { requestAnimationFrame(step); return; }
    fetch('/rapport', { method: 'POST', body: JSON.stringify({ resultat: mesurer(), erreurs: window.__log }) });
  }
  requestAnimationFrame(step);
  </script>`;
  const html = index.replace('<script type="module"', collector + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__smoke.html'), html);

  const url = `http://127.0.0.1:${PORT}/__smoke.html${TACTILE ? '?tactile=1' : ''}`;
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=900,430', '--user-data-dir=' + PROFILE, url], { stdio: ['ignore', 'ignore', 'ignore'] });
  const killer = setTimeout(() => { if (!done) { console.log('Delai depasse.'); finish(); } }, 150000);
  function finish() {
    clearTimeout(killer);
    try { edge.kill('SIGKILL'); } catch (e) {}
    const mode = TACTILE ? 'TACTILE (paysage)' : 'BUREAU';
    if (report && report.resultat) {
      const r = report.resultat;
      console.log(`--- ${mode} : ${r.largeur}x${r.hauteur} ---`);
      if (r.manquant.length) console.log('  absents (non applicables) :', r.manquant.join(', '));
      if (r.problemes.length === 0) console.log('  aucun chevauchement, aucun bloc colle.');
      else {
        console.log(`  ${r.problemes.length} PROBLEME(S) :`);
        r.problemes.forEach((p) => console.log('   ', JSON.stringify(p)));
      }
      if (process.argv.includes('--detail') && r.detail) {
        console.log('  detail des boites [gauche, haut, droite, bas, mode] :');
        r.detail.forEach((x) => console.log(`    ${x.paire}\n       a=${JSON.stringify(x.boites.a)}\n       b=${JSON.stringify(x.boites.b)}`));
      }
      if (report.erreurs && report.erreurs.length) console.log('  erreurs JS :', JSON.stringify(report.erreurs));
    } else {
      console.log(`--- ${mode} : aucun rapport.`, report ? JSON.stringify(report).slice(0, 200) : '');
    }
    try { fs.unlinkSync(path.join(ROOT, '__smoke.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  }
  const poll = setInterval(() => { if (done) { clearInterval(poll); setTimeout(finish, 300); } }, 300);
});
