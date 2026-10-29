// Systèmes linéaires plans ẋ = Ax, A réelle (2, 2) : matrice décrite par sa
// trace et son déterminant, spectre, nature de l'origine (diagramme de
// bifurcation du poly et du TD1) et flot exact e^{tA}.

const TOL = 1e-9;

// Matrice de trace `tr` et de déterminant `det`, sous l'une des deux formes :
//   - 'propres' : forme réduite réelle du TD1, dans la base des vecteurs
//     propres : diag(λ₁, λ₂) avec λ₁ ≤ λ₂ ; [[α, β], [−β, α]] pour α ± iβ ;
//     bloc de Jordan [[λ, 1], [0, λ]] pour une valeur propre double ;
//   - 'compagnon' : [[0, 1], [−det, tr]], soit ẍ − tr ẋ + det x = 0 dans le
//     plan (x, ẋ).
// Sur la parabole Δ = 0, les deux formes sont non diagonalisables, comme les
// cas P₅, P₁₀ et P₁₁ du poly.
export function matrice(tr, det, forme = 'propres') {
  if (forme === 'compagnon') {
    return [
      [0, 1],
      [-det, tr],
    ];
  }
  const delta = tr * tr - 4 * det;
  if (Math.abs(delta) <= TOL) {
    const l = tr / 2;
    return [
      [l, 1],
      [0, l],
    ];
  }
  if (delta > 0) {
    const r = Math.sqrt(delta);
    return [
      [(tr - r) / 2, 0],
      [0, (tr + r) / 2],
    ];
  }
  const a = tr / 2;
  const b = Math.sqrt(-delta) / 2;
  return [
    [a, b],
    [-b, a],
  ];
}

// Valeurs propres { re, im } (la partie imaginaire positive d'abord) et discriminant.
export function spectre(tr, det) {
  const delta = tr * tr - 4 * det;
  if (delta >= -TOL) {
    const r = Math.sqrt(Math.max(0, delta));
    return { delta, valeurs: [{ re: (tr - r) / 2, im: 0 }, { re: (tr + r) / 2, im: 0 }], reelles: true };
  }
  const b = Math.sqrt(-delta) / 2;
  return { delta, valeurs: [{ re: tr / 2, im: b }, { re: tr / 2, im: -b }], reelles: false };
}

// Nature de l'origine pour la matrice de trace tr et de déterminant det, sous
// la forme réduite du TD1 : { cas, nom, stabilite } où cas est le point
// P₁…P₁₁ du TD1 dont elle relève et stabilite l'une des chaînes
// 'asymptotiquement stable', 'stable', 'instable'.
export function nature(tr, det) {
  const s = (v) => (Math.abs(v) <= TOL ? 0 : Math.sign(v));
  const sd = s(det);
  const st = s(tr);
  const sDelta = s(tr * tr - 4 * det);
  if (sd < 0) return { cas: 'P₃', nom: 'col (point selle)', stabilite: 'instable' };
  if (sd === 0) {
    if (st < 0) return { cas: 'P₄', nom: 'droite d’équilibres, les autres orbites la rejoignent', stabilite: 'stable' };
    if (st > 0) return { cas: 'P₆', nom: 'droite d’équilibres, les autres orbites s’en éloignent', stabilite: 'instable' };
    return { cas: 'P₅', nom: 'valeur propre double nulle, non diagonalisable', stabilite: 'instable' };
  }
  if (sDelta > 0) {
    return st < 0
      ? { cas: 'P₁', nom: 'nœud (puits)', stabilite: 'asymptotiquement stable' }
      : { cas: 'P₂', nom: 'nœud (source)', stabilite: 'instable' };
  }
  if (sDelta === 0) {
    return st < 0
      ? { cas: 'P₁₁', nom: 'nœud impropre (puits)', stabilite: 'asymptotiquement stable' }
      : { cas: 'P₁₀', nom: 'nœud impropre (source)', stabilite: 'instable' };
  }
  if (st < 0) return { cas: 'P₇', nom: 'foyer (puits)', stabilite: 'asymptotiquement stable' };
  if (st > 0) return { cas: 'P₉', nom: 'foyer (source)', stabilite: 'instable' };
  return { cas: 'P₈', nom: 'centre', stabilite: 'stable' };
}

