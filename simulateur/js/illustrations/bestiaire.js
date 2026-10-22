// Solutions maximales en dimension 1 (poly, équations non linéaires) : dans
// l'espace des phases élargi (t, x), on choisit (t₀, x₀) d'un clic et l'on voit
// la solution maximale, son intervalle de définition et ce qui l'arrête.
//   ẋ = 1 + x²  : explosion en temps fini (x = tan t pour x(0) = 0) ;
//   ẋ = −x²     : solutions maximales non globales ;
//   ẋ = √|x|    : non-unicité en x = 0 (second membre non lipschitzien) ;
//   ẋ = −x³     : le linéarisé est nul, l'origine est pourtant asymptotiquement stable.

import { latexNombre } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { carte, paragraphe, toile } from './commun.js';

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
        return { a: -inf, b: inf, x: (t) => (t <= c ? 0 : ((t - c) / 2) ** 2), latex: 'x(t) = \\tfrac14 (t - c)^2 \\text{ pour } t > c,\\ 0 \\text{ sinon}', depart: c };
      }
      const c = t0 + 2 * s; // instant où la solution atteint 0
      return { a: -inf, b: inf, x: (t) => (t >= c ? 0 : -(((c - t) / 2) ** 2)), latex: 'x(t) = -\\tfrac14 (c - t)^2 \\text{ pour } t < c,\\ 0 \\text{ ensuite}', arrivee: c };
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

const COMMENTAIRES = {
  'carre-plus-un':
    'La solution explose en temps fini : $|x(t)| \\to +\\infty$ quand $t$ tend vers une borne finie de l’intervalle. Avec $x(0) = 0$, c’est $\\tan t$ sur $]-\\pi/2, \\pi/2[$ (exemple du poly). Aucune solution n’est globale.',
  'moins-carre':
    'Pour $x_0 \\neq 0$, la solution $x_0/((t - t_0)x_0 + 1)$ est maximale mais pas globale : elle explose en $t_0 - 1/x_0$, d’un seul côté. La fonction nulle est globale. Les courbes intégrales ne se coupent pas : elles partitionnent le plan (Cauchy-Lipschitz).',
  racine:
    'Le second membre $\\sqrt{|x|}$ est continu mais pas lipschitzien en 0 : par un point de l’axe $x = 0$ passent une infinité de solutions maximales, qui restent nulles puis décollent en $\\tfrac14(t - c)^2$ à un instant $c$ quelconque (en tirets). Comme toute solution atteint $0$ dans le passé ou dans le futur, aucune n’est unique. Peano garantit l’existence, pas l’unicité.',
  cube:
    'Le linéarisé en 0 est nul : la linéarisation ne conclut pas. Pourtant toutes les solutions tendent vers 0, comme $1/\\sqrt{2t}$, bien plus lentement qu’une exponentielle : l’origine est asymptotiquement stable.',
};

