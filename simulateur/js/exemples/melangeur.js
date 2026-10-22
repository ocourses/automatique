// Mélangeur (poly, chapitre « Commande », d'après Trélat) : un même produit
// arrive par deux entrées, de concentrations c₁ et c₂ et de débits u₁ et u₂ ;
// V est le volume dans la cuve, c sa concentration, et le débit de sortie vaut
// d = γ√V.
//   V̇ = u₁ + u₂ − γ√V,   ċ = ((c₁ − c)u₁ + (c₂ − c)u₂)/V.
// Au point de fonctionnement (V_e, c_e), le linéarisé vaut A = diag(α, 2α) avec
// α = −γ/(2√V_e), et B = [[1, 1], [β₁, β₂]] avec β_i = (c_i − c_e)/V_e.

export default {
  id: 'melangeur',
  titre: 'Mélangeur',
  source: 'Poly, chapitre « Commande »',

  etats: [
    { latex: 'x_1 = V', texte: 'V', unite: 'L' },
    { latex: 'x_2 = c', texte: 'c', unite: 'g/L' },
  ],
  commandes: [
    { latex: 'u_1', texte: 'u₁', unite: 'L/s' },
    { latex: 'u_2', texte: 'u₂', unite: 'L/s' },
  ],
  sansSortie: true,

  parametres: [
    { nom: 'gamma', latex: '\\gamma', valeur: 1, min: 0.2, max: 3, pas: 0.05, unite: 'L^{1/2}/s' },
    { nom: 'c1', latex: 'c_1', valeur: 2, min: 0.1, max: 4, pas: 0.05, unite: 'g/L' },
    { nom: 'c2', latex: 'c_2', valeur: 0.5, min: 0, max: 4, pas: 0.05, unite: 'g/L' },
    // Point de fonctionnement : volume et concentration visés.
    { nom: 'Ve', latex: 'V_e', valeur: 1, min: 0.2, max: 3, pas: 0.05, unite: 'L', famille: 'equilibre' },
    { nom: 'ce', latex: 'c_e', valeur: 1, min: 0, max: 4, pas: 0.05, unite: 'g/L', famille: 'equilibre' },
  ],

  f(x, u, p) {
    const V = Math.max(x[0], 1e-9);
    return [u[0] + u[1] - p.gamma * Math.sqrt(V), ((p.c1 - x[1]) * u[0] + (p.c2 - x[1]) * u[1]) / V];
  },

  // u₁ + u₂ = γ√V_e et c₁u₁ + c₂u₂ = c_e γ√V_e (poly). Les débits ne sont
  // positifs que si c_e est entre c₂ et c₁ ; si c₁ = c₂, seul c_e = c₁ est
  // possible, et l'on partage le débit à parts égales.
  equilibre(p) {
    const d = p.gamma * Math.sqrt(p.Ve);
    if (Math.abs(p.c1 - p.c2) < 1e-9) return { xe: [p.Ve, p.c1], ue: [d / 2, d / 2] };
    return {
      xe: [p.Ve, p.ce],
      ue: [(d * (p.ce - p.c2)) / (p.c1 - p.c2), (d * (p.c1 - p.ce)) / (p.c1 - p.c2)],
    };
  },

  latex: {
    modele:
      '\\begin{aligned} \\dot V &= u_1 + u_2 - \\gamma\\sqrt V \\\\ \\dot c &= \\frac{(c_1 - c)\\,u_1 + (c_2 - c)\\,u_2}{V} \\end{aligned}',
    equilibre:
      'u_{1e} + u_{2e} = \\gamma\\sqrt{V_e}, \\quad c_1 u_{1e} + c_2 u_{2e} = c_e\\,\\gamma\\sqrt{V_e}',
    loi: 'u = u_e + K(x - x_e), \\quad K \\in \\mathcal M_{2,2}(\\mathbb R)',
  },
  noteEquilibre:
    'On règle le volume $V_e$ et la concentration $c_e$ visés ; les débits d’équilibre s’en déduisent. Ils ne sont positifs que si $c_e$ est compris entre $c_2$ et $c_1$.',

  // Le mélangeur est stable sans commande (A = diag(α, 2α), α < 0) : le retour
  // d'état accélère la convergence. Gain par défaut : A + BK = diag(−2, −3)
  // pour les valeurs par défaut des paramètres (α = −0,5, β₁ = 1, β₂ = −0,5).
  gains: [
    [-0.5, -4 / 3],
    [-1, 4 / 3],
  ],
  bornesGains: [
    [
      { min: -6, max: 4, pas: 0.05 },
      { min: -6, max: 6, pas: 0.05 },
    ],
    [
      { min: -6, max: 4, pas: 0.05 },
      { min: -6, max: 6, pas: 0.05 },
    ],
  ],
  x0: [1.6, 0.6],
  choc: [0.3, 0.2],
  perturbation: 0.2,
  umax: 2,

  indications(p) {
    const alpha = -p.gamma / (2 * Math.sqrt(p.Ve));
    const b1 = (p.c1 - p.ce) / p.Ve;
    const b2 = (p.c2 - p.ce) / p.Ve;
    const controlable = Math.abs(b1 - b2) > 1e-9 || Math.abs(alpha * b1) > 1e-9;
    const fr = (v) => String(Number(v.toPrecision(3))).replace('.', '{,}');
    const liste = [
      {
        niveau: 'info',
        texte: `Ici $\\alpha = -\\gamma/(2\\sqrt{V_e}) = ${fr(alpha)}$, $\\beta_1 = ${fr(b1)}$, $\\beta_2 = ${fr(b2)}$ : $A = \\operatorname{diag}(\\alpha, 2\\alpha)$ est déjà Hurwitz, le mélangeur est stable sans commande ; le retour d’état règle la vitesse de convergence.`,
      },
      {
        niveau: controlable ? 'ok' : 'alerte',
        texte: `Le linéarisé est contrôlable si et seulement si $\\beta_1 \\neq \\beta_2$ ou $\\alpha\\beta_1 \\neq 0$, c’est-à-dire $c_1 \\neq c_2$ (poly) : ${controlable ? 'c’est le cas.' : 'ce n’est pas le cas, la concentration ne se règle pas.'}`,
      },
    ];
    if (p.ce < Math.min(p.c1, p.c2) || p.ce > Math.max(p.c1, p.c2)) {
      liste.push({
        niveau: 'alerte',
        texte: '$c_e$ n’est pas entre $c_2$ et $c_1$ : un des débits d’équilibre est négatif, ce qui n’a pas de sens physique.',
      });
    }
    return liste;
  },

  // ---- Scène ---------------------------------------------------------------
  // Cuve vue de face : le niveau est proportionnel au volume, la teinte du
  // liquide à la concentration ; les flèches des entrées et de la sortie ont
  // une épaisseur proportionnelle au débit.

  vue() {
    return { xmin: -1.8, xmax: 1.8, ymin: -0.7, ymax: 2.4 };
  },

  draw(ctx, x, u, p, o) {
    const [V, c] = x;
    const L = 1.4; // largeur de la cuve
    const H = 1.8; // hauteur de la cuve
    const niveau = Math.max(0, Math.min(H, (V / 3) * H));
    const col = o.couleurs;
    // Liquide : plus foncé quand c est grand (rapporté à max(c₁, c₂)).
    const cmax = Math.max(p.c1, p.c2, 1e-9);
    const t = Math.max(0, Math.min(1, c / cmax));
    ctx.fillStyle = `hsla(205, 70%, ${80 - 45 * t}%, ${o.fantome ? 0.5 : 0.9})`;
    ctx.fillRect(-L / 2, 0, L, niveau);
    if (o.fantome) return;
    // Niveau visé.
    const niveauE = Math.min(H, (p.Ve / 3) * H);
    o.pointilles(-L / 2 - 0.15, niveauE, L / 2 + 0.15, niveauE);
    // Cuve.
    ctx.strokeStyle = col.trait;
    ctx.lineWidth = 3 * o.px;
    ctx.beginPath();
    ctx.moveTo(-L / 2, H);
    ctx.lineTo(-L / 2, 0);
    ctx.lineTo(-0.1, 0);
    ctx.moveTo(0.1, 0);
    ctx.lineTo(L / 2, 0);
    ctx.lineTo(L / 2, H);
    ctx.stroke();
    // Entrées (accent) et sortie, en traits d'épaisseur proportionnelle au débit.
    const jet = (x0, y0, x1, y1, debit, couleur) => {
      ctx.save();
      ctx.strokeStyle = couleur;
      ctx.lineWidth = Math.max(1, 10 * Math.abs(debit)) * o.px;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
    };
    jet(-1.6, H + 0.35, -0.35, H + 0.35, u[0], col.accent);
    jet(-0.35, H + 0.35, -0.35, Math.max(niveau, 0.05), u[0], col.accent);
    jet(1.6, H + 0.35, 0.35, H + 0.35, u[1], col.accent);
    jet(0.35, H + 0.35, 0.35, Math.max(niveau, 0.05), u[1], col.accent);
    jet(0, 0, 0, -0.5, p.gamma * Math.sqrt(Math.max(V, 0)), col.discret);
    // Étiquettes.
    ctx.save();
    ctx.scale(1, -1);
    ctx.fillStyle = col.discret;
    ctx.font = `${14 * o.px}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('u₁, c₁', -1.2, -(H + 0.45));
    ctx.fillText('u₂, c₂', 1.2, -(H + 0.45));
    ctx.fillText('d = γ√V', 0.45, 0.45);
    ctx.restore();
  },

  // On saisit le liquide : la hauteur donne le volume.
  souris: {
    deplace(pt, x) {
      return [Math.max(0.05, (Math.min(pt.y, 1.8) / 1.8) * 3), x[1]];
    },
    vitesses: [],
  },
};