// Les onze points du TD1, aux coordonnées (trace, déterminant) de la figure.
export const CAS_TD1 = [
  { cas: 'P₁', tr: -3, det: 2 },
  { cas: 'P₂', tr: 3, det: 2 },
  { cas: 'P₃', tr: 0, det: -1 },
  { cas: 'P₄', tr: -3, det: 0 },
  { cas: 'P₅', tr: 0, det: 0 },
  { cas: 'P₆', tr: 2, det: 0 },
  { cas: 'P₇', tr: -2, det: 4 },
  { cas: 'P₈', tr: 0, det: 3 },
  { cas: 'P₉', tr: 2, det: 4 },
  { cas: 'P₁₀', tr: 4, det: 4 },
  { cas: 'P₁₁', tr: -4, det: 4 },
];

// e^{tA} pour A (2, 2), par Cayley-Hamilton : e^{tA} = a₀ I + a₁ A, avec a₀ et
// a₁ donnés par les valeurs propres (distinctes réelles, complexes ou double).
export function exponentielle(A, t) {
  const tr = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const delta = tr * tr - 4 * det;
  const echelle = Math.max(1, Math.abs(tr), Math.sqrt(Math.abs(det)));
  let a0;
  let a1;
  if (Math.abs(delta) <= 1e-12 * echelle * echelle) {
    const l = tr / 2;
    const e = Math.exp(l * t);
    a0 = e * (1 - l * t);
    a1 = e * t;
  } else if (delta > 0) {
    const r = Math.sqrt(delta);
    const l1 = (tr - r) / 2;
    const l2 = (tr + r) / 2;
    const e1 = Math.exp(l1 * t);
    const e2 = Math.exp(l2 * t);
    a0 = (l2 * e1 - l1 * e2) / (l2 - l1);
    a1 = (e2 - e1) / (l2 - l1);
  } else {
    const a = tr / 2;
    const b = Math.sqrt(-delta) / 2;
    const e = Math.exp(a * t);
    a0 = e * (Math.cos(b * t) - (a / b) * Math.sin(b * t));
    a1 = (e * Math.sin(b * t)) / b;
  }
  return [
    [a0 + a1 * A[0][0], a1 * A[0][1]],
    [a1 * A[1][0], a0 + a1 * A[1][1]],
  ];
}

export function applique(M, x) {
  return [M[0][0] * x[0] + M[0][1] * x[1], M[1][0] * x[0] + M[1][1] * x[1]];
}

// Directions propres réelles de A (vecteurs unitaires), une par valeur propre
// réelle distincte ; une seule pour un bloc de Jordan.
export function directionsPropres(A) {
  const tr = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const { valeurs, reelles, delta } = spectre(tr, det);
  if (!reelles) return [];
  const lambdas = Math.abs(delta) <= TOL ? [valeurs[0].re] : valeurs.map((z) => z.re);
  const dirs = [];
  for (const l of lambdas) {
    // Noyau de A − λI : une ligne non nulle (a, b) donne la direction (−b, a).
    const M = [
      [A[0][0] - l, A[0][1]],
      [A[1][0], A[1][1] - l],
    ];
    const ligne = Math.hypot(...M[0]) >= Math.hypot(...M[1]) ? M[0] : M[1];
    let v = Math.hypot(...ligne) < TOL ? [1, 0] : [-ligne[1], ligne[0]];
    const n = Math.hypot(...v);
    v = [v[0] / n, v[1] / n];
    // Valeur propre double diagonalisable (A = λI) : tout le plan est propre.
    if (Math.hypot(...M[0]) < TOL && Math.hypot(...M[1]) < TOL) return [[1, 0], [0, 1]].map((d) => ({ lambda: l, v: d }));
    dirs.push({ lambda: l, v });
  }
  return dirs;
}
