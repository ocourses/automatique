// Robot Lego segway : pendule inversé sur deux roues (poly, introduction ; TP).
//
// Le modèle est celui de fonction.m du TP, d'après Yamamoto (NXTway-GS) :
//   x = (θ, ψ, θ̇, ψ̇), θ l'angle moyen des roues, ψ l'inclinaison du corps
//   (ψ > 0 : penché vers l'avant), u la tension appliquée aux deux moteurs, en V.
//
// Deux signes diffèrent de fonction.m tel qu'il est archivé : dans le calcul de
// θ̈, les termes c3 et c5 y sont comptés avec le signe inverse de celui de ψ̈, ce
// qui donne un corps qui oscille au lieu de tomber (ψ̈ = −66 ψ au lieu de
// +270 ψ). Avec les signes corrigés, les termes de gravité du linéarisé
// retrouvent exactement ceux de matrices.m (−409,7 et 269,6). Les termes
// d'amortissement et d'entrée de matrices.m, eux, diffèrent de ceux du modèle
// (A₃₃ = −104,6 contre −162,1 ; B₃ = 203,4 contre 315,2) : le linéarisé affiché
// ici est celui du modèle non linéaire, calculé numériquement.
//
// Exemple volontairement épuré : seuls la masse et la hauteur du corps, et les
// quatre gains, se règlent.

const g = 9.81; // m/s²
const m = 0.03; // masse d'une roue, kg
const R = 0.04; // rayon des roues, m
const Jw = (m * R * R) / 2; // inertie d'une roue
const Jm = 1e-5; // inertie d'un moteur
const Rm = 6.69; // résistance d'un moteur, Ω
const Kb = 0.468; // constante de force contre-électromotrice, V·s/rad
const Kt = 0.317; // constante de couple, N·m/A
const n = 1; // rapport de réduction
const fm = 0.0022; // frottement entre le corps et le moteur
const fw = 0; // frottement entre la roue et le sol

const alpha = Kt / Rm;
const beta = (Kt * Kb) / Rm + fm;

