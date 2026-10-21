// Pendule inversé commandé par un couple moteur (poly, chapitre « Commande », TD2).
//
// x_1 = θ est l'angle à la verticale haute (θ > 0 : penché à droite),
// x_2 = θ̇, et le contrôle u est le couple appliqué au pivot.

function ramene(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export default {
  id: 'pendule-couple',
  titre: 'Pendule inversé commandé par un couple',
  source: 'Poly, chapitre « Commande » ; TD2',

  etats: [
    { latex: 'x_1 = \\theta', texte: 'θ', unite: 'rad' },
    { latex: 'x_2 = \\dot\\theta', texte: 'θ̇', unite: 'rad/s' },
  ],
  commandes: [{ latex: 'u', texte: 'u', unite: 'N·m' }],

  parametres: [
    { nom: 'm', latex: 'm', valeur: 1, min: 0.1, max: 5, pas: 0.1, unite: 'kg' },
    { nom: 'l', latex: 'l', valeur: 1, min: 0.2, max: 2, pas: 0.05, unite: 'm' },
    { nom: 'g', latex: 'g', valeur: 9.81, min: 0, max: 20, pas: 0.01, unite: 'm/s²' },
  ],

  f(x, u, p) {
    return [x[1], (p.g / p.l) * Math.sin(x[0]) - u[0] / (p.m * p.l * p.l)];
  },

  equilibre() {
    return { xe: [0, 0], ue: [0] };
  },

  latex: {
    modele: '\\dot x_1 = x_2, \\qquad \\dot x_2 = \\frac{g}{l}\\sin x_1 - \\frac{u}{ml^2}',
    equilibre: 'x_e = (0, 0), \\quad u_e = 0 \\quad \\text{(position haute)}',
  },

  gains: [[20, 5]],
  bornesGains: [[{ min: -10, max: 60, pas: 0.1 }, { min: -10, max: 30, pas: 0.1 }]],
  x0: [0.3, 0],

  // Indication propre à l'exemple : la condition du poly sur les gains.
  indications(p, K) {
    const mgl = p.m * p.g * p.l;
    const [k1, k2] = K[0];
    const ok = k1 > mgl && k2 > 0;
    return [
      {
        niveau: ok ? 'ok' : 'alerte',
        texte:
          `Pour ce pendule, $A + BK$ est Hurwitz si et seulement si $k_1 > mgl \\approx ${mgl.toFixed(2).replace('.', '{,}')}$ ` +
          `et $k_2 > 0$ : il faut « sur-corriger » la gravité et amortir (poly, exemple « Pendule inversé »).`,
      },
    ];
  },

  // ---- Scène (facultative) -------------------------------------------------

  vue(p) {
    const r = 1.35 * p.l;
    return { xmin: -r, xmax: r, ymin: -r, ymax: r };
  },

  draw(ctx, x, u, p, o) {
    const th = x[0];
    const bx = p.l * Math.sin(th);
    const by = p.l * Math.cos(th);

    // Verticale haute en pointillés : l'équilibre visé.
    ctx.save();
    ctx.setLineDash([6 * o.px, 6 * o.px]);
    ctx.strokeStyle = o.couleurs.discret;
    ctx.lineWidth = 1 * o.px;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 1.25 * p.l);
    ctx.stroke();
    ctx.restore();

    // Support du moteur.
    ctx.fillStyle = o.couleurs.discret;
    ctx.fillRect(-0.12 * p.l, -0.22 * p.l, 0.24 * p.l, 0.04 * p.l);
    ctx.strokeStyle = o.couleurs.discret;
    ctx.lineWidth = 2 * o.px;
    ctx.beginPath();
    ctx.moveTo(-0.06 * p.l, -0.18 * p.l);
    ctx.lineTo(0, 0);
    ctx.lineTo(0.06 * p.l, -0.18 * p.l);
    ctx.stroke();

    // Couple : arc fléché autour du pivot. Un couple u > 0 fait décroître θ,
    // donc tourne le pendule dans le sens trigonométrique à l'écran.
    o.arcCouple(-u[0], p.m * p.g * p.l, 0.22 * p.l);

    // Tige et masse.
    ctx.strokeStyle = o.couleurs.trait;
    ctx.lineWidth = 4 * o.px;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = o.couleurs.trait;
    ctx.beginPath();
    ctx.arc(bx, by, 0.08 * p.l, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = o.couleurs.fond;
    ctx.beginPath();
    ctx.arc(0, 0, 4 * o.px, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = o.couleurs.trait;
    ctx.lineWidth = 2 * o.px;
    ctx.stroke();
  },

  // Correspondance souris → état : la souris fixe l'angle ; la vitesse du
  // geste au lâcher donne θ̇ (x_2 est la dérivée de x_1).
  souris: {
    deplace(pt, x) {
      const vise = Math.atan2(pt.x, pt.y);
      return [x[0] + ramene(vise - x[0]), 0];
    },
    vitesses: [[0, 1]],
  },
};
