// Double intégrateur : chariot sur un rail droit (poly, chapitre « Commande » ; TD3).
//
// x_1 est la position du chariot, x_2 sa vitesse, et le contrôle u son
// accélération. La sortie mesurée est y = x_1.

export default {
  id: 'double-integrateur',
  titre: 'Double intégrateur',
  source: 'Poly, chapitre « Commande » ; TD3',

  etats: [
    { latex: 'x_1', texte: 'x₁', unite: 'm' },
    { latex: 'x_2 = \\dot x_1', texte: 'x₂', unite: 'm/s' },
  ],
  commandes: [{ latex: 'u', texte: 'u', unite: 'm/s²' }],
  sortie: 0,

  parametres: [{ nom: 'xe', latex: 'x_{e,1}', valeur: 0, min: -2, max: 2, pas: 0.1, unite: 'm', famille: 'equilibre' }],

  f(x, u) {
    return [x[1], u[0]];
  },

  equilibre(p) {
    return { xe: [p.xe, 0], ue: [0] };
  },

  latex: {
    modele: '\\dot x_1 = x_2, \\qquad \\dot x_2 = u',
    equilibre: 'x_e = (x_{e,1}, 0), \\quad u_e = 0',
  },

  // TD3 : valeur propre double −1 pour k_1 = −1, k_2 = −2.
  gains: [[-1, -2]],
  bornesGains: [[{ min: -20, max: 5, pas: 0.1 }, { min: -20, max: 5, pas: 0.1 }]],
  loi: '-1*(x1 - xe1) - 2*x2',
  x0: [1.5, 0],
  choc: [0, 1],
  perturbation: 0.5,
  umax: 2,
  portrait: { x1: [-2, 2], x2: [-1.5, 1.5] },

  indications(p, K) {
    const [k1, k2] = K[0];
    const liste = [
      {
        niveau: k1 < 0 && k2 < 0 ? 'ok' : 'alerte',
        texte:
          'Ici $\\chi_{A+BK}(\\lambda) = \\lambda^2 - k_2\\lambda - k_1$ : $A + BK$ est Hurwitz si et ' +
          'seulement si $k_1 < 0$ et $k_2 < 0$ (TD3).',
      },
    ];
    if (k2 === 0) {
      liste.push({
        niveau: 'info',
        texte:
          'Avec $k_2 = 0$, c’est un retour de sortie $u = ky$ : $\\lambda^2 = k$. Pour $k < 0$, les valeurs ' +
          'propres $\\pm i\\sqrt{-k}$ donnent des oscillations entretenues (stable, non asymptotiquement) ; ' +
          'aucun $k$ ne donne la stabilité asymptotique (TD3).',
      });
    }
    return liste;
  },

  // ---- Scène ---------------------------------------------------------------

  vue() {
    return { xmin: -3.2, xmax: 3.2, ymin: -0.9, ymax: 1.1 };
  },

  draw(ctx, x, u, p, o) {
    const L = 0.5; // longueur du chariot
    const H = 0.25;
    // Rail et position visée.
    if (!o.fantome) {
      ctx.strokeStyle = o.couleurs.discret;
      ctx.lineWidth = 2 * o.px;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      o.pointilles(p.xe, -0.15, p.xe, 0.9);
    }
    // Chariot.
    ctx.fillStyle = o.couleurs.trait;
    ctx.fillRect(x[0] - L / 2, 0.06, L, H);
    for (const dx of [-0.15, 0.15]) {
      ctx.beginPath();
      ctx.arc(x[0] + dx, 0.06, 0.06, 0, 2 * Math.PI);
      ctx.fill();
    }
    // Commande (accent) et perturbation : flèches horizontales.
    const yc = 0.06 + H / 2;
    o.fleche(x[0], yc + 0.3, 0.5 * u[0], 0);
    o.fleche(x[0], yc + 0.5, 0.5 * o.d[0], 0, o.couleurs.perturbation);
  },

  souris: {
    deplace(pt) {
      return [pt.x, 0];
    },
    vitesses: [[0, 1]],
  },
};
