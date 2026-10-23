// Rotations en dimension 3, pour l'animation du satellite : orientation du
// corps (matrice R, du repère du corps vers le repère fixe) et polhodies du
// solide libre sur la sphère du moment cinétique.

export function applique3(M, v) {
  return M.map((ligne) => ligne[0] * v[0] + ligne[1] * v[1] + ligne[2] * v[2]);
}

export function produit3(A, B) {
  return A.map((ligne) => [0, 1, 2].map((j) => ligne[0] * B[0][j] + ligne[1] * B[1][j] + ligne[2] * B[2][j]));
}

export const identite3 = () => [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

// Rotation d'angle `angle` autour de l'axe unitaire `a` (formule de Rodrigues).
export function rotation(a, angle) {
  const [x, y, z] = a;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    [c + x * x * t, x * y * t - z * s, x * z * t + y * s],
    [y * x * t + z * s, c + y * y * t, y * z * t - x * s],
    [z * x * t - y * s, z * y * t + x * s, c + z * z * t],
  ];
}

// Gram-Schmidt sur les colonnes : corrige la dérive numérique de R.
export function orthonormalise(R) {
  const col = [0, 1, 2].map((j) => R.map((l) => l[j]));
  const norme = (v) => Math.hypot(...v);
  const e1 = col[0].map((v) => v / norme(col[0]));
  const p = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  let e2 = col[1].map((v, i) => v - p(col[1], e1) * e1[i]);
  e2 = e2.map((v) => v / norme(e2));
  const e3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  return [0, 1, 2].map((i) => [e1[i], e2[i], e3[i]]);
}

// Orientation après un pas dt à la vitesse angulaire ω (exprimée dans le
// repère du corps) : Ṙ = R [ω]×, intégré exactement à ω constant sur le pas.
export function pasOrientation(R, w, dt) {
  const n = Math.hypot(...w);
  if (n * dt < 1e-12) return R;
  return produit3(R, rotation(w.map((v) => v / n), n * dt));
}

// Polhodies : trajectoires du moment cinétique h = Jω du solide libre
// (u = 0) sur la sphère ‖h‖ = 1, ḣ = h × J⁻¹h. Les départs sont pris dans le
// plan (h₁, h₃), où passent toutes les orbites (autour de ±e₁ et de ±e₃) ; on
// ajoute leurs symétriques. Chaque orbite est suivie jusqu'à ce qu'elle se
// referme.
export function polhodies([J1, J2, J3], { angles = [8, 20, 32, 44, 56, 68, 80], h = 0.01, tMax = 80 } = {}) {
  const F = ([a, b, c]) => {
    const w = [a / J1, b / J2, c / J3];
    return [b * w[2] - c * w[1], c * w[0] - a * w[2], a * w[1] - b * w[0]];
  };
  const pas = (x) => {
    const k1 = F(x);
    const k2 = F(x.map((v, i) => v + (h / 2) * k1[i]));
    const k3 = F(x.map((v, i) => v + (h / 2) * k2[i]));
    const k4 = F(x.map((v, i) => v + h * k3[i]));
    const y = x.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    const n = Math.hypot(...y);
    return y.map((v) => v / n);
  };
  const orbites = [];
  for (const deg of angles) {
    const t = (deg * Math.PI) / 180;
    const depart = [Math.cos(t), 0, Math.sin(t)];
    const pts = [depart];
    let x = depart;
    let parti = false;
    for (let k = 0; k * h < tMax; k++) {
      x = pas(x);
      pts.push(x);
      const d = Math.hypot(...x.map((v, i) => v - depart[i]));
      if (d > 0.2) parti = true;
      else if (parti && d < 0.02) break;
    }
    pts.push(depart);
    orbites.push(pts, pts.map((p) => p.map((v) => -v)));
  }
  return orbites;
}
