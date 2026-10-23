// Placement de pôles : formule d'Ackermann et déplacement d'une valeur propre
// dans le plan complexe en respectant la symétrie par conjugaison.

import { identite, kalman, matadd, matmul, rang, transpose } from './linalg.js';

// Coefficients (1, c_1, …, c_n) du polynôme unitaire de racines données
// (complexes {re, im}, stables par conjugaison) : seule la partie réelle est gardée.
export function polynomeDepuisRacines(racines) {
  let c = [{ re: 1, im: 0 }];
  for (const r of racines) {
    const suivant = [...c, { re: 0, im: 0 }];
    for (let k = 1; k < suivant.length; k++) {
      const p = c[k - 1];
      suivant[k] = {
        re: suivant[k].re - (p.re * r.re - p.im * r.im),
        im: suivant[k].im - (p.re * r.im + p.im * r.re),
      };
    }
    c = suivant;
  }
  return c.map((z) => z.re);
}

// Résout M x = b par élimination de Gauss avec pivot partiel.
export function resous(M, b) {
  const n = M.length;
  const A = M.map((ligne, i) => [...ligne, b[i]]);
  for (let j = 0; j < n; j++) {
    let p = j;
    for (let i = j + 1; i < n; i++) if (Math.abs(A[i][j]) > Math.abs(A[p][j])) p = i;
    [A[j], A[p]] = [A[p], A[j]];
    for (let i = j + 1; i < n; i++) {
      const c = A[i][j] / A[j][j];
      for (let k = j; k <= n; k++) A[i][k] -= c * A[j][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = A[i][n];
    for (let k = i + 1; k < n; k++) s -= A[i][k] * x[k];
    x[i] = s / A[i][i];
  }
  return x;
}

// Le placement est possible pour une seule commande et un linéarisé contrôlable.
export function placementPossible(A, B) {
  return B[0].length === 1 && rang(kalman(A, B)) === A.length;
}

// Gain K (1 × n) tel que A + BK ait les valeurs propres demandées.
// Ackermann donne K_a = e_nᵀ 𝒞(A,B)⁻¹ p(A) avec spec(A − B K_a) imposé ;
// la loi du cours étant u = Kx, on prend K = −K_a.
export function ackermann(A, B, racines) {
  const n = A.length;
  const c = polynomeDepuisRacines(racines);
  // p(A) = A^n + c_1 A^{n−1} + … + c_n I, par Horner.
  let P = identite(n);
  for (let k = 1; k <= n; k++) P = matadd(matmul(P, A), identite(n).map((l) => l.map((v) => v * c[k])));
  const C = kalman(A, B);
  const en = new Array(n).fill(0);
  en[n - 1] = 1;
  // Ligne w = e_nᵀ 𝒞⁻¹, c'est-à-dire 𝒞ᵀ wᵀ = e_n.
  const w = resous(C[0].map((_, j) => C.map((ligne) => ligne[j])), en);
  const Ka = P[0].map((_, j) => w.reduce((s, wi, i) => s + wi * P[i][j], 0));
  return [Ka.map((v) => -v)];
}

// Systèmes à gains diagonaux (satellite : A = 0, B = diag(1/J_i), K = diag(k_i)) :
// A + BK est diagonale, de coefficients a_jj + b_jj k_jj. Une valeur propre ne
// dépend alors que du gain de « son » axe, et se place seulement sur l'axe réel.
const coefficient = (A, B, K, j) => A[j][j] + B[j][j] * K[j][j];

// Indice j de l'axe dont la valeur propre est la plus proche de `re`.
export function axeDeValeurPropre(A, B, K, re) {
  let meilleur = 0;
  A.forEach((_, j) => {
    if (Math.abs(coefficient(A, B, K, j) - re) < Math.abs(coefficient(A, B, K, meilleur) - re)) meilleur = j;
  });
  return meilleur;
}

// Gain k_jj qui donne la valeur propre `lambda` à l'axe j, ramené dans [min, max].
export function gainPourValeurPropre(A, B, j, lambda, { min = -Infinity, max = Infinity } = {}) {
  return Math.min(max, Math.max(min, (lambda - A[j][j]) / B[j][j]));
}

// Nouvel ensemble de valeurs propres quand on amène vp[i] en z.
// `seuil` est la distance d'aimantation aux axes (dans le plan complexe) : un
// nombre, ou { re, im } quand les deux axes n'ont pas la même échelle.
//   - Une valeur propre complexe entraîne sa conjuguée ; près de l'axe réel,
//     la paire se colle en une racine réelle double.
//   - Une valeur propre réelle glisse sur l'axe réel ; écartée de l'axe, elle
//     emmène la réelle la plus proche, qui devient sa conjuguée (s'il n'y en a
//     pas, elle reste sur l'axe).
//   - Près de l'axe imaginaire, la partie réelle est mise à zéro.
export function deplaceValeurPropre(vp, i, z, seuil) {
  const nouv = vp.map((v) => ({ ...v }));
  const [seuilRe, seuilIm] = typeof seuil === 'number' ? [seuil, seuil] : [seuil.re, seuil.im];
  const re = Math.abs(z.re) < seuilRe ? 0 : z.re;
  const surAxeReel = Math.abs(z.im) < seuilIm;
  const reelle = (v) => v.im === 0;

  if (!reelle(vp[i])) {
    // Indice de la conjuguée : la plus proche de conj(vp[i]) parmi les autres.
    const j = autrePlusProche(vp, i, { re: vp[i].re, im: -vp[i].im });
    if (surAxeReel) {
      nouv[i] = { re, im: 0 };
      nouv[j] = { re, im: 0 };
    } else {
      nouv[i] = { re, im: z.im };
      nouv[j] = { re, im: -z.im };
    }
    return nouv;
  }

  const j = surAxeReel ? -1 : autrePlusProche(vp, i, vp[i], reelle);
  if (j < 0) {
    nouv[i] = { re, im: 0 };
  } else {
    nouv[i] = { re, im: z.im };
    nouv[j] = { re, im: -z.im };
  }
  return nouv;
}

function autrePlusProche(vp, i, cible, filtre = () => true) {
  let meilleur = -1;
  let d = Infinity;
  vp.forEach((v, k) => {
    if (k === i || !filtre(v)) return;
    const dk = Math.hypot(v.re - cible.re, v.im - cible.im);
    if (dk < d) {
      d = dk;
      meilleur = k;
    }
  });
  return meilleur;
}

// Annule les parties imaginaires négligeables (racines doubles calculées
// numériquement) pour que les valeurs propres réelles soient reconnues.
export function nettoieSpectre(vp) {
  return vp.map((v) => (Math.abs(v.im) < 1e-6 * (1 + Math.abs(v.re)) ? { re: v.re, im: 0 } : { ...v }));
}

// Lit une liste de pôles saisie au clavier, par exemple « -1, -2+3i, -2-3i »
// ou « -1, -2±3i » (paire conjuguée). Vérifie qu'il y en a n et que la liste
// est stable par conjugaison. Lève une Error en cas de problème.
export function litPoles(texte, n) {
  const propre = texte.replace(/−/g, '-').replace(/\s+/g, '').replace(/j/g, 'i');
  if (!propre) throw new Error('aucun pôle saisi');
  const poles = [];
  for (const morceau of propre.split(/[;,]/).filter(Boolean)) {
    const m = /^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)?(?:([+-]|±|\+-)(\d*\.?\d*)i)?$/i.exec(morceau);
    const imPur = /^([+-]?)(\d*\.?\d*)i$/i.exec(morceau);
    if (imPur) {
      const v = Number(imPur[2] || 1) * (imPur[1] === '-' ? -1 : 1);
      poles.push({ re: 0, im: v });
      continue;
    }
    if (!m || (m[1] === undefined && m[2] === undefined)) throw new Error(`pôle illisible « ${morceau} »`);
    const re = Number(m[1] ?? 0);
    if (m[2] === undefined) {
      poles.push({ re, im: 0 });
      continue;
    }
    const im = Number(m[3] || 1);
    if (m[2] === '±' || m[2] === '+-') poles.push({ re, im }, { re, im: -im });
    else poles.push({ re, im: m[2] === '-' ? -im : im });
  }
  if (poles.length !== n) throw new Error(`il faut ${n} pôles, ${poles.length} saisi${poles.length > 1 ? 's' : ''}`);
  const restants = poles.filter((z) => z.im !== 0);
  while (restants.length) {
    const z = restants.shift();
    const k = restants.findIndex((w) => Math.abs(w.re - z.re) < 1e-12 && Math.abs(w.im + z.im) < 1e-12);
    if (k < 0) throw new Error('les pôles complexes doivent venir par paires conjuguées');
    restants.splice(k, 1);
  }
  return poles;
}

// ---- Observateur de Luenberger --------------------------------------------

// Ligne C = e_k^T de la sortie mesurée y = x_k (k à partir de 0).
export function ligneSortie(n, k) {
  return Array.from({ length: n }, (_, j) => (j === k ? 1 : 0));
}

// Le couple (A, C) est observable si (A^T, C^T) est commandable (critère de Kalman dual).
export function observable(A, c) {
  return rang(kalman(transpose(A), transpose([c]))) === A.length;
}

// Gain L (vecteur de longueur n) tel que A − LC ait les valeurs propres demandées.
// (A − LC)^T = A^T + C^T K avec K = −L^T : c'est un placement de pôles pour (A^T, C^T).
export function placementObservateur(A, c, racines) {
  const K = ackermann(transpose(A), transpose([c]), racines);
  return K[0].map((v) => -v);
}

// A − LC pour une sortie c et un gain L.
export function matriceObservateur(A, c, L) {
  return A.map((ligne, i) => ligne.map((aij, j) => aij - L[i] * c[j]));
}

// Euler explicite sur ė = λ e : e_{k+1} = (1 + hλ) e_k. Facteur d'amplification
// maximal sur le spectre : il faut ρ = max |1 + hλ| < 1 pour que l'erreur converge.
export function facteurEuler(vp, h) {
  return Math.max(...vp.map((z) => Math.hypot(1 + h * z.re, h * z.im)));
}

// Plus grand pas h tel que |1 + hλ| < 1 pour toutes les valeurs propres : pour
// Re λ < 0, c'est h < −2 Re λ / |λ|². Vaut 0 si une valeur propre est de partie
// réelle positive ou nulle (aucun pas ne convient).
export function pasEulerMax(vp) {
  if (vp.some((z) => z.re >= -1e-12)) return 0;
  return Math.min(...vp.map((z) => (-2 * z.re) / (z.re * z.re + z.im * z.im)));
}
