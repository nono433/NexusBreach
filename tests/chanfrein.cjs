// Verifie le pave chanfreine et fusele, hors du navigateur.
//
// Une geometrie dont l'orientation est fausse s'affiche quand meme : trois
// faces sur quatre eclairées a l'envers donnent un rendu bizarre, pas une
// erreur. La capture le montrerait sans dire pourquoi. On verifie donc les
// nombres, qui sont lisibles.
//
// Ce qui est verifie, pour la boite droite ET pour la boite fuselee :
//   1. 44 triangles : 6 faces, 12 aretes, 8 coins. La pente ne change pas la
//      topologie, seulement la position des sommets ;
//   2. CHAQUE triangle a sa normale alignee avec sa normale geometrique,
//      donc eclairé du bon cote ;
//   3. toutes les normales sont unitaires ;
//   4. la boite droite fait bien 1 x 1 x 1 ;
//   5. la boite fuselee s'elargit vers le HAUT.
//
// Le point 5 est celui qui a deja manque. Le sens de la pente a ete pris a
// l'envers une premiere fois : le pave s'elargissait vers le bas, le buste
// devenait une jupe. Aucun controle de structure ne l'aurait vu — le nombre de
// triangles etait bon, les normales etaient alignees, et le robot avait l'air
// d'avoir passe par un defaut de posture. Seul un test qui regarde la bonne
// propiedad le trouve.
const fs = require('node:fs');
const path = require('node:path');

// La fonction est extraite du jeu et executee telle quelle, avec une doublure
// de THREE. Extraire plutot que recopier : une copie divergerait du jeu, et le
// test validerait autre chose que ce qui tourne.
const source = fs.readFileSync(path.join(__dirname, '..', 'wwwroot', 'game.js'), 'utf8');
const debut = source.indexOf('function creerPaveChanfreine(');
const fin = source.indexOf('// La boite droite :');
if (debut < 0 || fin < 0 || fin <= debut) {
  console.log('  fonction introuvable dans game.js');
  process.exit(1);
}
const corps = source.slice(debut, fin);

const DOUBLURE = {
  BufferGeometry: class {
    constructor() { this.attributes = {}; }
    setAttribute(nom, a) { this.attributes[nom] = a; }
  },
  Float32BufferAttribute: class {
    constructor(valeurs, taille) {
      this.array = Float32Array.from(valeurs);
      this.itemSize = taille;
    }
    get count() { return this.array.length / this.itemSize; }
    getX(i) { return this.array[i * this.itemSize]; }
    getY(i) { return this.array[i * this.itemSize + 1]; }
    getZ(i) { return this.array[i * this.itemSize + 2]; }
  }
};

const creer = new Function('THREE', corps + '\nreturn creerPaveChanfreine;')(DOUBLURE);

