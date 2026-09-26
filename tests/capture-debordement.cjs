// Capture des commandes tactiles en jeu, pour verifier visuellement le
// joystick flottant, les boutons et le HUD sur un ecran de telephone.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5095;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-deb-shot');
const SHOT = path.join(__dirname, '..', 'tests', 'paysage-tactile.png');
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
  var d = document, n = 0;
  // Mesure ecrite DANS la page puis lue sur la capture : les rapports par
  // requete ne se sont jamais passes ici, les timers n'avancant pas en
  // headless hors budget de temps virtuel.
  function analyser() {
    var limite = d.documentElement.clientWidth;
    var lignes = ['VIEWPORT ' + limite + 'px de large'];
    var vus = {};
    var tous = d.querySelectorAll('body *');
    for (var i = 0; i < tous.length; i++) {
      var e = tous[i];
      if (e.id === 'rapport-debordement') continue;
      var cs = d.defaultView.getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      var r = e.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      var dep = Math.round(Math.max(r.right - limite, -r.left));
      if (dep <= 1) continue;
      var cls = e.className;
      if (cls && cls.baseVal !== undefined) cls = cls.baseVal;
      var sel = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ((cls||'').toString().trim() ? '.' + (cls||'').toString().trim().split(/\\s+/).slice(0,2).join('.') : '');
      if (vus[sel]) continue;
      vus[sel] = 1;
      lignes.push('+' + dep + 'px ' + sel + ' (droite ' + Math.round(r.right) + ', l ' + Math.round(r.width) + ')');
    }
    if (lignes.length === 1) lignes.push('>>> AUCUN DEBORDEMENT <<<');
    var box = d.createElement('pre');
    box.id = 'rapport-debordement';
    box.textContent = lignes.join('\\n');
    box.style.cssText = 'position:fixed;left:0;top:0;right:0;z-index:99999;margin:0;padding:10px;background:#000;color:#0f0;font:12px/1.5 monospace;white-space:pre-wrap;word-break:break-all;border:3px solid #f0f';
    d.body.appendChild(box);
  }
  // On mesure le MENU tel quel, sans demarrer de partie : c'est lui qui
  // deborde en portrait.
  function etape() {
    n += 1;
    if (n === 15) { return; }
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
  fs.writeFileSync(path.join(ROOT, '__debordement.html'), html);

  fs.rmSync(SHOT, { force: true });
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    `--screenshot=${SHOT}`, '--window-size=844,390', '--virtual-time-budget=60000',
    `--user-data-dir=${PROFILE}`, `http://127.0.0.1:${PORT}/__debordement.html?tactile=1`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  edge.stderr.on('data', (c) => { stderr += c.toString(); });
  const killer = setTimeout(() => { try { edge.kill('SIGKILL'); } catch (e) {} }, 120000);
  edge.on('close', () => {
    clearTimeout(killer);
    if (fs.existsSync(SHOT)) console.log('capture :', SHOT, fs.statSync(SHOT).size, 'octets');
    else { console.log('pas de capture'); const f = stderr.split('\n').filter((l) => l.trim() && !/GPU|gl_|Fontconfig|swiftshader|fallback_task|LaunchUpdate|DEPRECATED/i.test(l)); if (f.length) console.log(f.slice(0, 8).join('\n')); }
    try { fs.unlinkSync(path.join(ROOT, '__debordement.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  });
});


