// Capture du jeu en mode ordinateur, pour verifier que les changements CSS
// (overflow sur .screen, media query sur la hauteur) n'ont rien casse.
// Variante de capture-tactile.cjs : pas de mode tactile, pas de doigts.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5096;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-bureau-shot');
const SHOT = path.join(__dirname, '..', 'tests', 'capture-bureau.png');
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
  // Taille de fenetre passee en argument pour tester plusieurs formats.
  const largeur = Number(process.argv[2] || 1280);
  const hauteur = Number(process.argv[3] || 720);
  const nom = process.argv[4] || 'bureau';
  const sortie = path.join(__dirname, '..', 'tests', `capture-${nom}.png`);
  const collector = `<script>
  window.__log = [];
  window.addEventListener('error', function (e) { window.__log.push('ERREUR: ' + (e.message||e)); });
  var d = document, n = 0;
  function etape() {
    n += 1;
    if (!d.getElementById('hud') || d.getElementById('hud').classList.contains('hidden')) {
      d.getElementById('start-button').click();
      return;
    }
    // Avance en permanence, sinon on meurt avant la fin de la capture.
    // Le tir reste volontairement episodique : sous rendu logiciel, une
    // rafale continue sature le rasteriseur et la capture n'aboutit jamais.
    if (n % 2 === 0) {
      d.getElementById('game-canvas').dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      d.getElementById('game-canvas').dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    }
    if (n % 5 === 0) {
      d.getElementById('game-canvas').dispatchEvent(new MouseEvent('mousemove', { clientX: 620 + Math.sin(n / 9) * 40, clientY: 340, bubbles: true }));
    }
  }
  function boucle() { etape(); if (n < 170) requestAnimationFrame(boucle); }
  requestAnimationFrame(boucle);
  </script>`;
  const html = index.replace('<script type="module"', collector + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__bureauschot.html'), html);

  fs.rmSync(sortie, { force: true });
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    `--screenshot=${sortie}`, `--window-size=${largeur},${hauteur}`, '--virtual-time-budget=55000',
    `--user-data-dir=${PROFILE}`, `http://127.0.0.1:${PORT}/__bureauschot.html`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  edge.stderr.on('data', (c) => { stderr += c.toString(); });
  const killer = setTimeout(() => { try { edge.kill('SIGKILL'); } catch (e) {} }, 120000);
  edge.on('close', () => {
    clearTimeout(killer);
    if (fs.existsSync(sortie)) console.log(`capture ${largeur}x${hauteur} :`, sortie, fs.statSync(sortie).size, 'octets');
    else { console.log('pas de capture'); const f = stderr.split('\n').filter((l) => l.trim() && !/GPU|gl_|Fontconfig|swiftshader|fallback_task|LaunchUpdate|DEPRECATED/i.test(l)); if (f.length) console.log(f.slice(0, 6).join('\n')); }
    try { fs.unlinkSync(path.join(ROOT, '__bureauschot.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  });
});
