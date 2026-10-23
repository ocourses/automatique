// Solutions maximales en dimension 1 (poly, équations non linéaires) : dans
// l'espace des phases élargi (t, x), on choisit (t₀, x₀) d'un clic et l'on voit
// la solution maximale, son intervalle de définition et ce qui l'arrête.
//   ẋ = 1 + x²  : explosion en temps fini (x = tan t pour x(0) = 0) ;
//   ẋ = −x²     : solutions maximales non globales ;
//   ẋ = √|x|    : non-unicité en x = 0 (second membre non lipschitzien) ;
//   ẋ = −x³     : le linéarisé est nul, l'origine est pourtant asymptotiquement stable.

import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { barreOutils, boutonInfo, carte, choixRadios, glisse, paragraphe, toile, zoomable } from './commun.js';

// Solution maximale du problème de Cauchy x(t₀) = x₀ : { a, b, x(t), latex }
// où ]a, b[ est l'intervalle de définition (a = −∞ ou b = +∞ possibles).
// Pour ẋ = √|x|, on renvoie une solution parmi d'autres : pour x₀ ≥ 0, celle
// qui est nulle avant d'atteindre x₀ ; pour x₀ < 0, celle qui reste nulle après
// avoir atteint 0. Toute solution passe par 0 ; d'autres s'en détachent là.
export function solutionMaximale(eq, t0, x0) {
  const inf = Infinity;
  switch (eq) {
    case 'carre-plus-un': {
      const phi = Math.atan(x0);
      return {
        a: t0 - Math.PI / 2 - phi,
        b: t0 + Math.PI / 2 - phi,
        x: (t) => Math.tan(t - t0 + phi),
        latex: `x(t) = \\tan(t - t_0 + \\arctan x_0)`,
      };
    }
    case 'moins-carre':
      if (x0 === 0) return { a: -inf, b: inf, x: () => 0, latex: 'x(t) = 0' };
      return {
        a: x0 > 0 ? t0 - 1 / x0 : -inf,
        b: x0 > 0 ? inf : t0 - 1 / x0,
        x: (t) => x0 / ((t - t0) * x0 + 1),
        latex: 'x(t) = \\dfrac{x_0}{(t - t_0)\\,x_0 + 1}',
      };
    case 'racine': {
      // x > 0 : √x croît linéairement, x = (√x₀ + (t − t₀)/2)², jusqu'à 0 dans le passé.
      // x < 0 : symétrique, x = −(√−x₀ − (t − t₀)/2)², nul après avoir atteint 0.
      const s = Math.sqrt(Math.abs(x0));
      if (x0 >= 0) {
        const c = t0 - 2 * s; // instant où la solution quitte 0
        return { a: -inf, b: inf, x: (t) => (t <= c ? 0 : ((t - c) / 2) ** 2), latex: 'x(t) = \\tfrac14 (t - c)^2 \\text{ pour } t > c,\\ 0 \\text{ sinon, où } c = t_0 - 2\\sqrt{x_0}', depart: c };
      }
      const c = t0 + 2 * s; // instant où la solution atteint 0
      return { a: -inf, b: inf, x: (t) => (t >= c ? 0 : -(((c - t) / 2) ** 2)), latex: 'x(t) = -\\tfrac14 (c - t)^2 \\text{ pour } t < c,\\ 0 \\text{ ensuite, où } c = t_0 + 2\\sqrt{-x_0}', arrivee: c };
    }
    case 'cube':
      if (x0 === 0) return { a: -inf, b: inf, x: () => 0, latex: 'x(t) = 0' };
      return {
        a: t0 - 1 / (2 * x0 * x0),
        b: inf,
        x: (t) => Math.sign(x0) / Math.sqrt(2 * (t - t0) + 1 / (x0 * x0)),
        latex: 'x(t) = \\dfrac{\\operatorname{sign}(x_0)}{\\sqrt{2(t - t_0) + 1/x_0^2}}',
      };
    default:
      throw new Error(`équation inconnue : ${eq}`);
  }
}

export const EQUATIONS = {
  'carre-plus-un': { latex: '\\dot x = 1 + x^2', f: (x) => 1 + x * x },
  'moins-carre': { latex: '\\dot x = -x^2', f: (x) => -x * x },
  racine: { latex: '\\dot x = \\sqrt{|x|}', f: (x) => Math.sqrt(Math.abs(x)) },
  cube: { latex: '\\dot x = -x^3', f: (x) => -x * x * x },
};

