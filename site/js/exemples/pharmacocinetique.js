// Administration contrôlée d'un médicament, avec observateur de Luenberger (TD4).
//
// x_1 est la concentration dans le tractus gastro-intestinal, x_2 la
// concentration dans le sang et u le débit d'administration, en unités
// normalisées. L'élimination sanguine est négligée. On ne mesure que la
// concentration sanguine y = x_2 : x_1 n'est pas mesurable, on l'estime.

export default {
  id: 'pharmacocinetique',
  titre: 'Pharmacocinétique avec observateur',
  source: 'TD4',

  etats: [
    { latex: 'x_1', texte: 'x₁', unite: 'u.a.' },
    { latex: 'x_2', texte: 'x₂', unite: 'u.a.' },
  ],
  commandes: [{ latex: 'u', texte: 'u', unite: 'u.a.' }],
  sortie: 1,

  // Famille de points de fonctionnement : x_2 constant est atteint pour x_1 = 0 et u = 0.
  parametres: [{ nom: 'xe', latex: 'x_{e,2}', valeur: 1, min: 0, max: 3, pas: 0.05, unite: 'u.a.', famille: 'equilibre' }],

  f(x, u) {
    return [-x[0] + 2 * u[0], x[0]];
  },

  equilibre(p) {
    return { xe: [0, p.xe], ue: [0] };
  },

  latex: {
    modele: '\\dot x_1 = -x_1 + 2u, \\qquad \\dot x_2 = x_1, \\qquad y = x_2',
    equilibre: 'x_e = (0, x_{e,2}), \\quad u_e = 0',
  },

  // Boucle ouverte au départ, comme dans le TD : u = u_e, seul l'observateur travaille.
  // Pour réguler x_2 sur x_{e,2}, placer les pôles de A + BK (par exemple en −1).
  gains: [[0, 0]],
  bornesGains: [[{ min: -3, max: 1, pas: 0.01 }, { min: -3, max: 1, pas: 0.01 }]],
  loi: 'ue',
  x0: [1, 0],
  // Bolus : une dose arrive d'un coup dans le tractus, que l'observateur ne voit que par y.
  choc: [1, 0],
  perturbation: 0.5,
  umax: 2,
  graphesEmpiles: true,
  portrait: { x1: [-0.5, 1.5], x2: [-0.5, 1.5] },

  // Observateur : L = (9, 7) place un pôle double en −4 (TD4).
  observateur: {
    L: [9, 7],
    h: 0.05,
    xh0: [0, 0],
    bornesL: [
      { min: -5, max: 40, pas: 0.1 },
      { min: -5, max: 30, pas: 0.1 },
    ],
    bornesH: { min: 0.005, max: 1, pas: 0.005 },
    latex:
      '\\begin{aligned} \\dot{\\hat x} &= A\\hat x + Bu + L\\,(y - C\\hat x) \\\\ \\dot e &= (A - LC)\\,e, \\quad e = x - \\hat x \\end{aligned}',
  },

  indications(p, K) {
    const [k1, k2] = K[0];
    return [
      {
        niveau: k1 < 0.5 && k2 < 0 ? 'ok' : 'alerte',
        texte:
          'Ici $\\chi_{A+BK}(\\lambda) = \\lambda^2 + (1 - 2k_1)\\lambda - 2k_2$ : $A + BK$ est Hurwitz si et seulement si ' +
          '$k_1 < 1/2$ et $k_2 < 0$. En boucle ouverte ($K = 0$), $A$ a pour valeurs propres $-1$ et $0$ : elle n’est pas Hurwitz.',
      },
    ];
  },
};
