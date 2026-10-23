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
import { aimante, pointDuPlan } from '../js/illustrations/bifurcation.js';
import { Particules, orbitesDuPortrait } from '../js/illustrations/portraits.js';
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

test('gabarit : un texte hors des valeurs permises garde la valeur par défaut', () => {
  const defaut = { forme: 'propres', tr: 0 };
  const choix = { forme: ['propres', 'compagnon'] };
  assert.equal(lisEtat(defaut, new URLSearchParams('forme=compagnon'), choix).forme, 'compagnon');
  assert.equal(lisEtat(defaut, new URLSearchParams('forme=foo'), choix).forme, 'propres');
  // Sans liste pour la clé, tout texte est accepté.
  assert.equal(lisEtat(defaut, new URLSearchParams('forme=foo')).forme, 'foo');
});

test('bifurcation : le point collé à la parabole a un discriminant exactement nul', () => {
  // Cliquer près de la parabole, à une trace quelconque : Δ vaut 0, pas 10⁻³.
  for (const tr of [-3.89, -2.3017, 1.2345, 4.4444]) {
    const { tr: t, det } = pointDuPlan(tr, (tr * tr) / 4 + 0.01, 0.2, 0.2);
    assert.equal(t * t - 4 * det, 0);
    assert.equal(spectre(t, det).delta, 0);
  }
  // Loin de la parabole, le point n'est pas déplacé (à l'arrondi près).
  assert.deepEqual(pointDuPlan(-2, 4, 0.05, 0.05), { tr: -2, det: 4 });
  // Les axes restent collés à 0.
  assert.deepEqual(pointDuPlan(1, 0.02, 0.05, 0.05), { tr: 1, det: 0 });
  // Le discriminant résiste à un aller-retour dans l'URL.
  const { tr, det } = pointDuPlan(-3.89, 3.79, 0.2, 0.2);
  const q = versRecherche('bifurcation', { tr, det });
  const lu = lisEtat({ tr: 0, det: 0 }, new URLSearchParams(q.toString()));
  assert.ok(Math.abs(lu.tr * lu.tr - 4 * lu.det) < 1e-9);
});

test('portraits : chaque orbite va du bord du cadre à l’équilibre, ou d’un bord à l’autre', () => {
  const cadre = { x: [-3, 3], y: [-3, 3] };
  const seuil = 0.005 * 6;
  for (const c of CAS_TD1) {
    for (const forme of ['propres', 'compagnon']) {
      const A = matrice(c.tr, c.det, forme);
      // Distance à l'ensemble des équilibres : l'origine, ou la droite noyau de A.
      const ligne = Math.hypot(...A[0]) >= Math.hypot(...A[1]) ? A[0] : A[1];
      const n = Math.hypot(...ligne);
      const droite = Math.abs(c.det) < 1e-9 && n > 0;
      const distance = (p) => (droite ? Math.abs(p[0] * ligne[0] + p[1] * ligne[1]) / n : Math.hypot(...p));
      const orbites = orbitesDuPortrait(A, cadre);
      assert.ok(orbites.length >= 4 && orbites.length <= 40, `${c.cas} ${forme} : ${orbites.length} orbites`);
      for (const pts of orbites) {
        // Orientée dans le sens du temps.
        const k = Math.floor(pts.length / 2);
        const v = applique(A, pts[k]);
        const d = [pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]];
        assert.ok(v[0] * d[0] + v[1] * d[1] >= 0, `${c.cas} ${forme} : orbite à rebours`);
        // Chaque bout est au bord, au seuil de l'équilibre, ou l'orbite est fermée.
        const fermee = Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 0.1;
        for (const bout of [pts[0], pts.at(-1)]) {
          const auBord = Math.max(Math.abs(bout[0]), Math.abs(bout[1])) > 3 - 0.06;
          assert.ok(auBord || distance(bout) < 2 * seuil || fermee, `${c.cas} ${forme} : bout en (${bout.map((x) => x.toFixed(2))})`);
        }
      }
    }
  }
});