// Ce que montre chaque équation (sans la répéter : elle est cochée au-dessus).
const COMMENTAIRES = {
  'carre-plus-un':
    'Les solutions $x(t) = \\tan(t - t_0 + \\arctan x_0)$ explosent en temps fini : $|x(t)| \\to +\\infty$ quand $t$ tend vers une borne finie de l’intervalle. Aucune n’est globale ; avec $x(0) = 0$, c’est $\\tan t$ sur $]-\\pi/2, \\pi/2[$ (exemple du poly).',
  'moins-carre':
    'Pour $x_0 \\neq 0$, la solution $x(t) = x_0/((t - t_0)x_0 + 1)$ est maximale mais pas globale : elle explose en $t_0 - 1/x_0$, d’un seul côté. La solution nulle est globale. Les courbes intégrales ne se coupent pas : elles partitionnent le plan (Cauchy-Lipschitz).',
  racine:
    'Le second membre est continu mais pas lipschitzien en 0 : par un point de l’axe $x = 0$ passent une infinité de solutions, qui restent nulles puis décollent en $x(t) = \\tfrac14(t - c)^2$ à un instant $c$ quelconque (en tirets). Peano donne l’existence, pas l’unicité.',
  cube:
    'Le linéarisé en 0 est nul : la linéarisation ne conclut pas. Pourtant toutes les solutions, $x(t) = \\operatorname{sign}(x_0)/\\sqrt{2(t - t_0) + 1/x_0^2}$ pour $x_0 \\neq 0$, tendent vers 0 comme $1/\\sqrt{2t}$, bien plus lentement qu’une exponentielle : l’origine est asymptotiquement stable.',
};

// Courbes intégrales de fond, réparties comme les orbites des portraits de
// phase : des points de départ régulièrement espacés sur le bord du cadre
// (distances rapportées à la taille du cadre), chaque courbe étant la solution
// maximale par ce point, et un départ déjà sur une courbe tracée est sauté.
// Rend des lignes brisées dans le cadre.
export function courbesDeFond(eq, cadre, departs = 40) {
  const [t1, t2] = cadre.x;
  const [y1, y2] = cadre.y;
  const [L, H] = [t2 - t1, y2 - y1];
  const norme = ([t, x]) => [(t - t1) / L, (x - y1) / H];
  const ecart = 4 / departs; // le bord mesure 4 en coordonnées normalisées
  const traces = [];
  const courbes = [];
  for (let k = 0; k < departs; k++) {
    let d = (k + 0.5) * ecart;
    let p;
    if (d < 1) p = [t1 + d * L, y1];
    else if ((d -= 1) < 1) p = [t2, y1 + d * H];
    else if ((d -= 1) < 1) p = [t2 - d * L, y2];
    else p = [t1, y2 - (d - 1) * H];
    const [u, v] = norme(p);
    if (traces.some(([a, b]) => Math.hypot(a - u, b - v) < 0.5 * ecart)) continue;
    const sol = solutionMaximale(eq, p[0], p[1]);
    const pts = [];
    for (let i = 0; i <= 500; i++) {
      const t = t1 + (L * i) / 500;
      if (t <= sol.a || t >= sol.b) continue;
      const x = sol.x(t);
      if (Number.isFinite(x)) pts.push([t, x]);
    }
    if (pts.length < 2) continue;
    for (const q of pts) if (q[1] >= y1 && q[1] <= y2) traces.push(norme(q));
    courbes.push(pts);
  }
  return courbes;
}

// Nombre au format français, pour les étiquettes du graphe.
const fr = (v) => String(Number(v.toPrecision(3))).replace('.', ',').replace('-', '−');

