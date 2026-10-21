// Algèbre linéaire pour de petites matrices (tableaux de lignes).

export function matmul(A, B) {
  return A.map((ligne) =>
    B[0].map((_, j) => ligne.reduce((s, aik, k) => s + aik * B[k][j], 0)),
  );
}

export function matadd(A, B) {
  return A.map((ligne, i) => ligne.map((aij, j) => aij + B[i][j]));
}

export function identite(n) {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

export function trace(A) {
  return A.reduce((s, ligne, i) => s + ligne[i], 0);
}

// Rang par élimination de Gauss avec pivot partiel, à tolérance relative.
export function rang(M, tol = 1e-9) {
  const A = M.map((ligne) => ligne.slice());
  const n = A.length;
  const m = A[0].length;
  const echelle = Math.max(1, ...A.flat().map(Math.abs));
  let r = 0;
  for (let j = 0; j < m && r < n; j++) {
    let p = r;
    for (let i = r + 1; i < n; i++) if (Math.abs(A[i][j]) > Math.abs(A[p][j])) p = i;
    if (Math.abs(A[p][j]) <= tol * echelle) continue;
    [A[r], A[p]] = [A[p], A[r]];
    for (let i = r + 1; i < n; i++) {
      const c = A[i][j] / A[r][j];
      for (let k = j; k < m; k++) A[i][k] -= c * A[r][k];
    }
    r++;
  }
  return r;
}

// Matrice de Kalman (B, AB, …, A^{n-1}B).
export function kalman(A, B) {
  const n = A.length;
  const blocs = [B];
  for (let k = 1; k < n; k++) blocs.push(matmul(A, blocs[k - 1]));
  return A.map((_, i) => blocs.flatMap((Bk) => Bk[i]));
}

// Coefficients (c_0 = 1, c_1, …, c_n) du polynôme caractéristique
// det(λI − A) = λ^n + c_1 λ^{n−1} + … + c_n (Faddeev-LeVerrier).
export function polynomeCaracteristique(A) {
  const n = A.length;
  const c = [1];
  let M = identite(n);
  for (let k = 1; k <= n; k++) {
    const AM = matmul(A, M);
    const ck = -trace(AM) / k;
    c.push(ck);
    M = matadd(AM, identite(n).map((ligne) => ligne.map((v) => v * ck)));
  }
  return c;
}

// Racines complexes {re, im} d'un polynôme unitaire de coefficients c (c[0] = 1).
export function racines(c) {
  const n = c.length - 1;
  if (n === 1) return [{ re: -c[1], im: 0 }];
  if (n === 2) {
    const d = c[1] * c[1] - 4 * c[2];
    if (d >= 0) {
      // Forme stable numériquement.
      const q = -(c[1] + Math.sign(c[1] || 1) * Math.sqrt(d)) / 2;
      const r1 = q;
      const r2 = q !== 0 ? c[2] / q : 0;
      return [{ re: r1, im: 0 }, { re: r2, im: 0 }].sort((a, b) => a.re - b.re);
    }
    const s = Math.sqrt(-d) / 2;
    return [{ re: -c[1] / 2, im: -s }, { re: -c[1] / 2, im: s }];
  }
  return durandKerner(c);
}

function cmul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
function horner(c, z) {
  let p = { re: 1, im: 0 };
  for (let k = 1; k < c.length; k++) {
    const pz = cmul(p, z);
    p = { re: pz.re + c[k], im: pz.im };
  }
  return p;
}

function durandKerner(c) {
  const n = c.length - 1;
  const R = 1 + Math.max(...c.slice(1).map(Math.abs));
  let z = Array.from({ length: n }, (_, k) => {
    const a = (2 * Math.PI * k) / n + 0.4;
    return { re: R * Math.cos(a), im: R * Math.sin(a) };
  });
  for (let it = 0; it < 500; it++) {
    let delta = 0;
    z = z.map((zi, i) => {
      let den = { re: 1, im: 0 };
      z.forEach((zj, j) => {
        if (j !== i) den = cmul(den, { re: zi.re - zj.re, im: zi.im - zj.im });
      });
      const corr = cdiv(horner(c, zi), den);
      delta = Math.max(delta, Math.hypot(corr.re, corr.im));
      return { re: zi.re - corr.re, im: zi.im - corr.im };
    });
    if (delta < 1e-14 * R) break;
  }
  const tol = 1e-9 * R;
  return z
    .map((r) => (Math.abs(r.im) < tol ? { re: r.re, im: 0 } : r))
    .sort((a, b) => a.re - b.re || a.im - b.im);
}

export function valeursPropres(A) {
  return racines(polynomeCaracteristique(A));
}

// Jacobiennes (A, B) de f en (xe, ue) par différences centrées.
export function linearise(f, xe, ue, p) {
  const n = xe.length;
  const m = ue.length;
  const A = identite(n).map((ligne) => ligne.map(() => 0));
  const B = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let j = 0; j < n; j++) {
    const h = 1e-6 * Math.max(1, Math.abs(xe[j]));
    const xp = xe.slice();
    const xm = xe.slice();
    xp[j] += h;
    xm[j] -= h;
    const fp = f(xp, ue, p);
    const fm = f(xm, ue, p);
    for (let i = 0; i < n; i++) A[i][j] = (fp[i] - fm[i]) / (2 * h);
  }
  for (let j = 0; j < m; j++) {
    const h = 1e-6 * Math.max(1, Math.abs(ue[j]));
    const up = ue.slice();
    const um = ue.slice();
    up[j] += h;
    um[j] -= h;
    const fp = f(xe, up, p);
    const fm = f(xe, um, p);
    for (let i = 0; i < n; i++) B[i][j] = (fp[i] - fm[i]) / (2 * h);
  }
  return { A, B };
}

// Arrondit à tol près pour nettoyer le bruit des différences finies.
export function nettoie(M, tol = 1e-7) {
  return M.map((ligne) => ligne.map((v) => (Math.abs(v) < tol ? 0 : Math.round(v / tol) * tol)));
}