test('particules : deux particules trop proches n’en font plus qu’une, l’autre renaît ailleurs', () => {
  const cadre = { x: [-3, 3], y: [-3, 3] };
  const rep = { cadre, contient: (x, y) => x >= -3 && x <= 3 && y >= -3 && y <= 3 };
  const A = [
    [0, 0],
    [0, 0],
  ]; // flot immobile : seule la fusion déplace les particules
  const p = new Particules(3, { fusion: 0.025 });
  p.pts = [
    { x: [1, 1], age: 0 },
    { x: [1.05, 1], age: 0 }, // à 0,05 < 0,025 × 6 = 0,15 de la première
    { x: [-2, -2], age: 0 },
  ];
  p.avance(A, rep, 0.01);
  assert.deepEqual(p.pts[0].x, [1, 1]);
  assert.deepEqual(p.pts[2].x, [-2, -2]);
  assert.notDeepEqual(p.pts[1].x, [1.05, 1]);
  assert.ok(rep.contient(...p.pts[1].x));
  assert.equal(p.pts[1].age, 0);
});

test('portraits : avec une droite d’équilibres, les orbites de gauche et de droite arrivent à des endroits différents', () => {
  const cadre = { x: [-3, 3], y: [-3, 3] };
  const arrivees = (cote) =>
    orbitesDuPortrait(matrice(-3, 0), cadre)
      .filter((pts) => Math.sign(pts[0][0]) === cote)
      .map((pts) => pts.at(-1)[1]);
  const gauche = arrivees(-1);
  const droite = arrivees(1);
  assert.ok(gauche.length >= 3 && droite.length >= 3);
  for (const y of gauche) assert.ok(droite.every((z) => Math.abs(z - y) > 0.2), `arrivée commune vers y = ${y.toFixed(2)}`);
});

test('portraits : un puits a des orbites qui arrivent au seuil de l’équilibre', () => {
  const cadre = { x: [-3, 3], y: [-3, 3] };
  for (const [tr, det] of [[-3, 2], [-4, 2], [-2, 4], [-0.3, 3], [-4, 4]]) {
    const bouts = orbitesDuPortrait(matrice(tr, det), cadre).map((pts) => Math.hypot(...pts.at(-1)));
    assert.ok(bouts.some((r) => r < 0.06), `(${tr}, ${det}) : aucune orbite n’arrive à l’origine`);
  }
});

test('portraits : les orbites d’un centre sont des ellipses fermées et régulièrement espacées', () => {
  const cadre = { x: [-3, 3], y: [-3, 3] };
  // Les orbites entièrement dans le cadre (rayon maximal < 3) sont fermées : le
  // début et la fin sont voisins.
  const orbites = orbitesDuPortrait(matrice(0, 3, 'propres'), cadre);
  const fermees = orbites.filter((pts) => pts.every((q) => Math.hypot(...q) < 2.9));
  assert.ok(fermees.length >= 3);
  for (const pts of fermees) {
    assert.ok(Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 0.2);
  }
  // Rayons des ellipses (ici des cercles) : écarts presque égaux.
  const rayons = fermees.map((pts) => Math.min(...pts.map((p) => Math.hypot(...p)))).sort((a, b) => a - b);
  const ecarts = rayons.slice(1).map((r, k) => r - rayons[k]);
  assert.ok(Math.max(...ecarts) < 1.6 * Math.min(...ecarts), `écarts ${ecarts.map((e) => e.toFixed(2))}`);
});

