// Capture les erreurs JavaScript reelles au demarrage, en mode ordinateur.
// Le rapport est ecrit DANS la page puis lu sur la capture : c'est la seule
// methode qui a fonctionne ici (les rapports par requete echouaient, les
// timers n'avancant pas en headless hors budget de temps virtuel).
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5104;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-diagnostic-pc');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const largeur = Number(process.argv[2] || 1280);
const hauteur = Number(process.argv[3] || 800);
const sortie = path.join(__dirname, '..', 'tests', 'diagnostic-pc.png');

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent((request.url || '/').split('?')[0]);
  const filePath = path.join(ROOT, relative === '/' ? '__smoke.html' : relative);
  let data = null;
  try { data = fs.readFileSync(filePath); } catch (e) { data = null; }
  if (!data) return response.writeHead(404).end('404');
  response.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  response.end(data);
});

server.listen(PORT, '127.0.0.1', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const collecteur = `<script>
  // Ce script s'execute AVANT le module du jeu : on intercepte tout.
  var journal = [];
  var t0 = Date.now();
  function horodatage() { return (Date.now() - t0) + 'ms'; }
  function noter(niveau, texte) {
    journal.push(niveau + ' [' + horodatage() + '] ' + texte);
  }
  window.__erreurs = journal;
  window.addEventListener('error', function (e) {
    var cible = e.target && e.target !== window ? (e.target.tagName || '?') + (e.target.src || '') : '';
    noter('ERREUR', (e.message || e) + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno + (cible ? ' [' + cible + ']' : ''));
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    noter('REJET', (r && (r.message || r.stack)) ? (r.message || r.stack) : String(r));
  });
  var erreurConsole = console.error;
  console.error = function () { noter('console.error', Array.prototype.join.call(arguments, ' ')); erreurConsole.apply(console, arguments); };
  var avertConsole = console.warn;
  console.warn = function () { noter('console.warn', Array.prototype.join.call(arguments, ' ')); avertConsole.apply(console, arguments); };

  var d = document, n = 0;
  function rapport(titre) {
    var lignes = ['=== ' + titre + ' ===', 'viewport ' + d.documentElement.clientWidth + 'x' + d.documentElement.clientHeight];
    var canvas = d.getElementById('game-canvas');
    lignes.push('canvas present : ' + Boolean(canvas) + (canvas ? ' (' + canvas.width + 'x' + canvas.height + ')' : ''));
    var ecran = d.getElementById('loading-screen');
    lignes.push('ecran chargement actif : ' + Boolean(ecran && ecran.classList.contains('active')));
    var menu = d.getElementById('menu-screen');
    lignes.push('menu actif : ' + Boolean(menu && menu.classList.contains('active')));
    var hud = d.getElementById('hud');
    lignes.push('HUD present : ' + Boolean(hud) + ' / cache : ' + Boolean(hud && hud.classList.contains('hidden')));
    lignes.push('classes racine : "' + d.documentElement.className + '"');
    var couche = d.getElementById('touch-layer');
    if (couche) lignes.push('couche tactile display : ' + d.defaultView.getComputedStyle(couche).display);
    var rot = d.getElementById('rotate-hint');
    if (rot) lignes.push('ecran rotation display : ' + d.defaultView.getComputedStyle(rot).display);
    var webgl = null;
    try { webgl = Boolean(d.createElement('canvas').getContext('webgl2') || d.createElement('canvas').getContext('webgl')); } catch (e) { webgl = false; }
    lignes.push('WebGL disponible : ' + webgl);
    lignes.push('--- ' + journal.length + ' message(s) ---');
    lignes = lignes.concat(journal.slice(0, 25));
    if (journal.length === 0) lignes.push('AUCUNE ERREUR JS');
    var box = d.createElement('pre');
    box.textContent = lignes.join('\\n');
    box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:999999;margin:0;padding:12px;background:#000;color:#0f0;font:12px/1.45 monospace;white-space:pre-wrap;word-break:break-all;overflow:auto;border:3px solid #ff0';
    d.body.appendChild(box);
  }
  function etape() {
    n += 1;
    if (n === 40) {
      // On tente de demarrer, comme le joueur.
      var b = d.getElementById('start-button');
      if (b) b.click();
    }
    if (n === 120) { rapport('APRES CLIC DEMARRER'); return; }
    if (n < 200) requestAnimationFrame(etape);
  }
  requestAnimationFrame(etape);
  </script>`;
  const html = index.replace('<script type="module"', collecteur + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__smoke.html'), html);

  fs.rmSync(sortie, { force: true });
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--virtual-time-budget=40000',
    `--screenshot=${sortie}`, `--window-size=${largeur},${hauteur}`,
    `--user-data-dir=${PROFILE}`,
    `http://127.0.0.1:${PORT}/__smoke.html`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  edge.stderr.on('data', (c) => { stderr += c.toString(); });
  const killer = setTimeout(() => { try { edge.kill('SIGKILL'); } catch (e) {} }, 150000);
  edge.on('close', () => {
    clearTimeout(killer);
    if (fs.existsSync(sortie)) console.log('  capture :', sortie, fs.statSync(sortie).size, 'octets');
    else { console.log('  pas de capture'); const f = stderr.split('\n').filter((l) => l.trim() && !/GPU|gl_|Fontconfig|swiftshader|fallback_task|DEPRECATED|SwiftShader|voice/i.test(l)); if (f.length) console.log(f.slice(0, 6).join('\n')); }
    try { fs.unlinkSync(path.join(ROOT, '__smoke.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  });
});
