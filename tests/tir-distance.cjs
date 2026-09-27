// Verifie que les ennemis tirent reellement a distance.
//
// Le signal est une contrainte de temps. L'arene fait 44 unites de cote, donc
// une apparition peut etre a 40 unites du joueur, et le robot le plus lent
// avance de 1.58 unite par seconde : il lui faut pres de 9 secondes pour
// seulement atteindre sa zone de tir, sans compter l'armement. On laisse donc
// jouer largement, et on mesure A QUAND la vie baisse pour la premiere fois.
//
// Le test ne tire jamais : les ennemis survivent, se stabilisent a leur
// distance de tir, et le joueur subit.
//
// Le rapport est ecrit DANS la page puis lu sur la capture. Les rapports par
// requete depuis une page injectee n'aboutissent pas ici : sans budget de
// temps virtuel les minuteries n'avancent pas, et avec lui la fenetre se
// ferme avant la reponse.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5110;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-tir');
const SHOT = path.join(__dirname, '..', 'tests', 'capture-tir.png');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent((request.url || '/').split('?')[0]);
  const filePath = path.join(ROOT, relative === '/' ? '__tir.html' : relative);
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
  var d = document, n = 0, debut = 0, premierDegat = -1, vieInitiale = 100;
  function vie() {
    var el = d.getElementById('health-value');
    return el ? Number(el.textContent) : 100;
  }
  function rapport() {
    var lignes = [
      'VIE initiale : ' + vieInitiale,
      'VIE finale   : ' + vie(),
      '1er degat    : ' + (premierDegat >= 0 ? 'image ' + premierDegat + ' (' + (premierDegat / 60).toFixed(2) + ' s)' : 'AUCUN'),
      'images       : ' + (n - debut),
      'erreurs JS   : ' + (window.__log.length ? window.__log.join(' | ') : 'aucune'),
      'gardien      : ' + (((window.__nexus && window.__nexus.erreurs) || []).join(' | ') || 'aucune'),
      'ennemis      : ' + ((d.getElementById('enemy-value') || {}).textContent || '?'),
      '',
      (vie() < vieInitiale)
        ? 'VERDICT : le tir a distance inflige des degats.'
        : 'VERDICT : aucun degat, le tir ne se declenche pas.'
    ];
    var box = d.createElement('pre');
    box.textContent = lignes.join('\\n');
    box.style.cssText = 'position:fixed;left:0;top:0;right:0;z-index:99999;margin:0;padding:12px;'
      + 'background:#000;color:#0f0;font:13px/1.6 monospace;white-space:pre-wrap;border:3px solid #ff0';
    d.body.appendChild(box);
  }
  function etape() {
    n += 1;
    var h = d.getElementById('hud');
    if (!h || h.classList.contains('hidden')) {
      d.getElementById('start-button').click();
      if (n < 300) requestAnimationFrame(etape);
      return;
    }
    if (debut === 0) { debut = n; vieInitiale = vie(); }
    if (premierDegat < 0 && vie() < vieInitiale) premierDegat = n - debut;
    // On s'arrete AU PREMIER degat : quand le tir fonctionne, le test se
    // termine en quelques secondes au lieu d'attendre la fin du delai. Le
    // plafond de 900 images ne sert qu'a constater un echec, et reste sous ce
    // que le rendu logiciel supporte en un seul lancement.
    if (premierDegat >= 0 || n - debut >= 900) { rapport(); return; }
    requestAnimationFrame(etape);
  }
  requestAnimationFrame(etape);
  </script>`;
  const html = index.replace('<script type="module"', collecteur + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__tir.html'), html);

  fs.rmSync(SHOT, { force: true });
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--virtual-time-budget=70000',
    `--screenshot=${SHOT}`, '--window-size=900,560',
    `--user-data-dir=${PROFILE}`,
    `http://127.0.0.1:${PORT}/__tir.html`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  edge.stderr.on('data', (c) => { stderr += c.toString(); });
  const killer = setTimeout(() => { try { edge.kill('SIGKILL'); } catch (e) {} }, 260000);
  edge.on('close', () => {
    clearTimeout(killer);
    if (fs.existsSync(SHOT)) console.log('  capture :', SHOT, fs.statSync(SHOT).size, 'octets');
    else {
      console.log('  pas de capture');
      const f = stderr.split('\n').filter((l) => l.trim() && !/GPU|gl_|Fontconfig|swiftshader|fallback_task|DEPRECATED|SwiftShader|voice/i.test(l));
      if (f.length) console.log(f.slice(0, 5).join('\n'));
    }
    try { fs.unlinkSync(path.join(ROOT, '__tir.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  });
});
