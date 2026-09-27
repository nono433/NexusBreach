// Verifie que le gardien de demarrage est bien en ligne. Ecrit dans un
// fichier : passer ce script via node -e dans PowerShell casse des que le
// texte contient des apostrophes, et une verification qui ne s'execute pas
// ne vaut rien.
(async () => {
  const b = 'b=' + Date.now();
  const base = 'https://nono433.github.io/NexusBreach/';

  const html = await (await fetch(base + 'index.html?' + b)).text();
  const js = await (await fetch(base + 'game.js?' + b)).text();

  console.log('  index.html :', html.length, 'caracteres');
  for (const t of ['__nexus', 'DEMARRAGE IMPOSSIBLE', 'moduleTouche', 'Ctrl+Maj+R']) {
    console.log('    ' + t.padEnd(26) + (html.split(t).length - 1));
  }
  console.log('  game.js :', js.length, 'caracteres');
  for (const t of ['__nexus', 'moduleTouche', '__nexus.pret', "L'initialisation du jeu a echoue"]) {
    console.log('    ' + t.padEnd(26) + (js.split(t).length - 1));
  }

  // La version du cache est verifiee par motif, jamais figee : ce test
  // exigeait game.js?v=15 et a echoue apres le passage en v=18, alors que le
  // gardien etait bien en ligne. Un test qui casse parce qu'il fige une
  // valeur qui change legitimement est un mauvais test.
  const version = (html.match(/game\.js\?v=(\d+)/) || [])[1];
  const versionPresente = Boolean(version);

  const okHtml = ['__nexus', 'DEMARRAGE IMPOSSIBLE', 'Ctrl+Maj+R'].every((t) => html.includes(t));
  const okJs = ['__nexus', 'moduleTouche', '__nexus.pret'].every((t) => js.includes(t));
  const ok = okHtml && okJs && versionPresente;
  console.log('  version game.js : v' + (version || 'ABSENTE'));
  console.log('\n' + (ok ? 'GARDIEN EN LIGNE.' : 'GARDIEN ABSENT OU INCOMPLET.'));
  process.exit(ok ? 0 : 1);
})();
