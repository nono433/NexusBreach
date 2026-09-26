// Verifie la geometrie du test de headshot, en reproduisant a l'identique
// isHeadshotHit() de game.js. Les positions des meshes sont relevees dans
// createEnemy() : body y=0.92 (Icosahedron 0.68, echelle y 0.9),
// chestPlate y=0.95 (Dodecahedron 0.46, echelle y 0.75),
// head y=1.58 (Octahedron headSize), hitbox cylindre r=0.9*radius h=2.05*scale.
import * as THREE from '../wwwroot/vendor/three.module.min.js';

const HEAD_Y = 1.58;
const BODY_TOP = 0.92 + 0.68 * 0.9; // 1.532
const CHEST_TOP = 0.95 + 0.46 * 0.75; // 1.295

function makeEnemy({ headSize, scale = 1, radius = 0.55, headX = 0 }) {
  const root = new THREE.Object3D();
  const head = new THREE.Object3D();
  head.position.set(headX, HEAD_Y, 0.03);
  root.add(head);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  return { head, headRadius: headSize * scale, radius };
}

const headTestCenter = new THREE.Vector3();
const headTestOffset = new THREE.Vector3();

function isHeadshotHit(enemy, hitDistance, raycaster) {
  if (!enemy.head || !enemy.head.parent) return false;
  enemy.head.getWorldPosition(headTestCenter);
  const radius = enemy.headRadius * 0.85;
  headTestCenter.y += enemy.headRadius * 0.25;
  headTestOffset.copy(headTestCenter).sub(raycaster.ray.origin);
  const projection = headTestOffset.dot(raycaster.ray.direction);
  if (projection < 0) return false;
  if (projection > hitDistance + enemy.radius * 0.75 + radius) return false;
  const perpendicularSq = headTestOffset.lengthSq() - projection * projection;
  return perpendicularSq <= radius * radius;
}

const cameraPosition = new THREE.Vector3(0, 1.68, 10);

function buildRay(direction, hitDistance) {
  const raycaster = new THREE.Raycaster();
  raycaster.ray.origin.copy(cameraPosition);
  raycaster.ray.direction.copy(direction);
  return { raycaster, hitDistance };
}

function shootAt(enemy, target) {
  const direction = target.clone().sub(cameraPosition).normalize();
  const { raycaster, hitDistance } = buildRay(direction, cameraPosition.distanceTo(target));
  return isHeadshotHit(enemy, hitDistance, raycaster);
}

let failures = 0;
function expect(label, got, wanted) {
  const pass = got === wanted;
  if (!pass) failures += 1;
  console.log(`  ${pass ? 'OK   ' : 'ECHEC'} ${label.padEnd(42)} attendu=${String(wanted).padEnd(5)} obtenu=${got}`);
}

const standard = makeEnemy({ headSize: 0.39 });
const alpha = makeEnemy({ headSize: 0.56, radius: 1.45 });
const giant = makeEnemy({ headSize: 0.39, scale: 1.75, radius: 0.55 * 1.75 });

console.log('Ennemi standard  (tete 0.39 @ y=1.58, torse jusqu a 1.532)');
expect('viser le centre de la tete', shootAt(standard, new THREE.Vector3(0, 1.58, 0)), true);
expect('viser le haut de la tete', shootAt(standard, new THREE.Vector3(0, 1.85, 0)), true);
expect('viser le bord lateral de la tete (0.28)', shootAt(standard, new THREE.Vector3(0.28, 1.62, 0)), true);
expect('viser la hailleur (hors tete, +0.45)', shootAt(standard, new THREE.Vector3(0.45, 1.62, 0)), false);
expect('viser le plateau (1.295)', shootAt(standard, new THREE.Vector3(0, CHEST_TOP, 0)), false);
expect('viser le torse moyen (0.95)', shootAt(standard, new THREE.Vector3(0, 0.95, 0)), false);
expect('viser le ventre (0.60)', shootAt(standard, new THREE.Vector3(0, 0.6, 0)), false);
expect('viser les jambes (0.20)', shootAt(standard, new THREE.Vector3(0, 0.2, 0)), false);
expect('viser le sommet du crane (1.95)', shootAt(standard, new THREE.Vector3(0, 1.95, 0)), true);

console.log('');
console.log('Alpha / elite  (tete 0.56, rayon 1.45)');
expect('centre de tete', shootAt(alpha, new THREE.Vector3(0, 1.58, 0)), true);
expect('torse', shootAt(alpha, new THREE.Vector3(0, 0.95, 0)), false);

console.log('');
console.log('Titan / grand gabarit  (tete 0.39 x echelle 1.75 = 0.68)');
expect('centre de tete', shootAt(giant, new THREE.Vector3(0, 1.58 * 1.75, 0)), true);
expect('torse', shootAt(giant, new THREE.Vector3(0, 0.92 * 1.75, 0)), false);

console.log('');
console.log('Garde-fou de profondeur (impact plus proche que la tete)');
{
  // Impact a 9.1 alors que la tete est a 10.0 : trop loin derriere, refuse.
  const dir = new THREE.Vector3(0, 1.58, 0).sub(cameraPosition).normalize();
  const { raycaster, hitDistance } = buildRay(dir, 9.1);
  expect('impact 0.9u avant la tete', isHeadshotHit(standard, hitDistance, raycaster), false);
  const close = buildRay(dir, 9.95);
  expect('impact 0.05u avant la tete', isHeadshotHit(standard, close.hitDistance, close.raycaster), true);
}
{
  // Rayon dirigee vers l'arriere : la tete ne doit pas compter.
  const dir = new THREE.Vector3(0, 1.58, -6).sub(cameraPosition).normalize();
  const { raycaster, hitDistance } = buildRay(dir, 6.5);
  expect('ennemi tourne dos, vise dans le vide au-dela', isHeadshotHit(standard, hitDistance, raycaster), false);
}

console.log('');
console.log(failures === 0 ? 'TOUS LES CAS CONFORMES' : `${failures} CAS EN ECHEC`);
process.exitCode = failures === 0 ? 0 : 1;

