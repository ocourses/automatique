// Vue 3D et caméra : projection d'un point du domaine [zmin, zmax], facettes,
// refus d'un domaine vide, rotation qui conserve les longueurs.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fauxCanevas } from './aides/faux-canevas.js';
import { installeDom, installeStyleCalcule } from './aides/faux-dom.js';

installeDom();
installeStyleCalcule();
const { Camera } = await import('../js/ui/camera3d.js');
const { Vue3D } = await import('../js/ui/vue3d.js');

const proche = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

// Vue de profil (élévation 0, azimut 0) : l'ordonnée à l'écran est la hauteur seule.
function vue(options = {}) {
  const v = new Vue3D(fauxCanevas({ largeur: 340, hauteur: 340 }), { x: [0, 1], y: [0, 1], zmax: 2, azimut: 0, elevation: 0, ...options });
  assert.ok(v.prepare());
  return v;
}

test('Vue3D.projette : [zmin, zmax] occupe la hauteur [−0,6 ; 0,6] du cube', () => {
  const v = vue({ zmin: -2 });
  const centre = v.rect.height / 2;
  proche(v.projette(0.5, 0.5, 0).py, centre);
  proche(v.projette(0.5, 0.5, 2).py, centre - 0.6 * v.echelle);
  proche(v.projette(0.5, 0.5, -2).py, centre + 0.6 * v.echelle);
});

test('Vue3D.projette : un z hors du domaine est ramené au bord', () => {
  const v = vue({ zmin: -2 });
  proche(v.projette(0.5, 0.5, 50).py, v.projette(0.5, 0.5, 2).py);
  proche(v.projette(0.5, 0.5, -50).py, v.projette(0.5, 0.5, -2).py);
});

test('Vue3D : par défaut zmin vaut 0, les valeurs négatives sont ramenées à 0', () => {
  const v = vue();
  proche(v.projette(0.5, 0.5, -1).py, v.projette(0.5, 0.5, 0).py);
  assert.ok(v.projette(0.5, 0.5, 2).py < v.projette(0.5, 0.5, 0).py);
});

test('Vue3D : un domaine vide est refusé, à la construction et ensuite', () => {
  assert.throws(() => vue({ zmax: 1, zmin: 1 }), RangeError);
  assert.throws(() => vue({ zmax: 0, zmin: 1 }), RangeError);
  assert.throws(() => vue().fixeDomaine([0, 1], [0, 1], 0, 0), RangeError);
  assert.doesNotThrow(() => vue().fixeDomaine([0, 1], [0, 1], 3, -1));
});

test('Vue3D.facettes : n × n facettes, hauteurs bornées au domaine', () => {
  const v = vue({ zmin: -1, zmax: 1 });
  const f = v.facettes((x, y) => 10 * (x - y), { n: 4 });
  assert.equal(f.length, 16);
  assert.ok(f.every(({ z }) => z >= -1 && z <= 1));
  assert.ok(f.some(({ z }) => z === 1) && f.some(({ z }) => z === -1));
});

test('Vue3D.facettes : `pave` restreint le domaine échantillonné', () => {
  const v = vue();
  const f = v.facettes((x) => x, { n: 2, pave: [[0, 0.5], [0, 1]] });
  assert.ok(f.every(({ z }) => z <= 0.5));
});

test('Vue3D.dessineFacettes : ne modifie pas le tableau reçu, dessine de loin en près', () => {
  const v = vue();
  const facettes = [
    { q: Array(4).fill({ px: 1, py: 1 }), prof: 1, z: 0, teinte: 215, alpha: 1 },
    { q: Array(4).fill({ px: 2, py: 2 }), prof: 9, z: 0, teinte: 215, alpha: 1 },
  ];
  v.dessineFacettes(facettes);
  assert.deepEqual(facettes.map((f) => f.prof), [1, 9]);
  const departs = v.ctx.appels.filter((a) => a.nom === 'moveTo').map((a) => a.args[0]);
  assert.deepEqual(departs, [2, 1]);
});

test('Camera.tourne : une rotation conserve la longueur', () => {
  for (const [azimut, elevation] of [[0, 0], [-0.7, 0.5], [2.1, -1.2], [3, 1.5]]) {
    const c = new Camera({ azimut, elevation });
    const [u, v, w] = [0.3, -0.8, 1.1];
    const { X, H, prof } = c.tourne(u, v, w);
    proche(X * X + H * H + prof * prof, u * u + v * v + w * w);
  }
});

test('Camera.tourne : de profil, l’abscisse, la profondeur et la hauteur sont celles du point', () => {
  const { X, H, prof } = new Camera({ azimut: 0, elevation: 0 }).tourne(0.3, -0.8, 1.1);
  assert.deepEqual([X, H, prof], [0.3, 1.1, -0.8]);
});

test('Camera.attache : l’élévation reste dans ses bornes pendant le geste', () => {
  const canevas = fauxCanevas();
  const c = new Camera({ azimut: 0, elevation: 0.5, elevations: [0.05, 1.5] }).attache(canevas);
  canevas.dispatchEvent({ type: 'pointerdown', clientX: 0, clientY: 0, pointerId: 1 });
  canevas.dispatchEvent({ type: 'pointermove', clientX: 100, clientY: 10000 });
  assert.equal(c.elevation, 1.5);
  canevas.dispatchEvent({ type: 'pointermove', clientX: 100, clientY: -10000 });
  assert.equal(c.elevation, 0.05);
  proche(c.azimut, 1);
  canevas.dispatchEvent({ type: 'pointerup' });
  canevas.dispatchEvent({ type: 'pointermove', clientX: 500, clientY: 0 });
  proche(c.azimut, 1);
});
