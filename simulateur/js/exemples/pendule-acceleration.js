// Pendule inversé commandé en accélération : le « balai » tenu sur la main (TD3).
//
// x_1 = α est l'angle à la verticale haute (α > 0 : penché à droite),
// x_2 = α̇, et le contrôle u est l'accélération horizontale du support
// (u > 0 : vers la droite). La sortie mesurée est y = x_1.

function ramene(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export default {
  id: 'pendule-acceleration',
  titre: 'Pendule inversé commandé en accélération',
  source: 'TD3',

  etats: [
    { latex: 'x_1 = \\alpha', texte: 'α', unite: 'rad' },
    { latex: 'x_2 = \\dot\\alpha', texte: 'α̇', unite: 'rad/s' },
  ],
  commandes: [{ latex: 'u', texte: 'u', unite: 'm/s²' }],
  sortie: 0,

  parametres: [
    { nom: 'l', latex: 'l', valeur: 1, min: 0.2, max: 2, pas: 0.05, unite: 'm' },
    { nom: 'g', latex: 'g', valeur: 9.81, min: 0, max: 20, pas: 0.01, unite: 'm/s²' },
    { nom: 'ae', latex: 'x_{e,1}', valeur: 0, min: -1.2, max: 1.2, pas: 0.01, unite: 'rad' },
  ],

  f(x, u, p) {
    return [x[1], (p.g / p.l) * Math.sin(x[0]) - (Math.cos(x[0]) * u[0]) / p.l];
  },

  // TD3 : u_e = g tan x_{e,1}, pour cos x_{e,1} ≠ 0.
  equilibre(p) {
    return { xe: [p.ae, 0], ue: [p.g * Math.tan(p.ae)] };
  },

  latex: {
    modele: '\\dot x_1 = x_2, \\qquad \\dot x_2 = \\frac{g}{l}\\sin x_1 - \\frac{\\cos x_1}{l}\\,u',
    equilibre: 'x_e = (x_{e,1}, 0), \\quad u_e = g\\tan x_{e,1}',
  },

  // Retour de sortie u = ky avec k > g : oscillations entretenues, V conservée.
  gains: [[15, 0]],
  bornesGains: [[{ min: -10, max: 60, pas: 0.1 }, { min: -10, max: 20, pas: 0.1 }]],
  loi: 'ue + 15*(x1 - xe1)',
  x0: [0.3, 0],
  choc: [0, 1],
  perturbation: 1,
  umax: 20,
  portrait: { x1: [-0.6, 0.6], x2: [-2, 2] },

  indications(p, K) {
    const [k1, k2] = K[0];
    const c2 = Math.cos(p.ae) ** 2;
    const seuil = p.g / c2;
    const liste = [
      {
        niveau: k2 > 0 && k1 > seuil ? 'ok' : 'alerte',
        texte:
          `Pour $\\cos x_{e,1} > 0$, $A + BK$ est Hurwitz si et seulement si $k_2 > 0$ et ` +
          `$k_1 > g/\\cos^2 x_{e,1} \\approx ${seuil.toFixed(2).replace('.', '{,}')}$ (TD3).`,
      },
    ];
    if (k2 === 0 && p.ae === 0 && k1 > p.g) {
      liste.push({
        niveau: 'info',
        texte:
          'Retour de sortie $u = ky$ avec $k > g$ : les valeurs propres $\\pm i\\sqrt{(k-g)/l}$ sont imaginaires ' +
          'pures et la linéarisation ne conclut pas. La fonction $V$ du TD3 est conservée le long des ' +
          'trajectoires : l’origine est stable, mais pas asymptotiquement.',
      });
    }
    return liste;
  },

  // Fonction de Lyapunov du TD3, valable pour u = k x_1 autour de l'origine.
  invariant(x, p, K) {
    const [k, k2] = K[0];
    if (k2 !== 0 || p.ae !== 0) return null;
    const V = ((p.g + k) / p.l) * (Math.cos(x[0]) - 1) + (k * x[0] * Math.sin(x[0])) / p.l + x[1] ** 2 / 2;
    return { latex: 'V(x(t))', valeur: V };
  },

  // ---- Scène ---------------------------------------------------------------

  vue(p) {
    const r = 1.35 * p.l;
    return { xmin: -r, xmax: r, ymin: -0.45 * p.l, ymax: 1.25 * p.l };
  },

  draw(ctx, x, u, p, o) {
    const a = x[0];
    const bx = p.l * Math.sin(a);
    const by = p.l * Math.cos(a);
    if (!o.fantome) {
      o.pointilles(0, 0, 1.2 * p.l * Math.sin(p.ae), 1.2 * p.l * Math.cos(p.ae));
      // Main (support) : un petit chariot.
      ctx.fillStyle = o.couleurs.discret;
      ctx.fillRect(-0.12 * p.l, -0.1 * p.l, 0.24 * p.l, 0.08 * p.l);
    }
    // Manche et brosse du balai.
    ctx.strokeStyle = o.couleurs.trait;
    ctx.lineWidth = 4 * o.px;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-a);
    ctx.fillStyle = o.couleurs.trait;
    ctx.fillRect(-0.12 * p.l, 0, 0.24 * p.l, 0.1 * p.l);
    ctx.restore();
    // Accélération du support (accent) et perturbation, à l'échelle g ↔ l/2.
    const e = (0.5 * p.l) / p.g;
    o.fleche(0, -0.2 * p.l, e * u[0], 0);
    o.fleche(0, -0.32 * p.l, e * o.d[0], 0, o.couleurs.perturbation);
  },

  souris: {
    deplace(pt, x) {
      const vise = Math.atan2(pt.x, pt.y);
      return [x[0] + ramene(vise - x[0]), 0];
    },
    vitesses: [[0, 1]],
  },
};
