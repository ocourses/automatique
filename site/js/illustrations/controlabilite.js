// Contrôlabilité (poly, chapitre « Commande ») : le système à deux commandes
//   ẋ₁ = α x₁ + u₁ + u₂,  ẋ₂ = 2α x₂ + β₁ u₁ + β₂ u₂,
// de matrice de Kalman 𝒞(A, B) = (B  AB) = [[1, 1, α, α], [β₁, β₂, 2αβ₁, 2αβ₂]].
// La carte colorie le rang de 𝒞 dans le plan (β₁, β₂) pour α donné ; à droite,
// des trajectoires issues de 0 sous des commandes tirées au hasard remplissent
// le plan quand le rang vaut 2, et restent sur la droite Im 𝒞 quand il vaut 1.
//
// Le rang vaut 1 si et seulement si β₁ = β₂ et αβ₁ = 0 : pour α = 0, toute la
// diagonale ; pour α ≠ 0, le seul point β₁ = β₂ = 0 (la seconde ligne de B est
// alors nulle et x₂ n'est pas commandable).

import { kalman, rang } from '../core/linalg.js';
import { champ } from '../ui/controls.js';
import { latexMatriceFixe, latexNombreFixe } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { boutonInfo, carte, glisse, paragraphe, toile } from './commun.js';

export const matrices = (alpha, b1, b2) => ({
  A: [
    [alpha, 0],
    [0, 2 * alpha],
  ],
  B: [
    [1, 1],
    [b1, b2],
  ],
});

export const rangKalman = (alpha, b1, b2, tol = 1e-9) => {
  const { A, B } = matrices(alpha, b1, b2);
  return rang(kalman(A, B), tol);
};

// Marches aléatoires : n commandes constantes par morceaux sur K intervalles,
// u(t) ∈ [−1, 1]² tiré au hasard à chaque intervalle (graine fixe : le dessin
// ne scintille pas), plus les quatre commandes constantes extrêmes (±1, ±1).
// Chaque marche a son propre biais (valeur moyenne de chaque composante) : les points d'arrivée s'étalent jusqu'au bord de l'ensemble
// atteignable au lieu de se tasser autour de 0.
// Chaque trajectoire part de 0 et est intégrée par Euler à petit pas jusqu'en
// T. Les points d'arrivée donnent une idée de l'ensemble atteignable en T.
export function trajectoiresAleatoires(alpha, b1, b2, { n = 300, T = 2, K = 10, sousPas = 12 } = {}) {
  let graine = 12345;
  const hasard = () => {
    graine = (1664525 * graine + 1013904223) % 2 ** 32;
    return graine / 2 ** 32;
  };
  const h = T / (K * sousPas);
  const commandes = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map((u) => Array.from({ length: K }, () => u));
  for (let k = 0; k < n; k++) {
    const biais = [hasard(), hasard()];
    commandes.push(Array.from({ length: K }, () => biais.map((p) => Math.max(-1, Math.min(1, 2 * p - 1 + 1.6 * (hasard() - 0.5))))));
  }
  return commandes.map((u) => {
    let x = [0, 0];
    const pts = [x];
    for (let i = 0; i < K * sousPas; i++) {
      const [u1, u2] = u[Math.floor(i / sousPas)];
      x = [x[0] + h * (alpha * x[0] + u1 + u2), x[1] + h * (2 * alpha * x[1] + b1 * u1 + b2 * u2)];
      pts.push(x);
    }
    return pts;
  });
}

