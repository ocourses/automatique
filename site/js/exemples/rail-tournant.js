// Chariot sur rail tournant (examen 2024-2025, session 1 ; oral 2019-2020).
//
// L'état est z = (x, ẋ, θ, θ̇) : x est l'abscisse du chariot sur le rail,
// θ l'angle du rail avec l'horizontale (sens trigonométrique), et le contrôle
// u le couple exercé sur le rail. La sortie mesurée est y = x.

function ramene(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export default {
  id: 'rail-tournant',
  titre: 'Chariot sur rail tournant',
  source: 'Examen 2024-2025 ; oral 2019-2020',

  etats: [
    { latex: 'z_1 = x', texte: 'x', unite: 'm' },
    { latex: 'z_2 = \\dot x', texte: 'ẋ', unite: 'm/s' },
    { latex: 'z_3 = \\theta', texte: 'θ', unite: 'rad' },
    { latex: 'z_4 = \\dot\\theta', texte: 'θ̇', unite: 'rad/s' },
  ],
  commandes: [{ latex: 'u', texte: 'u', unite: 'N·m' }],
  sortie: 0,
  // Le rail est en longueur : scène en haut sur toute la largeur, courbes et
  // graphiques dessous, comme le double intégrateur.
  disposition: 'large',

  parametres: [
    { nom: 'm', latex: 'm', valeur: 1, min: 0.1, max: 5, pas: 0.1, unite: 'kg' },
    { nom: 'J', latex: 'J', valeur: 1, min: 0.1, max: 5, pas: 0.1, unite: 'kg·m²' },
    { nom: 'g', latex: 'g', valeur: 9.81, min: 0, max: 20, pas: 0.01, unite: 'm/s²' },
    { nom: 'xe', latex: 'x_e', valeur: 0, min: -1, max: 1, pas: 0.05, unite: 'm', famille: 'equilibre' },
  ],

  f(z, u, p) {
    const [x, xp, th, thp] = z;
    return [
      xp,
      x * thp * thp - p.g * Math.sin(th),
      thp,
      (u[0] - 2 * p.m * x * xp * thp - p.m * p.g * x * Math.cos(th)) / (p.J + p.m * x * x),
    ];
  },

  // Rail horizontal, chariot immobile en x_e, couple compensant son poids.
  equilibre(p) {
    return { xe: [p.xe, 0, 0, 0], ue: [p.m * p.g * p.xe] };
  },

  latex: {
    modele:
      '\\begin{aligned} \\ddot x &= x\\,\\dot\\theta^2 - g\\sin\\theta \\\\ ' +
      '\\ddot\\theta &= \\frac{u - 2m\\,x\\,\\dot x\\,\\dot\\theta - m g\\, x\\cos\\theta}{J + m x^2} \\end{aligned}',
    equilibre: 'z_e = (x_e, 0, 0, 0), \\quad u_e = m g\\, x_e',
  },

  // Examen : K tel que tous les pôles soient égaux à −1 (calculé par Ackermann).
  polesParDefaut: [-1, -1, -1, -1],
  gains: [[0, 0, 0, 0]],
  bornesGains: [
    [
      { min: -20, max: 40, pas: 0.01 },
      { min: -20, max: 20, pas: 0.01 },
      { min: -60, max: 20, pas: 0.01 },
      { min: -30, max: 10, pas: 0.01 },
    ],
  ],
  // Mêmes gains écrits explicitement (pôles en −1 pour x_e = 0).
  loi: 'ue + (m*g + J/g)*(x1 - xe1) + 4*J/g*x2 - 6*J*x3 - 4*J*x4',
  x0: [0.5, 0, 0, 0],
  choc: [0, 0, 0, 0.5],
  perturbation: 1,
  umax: 20,

  indications(p, K) {
    const [, k2, k3, k4] = K[0];
    if (k2 !== 0 || k3 !== 0 || k4 !== 0) return [];
    return [
      {
        niveau: 'info',
        texte:
          'Retour de sortie $u = u_e + k(x - x_e)$ : $\\chi(\\lambda) = \\lambda^4 + g(k - mg)/(J + m x_e^2)$ ' +
          'a toujours une racine de partie réelle positive ou nulle, donc aucun $k$ ne stabilise ' +
          'asymptotiquement (examen 2024-2025).',
      },
    ];
  },

  // ---- Scène ---------------------------------------------------------------

  // Cadre en longueur, à la mesure du rail ; un rail très incliné sort par le
  // haut et le bas, le chariot reste visible.
  vue() {
    return { xmin: -2.7, xmax: 2.7, ymin: -0.9, ymax: 0.9 };
  },

  draw(ctx, z, u, p, o) {
    const [x, , th] = z;
    const c = Math.cos(th);
    const s = Math.sin(th);
    if (!o.fantome) {
      o.pointilles(-2.2, 0, 2.2, 0);
      ctx.fillStyle = o.couleurs.discret;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-0.12, -0.25);
      ctx.lineTo(0.12, -0.25);
      ctx.closePath();
      ctx.fill();
    }
    // Rail.
    ctx.strokeStyle = o.couleurs.trait;
    ctx.lineWidth = 3 * o.px;
    ctx.beginPath();
    ctx.moveTo(-2.5 * c, -2.5 * s);
    ctx.lineTo(2.5 * c, 2.5 * s);
    ctx.stroke();
    // Chariot, posé sur le rail à l'abscisse x.
    ctx.save();
    ctx.rotate(th);
    ctx.translate(x, 0);
    ctx.fillStyle = o.couleurs.trait;
    ctx.fillRect(-0.2, 0.07, 0.4, 0.16);
    for (const dx of [-0.11, 0.11]) {
      ctx.beginPath();
      ctx.arc(dx, 0.045, 0.045, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
    // Couple sur le rail (u > 0 fait croître θ : sens trigonométrique) et perturbation.
    const echelle = p.m * p.g;
    o.arcCouple(-u[0], echelle, 0.3);
    o.arcCouple(-o.d[0], echelle, 0.42, o.couleurs.perturbation);
  },

  // On saisit le chariot (règle x) ou le rail (règle θ).
  souris: {
    saisit(pt, z) {
      const [x, , th] = z;
      const d = Math.hypot(pt.x - x * Math.cos(th), pt.y - x * Math.sin(th));
      return d < 0.35 ? 'chariot' : 'rail';
    },
    deplace(pt, z, p, prise) {
      const [x, , th] = z;
      if (prise === 'chariot') return [pt.x * Math.cos(th) + pt.y * Math.sin(th), 0, th, 0];
      // L'angle du rail est défini modulo π : on garde le plus proche de θ.
      let vise = Math.atan2(pt.y, pt.x);
      if (Math.abs(ramene(vise - th)) > Math.PI / 2) vise = ramene(vise + Math.PI);
      return [x, 0, th + ramene(vise - th), 0];
    },
    vitesses: [
      [0, 1],
      [2, 3],
    ],
  },
};
