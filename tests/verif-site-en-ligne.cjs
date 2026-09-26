// Charge la version DEPLOYEE (pas la copie locale) dans un navigateur et
// verifie qu'elle demarre really. Un HTTP 200 ne prouve rien : le jeu peut
// charger et rester bloque sur le menu.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5098;
const PROFILE = path.join(__dirname, '..', '_edgeprofile-enligne');
const SITE = 'https://nono433.github.io/NexusBreach/index.html';
// Format de telephone : c'est le cas que le joueur signale.
const LARGEUR = 390;
const HAUTEUR = 844;

let done = false;
let report = null;

// Petit relais : la page injectee POSTe son rapport ici, le serveur ne sert
// que ce point de collecte (le jeu vient de GitHub Pages, pas de ce serveur).
const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/rapport') {
    let body = '';
    request.on('data', (c) => { body += c; });
    request.on('end', () => { try { report = JSON.parse(body); } catch (e) { report = { erreur: body.slice(0, 400) }; } done = true; response.writeHead(204).end(); });
    return;
  }
  response.writeHead(404).end('404');
});

server.listen(PORT, '127.0.0.1', () => {
  // La page distante ne peut pas POSTer vers 127.0.0.1 a cause de CORS :
  // on donc charge une copie locale de la page qui pointe vers le site
  // deploye, et qui injecte le collecteur.
  fs.writeFileSync(path.join(__dirname, '..', 'tests', '__enligne.html'), `<!doctype html>
<html><head><meta charset="utf-8"><title>sonde</title></head><body>
<script>
// On charge reellement le site deploye dans un iframe et on l'observe.
var journal = [], erreurs = [];
window.addEventListener('error', function (e) { erreurs.push('ERREUR: ' + (e.message || e)); });
var f = document.createElement('iframe');
f.width = ${LARGEUR}; f.height = ${HAUTEUR};
f.style.border = '0';
f.src = '${SITE}';
document.body.appendChild(f);
function attendre(n) {
  if (n < 60) { setTimeout(function () { attendre(n + 1); }, 250); return; }
  try {
    var w = f.contentWindow, d = f.contentDocument;
    var menu = d.getElementById('menu-screen');
    var canvas = d.getElementById('game-canvas');
    var btn = d.getElementById('start-button');
    var racine = d.documentElement;
    var resultat = {
      taille: [w.innerWidth, w.innerHeight],
      portrait: w.innerHeight > w.innerWidth,
      menuPresent: Boolean(menu),
      menuActif: Boolean(menu && menu.classList.contains('active')),
      menuVisible: Boolean(menu) && w.getComputedStyle(menu).visibility,
      canvasPresent: Boolean(canvas),
      canvasTaille: canvas ? [canvas.width, canvas.height] : null,
      boutonDemarrer: Boolean(btn),
      coucheTactile: Boolean(d.getElementById('touch-layer')),
      coucheTactileDisplay: d.getElementById('touch-layer') ? w.getComputedStyle(d.getElementById('touch-layer')).display : null,
      rotationEcran: Boolean(d.getElementById('rotate-hint')),
      rotationDisplay: d.getElementById('rotate-hint') ? w.getComputedStyle(d.getElementById('rotate-hint')).display : null,
      classesRacine: racine.className,
      scripts: d.querySelectorAll('script').length
    };
    // On tente de demarrer pour voir si le jeu repond.
    if (btn) { btn.click(); }
    setTimeout(function () {
      try {
        var h = d.getElementById('hud');
        resultat.jeuLance = Boolean(h) && !h.classList.contains('hidden');
        resultat.vieApres = d.getElementById('health-value') ? d.getElementById('health-value').textContent : null;
        resultat.vague = d.getElementById('wave-value') ? d.getElementById('wave-value').textContent : null;
      } catch (e) { resultat.sondage = String(e); }
      fetch('http://127.0.0.1:${PORT}/rapport', { method: 'POST', body: JSON.stringify({ resultat: resultat, erreurs: erreurs }) });
    }, 3000);
  } catch (e) {
    fetch('http://127.0.0.1:${PORT}/rapport', { method: 'POST', body: JSON.stringify({ erreur: String(e), erreurs: erreurs }) });
  }
}
attendre(0);
</script></body></html>`);

  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage',
    `--screenshot=${path.join(__dirname, '..', 'tests', 'capture-enligne-telephone.png')}`,
    `--window-size=${LARGEUR},${HAUTEUR}`, '--virtual-time-budget=40000',
    `--user-data-dir=${PROFILE}`, `http://127.0.0.1:${PORT}/__enligne.html`
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  const killer = setTimeout(() => { if (!done) { console.log('Delai depasse.'); finish(); } }, 150000);
  function finish() {
    clearTimeout(killer);
    try { edge.kill('SIGKILL'); } catch (e) {}
    if (report && report.resultat) {
      console.log('=== SONDE DU SITE DEPLOYE ===');
      for (const [k, v] of Object.entries(report.resultat)) {
        console.log(`  ${k.padEnd(22)} ${JSON.stringify(v)}`);
      }
    } else {
      console.log('Aucun rapport :', report ? JSON.stringify(report).slice(0, 300) : 'rien');
    }
    if (report && report.erreurs && report.erreurs.length) {
      console.log('  erreurs :', JSON.stringify(report.erreurs));
    }
    const shot = path.join(__dirname, '..', 'tests', 'capture-enligne-telephone.png');
    if (fs.existsSync(shot)) console.log('  capture :', shot);
    try { fs.unlinkSync(path.join(__dirname, '..', 'tests', '__enligne.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  }
  const poll = setInterval(() => { if (done) { clearInterval(poll); setTimeout(finish, 400); } }, 300);
});
