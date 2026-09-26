// Serveur statique minimal pour Nexus Breach — aucune dependance externe.
// Sert le dossier wwwroot puis ouvre le jeu. Necessaire car game.js est un
// module ES : le protocole file:// le bloque pour raisons de CORS.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 5050;
const HOST = '127.0.0.1';
const ROOT = path.join(__dirname, 'wwwroot');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function resolveSafe(urlPath) {
  // Neutralise toute tentative de remonter hors de wwwroot (../).
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const target = path.join(ROOT, path.normalize(decoded).replace(/^([/\\])+/, ''));
  const rel = path.relative(ROOT, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return target;
}

const server = http.createServer((request, response) => {
  let filePath = resolveSafe(request.url || '/');
  if (!filePath) {
    response.writeHead(403).end('403');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readError, data) => {
      if (readError) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('404 - introuvable');
        return;
      }
      const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      response.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      response.end(data);
    });
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('Le port 5050 est deja utilise. Nexus Breach est peut-etre deja lance.');
    process.exit(2);
  }
  console.error('Erreur du serveur :', error.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('   NEXUS BREACH');
  console.log('   ------------------------------------');
  console.log(`   Adresse : http://localhost:${PORT}`);
  console.log('');
  console.log("   Le navigateur va s'ouvrir automatiquement.");
  console.log('   Pour arreter le serveur, ferme cette fenetre.');
  console.log('');
});

// Ouverture du navigateur, detachee du serveur.
//
// Deux pieges evites ici :
//  1. Sur Windows, `start "http://..."` est interprete par cmd.exe comme un
//     TITRE de fenetre, pas comme une URL : une invite de commandes vide
//     s'ouvrait a la place du navigateur. La forme correcte est
//     `start "" "url"`, avec un titre vide explicite.
//  2. exec() herite des tubes de sortie du serveur, et le processus enfant
//     pouvait entrainer la fermeture du serveur. spawn() avec detached et
//     stdio:'ignore', suivi de unref(), rend l'enfant totalement
//     independant.
function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      const child = require('node:child_process').spawn(
        'cmd.exe',
        ['/c', 'start', '""', url],
        { detached: true, stdio: 'ignore' }
      );
      child.unref();
    } else {
      const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
      const child = require('node:child_process').spawn(opener, [url], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    }
  } catch (error) {
    // Le jeu reste jouable : il suffit d'ouvrir l'adresse manuellement.
    console.log(`Ouvre manuellement : ${url}`);
  }
}

if (!process.argv.includes('--no-browser')) {
  openBrowser(`http://localhost:${PORT}`);
}
