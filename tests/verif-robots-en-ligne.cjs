// Verifie que le nouveau gabarit d'ennemis est bien celui servi en ligne.
// Un push reussi ne prouve pas que Pages sert la bonne version : le navigateur
// peut servir un game.js?v= mis en cache. On verifie donc la presence des
// marqueurs du robot, et pas seulement que le sha correspond.
(async () => {
  const b = 'b=' + Date.now();
  const base = 'https://nono433.github.io/NexusBreach/';
  const html = await (await fetch(base + 'index.html?' + b)).text();
  const js = await (await fetch(base + 'game.js?' + b)).text();

  const MARQUEURS = [
    'function buildHumanoid',
    'function mergeBoxParts',
    'function animerBras',
    'const LISERE = 0.024;',
    'const BRAS_ARME = 1.35;',
    'materials.trim',
    'materials.visor',
    'armement',
    'BoxGeometry(template.radius * 1.75'
  ];

  const version = (html.match(/game\.js\?v=(\d+)/) || [])[1];
  console.log('  game.js?v=' + version);
  let manquants = 0;
  for (const marqueur of MARQUEURS) {
    const n = js.split(marqueur).length - 1;
    if (n === 0) manquants += 1;
    console.log('  ' + (n > 0 ? 'OK  ' : 'MANQUE') + ' ' + marqueur.padEnd(34) + n);
  }

  // L'ancien gabarit doit avoir disparu : les deux ne doivent pas cohabiter,
  // sinon le rendu dependrait de l'ordre d'initialisation.
  const ancien = js.includes('IcosahedronGeometry(0.68, 1)');
  console.log('  ' + (ancien ? 'ANCIEN' : 'OK  ') + '  ancien corps icosaedrique absent');
  if (ancien) manquants += 1;

  console.log('\n  ' + (manquants === 0
    ? 'LE GABARIT ROBOT EST EN LIGNE.'
    : manquants + ' MARQUEUR(S) ABSENT(S) : le site sert encore l ancienne version.'));
  process.exit(manquants === 0 ? 0 : 1);
})();