const ramene = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export default {
  id: 'segway',
  titre: 'Robot Lego segway',
  source: 'Poly, introduction ; TP',

  etats: [
    { latex: 'x_1 = \\theta', texte: 'θ', unite: 'rad' },
    { latex: 'x_2 = \\psi', texte: 'ψ', unite: 'rad' },
    { latex: 'x_3 = \\dot\\theta', texte: 'θ̇', unite: 'rad/s' },
    { latex: 'x_4 = \\dot\\psi', texte: 'ψ̇', unite: 'rad/s' },
  ],
  commandes: [{ latex: 'u', texte: 'u', unite: 'V' }],
  // Tout l'état est mesuré dans cet exemple (les capteurs viennent plus tard dans le TP).
  sansSortie: true,
  // Scène plus large que haute : en haut sur toute la largeur.
  disposition: 'large',

  parametres: [
    { nom: 'M', latex: 'M', valeur: 0.6, min: 0.2, max: 1.5, pas: 0.05, unite: 'kg' },
    { nom: 'H', latex: 'H', valeur: 0.144, min: 0.08, max: 0.25, pas: 0.002, unite: 'm' },
  ],

  f(x, u, p) {
    const psi = x[1];
    const dtheta = x[2];
    const dpsi = x[3];
    const L = p.H / 2; // distance du centre de masse à l'axe des roues
    const Jpsi = (p.M * L * L) / 3;
    const c1 = (2 * m + p.M) * R * R + 2 * Jw + 2 * n * n * Jm;
    const c2 = p.M * L * R * Math.cos(psi) - 2 * n * n * Jm;
    const c3 = -p.M * L * R * dpsi * dpsi * Math.sin(psi);
    const c4 = p.M * L * L + Jpsi + 2 * n * n * Jm;
    const c5 = -p.M * g * L * Math.sin(psi);
    const Ftheta = alpha * 2 * u[0] - 2 * (beta + fw) * dtheta + 2 * beta * dpsi;
    const Fpsi = -alpha * 2 * u[0] + 2 * beta * dtheta - 2 * beta * dpsi;
    const ddtheta = (-c4 * c3 + c2 * c5 + c4 * Ftheta - c2 * Fpsi) / (c4 * c1 - c2 * c2);
    const ddpsi = (Fpsi - c2 * ddtheta - c5) / c4;
    return [dtheta, dpsi, ddtheta, ddpsi];
  },

  // La position θ n'intervient pas dans les équations : tout θ est un équilibre,
  // on prend θ = 0. Le corps ne tient debout qu'à ψ = 0.
  equilibre() {
    return { xe: [0, 0, 0, 0], ue: [0] };
  },

  latex: {
    modele:
      '\\begin{aligned} c_1\\ddot\\theta + c_2\\ddot\\psi + c_3 &= F_\\theta \\\\ ' +
      'c_2\\ddot\\theta + c_4\\ddot\\psi + c_5 &= F_\\psi \\end{aligned}',
    equilibre: 'x_e = (0, 0, 0, 0), \\quad u_e = 0 \\quad \\text{(corps vertical)}',
    loi: 'u = u_e + K(x - x_e)',
  },
  noteEquilibre:
    'La position θ des roues n’apparaît pas dans les équations : le robot est en équilibre à n’importe quelle position. On prend θ = 0. C’est ce qui donne à A une valeur propre nulle ; le retour sur θ ramène le robot à sa position de départ.',

  // Un pôle à −137 écraserait les trois autres sur le plan : on fixe le cadre à ±10, et la
  // valeur propre rapide est marquée sur le bord avec sa vraie valeur.
  planRayon: 10,

  // Gains placés comme dans le TP : pôles −136,6 ; −2,66 ; −3,50 ; −5,99.
  polesParDefaut: [-136.5905, -2.6555, -3.5026, -5.9946],
  gains: [[0, 0, 0, 0]],
  bornesGains: [
    [
      { min: -3, max: 5, pas: 0.01 },
      { min: -5, max: 40, pas: 0.01 },
      { min: -3, max: 5, pas: 0.01 },
      { min: -3, max: 6, pas: 0.01 },
    ],
  ],
  loi:
    'ue + 0.335*(x1 - xe1) + 13.70*(x2 - xe2) + 0.7946*(x3 - xe3) + 1.046*(x4 - xe4)',
  // Condition initiale du TP : corps incliné de π/10 (18°), au repos.
  x0: [0, Math.PI / 10, 0, 0],
  choc: [0, 0, 0, 1],
  perturbation: 0.5,
  umax: 8,

  indications(p, K) {
    const [, k2] = K[0];
    const liste = [
      {
        niveau: 'info',
        texte:
          'Sans commande, la gravité fait tomber le corps : $A$ a une valeur propre strictement positive (pendule inversé), ' +
          'et une valeur propre nulle due à la position $\\theta$ des roues. Il faut donc un retour d’état sur les quatre variables.',
      },
    ];
    if (k2 <= 0) {
      liste.push({
        niveau: 'alerte',
        texte:
          'Avec $k_2 \\le 0$, la tension s’oppose à l’inclinaison : le robot n’est plus rattrapé quand il penche. ' +
          'Il faut $k_2 > 0$, c’est-à-dire pousser les roues vers l’avant quand le corps penche vers l’avant.',
      });
    }
    return liste;
  },

  // ---- Scène ---------------------------------------------------------------
  // La vue suit le robot : il reste au centre, et c'est le sol (les repères) qui
  // défile d'une distance R·θ, ce qui montre le déplacement sans sortir du cadre.

  vue() {
    return { xmin: -0.24, xmax: 0.24, ymin: -0.01, ymax: 0.25 };
  },

  draw(ctx, x, u, p, o) {
    const [theta, psi] = x;
    const col = o.couleurs;

    if (!o.fantome) {
      // Sol et repères tous les 5 cm, qui défilent quand les roues tournent.
      ctx.strokeStyle = col.discret;
      ctx.lineWidth = 2 * o.px;
      ctx.beginPath();
      ctx.moveTo(-0.3, 0);
      ctx.lineTo(0.3, 0);
      ctx.stroke();
      const pas = 0.05;
      const decalage = (((-R * theta) % pas) + pas) % pas;
      ctx.lineWidth = 1 * o.px;
      ctx.beginPath();
      for (let k = -6; k <= 6; k++) {
        const xk = decalage + k * pas;
        ctx.moveTo(xk, 0);
        ctx.lineTo(xk, -0.008);
      }
      ctx.stroke();
      // Verticale de l'équilibre.
      o.pointilles(0, R, 0, R + 1.1 * p.H);

      // Roue : un cercle et deux rayons, qui tournent comme θ (vers l'avant : sens horaire).
      ctx.strokeStyle = col.trait;
      ctx.lineWidth = 3 * o.px;
      ctx.beginPath();
      ctx.arc(0, R, R, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.lineWidth = 2 * o.px;
      ctx.beginPath();
      for (let k = 0; k < 2; k++) {
        const a = -theta + (k * Math.PI) / 2;
        ctx.moveTo(R * Math.cos(a), R + R * Math.sin(a));
        ctx.lineTo(-R * Math.cos(a), R - R * Math.sin(a));
      }
      ctx.stroke();
    }

    // Corps : un rectangle qui pivote autour de l'axe des roues, vers l'avant si ψ > 0.
    ctx.save();
    ctx.translate(0, R);
    ctx.rotate(-psi);
    ctx.fillStyle = col.trait;
    ctx.fillRect(-0.022, 0, 0.044, p.H);
    // Centre de masse, à mi-hauteur.
    ctx.fillStyle = col.fond;
    ctx.beginPath();
    ctx.arc(0, p.H / 2, 0.009, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    if (!o.fantome) {
      // Axe des roues.
      ctx.fillStyle = col.fond;
      ctx.strokeStyle = col.trait;
      ctx.lineWidth = 2 * o.px;
      ctx.beginPath();
      ctx.arc(0, R, 0.006, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      // Tension de commande (accent) et perturbation : flèches horizontales, 2 cm par volt.
      const yFleche = R + p.H + 0.025;
      o.fleche(0, yFleche, 0.02 * u[0], 0);
      o.fleche(0, yFleche + 0.02, 0.02 * o.d[0], 0, col.perturbation);
    }
  },

  // On saisit le corps : la souris donne l'inclinaison ψ (la position θ est conservée),
  // et la vitesse du geste au lâcher donne ψ̇.
  souris: {
    deplace(pt, x) {
      const vise = Math.atan2(pt.x, pt.y - R);
      return [x[0], x[1] + ramene(vise - x[1]), x[2], 0];
    },
    vitesses: [[1, 3]],
  },
};