export default {
  etat: { eq: 'carre-plus-un', t0: 0, x0: 0 },

  choix: { eq: Object.keys(EQUATIONS) },

  termes: ['solution maximale', 'solution globale', 'lipschitzienne', 'asymptotiquement stable'],

  rappel: [
    'Une solution est maximale si elle n’admet aucun prolongement strict, globale si elle est définie sur tout l’intervalle de temps. Toute solution globale est maximale, la réciproque est fausse.',
    'Cauchy-Lipschitz : si $f$ est continue et localement lipschitzienne en $x$, il passe par chaque $(t_0, x_0)$ une unique solution maximale. Les courbes intégrales partitionnent alors l’espace des phases élargi.',
    'Si $f$ est seulement continue, Peano donne l’existence d’une solution maximale, pas son unicité.',
  ],

  essais: [
    { texte: '$\\dot x = 1 + x^2$, $x(0) = 0$ : on retrouve $\\tan t$, définie sur $]-\\pi/2, \\pi/2[$.', etat: { eq: 'carre-plus-un', t0: 0, x0: 0 } },
    { texte: '$\\dot x = -x^2$ : cliquez au-dessus puis au-dessous de l’axe. De quel côté la solution explose-t-elle ?', etat: { eq: 'moins-carre', t0: 0, x0: 1 } },
    { texte: '$\\dot x = \\sqrt{|x|}$ : cliquez sur l’axe $x = 0$. Combien de solutions passent par ce point ?', etat: { eq: 'racine', t0: 0, x0: 0 } },
    { texte: '$\\dot x = -x^3$ : partez de $x_0 = 3$. Combien de temps faut-il pour atteindre $x = 0{,}5$ ? Et pour $\\dot x = -x$ ?', etat: { eq: 'cube', t0: -3, x0: 3 } },
  ],

  monte(zone, outils) {
    const r = outils.etat;

    // ---- Choix de l'équation, ce qu'elle montre et sa solution ----------------------------
    const choix = choixRadios(barreOutils(zone), {
      nom: 'eq',
      options: Object.entries(EQUATIONS).map(([valeur, { latex }]) => ({ valeur, latex })),
      change: (valeur) => {
        outils.change({ eq: valeur });
        dessine();
      },
    });
    const c1 = carte(zone);
    // Hauteur réservée : la page ne bouge pas quand on change d'équation.
    const texte = document.createElement('div');
    texte.className = 'texte-fixe';
    c1.appendChild(texte);
    const commentaire = paragraphe(texte, '', '');
    const solution = paragraphe(texte, '', '');

    // ---- Espace des phases élargi --------------------------------------------------------------
    const c2 = carte(zone, 'Espace des phases élargi $(t, x)$');
    boutonInfo(c2, [
      ['ligne', '--discret', 'Courbes intégrales : graphes d’autres solutions, qui partent du bord du cadre à intervalles réguliers.'],
      ['ligne', '--accent', 'La solution maximale par $(t_0, x_0)$.'],
      ['zone', '--zone-stable', 'Son intervalle de définition $]a, b[$, reporté sur l’axe des temps et écrit en bas à gauche.'],
      ['tirets', '--texte', 'Une borne finie de l’intervalle : la solution y explose ($|x(t)| \\to +\\infty$).'],
      ['tirets', '--accent', 'Pour $\\dot x = \\sqrt{|x|}$ : d’autres solutions maximales par le même point, qui quittent l’axe $x = 0$ à un autre instant.'],
      ['point', '--perturbation', 'La condition initiale $(t_0, x_0)$ : cliquez ou faites glisser. Le point se colle à l’axe $x = 0$.'],
    ]);
    const canvas = toile(c2, '16 / 9', () => dessine());
    canvas.classList.add('cliquable');
    const rep = new Repere(canvas, { x: [-4, 4], y: [-4, 4] });
    const barre = document.createElement('div');
    barre.className = 'barre-legende';
    c2.appendChild(barre);
    barre.appendChild(document.createElement('div'));
    const zoom = zoomable(canvas, rep, { barre, auto: () => ({ x: [-4, 4], y: [-4, 4] }), redessine: () => dessine(), deplacer: false });

    glisse(canvas, rep, {
      deplace: (t, x) => {
        // Aimantation sur l'axe x = 0, utile pour la non-unicité.
        const x0 = Math.abs(x) * rep.sy < 8 ? 0 : Number(x.toFixed(3));
        outils.change({ t0: Number(t.toFixed(3)), x0 });
        dessine();
      },
    });

    // Points de `sol` sur ]a, b[ ∩ [t1, t2].
    const echantillons = (sol, a, b, [t1, t2]) => {
      const pts = [];
      const [u, v] = [Math.max(a, t1), Math.min(b, t2)];
      for (let k = 0; k <= 600; k++) {
        const t = u + ((v - u) * k) / 600;
        if (t <= a || t >= b) continue;
        pts.push([t, sol.x(t)]);
      }
      return pts;
    };

    function dessine() {
      const col = couleurs();
      choix.fixe(r.eq);
      outils.rendTexte(commentaire, COMMENTAIRES[r.eq]);
      const sol = solutionMaximale(r.eq, r.t0, r.x0);
      outils.rendTexte(solution, `Solution maximale par le point $(t_0, x_0)$ choisi sur le graphe : $${sol.latex}$.`);

      const cadre = zoom.cadre();
      rep.fixeCadre(cadre.x, cadre.y);
      if (!rep.prepare()) return;
      const [t1, t2] = cadre.x;
      const marge = 0.05 * (t2 - t1);
      rep.axes({ noms: ['t', 'x'] });
      // Courbes intégrales de fond, réparties depuis le bord du cadre.
      for (const pts of courbesDeFond(r.eq, cadre)) rep.trace(pts, { couleur: col.discret, largeur: 1, alpha: 0.5 });
      // Non-unicité : la solution passe par 0 à l'instant τ. Après τ (si x₀ ≤ 0),
      // elle peut décoller en (t − c)²/4 à tout instant c ≥ τ ; avant τ (si
      // x₀ ≥ 0), elle peut arriver de x < 0 en −(c − t)²/4 à tout instant c ≤ τ.
      if (r.eq === 'racine') {
        const tau = r.x0 > 0 ? sol.depart : r.x0 < 0 ? sol.arrivee : r.t0;
        const tirets = { couleur: col.accent, largeur: 1.6, tirets: [5, 4] };
        for (let k = 1; k <= 6; k++) {
          if (r.x0 <= 0) {
            const c = tau + 0.6 * (k - 1);
            const pts = [];
            for (let t = tau; t <= t2 + marge; t += (t2 - t1) / 400) pts.push([t, t <= c ? 0 : ((t - c) / 2) ** 2]);
            rep.trace(pts, tirets);
          }
          if (r.x0 >= 0) {
            const c = tau - 0.6 * (k - 1);
            const pts = [];
            for (let t = t1 - marge; t <= tau; t += (t2 - t1) / 400) pts.push([t, t >= c ? 0 : -(((c - t) / 2) ** 2)]);
            rep.trace(pts, tirets);
          }
        }
      }
      // Intervalle de définition sur l'axe des temps, bornes finies en tirets.
      const [a, b] = [sol.a, sol.b];
      rep.trace([[Math.max(a, t1 - marge), 0], [Math.min(b, t2 + marge), 0]], { couleur: col.accent, largeur: 6, alpha: 0.3 });
      const [y1, y2] = cadre.y;
      for (const borne of [a, b]) {
        if (!Number.isFinite(borne)) continue;
        rep.trace([[borne, y1 - 1], [borne, y2 + 1]], { couleur: col.trait, largeur: 1.2, tirets: [6, 4] });
        rep.texte(borne, y2, `t = ${fr(borne)}`, { couleur: col.trait, dx: borne === a ? -6 : 6, dy: 16, align: borne === a ? 'right' : 'left', police: '13px system-ui, sans-serif', fond: true });
      }
      rep.trace(echantillons(sol, a, b, [t1 - marge, t2 + marge]), { couleur: col.accent, largeur: 2.6 });
      // Le point et ses coordonnées ; l'intervalle, écrit sous l'axe.
      rep.point(r.t0, r.x0, { rayon: 5, couleur: col.perturbation });
      rep.texte(r.t0, r.x0, `(t₀, x₀) = (${fr(r.t0)} ; ${fr(r.x0)})`, { couleur: col.perturbation, dx: 9, dy: r.x0 >= 0 ? 18 : -10, police: '600 13px system-ui, sans-serif', fond: true });
      const borneTexte = (v) => (Number.isFinite(v) ? fr(v) : v > 0 ? '+∞' : '−∞');
      // L'intervalle, toujours au même endroit : en bas à gauche du graphe.
      const globale = !Number.isFinite(a) && !Number.isFinite(b);
      rep.texte(t1, y1, `Intervalle ]${borneTexte(a)} ; ${borneTexte(b)}[ : solution ${globale ? 'globale' : 'non globale'}`, {
        couleur: col.accent,
        dx: 8,
        dy: -10,
        police: '600 13px system-ui, sans-serif',
        fond: true,
      });
    }

    outils.surTheme(dessine);
    dessine();
    return { applique: dessine };
  },
};
