// Robot Lego segway (TP) : le modèle est comparé à fonction.m rejoué sous Octave,
// avec les deux signes corrigés dans θ̈ (voir l'en-tête de js/exemples/segway.js).
// Les valeurs de référence viennent de ce calcul : jacobienne par différences
// centrées de fonction.m corrigé, gain -place(A, B, poles) et ode45 à RelTol 1e-11.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Simulation } from '../js/core/sim.js';
import segway from '../js/exemples/segway.js';

const proche = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const relatif = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test('le segway est en équilibre à ψ = 0, quelle que soit la position θ des roues', () => {
  const sim = new Simulation(segway);
  sim.f0 = segway.f([0, 0, 0, 0], [0], sim.p);
  sim.f0.forEach((v) => proche(v, 0, 1e-12));
  segway.f([3.7, 0, 0, 0], [0], sim.p).forEach((v) => proche(v, 0, 1e-12));
  // θ n'intervient pas : la première colonne de A est nulle.
  sim.A.forEach((ligne) => proche(ligne[0], 0, 1e-6));
});

test('linéarisé : mêmes coefficients que fonction.m corrigé, rejoué sous Octave', () => {
  const { A, B } = new Simulation(segway);
  relatif(A[2][1], -409.71841242, 1e-6);
  relatif(A[2][2], -162.1272879, 1e-6);
  relatif(A[2][3], 162.1272879, 1e-6);
  relatif(A[3][1], 269.62733932, 1e-6);
  relatif(A[3][2], 78.14959139, 1e-6);
  relatif(A[3][3], -78.14959139, 1e-6);
  relatif(B[2][0], 315.15968373, 1e-6);
  relatif(B[3][0], -151.91520703, 1e-6);
});

test('les termes de gravité du linéarisé retrouvent ceux de matrices.m', () => {
  // A₃₂ = −MgL E₁₂/det E et A₄₂ = MgL E₁₁/det E, avec E la matrice d'inertie du TP.
  const { A } = new Simulation(segway);
  const M = 0.6, L = 0.072, R = 0.04, m = 0.03, Jm = 1e-5, g = 9.81;
  const Jw = (m * R * R) / 2, Jpsi = (M * L * L) / 3;
  const E11 = (2 * m + M) * R * R + 2 * Jw + 2 * Jm;
  const E12 = M * L * R - 2 * Jm;
  const E22 = M * L * L + Jpsi + 2 * Jm;
  const det = E11 * E22 - E12 * E12;
  relatif(A[2][1], (-M * g * L * E12) / det, 1e-9);
  relatif(A[3][1], (M * g * L * E11) / det, 1e-9);
});

test('en boucle ouverte, le corps tombe (valeur propre positive) et θ donne une valeur propre nulle', () => {
  const sim = new Simulation(segway);
  const vp = sim.vpA.map((z) => z.re).sort((a, b) => a - b);
  assert.ok(vp[0] < -200 && vp[1] < -5);
  proche(vp[2], 0, 1e-6);
  relatif(vp[3], 7.4366, 1e-3);
  sim.fixeGains([[0, 0, 0, 0]]);
  sim.reinitialise(segway.x0);
  sim.avance(1);
  assert.ok(Math.abs(sim.x[1]) > 1, 'le corps est tombé');
});

test('gains par défaut : placement des pôles du TP, retrouvant le gain Octave', () => {
  const sim = new Simulation(segway);
  const K = sim.K[0];
  relatif(K[0], 0.3350092497, 1e-4);
  relatif(K[1], 13.7008575977, 1e-4);
  relatif(K[2], 0.7945694751, 1e-4);
  relatif(K[3], 1.0458635991, 1e-4);
  const vp = sim.vpBF.map((z) => z.re).sort((a, b) => a - b);
  [-136.5905, -5.9946, -3.5026, -2.6555].forEach((p, i) => relatif(vp[i], p, 1e-4));
  // La loi libre par défaut est ce même gain, écrit à 4 chiffres.
  const libre = new Simulation(segway);
  libre.fixeMode('loi');
  assert.equal(libre.erreurLoi, null);
  assert.equal(libre.equilibreBoucle, true);
  libre.vpBF.forEach((z) => assert.ok(z.re < 0));
});

test('simulation non linéaire du TP (x₀ = [0, π/10, 0, 0]) : même trajectoire que ode45', () => {
  const sim = new Simulation(segway);
  sim.reinitialise([0, Math.PI / 10, 0, 0]);
  const ref = [
    [0.1, [0.7309355, 0.05025822, 6.5623378, -1.79965606], 4.26548947],
    [0.25, [1.39538464, -0.07508197, 2.53033833, -0.20200561], 1.23803867],
    [0.5, [1.51796135, -0.04830164, -0.92089128, 0.20914236], -0.66622051],
    [1, [0.76432752, 0.00837669, -1.41637438, 0.02704794], -0.72629474],
    [2, [0.08357769, 0.00331004, -0.20264236, -0.00691193], -0.09489268],
  ];
  let t = 0;
  for (const [tt, x, u] of ref) {
    sim.avance(tt - t);
    t = tt;
    x.forEach((v, i) => proche(sim.x[i], v, 2e-3));
    proche(sim.commande()[0], u, 2e-3);
  }
});

test('le robot du TP se redresse depuis 18° sans saturer à 8 V, et se stabilise', () => {
  const sim = new Simulation(segway);
  sim.saturation = { active: true, umax: 8 };
  sim.evenements = [];
  sim.reinitialise(segway.x0);
  sim.avance(8);
  assert.ok(!sim.diverge);
  sim.x.forEach((v) => proche(v, 0, 1e-3));
  assert.ok(Math.max(...sim.historique.u[0].map(Math.abs)) < 8);
  assert.ok(!sim.evenements.some((e) => e.texte.startsWith('Saturation atteinte')));
  assert.ok(sim.evenements.some((e) => e.texte.startsWith('Entrée dans la boule')));
});

test('une saturation trop basse (3 V) ne suffit plus à rattraper un corps incliné de 18°', () => {
  const sim = new Simulation(segway);
  sim.saturation = { active: true, umax: 3 };
  sim.reinitialise(segway.x0);
  sim.avance(5);
  assert.ok(Math.abs(sim.x[1]) > 0.5, 'le corps tombe : le bassin d’attraction a rétréci');
});

test('exemple épuré : deux paramètres, quatre gains, pas de sortie particulière', () => {
  assert.equal(segway.parametres.length, 2);
  assert.equal(segway.sansSortie, true);
  assert.equal(segway.bornesGains[0].length, 4);
});
