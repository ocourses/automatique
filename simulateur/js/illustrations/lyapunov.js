// Fonction de Lyapunov (poly, théorie de Lyapunov) : la surface z = L(x) en 3D
// avec une bille qui suit la trajectoire, les lignes de niveau dans le plan,
// et t ↦ L(φ(t, x₀)). Deux systèmes du poly :
//   - le pendule, avec son énergie L(x) = x₂²/2 + ω²(1 − cos x₁), conservée
//     sans amortissement (Lyapunov non stricte : stable) et décroissante avec ;
//   - un système linéaire Hurwitz, avec L(x) = ∫₀^∞ ‖e^{sA}x‖² ds = xᵀPx, où
//     AᵀP + PA = −I, de dérivée −‖x‖² le long des trajectoires.
// L'argument de la preuve de stabilité est dessiné : un niveau c sous le
// minimum de L sur la sphère de rayon ε, et une boule B(0, η) ⊂ {L < c}.

import { matrice } from '../core/dim2.js';
import { champ } from '../ui/controls.js';
import { latexMatrice, latexNombre } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { Vue3D } from '../ui/vue3d.js';
import { carte, legende, paragraphe, simule, toile } from './commun.js';
import { champPendule } from './pendule-amorti.js';

// Solution symétrique P de AᵀP + PA = −Q pour A (2, 2) et Q = I : trois
// inconnues (p, q, r) avec P = [[p, q], [q, r]].
export function lyapunov2(A) {
  const [[a, b], [c, d]] = A;
  // Lignes : (1,1) 2(a p + c q) = −1 ; (1,2) b p + (a + d) q + c r = 0 ; (2,2) 2(b q + d r) = −1.
  const M = [
    [2 * a, 2 * c, 0],
    [b, a + d, c],
    [0, 2 * b, 2 * d],
  ];
  const s = [-1, 0, -1];
  // Cramer.
  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det3(M);
  const col = (k) => M.map((ligne, i) => ligne.map((v, j) => (j === k ? s[i] : v)));
  const [p, q, r] = [0, 1, 2].map((k) => det3(col(k)) / D);
  return [
    [p, q],
    [q, r],
  ];
}

// Système choisi : champ, fonction L, sa dérivée le long des trajectoires,
// domaine affiché et hauteur maximale de la surface.
export function systeme(r) {
  if (r.sys === 'pendule') {
    const w = Math.sqrt(r.w2);
    return {
      F: champPendule(r.a, r.w2),
      L: (x1, x2) => (x2 * x2) / 2 + r.w2 * (1 - Math.cos(x1)),
      dL: (x1, x2) => -r.a * x2 * x2,
      x: [-Math.PI, Math.PI],
      y: [-2.6 * w, 2.6 * w],
      zmax: 2.6 * r.w2,
      // Niveau des cols (±π, 0) : sous ce niveau, la trajectoire reste dans le puits.
      niveauCol: 2 * r.w2,
    };
  }
  const A = matrice(r.tr, r.det, 'compagnon');
  const P = lyapunov2(A);
  const L = (x1, x2) => P[0][0] * x1 * x1 + 2 * P[0][1] * x1 * x2 + P[1][1] * x2 * x2;
  return {
    A,
    P,
    F: (x) => [A[0][0] * x[0] + A[0][1] * x[1], A[1][0] * x[0] + A[1][1] * x[1]],
    L,
    dL: (x1, x2) => -(x1 * x1 + x2 * x2),
    x: [-2, 2],
    y: [-2, 2],
    zmax: Math.max(L(2, 2), L(2, -2), L(2, 0), L(0, 2)),
  };
}

// Argument de la preuve : c = min_{‖x‖ = ε} L(x) et η, le plus grand rayon
// tel que B(0, η) ⊂ {L < c}.
export function sandwich(L, eps, n = 720) {
  let c = Infinity;
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    c = Math.min(c, L(eps * Math.cos(a), eps * Math.sin(a)));
  }
  let eta = eps;
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    // Dernier rayon de la grille encore dans {L < c} : η est pris par défaut.
    const pas = eps / 400;
    for (let s = pas; s < eta; s += pas) {
      if (L(s * Math.cos(a), s * Math.sin(a)) >= c) {
        eta = s - pas;
        break;
      }
    }
  }
  return { c, eta };
}

