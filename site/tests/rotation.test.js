// Rotations 3D de l'animation du satellite et polhodies du solide libre.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applique3, identite3, orthonormalise, pasOrientation, polhodies, produit3 } from '../js/core/rotation.js';

const proche = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);

test('orientation : un quart de tour autour de e₃ envoie e₁ sur e₂', () => {
  const R = pasOrientation(identite3(), [0, 0, 1], Math.PI / 2);
  const v = applique3(R, [1, 0, 0]);
  proche(v[0], 0);
  proche(v[1], 1);
  proche(v[2], 0);
});

test('orientation : R reste orthogonale après de nombreux pas', () => {
  let R = identite3();
  for (let k = 0; k < 2000; k++) R = pasOrientation(R, [0.3, -1.1, 0.7], 0.01);
  R = orthonormalise(R);
  const RRt = produit3(R, R[0].map((_, j) => R.map((l) => l[j])));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) proche(RRt[i][j], i === j ? 1 : 0, 1e-9);
});

test('polhodies : sur la sphère, à énergie constante, et refermées', () => {
  const J = [3, 2, 1];
  const orbites = polhodies(J);
  assert.equal(orbites.length, 14);
  for (const o of orbites) {
    const E = (p) => p[0] ** 2 / J[0] + p[1] ** 2 / J[1] + p[2] ** 2 / J[2];
    const E0 = E(o[0]);
    for (const p of o) {
      proche(Math.hypot(...p), 1, 1e-9);
      proche(E(p), E0, 1e-4);
    }
    proche(Math.hypot(...o[o.length - 2].map((v, i) => v - o[0][i])), 0, 0.03);
  }
});

test('satellite : les côtés du pavé suivent l’ordre inverse des inerties', async () => {
  const { demiCotes } = await import('../js/ui/animations/satellite.js');
  const [a1, a2, a3] = demiCotes([3, 2, 1]);
  // J₁ > J₂ > J₃ : l'axe 1 est le plus court, l'axe 3 le plus long.
  assert.ok(a1 <= a2 && a2 <= a3);
  assert.ok(Math.abs(a3 - 0.8) < 1e-12);
  assert.ok(a1 >= 0.8 * 0.3 - 1e-12);
});
