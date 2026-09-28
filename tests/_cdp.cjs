// Pilote de navigateur par le protocole DevTools.
//
// Pourquoi ce fichier existe : jusqu'ici les captures passaient toutes par
// --virtual-time-budget, et ce drapeau et un piege. Le temps virtuel fait
// avancer les minuteries, mais rAF reste pilote par le compositeur, qui ne
// donne que deux images en douze secondes de temps virtuel. Mesure faite :
//
//   budget seul                        1 image en 38 ms
//   budget + run-all-compositor-stages 2 images en 3 s
//   sans budget                        0 image (la capture part au chargement)
//
// Donc une capture de jeu ne pouvait pas fonctionner, et c'est la raison pour
// laquelle le rendu d'un projectile n avait jamais ete observe. Le protocole
// DevTools supprime le probleme : le navigateur tourne en temps reel, et c'est
// nous qui decidons quand lire la page et quand photographier l'ecran.
//
// Node 24 fournit WebSocket et fetch, il n'y a donc rien a installer.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// Deux ports libres, distincts, demandes a chaque lancement.
//
// Les versions precedentes utilisaient des ports fixes. Un navigateur tue reste
// quelques secondes avant de liberer le sien, et le suivant s'y accrochait : le
// client DevTools se reconnectait alors a l'ancien navigateur, sur une autre
// page, et lisait un etat qui n'etait pas le sien. C'est la cause des echecs
// qui n'expliquaient rien. Le port se demande a l'OS, il n'y a plus rien a
// deviner.
function portLibre() {
  return new Promise((resoudre) => {
    const serveur = net.createServer();
    serveur.unref();
    serveur.on('error', () => resoudre(portLibre()));
    serveur.listen(0, '127.0.0.1', () => {
      const port = serveur.address().port;
      serveur.close(() => resoudre(port));
    });
  });
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// Un petit serveur de fichiers statiques : le jeu est un module, il faut donc
// une vraie origine HTTP pour que le navigateur accepte de le charger.
function servir(racine, port, pageParDefaut) {
  const http = require('node:http');
  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
  };
  const serveur = http.createServer((requete, reponse) => {
    const relatif = decodeURIComponent((requete.url || '/').split('?')[0]);
    const fichier = path.join(racine, relatif === '/' ? pageParDefaut : relatif);
    let data = null;
    try { data = fs.readFileSync(fichier); } catch (e) { data = null; }
    if (!data) return reponse.writeHead(404).end('404');
    reponse.writeHead(200, {
      'Content-Type': MIME[path.extname(fichier).toLowerCase()] || 'application/octet-stream'
    });
    reponse.end(data);
  });
  return new Promise((resoudre) => serveur.listen(port, '127.0.0.1', () => resoudre(serveur)));
}

async function pagesOuvertes(port) {
  try {
    const reponse = await fetch(`http://127.0.0.1:${port}/json/list`, {
      signal: AbortSignal.timeout(2000)
    });
    const charge = await reponse.json();
    // Le port peut repondre autre chose qu'une liste : un objet d'erreur quand
    // le navigateur refuse la connexion, par exemple. On ne doit jamais
    // supposer que c'est un tableau.
    if (Array.isArray(charge)) return charge;
    if (process.env.CDP_VERBOSE) console.log('  /json/list ->', JSON.stringify(charge).slice(0, 200));
    return [];
  } catch (e) {
    return [];
  }
}

class Session {
  constructor(sock, processus, serveur, profil, port) {
    this.sock = sock;
    this.processus = processus;
    this.serveur = serveur;
    this.profil = profil;
    this.port = port;
    this.suite = 0;
    this.enAttente = new Map();
    this.sock.addEventListener('message', (evenement) => {
      let message = null;
      try { message = JSON.parse(evenement.data); } catch (e) { return; }
      if (message.id && this.enAttente.has(message.id)) {
        const { resoudre, rejeter } = this.enAttente.get(message.id);
        this.enAttente.delete(message.id);
        if (message.error) rejeter(new Error(message.error.message));
        else resoudre(message.result);
      }
    });
  }

  envoyer(methode, params = {}) {
    this.suite += 1;
    const id = this.suite;
    return new Promise((resoudre, rejeter) => {
      const delai = setTimeout(() => {
        this.enAttente.delete(id);
        rejeter(new Error(methode + ' : pas de reponse'));
      }, 120000);
      this.enAttente.set(id, {
        resoudre: (r) => { clearTimeout(delai); resoudre(r); },
        rejeter: (e) => { clearTimeout(delai); rejeter(e); }
      });
      this.sock.send(JSON.stringify({ id, method: methode, params }));
    });
  }

  // Evalue du code dans la page et rend sa valeur. C'est le canal de lecture :
  // il remplace le --dump-dom, qui ne parle qu'au chargement de la page.
  async evaluer(expression) {
    const resultat = await this.envoyer('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (resultat.exceptionDetails) {
      const detail = resultat.exceptionDetails;
      throw new Error('la page a leve : ' + (detail.exception?.description || detail.text));
    }
    return resultat.result.value;
  }

