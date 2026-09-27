// Verifie la version DEPLOYEE dans un viewport de telephone.
//
// On ne peut pas demander a Edge headless une fenetre de 390 px : Windows
// impose une largeur de fenetre minimale d'environ 500 px, et la capture est
// alors un recadrage d'un rendu plus large. Un iframe, lui, a une vraie
// largeur de viewport : les media queries repondent et le jeu tourne dedans.
//
// C'est le seul moyen de verifier le tactile sans telephone, et cela reste
// une verification partielle : le vrai materiel n'est pas simule.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5108;
const PROFILE = path.join(__dirname, '..', '_edgeprofile-mobile-enligne');
const SHOT = path.join(__dirname, '..', 'tests', 'capture-mobile-enligne.png');
const SITE = '/index.html?tactile=1';

let done = false;
let report = null;

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/rapport') {
    let body = '';
    request.on('data', (c) => { body += c; });
    request.on('end', () => {
      try { report = JSON.parse(body); } catch (e) { report = { erreur: body.slice(0, 300) }; }
      done = true;
      response.writeHead(204).end();
    });
    return;
  }
  const relative = decodeURIComponent((request.url || '/').split('?')[0]);
  const filePath = path.join(__dirname, '..', 'wwwroot', relative === '/' ? 'index.html' : relative);
  let data = null;
  try { data = fs.readFileSync(filePath); } catch (e) { data = null; }
  if (!data) return response.writeHead(404).end('404');
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
  response.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  response.end(data);
});

