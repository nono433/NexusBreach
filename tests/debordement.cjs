// Affiche la liste des elements qui debordent du viewport, directement ecrite
// dans la page, puis capture l'ecran. On passe par une capture plutot que par
// un rapport POST : les captures sont fiables ici, alors que la mesure par
// requete ne s'est jamais passee (les timers et images de la page n'avancent
// pas en headless sans budget de temps virtuel, et les tests echouaient en
// concluant "aucun debordement" alors qu'ils n'avaient rien mesure).
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5103;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-debordement-capture');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const largeur = Number(process.argv[2] || 390);
const hauteur = Number(process.argv[3] || 844);
const nom = process.argv[4] || 'portrait';
const sortie = path.join(__dirname, '..', 'tests', `debordement-${nom}.png`);

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
  window.__log = [];
  window.addEventListener('error', function (e) { window.__log.push('ERREUR: ' + (e.message || e)); });
  var d = document;
  function analyser() {
    var limite = d.documentElement.clientWidth;
    var lignes = ['viewport ' + limite + 'px'];
    var vus = {};
    var tous = d.querySelectorAll('body *');
    for (var i = 0; i < tous.length; i++) {
      var e = tous[i];
      var cs = d.defaultView.getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      var r = e.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      var dep = Math.round(Math.max(r.right - limite, -r.left));
      if (dep <= 1) continue;
      var cls = e.className;
      if (cls && cls.baseVal !== undefined) cls = cls.baseVal;
      var sel = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ((cls || '').toString().trim() ? '.' + (cls || '').toString().trim().split(/\\s+/).slice(0, 2).join('.') : '');
      if (vus[sel]) continue;
      vus[sel] = 1;
      lignes.push('+' + dep + 'px  ' + sel + '  (droite ' + Math.round(r.right) + ', largeur ' + Math.round(r.width) + ')');
    }
    if (lignes.length === 1) lignes.push('AUCUN DEBORDEMENT');
    var box = d.createElement('pre');
    box.id = 'rapport-debordement';
    box.textContent = lignes.join('\\n');
    box.style.cssText = 'position:fixed;left:0;top:0;right:0;z-index:99999;margin:0;padding:8px;background:#000;color:#0f0;font:11px/1.45 monospace;white-space:pre-wrap;word-break:break-all;border:2px solid #f0f';
    d.body.appendChild(box);
  }
  var n = 0;
  function boucle() {
    n += 1;
    if (n === 20) { analyser(); return; }
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);
  </script>`;
  const html = index.replace('<script type="module"', collecteur + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__smoke.html'), html);

  fs.rmSync(sortie, { force: true });
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--virtual-time-budget=12000',
    `--screenshot=${sortie}`, `--window-size=${largeur},${hauteur}`,
    `--user-data-dir=${PROFILE}`,
    `http://127.0.0.1:${PORT}/__smoke.html`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  edge.stderr.on('data', (c) => { stderr += c.toString(); });
  const killer = setTimeout(() => { try { edge.kill('SIGKILL'); } catch (e) {} }, 120000);
  edge.on('close', () => {
    clearTimeout(killer);
    if (fs.existsSync(sortie)) console.log(`  ${nom} ${largeur}x${hauteur} -> ${sortie} (${fs.statSync(sortie).size} octets)`);
    else {
      console.log(`  ${nom} : pas de capture`);
      const f = stderr.split('\n').filter((l) => l.trim() && !/GPU|gl_|Fontconfig|swiftshader|fallback_task|DEPRECATED|SwiftShader/i.test(l));
      if (f.length) console.log(f.slice(0, 5).join('\n'));
    }
    try { fs.unlinkSync(path.join(ROOT, '__smoke.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  });
});