export default {
  etat: { eq: 'carre-plus-un', t0: 0, x0: 0 },

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
    const c1 = carte(zone);
    const choix = document.createElement('div');
    choix.className = 'choix';
    for (const [id, { latex }] of Object.entries(EQUATIONS)) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      Object.assign(input, { type: 'radio', name: 'eq', value: id });
      input.addEventListener('change', () => {
        outils.change({ eq: id });
        dessine();
      });
      const span = document.createElement('span');
      outils.rend(span, latex, false);
      label.append(input, ' ', span);
      choix.appendChild(label);
    }
    c1.appendChild(choix);
    const commentaire = paragraphe(c1, '', '');

    const c2 = carte(zone, 'Espace des phases élargi $(t, x)$');
    const canvas = toile(c2, '16 / 9', () => dessine());
    canvas.classList.add('cliquable');
    const rep = new Repere(canvas, { x: [-4, 4], y: [-4, 4] });
    paragraphe(c2, 'Cliquez pour choisir $(t_0, x_0)$. En gris, d’autres courbes intégrales ; en couleur, la solution maximale par $(t_0, x_0)$ et son intervalle de définition, reporté sur l’axe des temps.');
    const resultat = paragraphe(c2, '', 'verdict');

    canvas.addEventListener('pointerdown', (ev) => {
      const [t, x] = rep.versMonde(ev);
      // Aimantation sur l'axe x = 0, utile pour la non-unicité.
      const x0 = Math.abs(x) * rep.sy < 8 ? 0 : Number(x.toFixed(3));
      outils.change({ t0: Number(t.toFixed(3)), x0 });
      dessine();
    });

    const echantillons = (sol, a, b) => {
      const pts = [];
      const [t1, t2] = [Math.max(a, -4.2), Math.min(b, 4.2)];
      for (let k = 0; k <= 600; k++) {
        const t = t1 + ((t2 - t1) * k) / 600;
        if (t <= a || t >= b) continue;
        pts.push([t, sol.x(t)]);
      }
      return pts;
    };

    function dessine() {
      const col = couleurs();
      for (const input of choix.querySelectorAll('input')) input.checked = input.value === r.eq;
      outils.rendTexte(commentaire, `$${EQUATIONS[r.eq].latex}$. ${COMMENTAIRES[r.eq]}`);
      if (!rep.prepare()) return;
      rep.axes({ noms: ['t', 'x'] });
      // Courbes intégrales de fond.
      for (let x0 = -3.5; x0 <= 3.5; x0 += 0.5) {
        for (const t0 of r.eq === 'racine' ? [-3, 0, 3] : [0]) {
          const s = solutionMaximale(r.eq, t0, x0);
          rep.trace(echantillons(s, s.a, s.b), { couleur: col.discret, largeur: 1, alpha: 0.5 });
        }
      }
      const sol = solutionMaximale(r.eq, r.t0, r.x0);
      // Non-unicité : la solution passe par 0 à l'instant τ. Après τ (si x₀ ≤ 0),
      // elle peut décoller en (t − c)²/4 à tout instant c ≥ τ ; avant τ (si
      // x₀ ≥ 0), elle peut arriver de x < 0 en −(c − t)²/4 à tout instant c ≤ τ.
      if (r.eq === 'racine') {
        const tau = r.x0 > 0 ? sol.depart : r.x0 < 0 ? sol.arrivee : r.t0;
        const tirets = { couleur: col.perturbation, largeur: 1.6, tirets: [5, 4] };
        for (let k = 1; k <= 6; k++) {
          if (r.x0 <= 0) {
            const c = tau + 0.6 * (k - 1);
            const pts = [];
            for (let t = tau; t <= 4.2; t += 0.02) pts.push([t, t <= c ? 0 : ((t - c) / 2) ** 2]);
            rep.trace(pts, tirets);
          }
          if (r.x0 >= 0) {
            const c = tau - 0.6 * (k - 1);
            const pts = [];
            for (let t = -4.2; t <= tau; t += 0.02) pts.push([t, t >= c ? 0 : -(((c - t) / 2) ** 2)]);
            rep.trace(pts, tirets);
          }
        }
      }
      // Intervalle de définition sur l'axe des temps, et asymptotes aux bornes finies.
      const [a, b] = [sol.a, sol.b];
      rep.trace([[Math.max(a, -10), 0], [Math.min(b, 10), 0]], { couleur: col.accent, largeur: 5, alpha: 0.35 });
      for (const borne of [a, b]) if (Number.isFinite(borne)) rep.trace([[borne, -10], [borne, 10]], { couleur: col.alerte, largeur: 1.2, tirets: [6, 4] });
      rep.trace(echantillons(sol, a, b), { couleur: col.accent, largeur: 2.6 });
      rep.point(r.t0, r.x0, { rayon: 5, couleur: col.perturbation });

      const borne = (v) => (Number.isFinite(v) ? latexNombre(v) : v > 0 ? '+\\infty' : '-\\infty');
      const globale = !Number.isFinite(a) && !Number.isFinite(b);
      outils.rendTexte(
        resultat,
        `$t_0 = ${latexNombre(r.t0)}$, $x_0 = ${latexNombre(r.x0)}$ : solution maximale définie sur $]${borne(a)}, ${borne(b)}[$, ${globale ? 'globale' : 'non globale (explosion en temps fini)'}. ` +
          (r.eq === 'racine'
            ? `Elle n’est pas unique : elle passe par $x = 0$ ${r.x0 > 0 ? 'dans le passé' : r.x0 < 0 ? 'dans le futur' : 'en $t_0$'}, et d’autres solutions maximales s’en détachent là (en tirets).`
            : `$${sol.latex}$.`),
      );
      resultat.className = `verdict ${globale ? 'ok' : 'alerte'}`;
    }

    outils.surTheme(dessine);
    dessine();
    return { applique: dessine };
  },
};
