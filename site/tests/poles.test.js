// Tests du placement de pôles (Ackermann) et du déplacement des valeurs propres.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { linearise, matadd, matmul, valeursPropres } from '../js/core/linalg.js';
import { ackermann, deplaceValeurPropre, polynomeDepuisRacines } from '../js/core/poles.js';
import pendule from '../js/exemples/pendule-couple.js';

const proche = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const z = (re, im = 0) => ({ re, im });

test('polynôme depuis ses racines', () => {
  assert.deepEqual(polynomeDepuisRacines([z(-2, 1), z(-2, -1)]), [1, 4, 5]);
  assert.deepEqual(polynomeDepuisRacines([z(-1), z(-2), z(-3)]), [1, 6, 11, 6]);
});

test('Ackermann sur le pendule : retrouve les gains du poly', () => {
  // det(λI − (A + BK)) = λ² + (k₂/ml²) λ + k₁/ml² − g/l ; pour λ = −2 ± i,
  // λ² + 4λ + 5 donne k₂ = 4 ml² et k₁ = ml² (5 + g/l).
  const p = { m: 2, l: 0.5, g: 9.81 };
  const { A, B } = linearise(pendule.f, [0, 0], [0], p);
  const K = ackermann(A, B, [z(-2, 1), z(-2, -1)]);
  const ml2 = p.m * p.l * p.l;
  proche(K[0][0], ml2 * (5 + p.g / p.l), 1e-5);
  proche(K[0][1], 4 * ml2, 1e-5);
  const vp = valeursPropres(matadd(A, matmul(B, K)));
  vp.forEach((v) => proche(v.re, -2, 1e-5));
  vp.forEach((v) => proche(Math.abs(v.im), 1, 1e-5));
});

test('Ackermann en dimension 3', () => {
  const A = [
    [0, 1, 0],
    [0, 0, 1],
    [1, -2, 3],
  ];
  const B = [[0], [0], [1]];
  const voulues = [z(-1), z(-2, 3), z(-2, -3)];
  const vp = valeursPropres(matadd(A, matmul(B, ackermann(A, B, voulues))));
  proche(vp[0].re, -2, 1e-7);
  proche(vp[2].re, -1, 1e-7);
  proche(Math.abs(vp[0].im), 3, 1e-7);
});

test('déplacement : une complexe entraîne sa conjuguée', () => {
  const vp = deplaceValeurPropre([z(-2, -1), z(-2, 1)], 1, z(-3, 2), 0.1);
  assert.deepEqual(vp, [z(-3, -2), z(-3, 2)]);
});

test('déplacement : près de l’axe réel, la paire devient une racine double', () => {
  const vp = deplaceValeurPropre([z(-2, -1), z(-2, 1)], 1, z(-3, 0.05), 0.1);
  assert.deepEqual(vp, [z(-3), z(-3)]);
});

test('déplacement : près de l’axe imaginaire, imaginaire pur', () => {
  const vp = deplaceValeurPropre([z(-2, -1), z(-2, 1)], 0, z(0.05, -2), 0.1);
  assert.deepEqual(vp, [z(0, -2), z(0, 2)]);
});

test('déplacement : une réelle glisse sur l’axe, ou emmène la plus proche', () => {
  // Racine double : on en déplace une, l'autre reste.
  assert.deepEqual(deplaceValeurPropre([z(-3), z(-3)], 0, z(-1, 0.05), 0.1), [z(-1), z(-3)]);
  // Hors de l'axe : la réelle la plus proche devient la conjuguée.
  assert.deepEqual(deplaceValeurPropre([z(-1), z(-4), z(-5)], 1, z(-3, 2), 0.1), [z(-1), z(-3, 2), z(-3, -2)]);
  // Seule réelle (n = 3, une paire complexe) : elle reste sur l'axe.
  assert.deepEqual(deplaceValeurPropre([z(-1), z(-2, 1), z(-2, -1)], 0, z(-3, 2), 0.1), [z(-3), z(-2, 1), z(-2, -1)]);
});

test('gains diagonaux : une valeur propre se place sur l’axe réel en réglant le gain de son axe', async () => {
  const { axeDeValeurPropre, gainPourValeurPropre } = await import('../js/core/poles.js');
  const J = [3, 2, 1];
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const B = J.map((v, i) => J.map((_, j) => (i === j ? 1 / v : 0)));
  const K = [[-2, 0, 0], [0, -2, 0], [0, 0, -2]];
  // Valeurs propres k_i/J_i : −2/3, −1, −2.
  assert.equal(axeDeValeurPropre(A, B, K, -1), 1);
  assert.equal(axeDeValeurPropre(A, B, K, -2), 2);
  assert.equal(axeDeValeurPropre(A, B, K, -0.6), 0);
  // Placer −3 sur l'axe 1 (J = 3) : k = −9 ; hors bornes, on borne.
  assert.ok(Math.abs(gainPourValeurPropre(A, B, 0, -3) + 9) < 1e-12);
  assert.equal(gainPourValeurPropre(A, B, 0, -9, { min: -10, max: 2 }), -10);
  assert.equal(gainPourValeurPropre(A, B, 2, 5, { min: -10, max: 2 }), 2);
});
