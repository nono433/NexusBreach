// Capture des commandes tactiles en jeu, pour verifier visuellement le
// joystick flottant, les boutons et le HUD sur un ecran de telephone.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5095;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-tactile-shot');
const SHOT = path.join(__dirname, '..', 'tests', 'capture-tactile.png');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer((request, response) => {
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
  window.addEventListener('error', function (e) { window.__log.push('ERREUR: ' + (e.message||e)); });
  localStorage.setItem('nexus-breach-credits', '99999');
  var d = document, n = 0;
  function pointeur(type, id, x, y) {
    d.getElementById('game-canvas').dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true
    }));
  }
  // Drapeaux a usage unique : tester une frame exacte echoue des que le
  // nombre de frames a change, ce qui faisait sauter le joystick.
  var fait = { stick: false, look: false, glisse: false };
  function etape() {
    n += 1;
    if (!d.getElementById('hud') || d.getElementById('hud').classList.contains('hidden')) {
      d.getElementById('start-button').click();
      return;
    }
    if (!fait.stick) { fait.stick = true; pointeur('pointerdown', 1, 150, 340); pointeur('pointermove', 1, 205, 300); }
    if (!fait.look) { fait.look = true; pointeur('pointerdown', 2, 700, 300); }
    if (!fait.glisse) { fait.glisse = true; pointeur('pointermove', 2, 660, 288); }
    // On avance en permanence : rester immobile face a trois hostiles tue
    // avant la fin de la capture.
    if (fait.glisse) pointeur('pointermove', 1, 150, 292);
  }
  // La boucle s'arrete : sans cela la capture d'Edge ne se declenche jamais,
  // car --virtual-time-budget attend que la page se stabilise.
  function boucle() {
    etape();
    if (n < 300) requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);
  </script>`;
  const html = index.replace('<script type="module"', collector + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__tactileshot.html'), html);

  fs.rmSync(SHOT, { force: true });
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    `--screenshot=${SHOT}`, '--window-size=880,420', '--virtual-time-budget=55000',
    `--user-data-dir=${PROFILE}`, `http://127.0.0.1:${PORT}/__tactileshot.html?tactile=1`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  edge.stderr.on('data', (c) => { stderr += c.toString(); });
  const killer = setTimeout(() => { try { edge.kill('SIGKILL'); } catch (e) {} }, 120000);
  edge.on('close', () => {
    clearTimeout(killer);
    if (fs.existsSync(SHOT)) console.log('capture :', SHOT, fs.statSync(SHOT).size, 'octets');
    else { console.log('pas de capture'); const f = stderr.split('\n').filter((l) => l.trim() && !/GPU|gl_|Fontconfig|swiftshader|fallback_task|LaunchUpdate|DEPRECATED/i.test(l)); if (f.length) console.log(f.slice(0, 8).join('\n')); }
    try { fs.unlinkSync(path.join(ROOT, '__tactileshot.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  });
});


