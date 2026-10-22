// Tests des illustrations du cours : les résultats du TD1 (portraits de phase)
// et du TD2 (retour d'état, PID), et la cohérence du catalogue.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CAS_TD1, applique, directionsPropres, exponentielle, matrice, nature, spectre } from '../js/core/dim2.js';
import { valeursPropres } from '../js/core/linalg.js';
import { ackermann } from '../js/core/poles.js';
import { lisEtat, versRecherche } from '../js/illustration.js';
import { themes, trouve } from '../js/illustrations/catalogue.js';
import { simule } from '../js/illustrations/commun.js';
import { aimante } from '../js/illustrations/bifurcation.js';
import td2, { essaisEtape, hurwitzPD, matriceBouclee, matricePID, thetaBoucleOuverte, thetaInfiniPD } from '../js/illustrations/td2-pid.js';

const proche = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const z = (re, im = 0) => ({ re, im });

// ---- Catalogue et gabarit --------------------------------------------------------

test('catalogue : identifiants uniques, modules présents pour les illustrations disponibles', async () => {
  const ids = themes.flatMap((t) => t.illustrations.map((i) => i.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids.filter((id) => trouve(id).illustration.disponible)) {
    const m = (await import(`../js/illustrations/${id}.js`)).default;
    assert.equal(typeof m.monte, 'function', id);
    for (const essai of m.essais ?? []) {
      // Un essai ne règle que des réglages connus de l'illustration.
      for (const cle of Object.keys(essai.etat ?? {})) assert.ok(cle in m.etat, `${id} : ${cle}`);
    }
  }
});

test('gabarit : les réglages traversent l’URL avec leur type', () => {
  const defaut = { tr: -2, forme: 'propres', anime: true };
  const q = versRecherche('bifurcation', { tr: 1.5, forme: 'compagnon', anime: false });
  assert.deepEqual(lisEtat(defaut, new URLSearchParams(q.toString())), { tr: 1.5, forme: 'compagnon', anime: false });
  assert.deepEqual(lisEtat(defaut, new URLSearchParams('tr=abc')), defaut);
});

// ---- TD1 : portraits de phase ---------------------------------------------------------

test('TD1 : nature des onze points', () => {
  const attendu = {
    'P₁': 'asymptotiquement stable',
    'P₂': 'instable',
    'P₃': 'instable',
    'P₄': 'stable',
    'P₅': 'instable',
    'P₆': 'instable',
    'P₇': 'asymptotiquement stable',
    'P₈': 'stable',
    'P₉': 'instable',
    'P₁₀': 'instable',
    'P₁₁': 'asymptotiquement stable',
  };
  for (const c of CAS_TD1) {
    const n = nature(c.tr, c.det);
    assert.equal(n.cas, c.cas);
    assert.equal(n.stabilite, attendu[c.cas], c.cas);
  }
});

test('TD1 : la forme réduite a la trace et le déterminant voulus, et le bon spectre', () => {
  for (const forme of ['propres', 'compagnon']) {
    for (const c of CAS_TD1) {
      const A = matrice(c.tr, c.det, forme);
      proche(A[0][0] + A[1][1], c.tr, 1e-12);
      proche(A[0][0] * A[1][1] - A[0][1] * A[1][0], c.det, 1e-12);
      const vp = valeursPropres(A).map((v) => v.re).sort((a, b) => a - b);
      const attendu = spectre(c.tr, c.det).valeurs.map((v) => v.re).sort((a, b) => a - b);
      vp.forEach((v, i) => proche(v, attendu[i], 1e-6));
    }
  }
  // P₁ : Σ = diag(−2, −1) comme dans le TD1.
  assert.deepEqual(matrice(-3, 2), [[-2, 0], [0, -1]]);
  // Sur la parabole, un bloc de Jordan : une seule direction propre.
  assert.equal(directionsPropres(matrice(-4, 4)).length, 1);
  assert.equal(directionsPropres(matrice(-3, 2)).length, 2);
});

test('TD1 : exponentielle exacte, comparée à RK4, dans les trois cas', () => {
  for (const [tr, det] of [[-3, 2], [-2, 4], [-4, 4], [0, 3], [0, -1], [0, 0]]) {
    for (const forme of ['propres', 'compagnon']) {
      const A = matrice(tr, det, forme);
      const x0 = [1.2, -0.7];
      const exact = applique(exponentielle(A, 1.3), x0);
      const { x } = simule((t, y) => applique(A, y), x0, 1.3, 1e-3);
      exact.forEach((v, i) => proche(v, x[x.length - 1][i], 1e-8));
    }
  }
});

test('TD1 : y₂ = y₁^{λ₂/λ₁} pour y₀ = (1, 1) (P₁, P₂, P₃)', () => {
  for (const [tr, det] of [[-3, 2], [3, 2], [0, -1]]) {
    const A = matrice(tr, det);
    const [l1, l2] = [A[0][0], A[1][1]];
    const y = applique(exponentielle(A, 0.8), [1, 1]);
    proche(y[1], y[0] ** (l2 / l1), 1e-12);
  }
});

test('diagramme : aimantation sur les axes et la parabole', () => {
  assert.deepEqual(aimante(-0.01, 2, 0.05, 0.05), [0, 2]);
  assert.deepEqual(aimante(-2, 0.02, 0.05, 0.05), [-2, 0]);
  assert.deepEqual(aimante(-2, 1.03, 0.05, 0.05), [-2, 1]);
  assert.deepEqual(aimante(-2, 1.5, 0.05, 0.05), [-2, 1.5]);
});

// ---- TD2 ---------------------------------------------------------------------------------

test('TD2 : boucle ouverte, θ = e^{−2t} + ε sinh t', () => {
  const [, perturbe] = essaisEtape('ouverte', { eps: 0.02 });
  const { t, x } = simule(perturbe.F, perturbe.x0, 6, 1e-3);
  for (const k of [1000, 3000, 6000]) proche(x[k][0], thetaBoucleOuverte(t[k], 0.02), 1e-8);
  // ε = 0 : la trajectoire nominale tend vers 0.
  proche(thetaBoucleOuverte(10, 0), Math.exp(-20), 1e-15);
});

test('TD2 : A + BK est Hurwitz si et seulement si k₁ < −1 et k₂ < 0', () => {
  for (let k1 = -4; k1 <= 1; k1 += 0.25) {
    for (let k2 = -3; k2 <= 1; k2 += 0.25) {
      if (Math.abs(k1 + 1) < 1e-9 || Math.abs(k2) < 1e-9) continue;
      const hurwitz = valeursPropres(matriceBouclee(k1, k2)).every((v) => v.re < 0);
      assert.equal(hurwitz, hurwitzPD(k1, k2), `${k1}, ${k2}`);
    }
  }
});

test('TD2 : créneau rejeté, perturbation constante et erreur statique −e/(1 + k₁)', () => {
  const r = { ...td2.etat, k1: -3, k2: -2, d: 3, e: 1 };
  const [, creneau] = essaisEtape('creneau', r);
  const fin = simule(creneau.F, creneau.x0, 20, 1e-3).x.pop();
  proche(fin[0], 0, 1e-6);
  const [pd, pid] = essaisEtape('constante', r);
  const xpd = simule(pd.F, pd.x0, 30, 1e-3).x.pop();
  proche(xpd[0], thetaInfiniPD(1, -3), 1e-8);
  proche(thetaInfiniPD(1, -3), 0.5, 1e-15);
  // PID : θ → 0 et x₀ = ∫θ → −e/k₀.
  const xpid = simule(pid.F, pid.x0, 30, 1e-3).x.pop();
  proche(xpid[0], 0, 1e-8);
  proche(xpid[2], -1 / -6, 1e-8);
});

test('TD2 : le PID (−6, −12, −6) place les pôles en −1, −2, −3', () => {
  const vp = valeursPropres(matricePID(-6, -12, -6)).map((v) => v.re).sort((a, b) => a - b);
  [-3, -2, -1].forEach((v, i) => proche(vp[i], v, 1e-6));
  // Ackermann sur le système augmenté redonne les gains du TD.
  const A = [[0, 1, 0], [0, 0, 1], [0, 1, 0]];
  const B = [[0], [0], [1]];
  const K = ackermann(A, B, [z(-1), z(-2), z(-3)])[0];
  [-6, -12, -6].forEach((v, i) => proche(K[i], v, 1e-9));
});
