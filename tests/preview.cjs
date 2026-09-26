// Rend une page de preview en capture d'ecran. Utilise pour verifier
// visuellement une geometrie sans dependre du jeu complet.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = path.join(__dirname, '..', 'wwwroot');
const PROFILE = path.join(__dirname, '..', '_edgeprofile-preview');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const page = process.argv[2] || '__preview-sabre.html';
const output = process.argv[3] || path.join(__dirname, '..', 'tests', 'preview.png');
const port = Number(process.argv[4] || 5077);
const width = Number(process.argv[5] || 900);
const height = Number(process.argv[6] || 620);

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent((request.url || '/').split('?')[0]);
  const filePath = path.join(ROOT, relative === '/' ? page : relative);
  fs.readFile(filePath, (error, data) => {
    if (error) return response.writeHead(404).end('404');
    response.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    response.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  fs.rmSync(output, { force: true });
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--hide-scrollbars', `--screenshot=${output}`,
    `--window-size=${width},${height}`, '--virtual-time-budget=12000',
    `--user-data-dir=${PROFILE}`, `http://127.0.0.1:${port}/`
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  edge.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  const killer = setTimeout(() => { try { edge.kill('SIGKILL'); } catch (e) {} }, 90000);

  edge.on('close', () => {
    clearTimeout(killer);
    if (fs.existsSync(output)) {
      console.log('capture :', output, fs.statSync(output).size, 'octets');
    } else {
      console.log('pas de capture');
      const notable = stderr.split('\n').filter((l) => l.trim() && !/GPU|gl_|Fontconfig|voice|Registration|DEPRECATED|swiftshader|Vulkan|fallback_task|LaunchUpdate/i.test(l));
      if (notable.length) console.log(notable.slice(0, 15).join('\n'));
    }
    server.close();
    process.exit(0);
  });
});
