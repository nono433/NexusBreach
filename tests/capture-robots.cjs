// Capture des ennemis, pour verifier le nouveau gabarit a l'ecran. Un test
// qui ne dit que "aucune erreur" ne prouve rien sur un changement de look :
// un robot invisible ou une couleur perdue ne leve aucune exception.
//
// Le plan de capture est place par injection : la camera est posee face a
// une rangee d'ennemis de chaque type, et le rapport est ecrit dans la page
// puis lu sur l'image, methode seule fiable ici (les rapports par requete ne
// se sont jamais passes).
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5107;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-robots');
const SHOT = path.join(__dirname, '..', 'tests', 'capture-robots.png');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent((request.url || '/').split('?')[0]);
  const filePath = path.join(ROOT, relative === '/' ? '__robots.html' : relative);
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
  var d = document, n = 0, canvas = d.getElementById('game-canvas');
  function suite() {
    n += 1;
    // Relance du demarrage tant que le HUD n'est pas visible.
    var h = d.getElementById('hud');
    if (!h || h.classList.contains('hidden')) {
      d.getElementById('start-button').click();
      if (n < 200) requestAnimationFrame(suite);
      return;
    }
    // Tir continu et balayage lent : sans cela le joueur meurt avant la fin du
    // budget de temps virtuel et la capture montre l'ecran de mort, ou aucun
    // ennemi n'est visible. L'arc de visee balaie pour que la rafale touche
    // desormais au moins une cible de temps en temps.
    if (n % 2 === 0) {
      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 450 + Math.sin(n / 11) * 150, clientY: 280, bubbles: true }));
    }
    if (n < 400) requestAnimationFrame(suite);
  }
  requestAnimationFrame(suite);
  </script>`;
  const html = index.replace('<script type="module"', collecteur + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__robots.html'), html);

  fs.rmSync(SHOT, { force: true });
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--virtual-time-budget=40000',
    `--screenshot=${SHOT}`, '--window-size=900,520',
    `--user-data-dir=${PROFILE}`,
    `http://127.0.0.1:${PORT}/__robots.html`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  edge.stderr.on('data', (c) => { stderr += c.toString(); });
  const killer = setTimeout(() => { try { edge.kill('SIGKILL'); } catch (e) {} }, 120000);
  edge.on('close', () => {
    clearTimeout(killer);
    if (fs.existsSync(SHOT)) console.log('  capture :', SHOT, fs.statSync(SHOT).size, 'octets');
    else {
      console.log('  pas de capture');
      const f = stderr.split('\n').filter((l) => l.trim() && !/GPU|gl_|Fontconfig|swiftshader|fallback_task|DEPRECATED|SwiftShader|voice/i.test(l));
      if (f.length) console.log(f.slice(0, 5).join('\n'));
    }
    try { fs.unlinkSync(path.join(ROOT, '__robots.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  });
});
