// Detecte les chevauchements de mise en page dans l'Atelier.
// Un seul lancement d'Edge : on contraint la largeur du panneau a plusieurs
// valeurs et on remesure, ce qui provoque le meme retour a la ligne que
// differents tailles de fenetre.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 5091;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-chevauchement');
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
  localStorage.setItem('nexus-breach-credits', '999999');
  var d = document, frames = 0;
  function box(e) { if (!e) return null; var r = e.getBoundingClientRect(); return { top: r.top, bas: r.bottom, h: r.height }; }
  function mesurer(panneauLargeur) {
    var panneau = d.querySelector('.shop-panel');
    panneau.style.width = panneauLargeur + 'px';
    panneau.style.maxWidth = 'none';
    panneau.getBoundingClientRect(); // force le reflow
    var problemes = [];
    var rendues = {};
    ['shop-classes', 'shop-weapons', 'shop-abilities', 'shop-items'].forEach(function (id) {
      var conteneur = d.getElementById(id);
      rendues[id] = conteneur.children.length;
      var cartes = conteneur.querySelectorAll('.shop-item');
      for (var i = 0; i < cartes.length; i++) {
        var c = cartes[i];
        var boite = box(c);
        var nom = (c.querySelector('h3') || {}).textContent || '(sans titre)';
        var precedents = null;
        for (var j = 0; j < c.children.length; j++) {
          var bloc = c.children[j];
          var b = box(bloc);
          if (!b || b.h <= 0) continue;
          var etiquette = bloc.className || bloc.tagName;
          if (precedents && b.top < precedents.bas - 0.5) {
            problemes.push({ section: id, carte: nom, bloc: etiquette, chevauche: precedents.nom, ecart: Math.round((precedents.bas - b.top) * 10) / 10 });
          }
          if (b.bas > boite.bas + 0.5) {
            problemes.push({ section: id, carte: nom, bloc: etiquette, deborde: Math.round((b.bas - boite.bas) * 10) / 10 });
          }
          precedents = { bas: b.bas, nom: etiquette };
        }
      }
    });
    return { largeur: panneauLargeur, rendues: rendues, problemes: problemes };
  }
  function step() {
    frames += 1;
    if (frames < 3) { requestAnimationFrame(step); return; }
    d.getElementById('shop-button').click();
    // Attendre que l'Atelier soit REELLEMENT peuple : le clic ne produit
    // rien tant que initEvents() n'a pas cable le bouton, ce qui depend du
    // moment ou le module a fini de s'initialiser.
    // Le clic peut etre perdu s'il part avant que initEvents() n'ait cable le
    // bouton : attendre ensuite ne rattrape rien, il faut recliquer.
    var attentes = 0;
    function verifier() {
      attentes += 1;
      var remplies = d.getElementById('shop-classes').children.length;
      if (remplies === 0 && attentes < 90) {
        if (attentes % 10 === 0) d.getElementById('shop-button').click();
        requestAnimationFrame(verifier);
        return;
      }
      if (remplies === 0) {
        fetch('/rapport', { method: 'POST', body: JSON.stringify({ erreur: 'atelier non ouvert', attentes: attentes, erreurs: window.__log }) });
        return;
      }
      var largeurReelle = d.documentElement.clientWidth;
      var largeurs = [1100, 950, 820, 700, 600, 500, 420, 360];
      var mesures = largeurs.map(function (l) { return mesurer(l); });
      fetch('/rapport', { method: 'POST', body: JSON.stringify({
        largeurReelle: largeurReelle, mesures: mesures, erreurs: window.__log
      }) });
    }
    requestAnimationFrame(verifier);
  }
  requestAnimationFrame(step);
  </script>`;
  const html = index.replace('<script type="module"', collector + '\n  <script type="module"');
  fs.writeFileSync(path.join(ROOT, '__smoke.html'), html);

  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,900', '--user-data-dir=' + PROFILE, `http://127.0.0.1:${PORT}/__smoke.html`], { stdio: ['ignore', 'ignore', 'ignore'] });
  const killer = setTimeout(() => { if (!done) { console.log('Delai depasse.'); finish(); } }, 150000);
  function finish() {
    clearTimeout(killer);
    try { edge.kill('SIGKILL'); } catch (e) {}
    if (report && report.mesures) {
      console.log('largeur fenetre reelle :', report.largeurReelle);
      console.log('largeur panneau | cartes rendues | problemes');
      let total = 0;
      for (const m of report.mesures) {
        total += m.problemes.length;
        const flag = m.problemes.length === 0 ? 'OK' : m.problemes.length + ' PROBLEME(S)';
        console.log(`  ${String(m.largeur).padStart(6)} px | ${Object.values(m.rendues).join('/').padEnd(24)} | ${flag}`);
        m.problemes.slice(0, 5).forEach((p) => console.log(`        ${JSON.stringify(p)}`));
      }
      console.log(`\n${total === 0 ? 'AUCUN CHEVAUCHEMENT, aucune carte tronquee.' : total + ' probleme(s) de mise en page.'}`);
      if (report.erreurs && report.erreurs.length) console.log('erreurs JS :', JSON.stringify(report.erreurs));
    } else {
      console.log('Aucun rapport.', report ? JSON.stringify(report).slice(0, 200) : '');
    }
    try { fs.unlinkSync(path.join(ROOT, '__smoke.html')); } catch (e) {}
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
    server.close();
    process.exit(0);
  }
  const poll = setInterval(() => { if (done) { clearInterval(poll); setTimeout(finish, 300); } }, 300);
});
