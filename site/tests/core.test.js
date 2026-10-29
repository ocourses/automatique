// Tests de core/ : les résultats doivent retrouver ceux du poly et des TD.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { euler, integre, rk4 } from '../socle/js/core/ode.js';
import { kalman, linearise, matadd, matmul, rang, valeursPropres } from '../js/core/linalg.js';
import { Simulation } from '../js/core/sim.js';
import pendule from '../js/exemples/pendule-couple.js';

const proche = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('RK4 et Euler sur ẋ = x', () => {
  const F = (t, x) => [x[0]];
  proche(integre(rk4, F, 0, [1], 1, 1e-2)[0], Math.E, 1e-8);
  proche(integre(euler, F, 0, [1], 1, 1e-4)[0], Math.E, 1e-3);
});

test('valeurs propres : cas réels, complexes et de taille 4', () => {
  // TD2 : θ̈ − θ = u, A = [[0, 1], [1, 0]], valeurs propres ±1.
  const vp = valeursPropres([[0, 1], [1, 0]]);
  proche(vp[0].re, -1);
  proche(vp[1].re, 1);
  // Oscillateur : ±i.
  const osc = valeursPropres([[0, 1], [-1, 0]]);
  osc.forEach((z) => proche(Math.abs(z.im), 1));
  osc.forEach((z) => proche(z.re, 0));
  // Matrice compagnon de (λ+1)(λ+2)(λ+3)(λ+4) = λ⁴ + 10λ³ + 35λ² + 50λ + 24.
  const C = [
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
    [-24, -50, -35, -10],
  ];
  valeursPropres(C).forEach((z, i) => {
    proche(z.re, -4 + i, 1e-8);
    proche(z.im, 0, 1e-8);
  });
});

test('critère de Kalman', () => {
  assert.equal(rang(kalman([[0, 1], [0, 0]], [[0], [1]])), 2);
  assert.equal(rang(kalman([[1, 0], [0, 2]], [[1], [0]])), 1);
});

test('pendule : linéarisé et condition k₁ > mgl, k₂ > 0 du poly', () => {
  const p = { m: 2, l: 0.5, g: 9.81 };
  const { A, B } = linearise(pendule.f, [0, 0], [0], p);
  proche(A[0][0], 0);
  proche(A[0][1], 1);
  proche(A[1][0], p.g / p.l);
  proche(A[1][1], 0);
  proche(B[0][0], 0);
  proche(B[1][0], -1 / (p.m * p.l * p.l));
  assert.equal(rang(kalman(A, B)), 2);

  const mgl = p.m * p.g * p.l;
  const maxRe = (K) => Math.max(...valeursPropres(matadd(A, matmul(B, K))).map((z) => z.re));
  assert.ok(maxRe([[mgl + 1, 1]]) < 0);
  assert.ok(maxRe([[mgl - 1, 1]]) > 0);
  assert.ok(maxRe([[mgl + 1, -1]]) > 0);
});

test('TD2 : u = k₁θ + k₂θ̇ stabilise θ̈ − θ = u ssi k₁ < −1 et k₂ < 0', () => {
  const A = [[0, 1], [1, 0]];
  const B = [[0], [1]];
  const maxRe = (k1, k2) => Math.max(...valeursPropres(matadd(A, matmul(B, [[k1, k2]]))).map((z) => z.re));
  assert.ok(maxRe(-2, -1) < 0);
  assert.ok(maxRe(-0.5, -1) > 0);
  assert.ok(maxRe(-2, 1) > 0);
});

test('simulation : le pendule bouclé revient à la verticale', () => {
  const sim = new Simulation(pendule);
  sim.reinitialise([0.3, 0]);
  sim.avance(10);
  assert.ok(!sim.diverge);
  proche(sim.x[0], 0, 1e-3);
  proche(sim.x[1], 0, 1e-3);
  proche(sim.t, 10, 1e-9);
});

test('simulation : sans sur-correction de la gravité, le pendule tombe', () => {
  const sim = new Simulation(pendule);
  sim.fixeGain(0, 0, 5); // k₁ < mgl ≈ 9,81
  sim.reinitialise([0.05, 0]);
  sim.avance(5);
  assert.ok(Math.abs(sim.x[0]) > 1);
});


test('valeurs propres d’un système raide : racines distinctes de tailles très différentes', () => {
  // Matrice compagnon de racines −136,5905 ; −5,9946 ; −3,5026 ; −2,6555 (pôles du TP du segway) :
  // les coefficients dépassent 10⁴, ce qui ne doit pas faire fusionner des racines distinctes.
  const racines = [-136.5905, -5.9946, -3.5026, -2.6555];
  const c = [1];
  for (const r of racines) {
    c.push(0);
    for (let k = c.length - 1; k > 0; k--) c[k] -= r * c[k - 1];
  }
  const C = [[0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [-c[4], -c[3], -c[2], -c[1]]];
  const vp = valeursPropres(C).map((z) => z.re).sort((a, b) => a - b);
  racines.forEach((r, i) => proche(vp[i], r, 1e-6 * Math.abs(r)));
  valeursPropres(C).forEach((z) => proche(z.im, 0, 1e-9));
  // Une racine nulle et une racine positive, comme pour le segway en boucle ouverte.
  const vp2 = valeursPropres([[0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [0, 0, 1600, -240]]);
  assert.equal(vp2.filter((z) => Math.abs(z.re) < 1e-6).length, 2);
});

test('une racine multiple reste exacte à côté d’une racine éloignée', () => {
  // (λ + 1)³ (λ + 100) : le paquet des trois racines voisines de −1 est regroupé, pas la racine −100.
  const c = [1, 103, 303, 301, 100];
  const vp = valeursPropres([[0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [-c[4], -c[3], -c[2], -c[1]]]).map((z) => z.re).sort((a, b) => a - b);
  proche(vp[0], -100, 1e-6);
  [1, 2, 3].forEach((i) => proche(vp[i], -1, 1e-9));
});