function examiner(fusee) {
  const g = creer(0.07, fusee);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const problemes = [];

  if (pos.count / 3 !== 44) {
    problemes.push('nombre de triangles inattendu : ' + pos.count / 3);
  }
  if (nor.count !== pos.count) {
    problemes.push('normales et positions different de longueur : '
      + nor.count + ' contre ' + pos.count
      + '. Sans normales, le moteur invente un eclairage.');
  }

  let desalignees = 0;
  let nonUnitaires = 0;
  let degeneres = 0;
  let minX = Infinity; let maxX = -Infinity;
  let minY = Infinity; let maxY = -Infinity;
  let minZ = Infinity; let maxZ = -Infinity;
  let largeurEnHaut = 0;
  let largeurEnBas = 0;

  for (let t = 0; t < pos.count / 3; t += 1) {
    const i = t * 3;
    const p = [[pos.getX(i), pos.getY(i), pos.getZ(i)],
      [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)],
      [pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2)]];
    const n = [nor.getX(i), nor.getY(i), nor.getZ(i)];

    for (const v of p) {
      minX = Math.min(minX, v[0]); maxX = Math.max(maxX, v[0]);
      minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]);
      minZ = Math.min(minZ, v[2]); maxZ = Math.max(maxZ, v[2]);
      if (v[1] > 0.4) largeurEnHaut = Math.max(largeurEnHaut, Math.abs(v[0]));
      if (v[1] < -0.4) largeurEnBas = Math.max(largeurEnBas, Math.abs(v[0]));
    }

    const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
    const v = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const lc = Math.hypot(c[0], c[1], c[2]);
    if (lc < 1e-9) { degeneres += 1; continue; }
    const ln = Math.hypot(n[0], n[1], n[2]);
    if (Math.abs(ln - 1) > 1e-5) nonUnitaires += 1;
    const produit = (c[0] * n[0] + c[1] * n[1] + c[2] * n[2]) / (lc * ln);
    if (produit < 0.999) desalignees += 1;
  }

  if (desalignees > 0) {
    problemes.push(desalignees + ' triangle(s) a normale opposee : eclairage faux');
  }
  if (nonUnitaires > 0) problemes.push(nonUnitaires + ' normale(s) non unitaire(s)');
  if (degeneres > 0) problemes.push(degeneres + ' triangle(s) degenere(s)');

  // La hauteur ne change jamais : la pente est horizontale.
  if (Math.abs(maxY - minY - 1) > 1e-5) {
    problemes.push('hauteur inattendue : ' + (maxY - minY).toFixed(3));
  }

  if (fusee === 0) {
    if (Math.abs(maxX - minX - 1) > 1e-5) {
      problemes.push('largeur inattendue pour une boite droite : '
        + (maxX - minX).toFixed(3));
    }
    if (Math.abs(largeurEnHaut - largeurEnBas) > 1e-5) {
      problemes.push('une boite droite ne doit pas avoir de pente');
    }
  } else {
    if (!(largeurEnHaut > largeurEnBas)) {
      problemes.push('la piece ne s elargit PAS vers le haut : haut '
        + largeurEnHaut.toFixed(3) + ', bas ' + largeurEnBas.toFixed(3)
        + '. Le buste deviendrait une jupe et les membres des entonnoirs.');
    }
    // La largeur maximale n'est pas 1 + fusee : le point le plus large est
    // l'arête haute du chanfrein, pas le sommet de la face. Il se trouve a
    // y = 0,5 - chanfrein, donc le facteur de pente y vaut 1 + fusee x
    // (1 - 2 x chanfrein). Attendre 1 + fusee, c'est attendre un pave non
    // chanfreiné.
    const CHANFREIN = 0.07;
    const largeurAttendue = 1 + fusee * (1 - 2 * CHANFREIN);
    if (Math.abs(maxX - minX - largeurAttendue) > 0.01) {
      problemes.push('largeur hors de la valeur annoncee : '
        + (maxX - minX).toFixed(3) + ' au lieu de ' + largeurAttendue.toFixed(3));
    }
  }

  return { problemes, triangles: pos.count / 3, desalignees, largeurEnHaut, largeurEnBas };
}

const problemes = [];

console.log('  --- boite droite (fusee 0) ---');
const droite = examiner(0);
console.log('    triangles : ' + droite.triangles
  + '   normales desalignees : ' + droite.desalignees);
problemes.push(...droite.problemes.map((p) => 'droite : ' + p));

console.log('  --- boite fuselee (fusee 0,16) ---');
const fuselee = examiner(0.16);
console.log('    triangles : ' + fuselee.triangles
  + '   normales desalignees : ' + fuselee.desalignees
  + '   demi-largeur haut ' + fuselee.largeurEnHaut.toFixed(3)
  + '  bas ' + fuselee.largeurEnBas.toFixed(3));
problemes.push(...fuselee.problemes.map((p) => 'fuselee : ' + p));

if (problemes.length) {
  console.log('\n  PROBLEMES :');
  problemes.forEach((p) => console.log('   - ' + p));
  process.exit(1);
}
console.log('\n  LE PAVE EST CORRECT : DROIT, ET FUSELE VERS LE HAUT.');