// Enveloppe convexe de points du plan (chaîne monotone d'Andrew) : le contour de
// l'ensemble atteignable, convexe pour un système linéaire à commandes bornées.
export function enveloppeConvexe(points) {
  const P = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const croix = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const moitie = (liste) => {
    const h = [];
    for (const p of liste) {
      while (h.length >= 2 && croix(h[h.length - 2], h[h.length - 1], p) <= 1e-12) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...moitie(P), ...moitie([...P].reverse())];
}

export default {
  etat: { alpha: 0, b1: 1, b2: -0.5, T: 2 },

  termes: ['matrice de Kalman', 'contrôlable', 'atteignable'],

  rappel: [
    'Le système $\\dot x = Ax + Bu$ est contrôlable si et seulement si la matrice de Kalman $\\mathcal C(A, B) = (B \\ AB \\ \\cdots \\ A^{n-1}B)$ est de rang $n$. L’ensemble atteignable depuis $0$ est alors tout $\\mathbb R^n$ ; sinon, c’est le sous-espace $\\operatorname{Im}\\mathcal C(A, B)$, quel que soit le temps.',
    'Exemple du poly : $A = \\begin{pmatrix} \\alpha & 0 \\\\ 0 & 2\\alpha \\end{pmatrix}$, $B = \\begin{pmatrix} 1 & 1 \\\\ \\beta_1 & \\beta_2 \\end{pmatrix}$. Le mineur des deux premières colonnes de $\\mathcal C$ vaut $\\beta_2 - \\beta_1$ ; si $\\beta_1 = \\beta_2$, celui des colonnes 1 et 3 vaut $\\alpha\\beta_1$.',
    'Le rang vaut donc 2 si et seulement si $\\beta_1 \\neq \\beta_2$ ou $\\alpha\\beta_1 \\neq 0$ (mélangeur du poly).',
  ],

  essais: [
    { texte: 'Avec $\\alpha = 0$, placez le point sur la diagonale $\\beta_1 = \\beta_2$ : les trajectoires restent sur une droite, quelle que soit la commande.', etat: { alpha: 0, b1: 1, b2: 1 } },
    { texte: 'Gardez $\\beta_1 = \\beta_2 = 1$ et prenez $\\alpha \\neq 0$ : le rang remonte à 2. La dynamique de $A$ suffit à séparer les deux directions.', etat: { alpha: -0.8, b1: 1, b2: 1 } },
    { texte: 'Avec $\\alpha \\neq 0$, essayez $\\beta_1 = \\beta_2 = 0$ : la seconde ligne de $B$ est nulle, $x_2$ n’est pas commandable. Ce cas n’est pas couvert par l’énoncé « rang 1 ssi $\\beta_1 = \\beta_2$ et $\\alpha = 0$ » de l’exemple général du poly.', etat: { alpha: -0.8, b1: 0, b2: 0 } },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    const grille = document.createElement('div');
    grille.className = 'grille-2';
    zone.appendChild(grille);

    const cCarte = carte(grille, 'Rang de $\\mathcal C(A, B)$ dans le plan $(\\beta_1, \\beta_2)$');
    const champAlpha = champ(cCarte, { latex: '\\alpha', min: -2, max: 2, pas: 0.05, pasFleche: 0.1, valeur: r.alpha }, (v) => {
      outils.change({ alpha: v });
      dessine();
    });
    const canvasCarte = toile(cCarte, '1 / 1', () => dessine());
    canvasCarte.classList.add('saisissable');
    const repCarte = new Repere(canvasCarte, { x: [-2, 2], y: [-2, 2], egal: true });
    const verdict = paragraphe(cCarte, '', 'verdict');

    boutonInfo(cCarte, [
      ['point', '--accent', 'Le point $(\\beta_1, \\beta_2)$ : faites-le glisser. Bleu si le système est contrôlable (rang 2), rouge sinon.'],
      ['ligne', '--alerte', 'Le lieu du rang 1 : toute la diagonale si $\\alpha = 0$, le seul point $(0, 0)$ sinon. Le point s’y colle.'],
    ]);
    const cTraj = carte(grille, 'Ensemble atteignable en $T$ depuis $0$');
    boutonInfo(cTraj, [
      ['ligne', '--accent', 'Quelques marches aléatoires : commandes $u(t) \\in [-1, 1]^2$ constantes par morceaux, tirées au hasard, depuis $0$.'],
      ['point', '--accent', 'Le point atteint au temps $T$ par chacune des 300 marches.'],
      ['zone', '--accent', 'L’enveloppe convexe de ces points : l’ensemble atteignable en $T$ (convexe, pour des commandes bornées).'],
      ['zone', '--alerte', 'Si le rang vaut 1 : la droite $\\operatorname{Im}\\mathcal C(A, B)$, où restent toutes les trajectoires.'],
      ['point', '--perturbation', 'Le point de départ $0$.'],
    ]);
    const champT = champ(cTraj, { latex: 'T', min: 0.2, max: 4, pas: 0.05, pasFleche: 0.1, valeur: r.T }, (v) => {
      outils.change({ T: v });
      dessine();
    });
    const canvasTraj = toile(cTraj, '1 / 1', () => dessine());
    const repTraj = new Repere(canvasTraj, { x: [-3, 3], y: [-3, 3], egal: true });
    const noteTraj = paragraphe(cTraj, '', '');

    // Le point (β₁, β₂) se colle à la diagonale et à l'origine, où le rang chute.
    glisse(canvasCarte, repCarte, {
      deplace: (x, y) => {
        let [b1, b2] = [x, y];
        const seuil = 8 / repCarte.sx;
        if (Math.abs(b1 - b2) < seuil) b1 = b2 = (b1 + b2) / 2;
        if (Math.hypot(b1, b2) < seuil) b1 = b2 = 0;
        outils.change({ b1: Number(b1.toFixed(3)), b2: Number(b2.toFixed(3)) });
        dessine();
      },
    });

    function dessine() {
      const col = couleurs();
      const rg = rangKalman(r.alpha, r.b1, r.b2);
      const { A, B } = matrices(r.alpha, r.b1, r.b2);

      if (repCarte.prepare()) {
        repCarte.axes({ noms: ['β₁', 'β₂'] });
        // Lieu du rang 1, tracé exactement (il est de mesure nulle).
        if (Math.abs(r.alpha) < 1e-9) repCarte.droite(0, 0, 1, 1, { couleur: col.alerte, largeur: 2.5 });
        else repCarte.point(0, 0, { rayon: 5, couleur: col.alerte });
        repCarte.point(r.b1, r.b2, { rayon: 7, couleur: rg === 2 ? col.accent : col.alerte });
      }
      verdict.className = `verdict ${rg === 2 ? 'ok' : 'alerte'}`;
      outils.rendTexte(
        verdict,
        `$\\mathcal C(A, B) = ${latexMatriceFixe(kalman(A, B))}$ est de rang ${rg} : ${rg === 2 ? 'le système est contrôlable.' : 'le système n’est pas contrôlable.'} ` +
          `En rouge, le lieu du rang 1 pour $\\alpha = ${latexNombreFixe(r.alpha)}$ : ${Math.abs(r.alpha) < 1e-9 ? 'toute la diagonale $\\beta_1 = \\beta_2$' : 'le seul point $\\beta_1 = \\beta_2 = 0$'}.`,
      );

      const marches = trajectoiresAleatoires(r.alpha, r.b1, r.b2, { T: r.T });
      const arrivees = marches.map((pts) => pts[pts.length - 1]);
      // Cadre carré, centré en 0, qui contient tous les points atteints.
      const rayon = Math.max(1, ...arrivees.map(([a, b]) => Math.max(Math.abs(a), Math.abs(b)))) * 1.15;
      repTraj.fixeCadre([-rayon, rayon], [-rayon, rayon]);
      if (repTraj.prepare()) {
        repTraj.axes({ noms: ['x₁', 'x₂'] });
        const contour = enveloppeConvexe(arrivees);
        const ctx = repTraj.ctx;
        ctx.save();
        repTraj.decoupe();
        ctx.fillStyle = col.accent;
        ctx.globalAlpha = 0.14;
        ctx.beginPath();
        contour.forEach(([a, b], k) => (k ? ctx.lineTo(repTraj.X(a), repTraj.Y(b)) : ctx.moveTo(repTraj.X(a), repTraj.Y(b))));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        repTraj.trace([...contour, contour[0]], { couleur: col.accent, largeur: 1.2, alpha: 0.6 });
        if (rg < 2) {
          // Im 𝒞 : la droite engendrée par la première colonne non nulle.
          const C = kalman(A, B);
          const j = C[0].findIndex((_, k) => Math.hypot(C[0][k], C[1][k]) > 1e-9);
          repTraj.droite(0, 0, C[0][j], C[1][j], { couleur: col.alerte, largeur: 6, alpha: 0.25 });
        }
        for (const pts of marches.slice(4, 14)) repTraj.trace(pts, { couleur: col.accent, largeur: 1, alpha: 0.5 });
        for (const [a, b] of arrivees) repTraj.point(a, b, { rayon: 2, couleur: col.accent });
        repTraj.point(0, 0, { rayon: 5, couleur: col.perturbation });
      }
      outils.rendTexte(
        noteTraj,
        rg === 2
          ? 'Les points atteints remplissent une région du plan, qui grandit avec $T$ et avec la borne sur $u$ : sans borne, l’ensemble atteignable est le plan entier.'
          : 'Tous les points atteints restent sur la droite $\\operatorname{Im}\\mathcal C(A, B)$ (en rouge), quelle que soit la commande.',
      );
    }

    outils.surTheme(dessine);
    dessine();
    return {
      applique() {
        champAlpha.fixe(r.alpha);
        champT.fixe(r.T);
        dessine();
      },
    };
  },
};
