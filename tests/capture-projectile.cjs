// Capture le moment ou un robot arme son tir, pour verifier que le geste se
// lit. Le panneau de diagnostic indique l'image ou un projectile est en vol.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5111;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-tir-shot');
const SHOT = path.join(__dirname, '..', 'tests', 'capture-projectile.png');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent((request.url || '/').split('?')[0]);
  const filePath = path.join(ROOT, relative === '/' ? '__tirshot.html' : relative);
  let data = null;
  try { data = fs.readFileSync(filePath); } catch (e) { data = null; }
  if (!data) return response.writeHead(404).end('404');
  response.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  response.end(data);
});

server.listen(PORT, '127.0.0.1', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const collecteur = `<script>
  window.__log = [];
  window.addEventListener('error', function (e) { window.__log.push('ERREUR: ' + (e.message || e)); });
  var d = document, n = 0, debut = 0;
  function etape() {
    n += 1;
    var h = d.getElementById('hud');
    if (!h || h.classList.contains('hidden')) {
      d.getElementById('start-button').click();
      if (n < 300) requestAnimationFrame(etape);
      return;
    }
    if (debut === 0) debut = n;
    if (n - debut >= 200) { return; }
    requestAnimationFrame(etape);
  }
  requestAnimationFrame(etape);
  </script>`;
  const html = index.replace('<script type="module"', collecteur + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__tirshot.html'), html);

  fs.rmSync(SHOT, { force: true });
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--virtual-time-budget=35000',
    `--screenshot=${SHOT}`, '--window-size=900,520',
    `--user-data-dir=${PROFILE}`,
    `http://127.0.0.1:${PORT}/__tirshot.html`
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  const killer = setTimeout(() => { try { edge.kill('SIGKILL'); } catch (e) {} }, 180000);
  edge.on('close', () => {
    clearTimeout(killer);
    if (fs.existsSync(SHOT)) console.log('  capture :', SHOT, fs.statSync(SHOT).size, 'octets');
    else console.log('  pas de capture');
    try { fs.unlinkSync(path.join(ROOT, '__tirshot.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  });
});
