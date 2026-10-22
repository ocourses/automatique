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

export function transpose(A) {
  return A[0].map((_, j) => A.map((ligne) => ligne[j]));
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

// Coefficients (degré décroissant) de la dérivée, et évaluation de Horner
// pour des coefficients réels quelconques.
function derivee(c) {
  const n = c.length - 1;
  return c.slice(0, n).map((ck, k) => ck * (n - k));
}
function hornerGeneral(c, z) {
  let p = { re: 0, im: 0 };
  for (const ck of c) {
    const pz = cmul(p, z);
    p = { re: pz.re + ck, im: pz.im };
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
    if (delta < 1e-14 * Math.max(1, ...z.map((w) => Math.hypot(w.re, w.im)))) break;
  }
  // Une racine de multiplicité k n'est obtenue qu'à ε^{1/k} près. C'est une
  // racine simple de la dérivée (k−1)-ième de p : on l'affine par Newton sur
  // cette dérivée, à partir de la moyenne du paquet de racines voisines.
  // « Voisines » se mesure à l'échelle de la racine elle-même, et non à celle des
  // coefficients : pour un système raide (racines −136 et −3, coefficients de
  // l'ordre de 10⁶), une tolérance fondée sur les coefficients fusionnerait des
  // racines pourtant distinctes.
  const module = (w) => Math.hypot(w.re, w.im);
  const vues = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (vues[i]) continue;
    // 1 % de la taille de la racine : une racine multiple de la jacobienne d'un
    // bouclé non linéaire (différences finies, erreur ~10⁻⁷) s'étale de (10⁻⁷)^{1/4} ≈ 0,02.
    // Deux racines réellement distinctes à moins de 1 % l'une de l'autre sont
    // confondues, ce que les exemples du simulateur ne rencontrent pas.
    const paquet = 1e-2 * Math.max(1, module(z[i]));
    const membres = [i];
    for (let j = i + 1; j < n; j++) {
      if (!vues[j] && Math.hypot(z[i].re - z[j].re, z[i].im - z[j].im) < paquet) membres.push(j);
    }
    if (membres.length > 1) {
      let r = {
        re: membres.reduce((s, k) => s + z[k].re, 0) / membres.length,
        im: membres.reduce((s, k) => s + z[k].im, 0) / membres.length,
      };
      let q = c;
      for (let k = 1; k < membres.length; k++) q = derivee(q);
      const dq = derivee(q);
      for (let it = 0; it < 30; it++) {
        const d = hornerGeneral(dq, r);
        if (d.re === 0 && d.im === 0) break;
        const corr = cdiv(hornerGeneral(q, r), d);
        r = { re: r.re - corr.re, im: r.im - corr.im };
        if (Math.hypot(corr.re, corr.im) < 1e-15 * Math.max(1, module(r))) break;
      }
      // Le raffinement doit rester dans le paquet : sinon ces racines n'étaient
      // pas une racine multiple, et on garde les valeurs de Durand-Kerner.
      if (Number.isFinite(r.re) && Number.isFinite(r.im) && membres.every((k) => module({ re: z[k].re - r.re, im: z[k].im - r.im }) < 10 * paquet)) {
        membres.forEach((k) => {
          vues[k] = true;
          z[k] = r;
        });
      }
    }
  }
  return z
    .map((r) => (Math.abs(r.im) < 1e-9 * Math.max(1, module(r)) ? { re: r.re, im: 0 } : r))
    .sort((a, b) => a.re - b.re || a.im - b.im);
}

export function valeursPropres(A) {
  return racines(polynomeCaracteristique(A));
}

// Jacobienne de F : R^n → R^k en w0, par différences centrées.
export function jacobienne(F, w0) {
  const n = w0.length;
  const colonnes = [];
  for (let j = 0; j < n; j++) {
    const h = 1e-6 * Math.max(1, Math.abs(w0[j]));
    const wp = w0.slice();
    const wm = w0.slice();
    wp[j] += h;
    wm[j] -= h;
    const fp = F(wp);
    const fm = F(wm);
    colonnes.push(fp.map((v, i) => (v - fm[i]) / (2 * h)));
  }
  return colonnes[0].map((_, i) => colonnes.map((c) => c[i]));
}

// Jacobiennes (A, B) de f en (xe, ue).
export function linearise(f, xe, ue, p) {
  const A = jacobienne((x) => f(x, ue, p), xe);
  const B = jacobienne((u) => f(xe, u, p), ue);
  return { A, B };
}

// Inverse de M (null si M est singulière), par Gauss-Jordan.
export function inverse(M, tol = 1e-12) {
  const n = M.length;
  const A = M.map((ligne, i) => [...ligne, ...identite(n)[i]]);
  for (let j = 0; j < n; j++) {
    let p = j;
    for (let i = j + 1; i < n; i++) if (Math.abs(A[i][j]) > Math.abs(A[p][j])) p = i;
    if (Math.abs(A[p][j]) < tol) return null;
    [A[j], A[p]] = [A[p], A[j]];
    const piv = A[j][j];
    for (let k = 0; k < 2 * n; k++) A[j][k] /= piv;
    for (let i = 0; i < n; i++) {
      if (i === j) continue;
      const c = A[i][j];
      for (let k = 0; k < 2 * n; k++) A[i][k] -= c * A[j][k];
    }
  }
  return A.map((ligne) => ligne.slice(n));
}
