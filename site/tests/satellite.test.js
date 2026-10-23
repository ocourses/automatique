// Satellite (examen 2017-2018) : retour d'état diagonal et fonction V des équations d'Euler.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Simulation } from '../js/core/sim.js';
import { indications } from '../js/ui/hints.js';
import { rang, kalman } from '../js/core/linalg.js';
import satellite from '../js/exemples/satellite.js';

const proche = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const V = (sim, w = sim.x) => sim.p.J1 * w[0] ** 2 + sim.p.J2 * w[1] ** 2 + sim.p.J3 * w[2] ** 2;
const avecGains = (k) => {
  const sim = new Simulation(satellite);
  sim.fixeGains([[k[0], 0, 0], [0, k[1], 0], [0, 0, k[2]]]);
  return sim;
};

test('question 1 : f(ω, u) = ((J₂−J₃)ω₂ω₃ + u₁)/J₁, …', () => {
  const p = { J1: 3, J2: 2, J3: 1 };
  const f = satellite.f([1, 2, 3], [0.3, 0.6, 0.9], p);
  proche(f[0], ((2 - 1) * 2 * 3 + 0.3) / 3);
  proche(f[1], ((1 - 3) * 3 * 1 + 0.6) / 2);
  proche(f[2], ((3 - 2) * 1 * 2 + 0.9) / 1);
});

test('question 2 : J_g(0) = diag(k_i/J_i), commandable, Hurwitz ssi k_i < 0', () => {
  const sim = avecGains([-3, -4, -5]);
  const D = [-3 / 3, -4 / 2, -5 / 1];
  sim.Jbf.forEach((ligne, i) => ligne.forEach((v, j) => proche(v, i === j ? D[i] : 0, 1e-6)));
  assert.equal(rang(kalman(sim.A, sim.B)), 3);
  assert.ok(sim.vpBF.every((z) => z.re < 0));
  for (const k of [[1, -2, -2], [-2, 0, -2], [-2, -2, 0.5]]) {
    assert.ok(avecGains(k).vpBF.some((z) => z.re >= -1e-9), k.join());
  }
});

test('question 2 : le bouclé converge vers 0 pour k_i < 0', () => {
  const sim = avecGains([-2, -2, -2]);
  sim.avance(30);
  sim.x.forEach((v) => proche(v, 0, 1e-3));
});

test('question 3 : sans contrôle, la jacobienne est nulle (la linéarisation ne conclut pas)', () => {
  const sim = avecGains([0, 0, 0]);
  sim.A.forEach((l) => l.forEach((v) => proche(v, 0, 1e-6)));
  const textes = indications(sim).map((i) => i.texte);
  assert.ok(textes.some((t) => t.includes('valeur propre nulle')));
});

test('question 4 : V est conservée pour u = 0, donc stable mais pas asymptotiquement', () => {
  const sim = avecGains([0, 0, 0]);
  const V0 = V(sim);
  sim.avance(30);
  proche(V(sim), V0, 1e-6 * V0);
  assert.ok(Math.hypot(...sim.x) > 0.1, 'ω ne tend pas vers 0');
  assert.ok(!sim.diverge);
  // Stabilité : une petite condition initiale reste petite.
  sim.reinitialise([0.01, 0.01, 0.01]);
  sim.avance(30);
  assert.ok(Math.hypot(...sim.x) < 0.05);
  assert.ok(Math.hypot(...sim.x) > 0.005);
});

test('V̇ = 2 Σ k_i ω_i² le long des trajectoires du bouclé', () => {
  const sim = avecGains([-1, -2, -3]);
  sim.reinitialise([0.5, 1, 0.5]);
  const dt = 1e-4;
  const avant = V(sim);
  const derivee = 2 * (-1 * sim.x[0] ** 2 - 2 * sim.x[1] ** 2 - 3 * sim.x[2] ** 2);
  sim.avance(dt);
  proche((V(sim) - avant) / dt, derivee, 5e-3);
});

test('un gain positif sur un axe fait diverger cet axe', () => {
  const sim = avecGains([0.5, -2, -2]);
  sim.reinitialise([0.01, 0, 0]);
  sim.avance(30);
  // ω₁ est exactement exponentielle ici : 0,01 · e^{(0,5/3)·30} ≈ 1,5.
  proche(sim.x[0], 0.01 * Math.exp((0.5 / 3) * 30), 1e-3);
  assert.ok(Math.abs(sim.x[0]) > 1);
});

test('indications : conditions k_i < 0 et fonction de Lyapunov', () => {
  const sim = avecGains([-2, -2, -2]);
  const textes = () => indications(sim).map((i) => `${i.niveau}|${i.texte}`);
  assert.ok(textes().some((t) => t.startsWith('ok|') && t.includes('k_1 < 0')));
  assert.ok(textes().some((t) => t.includes('fonction de Lyapunov stricte')));
  sim.fixeGains([[1, 0, 0], [0, -2, 0], [0, 0, -2]]);
  assert.ok(textes().some((t) => t.startsWith('alerte|') && t.includes('diverge')));
});

test('le modèle déclare l’interface épurée : gains diagonaux, pas de sortie', () => {
  assert.equal(satellite.gainsDiagonaux, true);
  assert.equal(satellite.sansSortie, true);
  assert.equal(satellite.parametres.length, 3);
});