test('glossaire : chaque terme déclaré par une illustration existe et a une définition sourcée', async () => {
  const { GLOSSAIRE } = await import('../js/illustrations/glossaire.js');
  for (const { illustrations } of themes) {
    for (const { id, disponible } of illustrations) {
      if (!disponible) continue;
      const module = (await import(`../js/illustrations/${id}.js`)).default;
      for (const terme of module.termes ?? []) {
        assert.ok(GLOSSAIRE[terme], `${id} : terme absent du glossaire, ${terme}`);
      }
    }
  }
  for (const [cle, { formes, definition, source }] of Object.entries(GLOSSAIRE)) {
    assert.ok(formes.length > 0 && definition.length > 20 && /^Poly, chapitre/.test(source), cle);
  }
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

// ---- Solutions maximales (dimension 1) -------------------------------------------------

import { EQUATIONS, courbesDeFond, solutionMaximale } from '../js/illustrations/bestiaire.js';
import { champPendule, puitsAtteint } from '../js/illustrations/pendule-amorti.js';
import { champF, champG, rhoF, rhoG } from '../js/illustrations/contre-exemple.js';

test('bestiaire : exemples du poly (tan t, x₀/((t − t₀)x₀ + 1), t²/4, −x³)', () => {
  const tan = solutionMaximale('carre-plus-un', 0, 0);
  proche(tan.a, -Math.PI / 2, 1e-15);
  proche(tan.b, Math.PI / 2, 1e-15);
  proche(tan.x(1), Math.tan(1), 1e-15);
  const inv = solutionMaximale('moins-carre', 0, 1);
  assert.equal(inv.a, -1);
  assert.equal(inv.b, Infinity);
  assert.equal(solutionMaximale('moins-carre', 2, -0.5).b, 4);
  // ẋ = √|x|, x(0) = 0 : la solution t²/4 du poly (pour t > 0).
  proche(solutionMaximale('racine', 0, 0).x(3), 9 / 4, 1e-15);
  assert.equal(solutionMaximale('racine', 0, 0).x(-1), 0);
  // ẋ = −x³ : x(t) = sign(x₀)/√(2t + 1/x₀²) (poly).
  proche(solutionMaximale('cube', 0, 2).x(1), 1 / Math.sqrt(2 + 0.25), 1e-15);
});

test('bestiaire : chaque solution exacte vérifie l’équation (comparée à RK4)', () => {
  for (const [eq, t0, x0, t1] of [
    ['carre-plus-un', 0.3, -1, 1.5],
    ['moins-carre', -1, 2, 3],
    ['moins-carre', 0, -0.4, 2],
    ['racine', 0, 1, 2],
    ['racine', 0, -1, 1.5],
    ['cube', 0, -3, 4],
  ]) {
    const sol = solutionMaximale(eq, t0, x0);
    const { x } = simule((t, y) => [EQUATIONS[eq].f(y[0])], [x0], t1 - t0, 1e-4);
    proche(x[x.length - 1][0], sol.x(t1), 1e-6);
  }
});

// ---- Linéarisation -----------------------------------------------------------------------

test('pendule amorti : lâché à l’horizontale, il revient en bas ; lancé fort, il change de puits', () => {
  assert.equal(puitsAtteint([Math.PI / 2, 0], 1, 9.81), 0);
  // Lancé à 8 rad/s, il ne passe pas le sommet (l'amortissement l'en empêche) ; à 10, si.
  assert.equal(puitsAtteint([0, 8], 1, 9.81), 0);
  assert.equal(puitsAtteint([0, 10], 1, 9.81), 1);
  assert.equal(puitsAtteint([0, -10], 1, 9.81), -1);
  // Sans amortissement, aucun puits n'attire.
  assert.equal(puitsAtteint([1, 0], 0, 9.81), null);
  // Le puits annoncé est bien celui où finit la trajectoire.
  const F = champPendule(1, 9.81);
  const fin = simule((t, x) => F(x), [0, 10], 40, 1e-3).x.pop();
  proche(fin[0], 2 * Math.PI, 1e-6);
});

test('contre-exemple : ρ̇ = ∓2ρ², ρ exact contre RK4, explosion de g en 1/(2ρ₀)', () => {
  const x0 = [0.6, 0.3];
  const rho0 = 0.45;
  const xf = simule((t, x) => champF(x), x0, 3, 1e-3).x.pop();
  proche(xf[0] ** 2 + xf[1] ** 2, rhoF(rho0, 3), 1e-9);
  const xg = simule((t, x) => champG(x), x0, 1, 1e-4).x.pop();
  proche(xg[0] ** 2 + xg[1] ** 2, rhoG(rho0, 1), 1e-7);
  assert.equal(rhoG(rho0, 1 / (2 * rho0) + 0.01), Infinity);
  // Même linéarisé : f′(0) = g′(0) = [[0, 1], [−1, 0]].
  const h = 1e-6;
  for (const F of [champF, champG]) {
    const J = [0, 1].map((j) => {
      const e = [0, 0];
      e[j] = h;
      const p = F(e);
      const m = F(e.map((v) => -v));
      return p.map((v, i) => (v - m[i]) / (2 * h));
    });
    proche(J[0][0], 0);
    proche(J[0][1], -1);
    proche(J[1][0], 1);
    proche(J[1][1], 0);
  }
});

// ---- Lyapunov ----------------------------------------------------------------------------

import { lyapunov2, sandwich, systeme } from '../js/illustrations/lyapunov.js';

test('Lyapunov, cas linéaire : AᵀP + PA = −I et L(x) = ∫‖e^{sA}x‖² ds (poly)', () => {
  const A = matrice(-1, 2, 'compagnon');
  const P = lyapunov2(A);
  const M = [0, 1].map((i) => [0, 1].map((j) => A[0][i] * P[0][j] + A[1][i] * P[1][j] + P[i][0] * A[0][j] + P[i][1] * A[1][j]));
  proche(M[0][0], -1, 1e-12);
  proche(M[0][1], 0, 1e-12);
  proche(M[1][1], -1, 1e-12);
  // L(x) = xᵀPx coïncide avec l'intégrale du poly, calculée numériquement.
  const x = [0.7, -0.4];
  let integrale = 0;
  const h = 1e-3;
  for (let s = 0; s < 40; s += h) {
    const y = applique(exponentielle(A, s + h / 2), x);
    integrale += h * (y[0] ** 2 + y[1] ** 2);
  }
  const L = P[0][0] * x[0] ** 2 + 2 * P[0][1] * x[0] * x[1] + P[1][1] * x[1] ** 2;
  proche(integrale, L, 1e-6);
});

test('Lyapunov : dérivée le long des trajectoires (pendule : −a x₂², linéaire : −‖x‖²)', () => {
  for (const r of [{ sys: 'pendule', a: 0.7, w2: 4 }, { sys: 'pendule', a: 0, w2: 4 }, { sys: 'lineaire', tr: -1, det: 2 }]) {
    const s = systeme(r);
    const x = [0.9, -1.3];
    const f = s.F(x);
    const h = 1e-6;
    const grad = [(s.L(x[0] + h, x[1]) - s.L(x[0] - h, x[1])) / (2 * h), (s.L(x[0], x[1] + h) - s.L(x[0], x[1] - h)) / (2 * h)];
    proche(grad[0] * f[0] + grad[1] * f[1], s.dL(...x), 1e-6);
  }
});

test('Lyapunov : argument de la preuve, B(0, η) ⊂ {L < c} ⊂ B(0, ε)', () => {
  const { L } = systeme({ sys: 'lineaire', tr: -1, det: 2 });
  const eps = 1.5;
  const { c, eta } = sandwich(L, eps);
  assert.ok(eta > 0 && eta < eps);
  for (let k = 0; k < 360; k++) {
    const a = (2 * Math.PI * k) / 360;
    assert.ok(L(eta * 0.999 * Math.cos(a), eta * 0.999 * Math.sin(a)) < c);
    assert.ok(L(eps * Math.cos(a), eps * Math.sin(a)) >= c - 1e-12);
  }
});

// ---- Intégration numérique (TD4) -----------------------------------------------------------

import { SCHEMAS, erreurs, pente, trajectoire } from '../js/illustrations/euler.js';

test('TD4 : ‖x₁‖² = (1 + h²)‖x₀‖² (explicite), ‖x₀‖²/(1 + h²) (implicite), Q conservée (symplectique)', () => {
  const x0 = [0.8, -0.6];
  const V = ([q, p]) => q * q + p * p;
  for (const h of [0.05, 0.3, 1.2]) {
    proche(V(SCHEMAS.explicite(x0, h)), (1 + h * h) * V(x0), 1e-12);
    proche(V(SCHEMAS.implicite(x0, h)), V(x0) / (1 + h * h), 1e-12);
    // L'implicite vérifie bien x₁ = x₀ + h φ(x₁).
    const [q1, p1] = SCHEMAS.implicite(x0, h);
    proche(q1, x0[0] + h * p1, 1e-12);
    proche(p1, x0[1] - h * q1, 1e-12);
    const Q = ([q, p]) => q * q + p * p - h * p * q;
    const xs = trajectoire('symplectique', x0, h, 500);
    for (const x of xs) proche(Q(x), Q(x0), 1e-10);
  }
  // Après n pas : (1 + h²)ⁿ.
  const xs = trajectoire('explicite', [1, 0], 0.2, 150);
  proche(V(xs[150]) / 1.04 ** 150, 1, 1e-10);
});

test('TD4 : ordres de convergence, 1 pour les trois Euler, 4 pour RK4', () => {
  const pas = [0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001];
  proche(pente(erreurs('explicite', [1, 0], 2 * Math.PI, pas)), 1, 0.05);
  proche(pente(erreurs('implicite', [1, 0], 2 * Math.PI, pas)), 1, 0.05);
  proche(pente(erreurs('symplectique', [1, 0], 2 * Math.PI, pas)), 1, 0.05);
  proche(pente(erreurs('rk4', [1, 0], 2 * Math.PI, [0.1, 0.05, 0.02, 0.01])), 4, 0.05);
});

// ---- Contrôlabilité et mélangeur (S7) -------------------------------------------------------

import { enveloppeConvexe, rangKalman, trajectoiresAleatoires } from '../js/illustrations/controlabilite.js';
import { Simulation } from '../js/core/sim.js';
import melangeur from '../js/exemples/melangeur.js';

test('contrôlabilité : rang 1 si et seulement si β₁ = β₂ et αβ₁ = 0', () => {
  assert.equal(rangKalman(0, 1, 1), 1); // α = 0, diagonale
  assert.equal(rangKalman(0, 1, 0.5), 2);
  assert.equal(rangKalman(-0.8, 1, 1), 2); // α ≠ 0 : la diagonale redevient contrôlable
  assert.equal(rangKalman(-0.8, 0, 0), 1); // cas β₁ = β₂ = 0, omis par l'exemple général du poly
  for (let a = -1; a <= 1; a += 0.5) {
    for (let b1 = -1; b1 <= 1; b1 += 0.5) {
      for (let b2 = -1; b2 <= 1; b2 += 0.5) {
        const attendu = Math.abs(b1 - b2) > 1e-12 || Math.abs(a * b1) > 1e-12 ? 2 : 1;
        assert.equal(rangKalman(a, b1, b2), attendu, `${a}, ${b1}, ${b2}`);
      }
    }
  }
});

test('mélangeur : linéarisé du poly, A = diag(α, 2α), B = [[1, 1], [β₁, β₂]]', () => {
  const sim = new Simulation(melangeur);
  for (const [Ve, ce] of [[1, 1], [2, 1.5], [0.5, 0.8]]) {
    sim.fixeParametre('Ve', Ve);
    sim.fixeParametre('ce', ce);
    const { gamma, c1, c2 } = sim.p;
    const alpha = -gamma / (2 * Math.sqrt(Ve));
    proche(sim.A[0][0], alpha, 1e-6);
    proche(sim.A[0][1], 0, 1e-6);
    proche(sim.A[1][0], 0, 1e-6);
    proche(sim.A[1][1], 2 * alpha, 1e-6);
    proche(sim.B[1][0], (c1 - ce) / Ve, 1e-6);
    proche(sim.B[1][1], (c2 - ce) / Ve, 1e-6);
    // Débits d'équilibre : u₁ + u₂ = γ√V_e et c₁u₁ + c₂u₂ = c_e γ√V_e.
    proche(sim.ue[0] + sim.ue[1], gamma * Math.sqrt(Ve), 1e-12);
    proche(c1 * sim.ue[0] + c2 * sim.ue[1], ce * gamma * Math.sqrt(Ve), 1e-12);
  }
});

test('mélangeur : le gain par défaut donne A + BK = diag(−2, −3) et la cuve se stabilise', () => {
  const sim = new Simulation(melangeur);
  const vp = sim.vpBF.map((z) => z.re).sort((a, b) => a - b);
  proche(vp[0], -3, 1e-6);
  proche(vp[1], -2, 1e-6);
  sim.avance(10);
  sim.x.forEach((v, i) => proche(v, sim.xe[i], 1e-6));
});

// ---- Flot et exponentielle -----------------------------------------------------------------

import { A_CE, B_CE, produit } from '../js/illustrations/flot.js';

test('exponentielle : contre-exemple du poly, e^A e^B = [[2, 1], [1, 1]] ≠ e^{A+B}', () => {
  const eAeB = produit(exponentielle(A_CE, 1), exponentielle(B_CE, 1));
  assert.deepEqual(eAeB, [[2, 1], [1, 1]]);
  const eAB = exponentielle([[0, 1], [1, 0]], 1);
  proche(eAB[0][0], Math.cosh(1), 1e-12);
  proche(eAB[0][1], Math.sinh(1), 1e-12);
  // det e^{tA} = e^{t tr A} : l'aire du disque image vaut π e^{t tr A}.
  const E = exponentielle(matrice(-0.4, 4), 1.3);
  proche(E[0][0] * E[1][1] - E[0][1] * E[1][0], Math.exp(-0.4 * 1.3), 1e-12);
});

test('solutions maximales : courbes de fond nombreuses, sans doublon, solutions de l’équation', () => {
  const cadre = { x: [-4, 4], y: [-4, 4] };
  for (const eq of Object.keys(EQUATIONS)) {
    const courbes = courbesDeFond(eq, cadre);
    assert.ok(courbes.length >= 8 && courbes.length <= 40, `${eq} : ${courbes.length} courbes`);
    // Chaque courbe vérifie ẋ = f(x) (différences finies, loin des explosions).
    for (const pts of courbes) {
      for (let i = 1; i < pts.length - 1; i += 25) {
        const [[ta, xa], [tb, xb]] = [pts[i - 1], pts[i + 1]];
        const x = pts[i][1];
        if (Math.abs(x) > 3 || Math.abs(xa) > 3 || Math.abs(xb) > 3) continue;
        const pente = (xb - xa) / (tb - ta);
        assert.ok(Math.abs(pente - EQUATIONS[eq].f(x)) < 0.05 * (1 + Math.abs(pente)), `${eq} : pente ${pente} au lieu de ${EQUATIONS[eq].f(x)}`);
      }
    }
  }
});

test('format : nombres et matrices de largeur fixe', async () => {
  const { latexMatriceFixe, latexNombreFixe } = await import('../js/ui/format.js');
  assert.equal(latexNombreFixe(0.5), '\\phantom{-}0{,}50');
  assert.equal(latexNombreFixe(-1.234), '-1{,}23');
  assert.equal(latexNombreFixe(-0.001), '\\phantom{-}0{,}00'); // pas de « −0,00 »
  // Toutes les entrées d'une matrice ont la même largeur (même nombre de caractères visibles).
  const visibles = (s) => s.replace(/\\phantom\{(.)\}/g, '$1').replace(/\{,\}/g, ',');
  const M = latexMatriceFixe([[-0.2, 12.5], [3, -0.004]]);
  const entrees = M.replace(/\\(begin|end)\{pmatrix\}/g, '').split(/&|\\\\/).map((e) => visibles(e.trim()));
  assert.ok(entrees.every((e) => e.length === entrees[0].length), entrees.join(' | '));
});

test('contrôlabilité : au rang 1, les trajectoires restent sur Im C(A, B)', () => {
  // α = 0, β₁ = β₂ = 1 : Im C = droite engendrée par (1, 1).
  for (const pts of trajectoiresAleatoires(0, 1, 1)) for (const [x, y] of pts) assert.ok(Math.abs(x - y) < 1e-9);
  // Rang 2 : elles en sortent.
  assert.ok(trajectoiresAleatoires(0, 1, -0.5).some((pts) => pts.some(([x, y]) => Math.abs(x - y) > 0.1)));
});

test('contrôlabilité : l’enveloppe des points atteints est un polygone convexe qui les contient', () => {
  const arrivees = trajectoiresAleatoires(0, 1, -0.5).map((pts) => pts[pts.length - 1]);
  const contour = enveloppeConvexe(arrivees);
  assert.ok(contour.length >= 4);
  // Tous les points sont du même côté de chaque arête (sens trigonométrique).
  for (const p of arrivees) {
    contour.forEach((a, k) => {
      const b = contour[(k + 1) % contour.length];
      assert.ok((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-9);
    });
  }
  // Rang 1 : le contour est dégénéré, tout est sur la droite x = y.
  for (const [x, y] of trajectoiresAleatoires(0, 1, 1).map((pts) => pts[pts.length - 1])) assert.ok(Math.abs(x - y) < 1e-9);
});

test('latexComplexeFixe : largeur constante, signe de la partie imaginaire conservé', async () => {
  const { latexComplexeFixe } = await import('../js/ui/format.js');
  assert.equal(latexComplexeFixe({ re: -1.234, im: 0 }), '-1{,}23');
  assert.equal(latexComplexeFixe({ re: 0.5, im: -2 }), '\\phantom{-}0{,}50 - 2{,}00\\,i');
  assert.equal(latexComplexeFixe({ re: 0, im: 3 }), '\\phantom{-}0{,}00 + 3{,}00\\,i');
});

test('pendule amorti : les essais annoncent le bon bassin', async () => {
  const { puitsAtteint } = await import('../js/illustrations/pendule-amorti.js');
  assert.equal(puitsAtteint([Math.PI / 2, 0], 1, 9.81), 0);
  assert.equal(puitsAtteint([0, 7.5], 0.5, 9.81), 1);
  assert.equal(puitsAtteint([0, 6], 0.5, 9.81), 0);
});

test('plan restreint : borneLe ramène le point dans le cadran des matrices de Hurwitz', async () => {
  const { borneLe } = await import('../js/illustrations/plan-trace-det.js');
  const { BORNE_PLAN } = await import('../js/illustrations/lyapunov.js');
  assert.deepEqual(borneLe({ tr: 3, det: -2 }, BORNE_PLAN), { tr: -0.1, det: 0.1 });
  assert.deepEqual(borneLe({ tr: -7, det: 9 }, BORNE_PLAN), { tr: -4, det: 6 });
  assert.deepEqual(borneLe({ tr: -1, det: 2 }, BORNE_PLAN), { tr: -1, det: 2 });
});

test('parcours : chaque page disponible a une suivante, sauf la dernière', async () => {
  const { parcours, suivante, precedente } = await import('../js/parcours.js');
  assert.ok(parcours.length > 10);
  for (const p of parcours.slice(0, -1)) assert.ok(suivante(p.genre, p.id), p.id);
  const dernier = parcours[parcours.length - 1];
  assert.equal(suivante(dernier.genre, dernier.id), null);
  assert.equal(precedente(parcours[0].genre, parcours[0].id), null);
  for (const p of parcours.slice(1)) assert.ok(precedente(p.genre, p.id), p.id);
  assert.equal(precedente(parcours[1].genre, parcours[1].id).id, parcours[0].id);
  // Même ordre que l'accueil : le simulateur est dans le thème « Commande », avant Euler.
  const ids = parcours.map((p) => p.id);
  assert.ok(ids.indexOf('controlabilite') < ids.indexOf('double-integrateur'));
  assert.ok(ids.indexOf('segway') < ids.indexOf('euler'));
  assert.equal(ids[ids.length - 1], 'euler');
  assert.equal(new Set(parcours.map((p) => p.lien)).size, parcours.length);
});

test('plan complexe : l’aimantation accepte un seuil propre à chaque axe', async () => {
  const { deplaceValeurPropre } = await import('../js/core/poles.js');
  const vp = [{ re: -1, im: 0 }, { re: -2, im: 0 }];
  // Près de l'axe imaginaire pour l'échelle en re seulement.
  const a = deplaceValeurPropre(vp, 0, { re: -0.04, im: 0.5 }, { re: 0.05, im: 0.01 });
  assert.equal(a[0].re, 0);
  assert.equal(a[0].im, 0.5);
  // Près de l'axe réel pour l'échelle en im seulement.
  const b = deplaceValeurPropre(vp, 0, { re: -0.5, im: 0.04 }, { re: 0.01, im: 0.05 });
  assert.equal(b[0].im, 0);
  assert.equal(b[0].re, -0.5);
});

test('simulation emballée : l’état n’est plus un point de départ raisonnable', async () => {
  const { Simulation } = await import('../js/core/sim.js');
  const segway = (await import('../js/exemples/segway.js')).default;
  const sim = new Simulation(segway);
  const x0 = sim.x.slice();
  assert.equal(sim.etatRaisonnable(x0), true);
  sim.x = sim.x.map((v) => v + 500);
  assert.equal(sim.etatRaisonnable(x0), false);
  sim.x = x0.slice();
  sim.x[1] = NaN;
  assert.equal(sim.etatRaisonnable(x0), false);
  sim.x = x0.slice();
  sim.diverge = true;
  assert.equal(sim.etatRaisonnable(x0), false);
});

test('simulation emballée : un lancer très vif ne rend pas le seuil trop large', async () => {
  const { Simulation } = await import('../js/core/sim.js');
  const segway = (await import('../js/exemples/segway.js')).default;
  const sim = new Simulation(segway);
  const lance = sim.xe.map((v, i) => v + (i === 3 ? 27 : 0));
  sim.x = sim.xe.map((v, i) => v + (i === 0 ? 102 : 0));
  assert.equal(sim.etatRaisonnable(lance), false);
});

test('nombreScientifique : largeur constante, quelle que soit la valeur', async () => {
  const { nombreScientifique } = await import('../js/ui/format.js');
  const valeurs = [0, 1, -1, 0.05, -0.0123, 123.456, -9876.5, 1e-7, -2.5e12, 0.999999, 9.9999];
  const largeurs = new Set(valeurs.map((v) => nombreScientifique(v).length));
  assert.equal(largeurs.size, 1);
  assert.equal(nombreScientifique(0.0123), '+1,23e−02');
  assert.equal(nombreScientifique(-123.456), '−1,23e+02');
  assert.equal(nombreScientifique(0), '+0,00e+00');
  assert.equal(nombreScientifique(9.9999), '+1,00e+01');
  assert.equal(nombreScientifique(NaN).length, nombreScientifique(1).length);
});
