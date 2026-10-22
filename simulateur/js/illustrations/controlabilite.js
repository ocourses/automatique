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
import { latexMatrice } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { carte, glisse, paragraphe, toile } from './commun.js';

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

// Commandes constantes par morceaux tirées au hasard (graine fixe pour que le
// dessin ne scintille pas) ; trajectoire depuis 0 par Euler à petit pas.
function trajectoiresAleatoires(alpha, b1, b2, { n = 40, T = 2, h = 0.01 } = {}) {
  let graine = 12345;
  const hasard = () => {
    graine = (1664525 * graine + 1013904223) % 2 ** 32;
    return graine / 2 ** 32 - 0.5;
  };
  const trajets = [];
  for (let k = 0; k < n; k++) {
    let x = [0, 0];
    let u = [0, 0];
    const pts = [x];
    for (let i = 0; i * h < T; i++) {
      if (i % 25 === 0) u = [4 * hasard(), 4 * hasard()];
      x = [x[0] + h * (alpha * x[0] + u[0] + u[1]), x[1] + h * (2 * alpha * x[1] + b1 * u[0] + b2 * u[1])];
      pts.push(x);
    }
    trajets.push(pts);
  }
  return trajets;
}

export default {
  etat: { alpha: 0, b1: 1, b2: -0.5 },

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
    const champAlpha = champ(cCarte, { latex: '\\alpha', min: -2, max: 2, pas: 0.05, valeur: r.alpha }, (v) => {
      outils.change({ alpha: v });
      dessine();
    });
    const canvasCarte = toile(cCarte, '1 / 1', () => dessine());
    canvasCarte.classList.add('saisissable');
    const repCarte = new Repere(canvasCarte, { x: [-2, 2], y: [-2, 2], egal: true });
    const verdict = paragraphe(cCarte, '', 'verdict');

    const cTraj = carte(grille, 'Trajectoires depuis $0$, commandes au hasard');
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
        repCarte.region((b1, b2) => rangKalman(r.alpha, b1, b2, 1e-3) === 2, { couleur: col.zone, pas: 5 });
        repCarte.axes({ noms: ['β₁', 'β₂'] });
        // Lieu du rang 1, tracé exactement (il est de mesure nulle).
        if (Math.abs(r.alpha) < 1e-9) repCarte.droite(0, 0, 1, 1, { couleur: col.alerte, largeur: 2.5 });
        else repCarte.point(0, 0, { rayon: 5, couleur: col.alerte });
        repCarte.point(r.b1, r.b2, { rayon: 7, couleur: rg === 2 ? col.accent : col.alerte });
      }
      verdict.className = `verdict ${rg === 2 ? 'ok' : 'alerte'}`;
      outils.rendTexte(
        verdict,
        `$\\mathcal C(A, B) = ${latexMatrice(kalman(A, B))}$ est de rang ${rg} : ${rg === 2 ? 'le système est contrôlable.' : 'le système n’est pas contrôlable.'} ` +
          `En rouge, le lieu du rang 1 pour $\\alpha = ${String(r.alpha).replace('.', '{,}')}$ : ${Math.abs(r.alpha) < 1e-9 ? 'toute la diagonale $\\beta_1 = \\beta_2$' : 'le seul point $\\beta_1 = \\beta_2 = 0$'}.`,
      );

      if (repTraj.prepare()) {
        repTraj.axes({ noms: ['x₁', 'x₂'] });
        if (rg < 2) {
          // Im 𝒞 : la droite engendrée par la première colonne non nulle.
          const C = kalman(A, B);
          const j = C[0].findIndex((_, k) => Math.hypot(C[0][k], C[1][k]) > 1e-9);
          repTraj.droite(0, 0, C[0][j], C[1][j], { couleur: col.alerte, largeur: 6, alpha: 0.25 });
        }
        for (const pts of trajectoiresAleatoires(r.alpha, r.b1, r.b2)) repTraj.trace(pts, { couleur: col.accent, largeur: 1, alpha: 0.6 });
        repTraj.point(0, 0, { rayon: 4, couleur: col.trait });
      }
      outils.rendTexte(
        noteTraj,
        rg === 2
          ? 'Les trajectoires partent dans toutes les directions : l’ensemble atteignable est le plan entier.'
          : 'Toutes les trajectoires restent sur la droite $\\operatorname{Im}\\mathcal C(A, B)$ (en rouge), quelle que soit la commande.',
      );
    }

    outils.surTheme(dessine);
    dessine();
    return {
      applique() {
        champAlpha.fixe(r.alpha);
        dessine();
      },
    };
  },
};
