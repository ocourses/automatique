// Portrait de phase d'un système linéaire plan ẋ = Ax, partagé par le
// diagramme de bifurcation et la galerie des onze cas : champ de vecteurs,
// directions propres, droite d'équilibres, orbites fléchées et particules
// emportées par le flot.

import { applique, directionsPropres, exponentielle, spectre } from '../core/dim2.js';

// Durée sur laquelle on trace une orbite, selon la vitesse du flot.
function horizon(A) {
  const tr = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const { valeurs, reelles } = spectre(tr, det);
  if (!reelles && Math.abs(valeurs[0].re) < 1e-9) return { debut: 0, fin: (2 * Math.PI) / Math.abs(valeurs[0].im) };
  const vitesse = Math.max(0.3, ...valeurs.map((z) => Math.hypot(z.re, z.im)));
  return { debut: -6 / vitesse, fin: 6 / vitesse };
}

// Orbite par x0 : points e^{tA}x0, t parcourant l'horizon.
export function orbite(A, x0, n = 400) {
  const { debut, fin } = horizon(A);
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = debut + ((fin - debut) * k) / n;
    pts.push(applique(exponentielle(A, t), x0));
  }
  return pts;
}

// Conditions initiales des orbites dessinées : deux cercles intérieurs au
// cadre (pour qu'un centre ait ses ellipses), plus les directions propres
// (pour montrer qu'elles sont invariantes).
function departs(A, R) {
  const pts = [];
  for (const [rayon, N, decalage] of [
    [0.9 * R, 10, 0.5],
    [0.45 * R, 6, 0],
  ]) {
    for (let k = 0; k < N; k++) {
      const a = (2 * Math.PI * (k + decalage)) / N;
      pts.push([rayon * Math.cos(a), rayon * Math.sin(a)]);
    }
  }
  for (const { v } of directionsPropres(A)) for (const s of [-1, 1]) pts.push([0.6 * R * s * v[0], 0.6 * R * s * v[1]]);
  return pts;
}

export function dessinePortrait(rep, A, { couleurs: col, champ = true, finesse = 1, orbitesEn = null } = {}) {
  const R = 0.5 * Math.min(rep.cadre.x[1] - rep.cadre.x[0], rep.cadre.y[1] - rep.cadre.y[0]);
  if (champ) rep.champ((x, y) => applique(A, [x, y]), { n: Math.round(15 * finesse), couleur: col.discret });

  // Droite d'équilibres (det A = 0, A ≠ 0) : noyau de A.
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  if (Math.abs(det) < 1e-9) {
    const ligne = Math.hypot(...A[0]) >= Math.hypot(...A[1]) ? A[0] : A[1];
    if (Math.hypot(...ligne) > 1e-9) rep.droite(0, 0, -ligne[1], ligne[0], { couleur: col.alerte, largeur: 2.5 });
  }

  // Directions propres.
  for (const { v } of directionsPropres(A)) rep.droite(0, 0, v[0], v[1], { couleur: col.accent, largeur: 1, tirets: [6, 4] });

  // Orbites fléchées.
  for (const x0 of orbitesEn ?? departs(A, R)) {
    const pts = orbite(A, x0, Math.round(300 * finesse));
    rep.trace(pts, { couleur: col.trait, largeur: 1.2 * finesse + 0.2, alpha: 0.8 });
    // Flèche au milieu de la partie visible, dans le sens du temps.
    const visibles = pts.map((p, k) => (rep.contient(p[0], p[1]) && Math.hypot(...p) > 0.08 * R ? k : -1)).filter((k) => k >= 0);
    if (visibles.length > 2) {
      const p = pts[visibles[Math.floor(visibles.length / 2)]];
      const v = applique(A, p);
      rep.pointe(p[0], p[1], v[0], v[1], { couleur: col.trait, taille: 7 * finesse + 1 });
    }
  }
  rep.point(0, 0, { rayon: 3.5, couleur: col.trait });
}

// Particules emportées par le flot, pour voir le mouvement (pas de dessin si
// l'utilisateur préfère réduire les animations).
export class Particules {
  constructor(n = 40) {
    this.n = n;
    this.pts = [];
  }

  avance(A, rep, dt) {
    const { x: [a, b], y: [c, d] } = rep.cadre;
    const tire = () => [a + Math.random() * (b - a), c + Math.random() * (d - c)];
    while (this.pts.length < this.n) this.pts.push({ x: tire(), age: Math.random() * 4 });
    const E = exponentielle(A, dt);
    const echelle = Math.min(b - a, d - c);
    for (const p of this.pts) {
      p.x = applique(E, p.x);
      p.age += dt;
      // Une particule sortie du cadre, arrivée à l'origine ou trop vieille renaît ailleurs.
      if (!rep.contient(...p.x) || Math.hypot(...p.x) < 0.01 * echelle || p.age > 6) {
        p.x = tire();
        p.age = 0;
      }
    }
  }

  dessine(rep, couleur) {
    for (const p of this.pts) rep.point(p.x[0], p.x[1], { rayon: 2.6, couleur });
  }
}
