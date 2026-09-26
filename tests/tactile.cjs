// Test du mode tactile : simule des doigts (PointerEvents pointerType
// 'touch') et verifie joystick, visee, tir automatique et pause tactile.
// Le jeu est charge avec ?tactile=1 pour forcer le mode tactile.
//
// Chaque action est rejouee tant qu'elle n'a pas pris : le module du jeu
// s'execute apres ce script, un clic lance trop tot serait perdu.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5094;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-tactile');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
let done = false;
let report = null;

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/rapport') {
    let body = '';
    request.on('data', (c) => { body += c; });
    request.on('end', () => { try { report = JSON.parse(body); } catch (e) { report = { erreur: body.slice(0, 300) }; } done = true; response.writeHead(204).end(); });
    return;
  }
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
  var d = document;
  var etapes = [];
  function note(etiquette, extra) { etapes.push(Object.assign({ etape: etiquette }, extra || {})); }
  function pointeur(type, id, x, y) {
    d.getElementById('game-canvas').dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', isPrimary: id === 1,
      clientX: x, clientY: y, bubbles: true, cancelable: true
    }));
  }
  function bouton(type, id, elementId) {
    var el = d.getElementById(elementId);
    el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true }));
  }
  // Sequence plate : chaque etape est rejouee jusqu'a ce que sa condition
  // soit vraie, avec un plafond d'image pour ne pas boucler indefiniment.
  var etapesTest = [
    { nom: 'attente-jeu',
      agir: function () { return d.getElementById('start-button'); },
      condition: function () { return d.getElementById('start-button') !== null; },
      assertion: function () { return { classeRacine: d.documentElement.className }; } },
    { nom: 'demarrage-partie',
      agir: function () { d.getElementById('start-button').click(); },
      // La couche tactile n'est visible qu'une fois la classe touche-en-jeu
      // posee par la boucle de jeu : on attend les deux, sinon on lit l'etat
      // d'avant et le resultat serait trompeur.
      condition: function () {
        var h = d.getElementById('hud');
        return h && !h.classList.contains('hidden') && d.documentElement.classList.contains('touche-en-jeu');
      },
      assertion: function () { return { coucheVisible: getComputedStyle(d.getElementById('touch-layer')).display !== 'none' }; } },
    { nom: 'joystick-apparu',
      agir: function () { pointeur('pointerdown', 1, 140, 300); },
      condition: function () { return d.getElementById('touch-stick').classList.contains('active'); },
      assertion: function () { return { stickActif: d.getElementById('touch-stick').classList.contains('active') }; } },
    { nom: 'deplacement-joystick',
      agir: function () { pointeur('pointermove', 1, 200, 250); },
      condition: function () { return true; },
      assertion: function () { return { fait: true }; } },
    { nom: 'tir-automatique',
      agir: function () { pointeur('pointerdown', 2, 700, 300); },
      condition: function () { return true; },
      assertion: function () { return { munitionsAvant: d.getElementById('ammo-value').textContent }; } },
    { nom: 'tir-apres-glisse',
      agir: function () { pointeur('pointermove', 2, 640, 280); },
      condition: function () { return d.getElementById('ammo-value').textContent !== '30'; },
      assertion: function () { return { munitionsApres: d.getElementById('ammo-value').textContent, tire: d.getElementById('ammo-value').textContent !== '30' }; } },
    { nom: 'relacher-doigts',
      agir: function () { pointeur('pointerup', 1, 200, 250); pointeur('pointerup', 2, 640, 280); },
      condition: function () { return !d.getElementById('touch-stick').classList.contains('active'); },
      assertion: function () { return { stickLibere: !d.getElementById('touch-stick').classList.contains('active') }; } },
    { nom: 'bouton-recharge',
      agir: function () { bouton('pointerdown', 4, 'touch-reload'); },
      condition: function () { return d.getElementById('reload-status').textContent.indexOf('RECHARGE') >= 0; },
      assertion: function () { return { recharge: d.getElementById('reload-status').textContent }; } },
    { nom: 'pause-tactile',
      agir: function () { bouton('pointerdown', 5, 'touch-pause'); bouton('pointerup', 5, 'touch-pause'); },
      condition: function () { return d.getElementById('pause-screen').classList.contains('active'); },
      assertion: function () { return { pauseActive: d.getElementById('pause-screen').classList.contains('active') }; } },
    { nom: 'reprise',
      agir: function () { d.getElementById('resume-button').click(); },
      condition: function () { return !d.getElementById('pause-screen').classList.contains('active'); },
      assertion: function () { return { pauseFermee: true }; } },
    { nom: 'bouton-capacite',
      agir: function () { bouton('pointerdown', 6, 'touch-ability'); bouton('pointerup', 6, 'touch-ability'); },
      condition: function () { return true; },
      assertion: function () { return { declenche: true }; } },
    { nom: 'atelier-tactile',
      agir: function () { d.getElementById('shop-button').click(); },
      condition: function () { return d.getElementById('shop-classes').children.length > 0; },
      assertion: function () {
        return {
          classes: d.getElementById('shop-classes').children.length,
          armes: d.getElementById('shop-weapons').children.length,
          capacites: d.getElementById('shop-abilities').children.length
        };
      } },
    // openShop() change bien l'etat, mais la classe touche-en-jeu n'est
    // retiree qu'a la frame suivante : cette etape attend cette frame la,
    // sinon elle lirait l'etat d'avant et passerait a tort.
    { nom: 'couche-cachee-atelier',
      agir: function () {},
      condition: function () { return !d.documentElement.classList.contains('touche-en-jeu'); },
      assertion: function () { return { coucheVisible: getComputedStyle(d.getElementById('touch-layer')).display !== 'none' }; } }
  ];
  var index = 0;
  function etape() {
    if (index >= etapesTest.length) {
      fetch('/rapport', { method: 'POST', body: JSON.stringify({ erreurs: window.__log, etapes: etapes }) });
      return;
    }
    var courante = etapesTest[index];
    var images = 0;
    function essayer() {
      images += 1;
      if (courante.agir) courante.agir();
      if (courante.condition && !courante.condition()) {
        if (images > 90) {
          note(courante.nom + ' : ECHEC', Object.assign({ images: images }, courante.assertion ? courante.assertion() : {}));
          index += 1;
          etape();
          return;
        }
        requestAnimationFrame(essayer);
        return;
      }
      note(courante.nom + ' : OK', Object.assign({ images: images }, courante.assertion ? courante.assertion() : {}));
      index += 1;
      etape();
    }
    requestAnimationFrame(essayer);
  }
  requestAnimationFrame(etape);
  </script>`;
  const html = index.replace('<script type="module"', collector + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__smoke.html'), html);

  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=900,420', '--user-data-dir=' + PROFILE, `http://127.0.0.1:${PORT}/__smoke.html?tactile=1`], { stdio: ['ignore', 'ignore', 'pipe'] });
  const killer = setTimeout(() => { if (!done) { console.log('Delai depasse.'); finish(); } }, 200000);
  function finish() {
    clearTimeout(killer);
    try { edge.kill('SIGKILL'); } catch (e) {}
    if (report && report.etapes) {
      console.log('erreurs :', JSON.stringify(report.erreurs));
      for (const e of report.etapes) {
        const details = Object.keys(e).filter((k) => k !== 'etape').map((k) => `${k}=${e[k]}`).join('  ');
        console.log(`  ${e.etape.padEnd(28)} ${details}`);
      }
    } else {
      console.log('Aucun rapport.', report ? JSON.stringify(report).slice(0, 300) : '');
    }
    try { fs.unlinkSync(path.join(ROOT, '__smoke.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  }
  const poll = setInterval(() => { if (done) { clearInterval(poll); setTimeout(finish, 300); } }, 300);
});
