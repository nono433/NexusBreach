// Diagnostic : la page de mesure est-elle servie, et le script s'execute-t-il ?
// Passe par --dump-dom, qui rend le DOM apres chargement, donc le titre
// affiche trahit l'etat d'avancement.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..', 'wwwroot');
const PORT = 5101;

const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>DEPART</title></head>
<body><div id="temoin">non-modifie</div>
<script>
var journal = [];
window.addEventListener('error', function (e) { journal.push('ERREUR ' + (e.message || e)); });
document.getElementById('temoin').textContent = 'script-execute';
setTimeout(function () {
  document.getElementById('temoin').textContent = 'minuteur-passe';
  fetch('/rapport', { method: 'POST', body: JSON.stringify({ ok: true, url: location.href, largeur: document.documentElement.clientWidth }) });
}, 600);
<\/script>
</body></html>`;

fs.writeFileSync(path.join(ROOT, 'mesure.html'), page, 'utf8');

let recu = null;
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/rapport') {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => { recu = b; res.writeHead(204).end(); });
    return;
  }
  let d = null;
  try { d = fs.readFileSync(path.join(ROOT, req.url === '/' ? 'mesure.html' : req.url)); } catch (e) {}
  if (!d) { res.writeHead(404).end('404'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(d);
});

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profile = path.join(__dirname, '..', '_edgeprofile-diagnostic');

server.listen(PORT, '127.0.0.1', () => {
  const p = spawn(edge, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--dump-dom',
    '--window-size=390,844', `--user-data-dir=${profile}`,
    `http://127.0.0.1:${PORT}/mesure.html`
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let dom = '';
  let err = '';
  p.stdout.on('data', (c) => { dom += c.toString(); });
  p.stderr.on('data', (c) => { err += c.toString(); });

  const minuteur = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} }, 90000);
  p.on('close', () => {
    clearTimeout(minuteur);
    const temoin = dom.match(/id="temoin">([^<]*)</);
    console.log('  DOM rendu          :', dom.length, 'caracteres');
    console.log('  temoin dans le DOM :', temoin ? temoin[1] : '(absent)');
    console.log('  rapport POST recu  :', recu ? recu.slice(0, 200) : 'AUCUN');
    if (!dom.length) {
      const utile = err.split('\n').filter((l) => l.trim() && !/GPU|gl_|Fontconfig|fallback_task|DEPRECATED|SwiftShader|voice/i.test(l));
      console.log('  stderr notable     :', utile.slice(0, 6).join(' | ') || '(rien)');
    }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
    try { fs.unlinkSync(path.join(ROOT, 'mesure.html')); } catch (e) {}
    server.close();
    process.exit(0);
  });
});