const DUREE = 20;

export default {
  etat: { sys: 'pendule', a: 0, w2: 4, tr: -1, det: 2, x1: 1.8, x2: 0, eps: 1.5, preuve: false },

  rappel: [
    'Une fonction de Lyapunov pour $x_e$ est une fonction continue $L$ telle que $L(x) > L(x_e)$ près de $x_e$, $x \\neq x_e$, et qui décroît le long des trajectoires : $\\nabla L(x) \\cdot f(x) \\le 0$. Si $L$ existe, $x_e$ est stable ; si elle est stricte, $x_e$ est asymptotiquement stable.',
    'Pendule non amorti : l’énergie $E(x) = \\tfrac12 x_2^2 - \\tfrac{g}{l}\\cos x_1$ est constante le long des trajectoires. C’est une fonction de Lyapunov non stricte : la position basse est stable, mais pas asymptotiquement.',
    'Cas linéaire, $A$ Hurwitz : $L(x) = \\int_0^{+\\infty} \\|e^{sA}x\\|^2\\,\\mathrm ds$ vérifie $\\frac{\\mathrm d}{\\mathrm dt} L(\\varphi(t, x_0)) = -\\|\\varphi(t, x_0)\\|^2$. C’est une fonction de Lyapunov stricte, et $L(x) \\to +\\infty$ : la stabilité est globale.',
  ],

  essais: [
    { texte: 'Pendule non amorti : la bille tourne sur une ligne de niveau, $L(t)$ est constante. Pourquoi l’équilibre n’est-il pas asymptotiquement stable ?', etat: { sys: 'pendule', a: 0 } },
    { texte: 'Ajoutez de l’amortissement : la bille descend au fond du bol. $\\dot L = -a\\,x_2^2$ s’annule pourtant sur l’axe $x_2 = 0$ : voyez les paliers de $L(t)$.', etat: { sys: 'pendule', a: 0.5 } },
    { texte: 'Partez au-dessus du niveau des cols (en tirets) : la bille franchit le bord du bol. Sous ce niveau, elle ne peut pas sortir du puits.', etat: { sys: 'pendule', a: 0.3, x1: 0, x2: 4.5 } },
    { texte: 'Affichez l’argument de la preuve : partant de la boule $B(0, \\eta)$, une trajectoire reste dans $\\{L < c\\}$, donc dans $B(0, \\varepsilon)$, puisque $L$ décroît.', etat: { preuve: true, sys: 'pendule', a: 0.5, x1: 0.5, x2: 0.5 } },
    { texte: 'Cas linéaire : les lignes de niveau de $L = x^\\top P x$ sont des ellipses, que les trajectoires traversent vers l’intérieur. Changez $A$ et regardez le bol se déformer.', etat: { sys: 'lineaire', tr: -0.5, det: 3 } },
  ],

  monte(zone, outils) {
    const r = outils.etat;

    // ---- Réglages -------------------------------------------------------------
    const cReglages = carte(zone);
    const choix = document.createElement('div');
    choix.className = 'choix';
    choix.innerHTML =
      '<label><input type="radio" name="sys" value="pendule"> pendule, L = énergie</label>' +
      '<label><input type="radio" name="sys" value="lineaire"> système linéaire, L = xᵀPx</label>' +
      '<label><input type="checkbox" data-cle="preuve"> argument de la preuve</label>';
    cReglages.appendChild(choix);
    for (const input of choix.querySelectorAll('input')) {
      input.addEventListener('change', () => {
        outils.change(input.type === 'radio' ? { sys: input.value } : { preuve: input.checked });
        miseAJour();
      });
    }
    const zoneCurseurs = document.createElement('div');
    cReglages.appendChild(zoneCurseurs);
    const verdict = paragraphe(cReglages, '', 'verdict');

    // ---- 3D et plan -------------------------------------------------------------
    const grille = document.createElement('div');
    grille.className = 'grille-2';
    zone.appendChild(grille);
    const c3d = carte(grille, 'Surface $z = L(x)$');
    const canvas3d = toile(c3d, '1 / 1', () => dessine());
    const vue = new Vue3D(canvas3d, { x: [-1, 1], y: [-1, 1], zmax: 1, rappel: () => dessine() });
    paragraphe(c3d, 'Faites glisser pour tourner la surface.');

    const cPlan = carte(grille, 'Lignes de niveau de $L$');
    const canvasPlan = toile(cPlan, '1 / 1', () => dessine());
    canvasPlan.classList.add('cliquable');
    const rep = new Repere(canvasPlan, { x: [-1, 1], y: [-1, 1] });
    const legendePlan = document.createElement('div');
    cPlan.appendChild(legendePlan);
    canvasPlan.addEventListener('pointerdown', (ev) => {
      const [x1, x2] = rep.versMonde(ev);
      outils.change({ x1: Number(x1.toFixed(3)), x2: Number(x2.toFixed(3)) });
      recalcule();
    });

    const cTemps = carte(zone, '$t \\mapsto L(\\varphi(t, x_0))$');
    const canvasT = toile(cTemps, '4 / 1', () => dessine());
    const repT = new Repere(canvasT, { x: [0, DUREE], y: [0, 1] });

    let sys = null;
    let traj = null;
    let preuve = null;
    let indice = 0;
    let champs = {};

    function curseurs() {
      zoneCurseurs.textContent = '';
      champs = {};
      const curseur = (cle, latex, min, max, pas) => {
        champs[cle] = champ(zoneCurseurs, { latex, min, max, pas, valeur: r[cle] }, (v) => {
          outils.change({ [cle]: v });
          recalcule();
        });
      };
      if (r.sys === 'pendule') {
        curseur('a', 'a', 0, 3, 0.01);
        curseur('w2', '\\omega^2', 0.5, 12, 0.1);
      } else {
        curseur('tr', '\\operatorname{tr}', -4, -0.1, 0.05);
        curseur('det', '\\det', 0.1, 6, 0.05);
      }
      if (r.preuve) curseur('eps', '\\varepsilon', 0.2, r.sys === 'pendule' ? 3 : 1.9, 0.05);
    }

    function recalcule() {
      sys = systeme(r);
      traj = simule((t, x) => sys.F(x), [r.x1, r.x2], DUREE, 0.01);
      preuve = r.preuve ? sandwich(sys.L, r.eps) : null;
      indice = outils.mouvementReduit ? traj.x.length - 1 : 0;
      vue.fixeDomaine(sys.x, sys.y, sys.zmax);
      rep.fixeCadre(sys.x, sys.y);
      dessine();
    }

    function dessine() {
      if (!sys) return;
      const col = couleurs();
      for (const input of choix.querySelectorAll('input')) {
        input.checked = input.type === 'radio' ? input.value === r.sys : Boolean(r.preuve);
      }
      const k = Math.min(indice, traj.x.length - 1);
      const [b1, b2] = traj.x[k];

      // 3D.
      if (vue.prepare()) {
        vue.socle();
        vue.surface((x, y) => sys.L(x, y));
        const dansCadre = traj.x.filter(([a, b]) => a >= sys.x[0] && a <= sys.x[1] && b >= sys.y[0] && b <= sys.y[1]);
        vue.courbe(dansCadre.map(([a, b]) => [a, b, 0]), { couleur: col.discret, largeur: 1 });
        vue.courbe(traj.x.slice(0, k + 1).map(([a, b]) => [a, b, sys.L(a, b)]), { couleur: col.perturbation, largeur: 2.5 });
        vue.bille(b1, b2, sys.L(b1, b2), col.perturbation);
      }

      // Plan.
      if (rep.prepare()) {
        const niveaux = [];
        for (let j = 1; j <= 9; j++) niveaux.push((sys.zmax * j * j) / 100);
        for (const c of niveaux) rep.isoligne(sys.L, c, { couleur: col.discret, largeur: 1, n: 60 });
        if (sys.niveauCol) rep.isoligne(sys.L, sys.niveauCol, { couleur: col.alerte, largeur: 1.5, tirets: [6, 4] });
        rep.champ((a, b) => sys.F([a, b]), { n: 14, couleur: col.discret });
        rep.axes({ noms: ['x₁', 'x₂'], grille: false });
        if (preuve) {
          const cercle = (R) => Array.from({ length: 121 }, (_, i) => [R * Math.cos((2 * Math.PI * i) / 120), R * Math.sin((2 * Math.PI * i) / 120)]);
          rep.trace(cercle(r.eps), { couleur: col.trait, largeur: 1.2, tirets: [5, 4] });
          rep.isoligne(sys.L, preuve.c, { couleur: col.accent, largeur: 2.5 });
          rep.trace(cercle(preuve.eta), { couleur: col.observateur, largeur: 2 });
        }
        rep.trace(traj.x, { couleur: col.perturbation, largeur: 2, alpha: 0.9 });
        rep.point(r.x1, r.x2, { rayon: 5, couleur: col.perturbation, plein: false });
        rep.point(b1, b2, { rayon: 6, couleur: col.perturbation });
      }
      legendePlan.textContent = '';
      legende(legendePlan, [
        { texte: 'trajectoire depuis $x_0$ (cliquez pour le choisir)', couleur: col.perturbation },
        ...(sys.niveauCol ? [{ texte: 'niveau des cols $(\\pm\\pi, 0)$', couleur: col.alerte, tirets: true }] : []),
        ...(preuve
          ? [
              { texte: '$\\|x\\| = \\varepsilon$', couleur: col.trait, tirets: true },
              { texte: `$L = c$, $c = \\min_{\\|x\\| = \\varepsilon} L = ${latexNombre(preuve.c)}$`, couleur: col.accent },
              { texte: `$B(0, \\eta)$, $\\eta = ${latexNombre(preuve.eta)}$`, couleur: col.observateur },
            ]
          : []),
      ]);

      // L(t).
      const Lt = traj.t.map((t, i) => [t, sys.L(...traj.x[i])]);
      const Lmax = Math.max(...Lt.map(([, v]) => v)) * 1.15 || 1;
      repT.fixeCadre([0, DUREE], [0, Lmax]);
      if (repT.prepare()) {
        repT.axes({ noms: ['t', 'L'] });
        repT.trace(Lt, { couleur: col.accent, largeur: 2 });
        repT.point(traj.t[k], Lt[k][1], { rayon: 5, couleur: col.perturbation });
      }

      // Verdict.
      let texte;
      let niveau;
      if (r.sys === 'pendule') {
        if (r.a === 0) {
          niveau = '';
          texte = '$\\dot L = \\nabla L \\cdot f = 0$ : $L$ est conservée. Fonction de Lyapunov non stricte : $(0, 0)$ est stable, pas asymptotiquement stable.';
        } else {
          niveau = 'ok';
          texte =
            '$\\dot L = -a\\,x_2^2 \\le 0$ : $L$ décroît le long des trajectoires. $\\dot L$ s’annule sur l’axe $x_2 = 0$, mais une trajectoire autre que l’équilibre n’y reste pas : $t \\mapsto L(\\varphi(t, x_0))$ décroît strictement, et $(0, 0)$ est asymptotiquement stable.';
        }
      } else {
        niveau = 'ok';
        texte = `$A = ${latexMatrice(sys.A)}$, $P = ${latexMatrice(sys.P)}$, avec $A^\\top P + PA = -I$. $\\dot L = -\\|x\\|^2 < 0$ hors de l’origine : fonction de Lyapunov stricte, et $L(x) \\to +\\infty$ quand $\\|x\\| \\to +\\infty$ : l’origine est globalement asymptotiquement stable.`;
      }
      verdict.className = `verdict ${niveau}`;
      outils.rendTexte(verdict, texte);
    }

    function miseAJour() {
      curseurs();
      recalcule();
    }

    // La bille avance d'un pas de temps par image ; la trajectoire recommence à la fin.
    let avant = performance.now();
    const anime = (maintenant) => {
      const dt = Math.min(0.05, (maintenant - avant) / 1000);
      avant = maintenant;
      if (traj) {
        indice += Math.round(dt / 0.01);
        if (indice >= traj.x.length + 100) indice = 0;
        dessine();
      }
      requestAnimationFrame(anime);
    };
    if (!outils.mouvementReduit) requestAnimationFrame(anime);

    outils.surTheme(dessine);
    miseAJour();
    return { applique: miseAJour };
  },
};