  // Ecrit dans le stockage AVANT que le jeu ne le lise, puis recharge la page.
  //
  // Ecrire localStorage apres coup ne suffit pas : au premier chargement le jeu
  // lit un profil neuf, y ecrit ce qu il trouve, puis ce profil prime sur la
  // cle isolee au chargement suivant. Le resultat est intermittent : ca
  // depending du course entre la sauvegarde du jeu et notre ecriture. Injecter
  // le script dans le document suivant supprime la course.
  async preparerStockage(paires) {
    const source = Object.entries(paires)
      .map(([cle, valeur]) => `try { localStorage.setItem(${JSON.stringify(cle)}, `
        + `${JSON.stringify(valeur)}); } catch (e) {}`)
      .join('\n');
    await this.envoyer('Page.addScriptToEvaluateOnNewDocument', { source });
    await this.envoyer('Page.reload');
  }

  // Attend une condition verifiee dans la page. C'est le vrai temps qui passe,
  // donc le jeu avance comme pour un joueur.
  async attendre(juste, delaiMax = 90000, pas = 120) {
    const limite = Date.now() + delaiMax;
    while (Date.now() < limite) {
      const valeur = await this.evaluer(juste);
      if (valeur) return valeur;
      await attendre(pas);
    }
    return null;
  }

  async capturer(fichier) {
    const resultat = await this.envoyer('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(fichier, Buffer.from(resultat.data, 'base64'));
    return fs.statSync(fichier).size;
  }

  async fermer() {
    try { this.sock.close(); } catch (e) {}
    try { this.processus.kill('SIGKILL'); } catch (e) {}
    try { this.serveur.close(); } catch (e) {}
    await attendre(400);
    try { fs.rmSync(this.profil, { recursive: true, force: true }); } catch (e) {}
  }
}

// Ouvre une page, attend qu'elle soit pilotable, et rend une session.
async function ouvrir(page, racine, options = {}) {
  const { largeur = 480, hauteur = 360, budget = 0, query = '' } = options;
  const port = await portLibre();
  // Le port du serveur de fichiers doit differer de celui de DevTools : sinon
  // /json/list repond 404 et l'on croit a un navigateur casse.
  let portServeur = await portLibre();
  while (portServeur === port) portServeur = await portLibre();
  const profil = path.join(os.tmpdir(), 'nb-cdp-' + Math.random().toString(36).slice(2, 9));
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
  const serveur = await servir(racine, portServeur, page);

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
    `--window-size=${largeur},${hauteur}`,
    `--user-data-dir=${profil}`,
    `--remote-debugging-port=${port}`,
    `http://127.0.0.1:${portServeur}/${page}${query ? '?' + query : ''}`
  ];
  if (budget > 0) args.splice(3, 0, `--virtual-time-budget=${budget}`);

  const processus = spawn(EDGE, args, { stdio: ['ignore', 'ignore', 'ignore'] });

  let cible = null;
  const limite = Date.now() + 40000;
  while (Date.now() < limite && !cible) {
    const pages = await pagesOuvertes(port);
    // On ne prend PAS la premiere page venue : un navigateur d'un test
    // precedent laisse parfois un onglet a propos d'une page vierge, et s'y
    // connecter donne un document sans localStorage ni page a tester. Le
    // symptome est un "Access is denied for this document" qui n'a rien a voir
    // avec le code que l'on croyait tester.
    cible = pages.find((p) => p.type === 'page' && p.webSocketDebuggerUrl
      && !/^about:/.test(p.url) && p.url.includes(page));
    if (!cible) await attendre(250);
  }
  if (!cible) {
    try { processus.kill('SIGKILL'); } catch (e) {}
    serveur.close();
    try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
    throw new Error('le navigateur n a jamais expose de page pilotable');
  }

  const sock = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((resoudre, rejeter) => {
    sock.addEventListener('open', resoudre, { once: true });
    sock.addEventListener('error', () => rejeter(new Error('connexion DevTools refusee')), { once: true });
  });

  const session = new Session(sock, processus, serveur, profil, port);
  await session.envoyer('Page.enable');
  await session.envoyer('Runtime.enable');

  // On verifie que le documentconnecte est bien la page demandee. Un navigateur
  // d'un test precedent peut laisser un onglet vierge, et /json/list peut
  // annoncer l'URL de la page alors que le document est encore about:blank. On
  // se retrouve alors avec une page sans localStorage : le symptome est un
  // "Access is denied for this document" qui n'a rien a voir avec le test.
  // La query fait partie de l'URL attendue : le mode tactile du jeu se
  // declenche par ?tactile=1, et une navigation qui l'oublierait fait croire
  // au jeu qu'il tourne sur un ordinateur. Le symptome est trompeur : le jeu
  // demarre tres bien, mais aucune commande tactile n existe.
  const attendue = `http://127.0.0.1:${portServeur}/${page}${query ? '?' + query : ''}`;
  const limiteDoc = Date.now() + 15000;
  while (Date.now() < limiteDoc) {
    const href = await session.evaluer('location.href').catch(() => '');
    if (href && href.includes(page)) break;
    if (Date.now() > limiteDoc - 14000) {
      await session.envoyer('Page.navigate', { url: attendue });
    }
    await attendre(200);
  }
  return session;
}

module.exports = { ouvrir, attendre, EDGE };