server.listen(PORT, '127.0.0.1', () => {
  // La page mere ne sert qu'a poser l'iframe et a transmettre le rapport.
  fs.writeFileSync(path.join(__dirname, '..', 'wwwroot', '__mobile.html'), `<!doctype html>
<html><head><meta charset="utf-8"><title>mobile</title>
<style>html,body{margin:0;background:#111}iframe{border:0;display:block}</style>
</head><body>
<iframe id="tel" width="390" height="390"></iframe>
<script>
window.__erreurs = [];
window.addEventListener('error', function (e) { window.__erreurs.push(String(e.message || e)); });
var f = document.getElementById('tel');
f.src = '${SITE}';
function pointeur(d, type, id, x, y) {
  d.getElementById('game-canvas').dispatchEvent(new PointerEvent(type, {
    pointerId: id, pointerType: 'touch', isPrimary: id === 1,
    clientX: x, clientY: y, bubbles: true, cancelable: true
  }));
}
var etapes = 0;
var envoyeGestes = false;
function sonder() {
  etapes += 1;
  var d, w;
  try { d = f.contentDocument; w = f.contentWindow; } catch (e) { envoyer('document inaccessible : ' + e); return; }
  if (!d || !d.body) {
    if (etapes > 120) { envoyer('page jamais chargee'); return; }
    setTimeout(sonder, 250); return;
  }
  if (!d.getElementById('start-button')) {
    if (etapes > 120) { envoyer('bouton de demarrage absent'); return; }
    setTimeout(sonder, 250); return;
  }
  // Demarrage : on REPOUSSE le clic tant que le HUD n'est pas visible. Un clic
  // envoye avant que le module du jeu n'ait cable le bouton est perdu, et sans
  // reprise la partie ne demarre jamais : les gestes tactiles partiraient alors
  // dans le vide et le tir automatique semblerait casse.
  var h = d.getElementById('hud');
  var enJeu = h && !h.classList.contains('hidden');
  if (!enJeu && etapes < 24) {
    d.getElementById('start-button').click();
    setTimeout(sonder, 250);
    return;
  }

  // Mode tactile actif ?
  var tactile = d.documentElement.classList.contains('touche');
  var couche = d.getElementById('touch-layer');
  var display = couche ? w.getComputedStyle(couche).display : 'absent';
  var portrait = d.documentElement.classList.contains('touche-portrait');

  if (etapes < 8) { setTimeout(sonder, 250); return; }

  // Joystick : un doigt sur la moitie gauche basse
  var premier = !envoyeGestes;
  if (premier) { envoyeGestes = true; pointeur(d, 'pointerdown', 1, 120, 320); pointeur(d, 'pointermove', 1, 160, 280); }
  // Tir : un second doigt a droite, glissement repete. Le tir automatique ne
  // repose que sur des mouvements successifs, un deplacement unique pose au
  // meme instant que le pointerdown pouvant passer avant PLAYING.
  if (premier && etapes >= 18 && etapes <= 30) {
    if (etapes === 18) pointeur(d, 'pointerdown', 2, 320, 320);
    pointeur(d, 'pointermove', 2, 320 - (etapes - 18) * 8, 320 - (etapes - 18) * 4);
  }
  // Temoin : le bouton TIR. S'il consomme lui non plus de munitions, le
  // probleme n'est pas le glissement mais tout le tir dans cet iframe, et la
  // sonde est en cause plutot que le jeu.
  if (premier && etapes === 20) {
    d.getElementById('touch-fire').dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true
    }));
  }
  if (premier && etapes === 24) {
    d.getElementById('touch-fire').dispatchEvent(new PointerEvent('pointerup', {
      pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true
    }));
  }

  setTimeout(function () {
    var h = d.getElementById('hud');
    afficher({
      viewport: d.documentElement.clientWidth + 'x' + d.documentElement.clientHeight,
      modeTactile: tactile,
      classePortrait: portrait,
      coucheTactileDisplay: display,
      coucheVisibleEnJeu: couche ? w.getComputedStyle(couche).display : 'absent',
      joystickActif: d.getElementById('touch-stick').classList.contains('active'),
      partieLancee: enJeu,
      vie: (d.getElementById('health-value') || {}).textContent,
      munitions: (d.getElementById('ammo-value') || {}).textContent,
      canvas: (function () { var c = d.getElementById('game-canvas'); return c ? c.width + 'x' + c.height : 'absent'; })(),
      mentionMenu: (d.querySelector('.pointer-note') || {}).textContent,
      erreursJS: ((w.__nexus && w.__nexus.erreurs) || []).length
    });
  }, 2200);
}
// Le rapport est ECRIT dans la page, puis lu sur la capture. Les rapports par
// requete depuis une page injectee n'aboutissent pas ici : sans budget de temps
// virtuel les minuteries n'avancent pas, et avec lui la fenetre se ferme
// avant la reponse. L'ecriture dans la page, elle, fonctionne toujours.
function afficher(donnees) {
  var box = document.createElement('pre');
  box.textContent = Object.keys(donnees).map(function (k) {
    return k + ' : ' + JSON.stringify(donnees[k]);
  }).join('\\n');
  box.style.cssText = 'position:fixed;left:0;top:0;right:0;z-index:99999;margin:0;padding:10px;'
    + 'background:#000;color:#0f0;font:12px/1.5 monospace;white-space:pre-wrap;word-break:break-all;'
    + 'border:3px solid #ff0';
  document.body.appendChild(box);
}
function envoyer(texte) {
  var box = document.createElement('pre');
  box.textContent = 'ECHEC : ' + texte;
  box.style.cssText = 'position:fixed;left:0;top:0;right:0;z-index:99999;margin:0;padding:10px;'
    + 'background:#000;color:#f66;font:13px monospace;border:3px solid #f00';
  document.body.appendChild(box);
}
setTimeout(function () { sonder(); }, 300);
</script>
</body></html>`);

  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--virtual-time-budget=45000',
    `--screenshot=${SHOT}`, '--window-size=520,520',
    `--user-data-dir=${PROFILE}`,
    `http://127.0.0.1:${PORT}/__mobile.html`
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  const killer = setTimeout(() => { if (!done) { console.log('  Delai depasse.'); finir(null); } }, 200000);
  function finir(r) {
    clearTimeout(killer);
    try { edge.kill('SIGKILL'); } catch (e) {}
    const rep = r || report;
    if (rep && !rep.erreur) {
      console.log('=== SITE DEPLOYE, VIEWPORT TELEPHONE (390x390) ===');
      for (const k of Object.keys(rep)) {
        const v = rep[k];
        if (k === 'erreurs' || k === 'erreursJs') {
          const n = Array.isArray(v) ? v.length : 0;
          console.log('  ' + (n === 0 ? 'OK  ' : 'ATTENTION') + ' ' + k.padEnd(24) + (n === 0 ? 'aucune' : JSON.stringify(v).slice(0, 200)));
        } else {
          console.log('  ' + String(k).padEnd(24) + JSON.stringify(v));
        }
      }
    } else {
      console.log('  aucun rapport :', rep ? JSON.stringify(rep).slice(0, 200) : 'rien');
    }
    if (fs.existsSync(SHOT)) console.log('  capture :', SHOT);
    try { fs.unlinkSync(path.join(__dirname, '..', 'wwwroot', '__mobile.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  }
  const poll = setInterval(() => { if (done) { clearInterval(poll); setTimeout(() => finir(report), 400); } }, 300);
});
