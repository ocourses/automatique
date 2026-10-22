// Satellite : équations d'Euler (examen 2017-2018, session 1, exercice 2).
//
// ω = (ω₁, ω₂, ω₃) est la vitesse angulaire dans le repère des axes principaux
// d'inertie, J₁ > J₂ > J₃ > 0 les moments d'inertie et u = (u₁, u₂, u₃) les
// couples des moteurs. On étudie l'équilibre ω_e = 0, u_e = 0 avec le retour
// d'état diagonal u = Kω de l'énoncé, K = diag(k₁, k₂, k₃). C'est un exemple
// volontairement épuré : seuls les gains k_i et les inerties se règlent.

const diagonale = { min: -10, max: 2, pas: 0.05 };

export default {
  id: 'satellite',
  titre: 'Satellite : équations d’Euler',
  source: 'Examen 2017-2018',

  etats: [
    { latex: '\\omega_1', texte: 'ω₁', unite: 'rad/s' },
    { latex: '\\omega_2', texte: 'ω₂', unite: 'rad/s' },
    { latex: '\\omega_3', texte: 'ω₃', unite: 'rad/s' },
  ],
  commandes: [
    { latex: 'u_1', texte: 'u₁', unite: 'N·m' },
    { latex: 'u_2', texte: 'u₂', unite: 'N·m' },
    { latex: 'u_3', texte: 'u₃', unite: 'N·m' },
  ],
  // Tout l'état est mesuré : pas de sortie particulière.
  sansSortie: true,

  parametres: [
    { nom: 'J1', latex: 'J_1', valeur: 3, min: 0.5, max: 6, pas: 0.1, unite: 'kg·m²' },
    { nom: 'J2', latex: 'J_2', valeur: 2, min: 0.5, max: 6, pas: 0.1, unite: 'kg·m²' },
    { nom: 'J3', latex: 'J_3', valeur: 1, min: 0.5, max: 6, pas: 0.1, unite: 'kg·m²' },
  ],

  f(w, u, p) {
    return [
      ((p.J2 - p.J3) * w[1] * w[2] + u[0]) / p.J1,
      ((p.J3 - p.J1) * w[2] * w[0] + u[1]) / p.J2,
      ((p.J1 - p.J2) * w[0] * w[1] + u[2]) / p.J3,
    ];
  },

  equilibre() {
    return { xe: [0, 0, 0], ue: [0, 0, 0] };
  },

  latex: {
    modele:
      '\\begin{aligned} J_1\\dot\\omega_1 &= (J_2 - J_3)\\,\\omega_2\\omega_3 + u_1 \\\\ ' +
      'J_2\\dot\\omega_2 &= (J_3 - J_1)\\,\\omega_3\\omega_1 + u_2 \\\\ ' +
      'J_3\\dot\\omega_3 &= (J_1 - J_2)\\,\\omega_1\\omega_2 + u_3 \\end{aligned}',
    equilibre: '\\omega_e = (0, 0, 0), \\quad u_e = (0, 0, 0)',
    loi: 'u = K\\omega, \\quad K = \\operatorname{diag}(k_1, k_2, k_3)',
  },
  noteEquilibre:
    'On étudie, comme dans l’énoncé, l’équilibre où le satellite ne tourne pas. Les rotations uniformes autour d’un axe principal sont d’autres équilibres, qu’on n’étudie pas ici.',

  // Seule la diagonale de K se règle, comme dans l'énoncé.
  gainsDiagonaux: true,
  gains: [
    [-2, 0, 0],
    [0, -2, 0],
    [0, 0, -2],
  ],
  bornesGains: [
    [diagonale, diagonale, diagonale],
    [diagonale, diagonale, diagonale],
    [diagonale, diagonale, diagonale],
  ],
  x0: [0.5, 1, 0.5],
  choc: [0.5, -0.5, 0.5],
  perturbation: 0.5,
  umax: 5,

  // V(ω) = J₁ω₁² + J₂ω₂² + J₃ω₃², conservée pour u = 0 et, pour K diagonal,
  // de dérivée 2 Σ k_i ω_i² le long des trajectoires du bouclé.
  invariant(w, p) {
    return { latex: 'V(\\omega)', valeur: p.J1 * w[0] ** 2 + p.J2 * w[1] ** 2 + p.J3 * w[2] ** 2 };
  },

  indications(p, K) {
    const k = [K[0][0], K[1][1], K[2][2]];
    const mauvais = k.map((v, i) => (v >= 0 ? i + 1 : null)).filter(Boolean);
    const liste = [
      {
        niveau: mauvais.length === 0 ? 'ok' : 'alerte',
        texte:
          'Avec $u = K\\omega$ et $K$ diagonale, $J_g(0) = \\operatorname{diag}(k_i/J_i)$ : l’origine est ' +
          'asymptotiquement stable par linéarisation si et seulement si $k_1 < 0$, $k_2 < 0$ et $k_3 < 0$ (examen 2017-2018).',
      },
    ];
    if (mauvais.length > 0) {
      liste.push({
        niveau: 'alerte',
        texte: `Gain non négatif sur ${mauvais.map((i) => `$k_${i}$`).join(', ')} : ${
          k.some((v, i) => v > 0 && mauvais.includes(i + 1))
            ? 'l’axe correspondant diverge (valeur propre $k_i/J_i > 0$)'
            : 'valeur propre nulle, la linéarisation ne permet pas de conclure'
        }.`,
      });
    }
    liste.push({
      niveau: 'info',
      texte:
        'Fonction $V(\\omega) = J_1\\omega_1^2 + J_2\\omega_2^2 + J_3\\omega_3^2$ : le long des trajectoires du bouclé, ' +
        '$\\dot V = 2\\sum k_i\\omega_i^2$. Pour $K = 0$, $V$ est conservée : l’origine est stable mais pas asymptotiquement stable. ' +
        'Si tous les $k_i$ sont négatifs, $V$ décroît strictement : c’est une fonction de Lyapunov stricte.',
    });
    return liste;
  },
};
