// Pendule simple amorti (poly, stabilité par linéarisation) :
//   ẋ₁ = x₂,  ẋ₂ = −a x₂ − ω² sin x₁,  avec a = k/(ml²) et ω² = g/l.
// Les équilibres (2jπ, 0) sont des puits (nœud, nœud impropre ou foyer selon
// le signe de Δ = a² − 4ω²), les (π + 2jπ, 0) des cols. Le portrait colorie
// le bassin d'attraction de chaque puits, et compare, d'un clic, la
// trajectoire du pendule à celle de son linéarisé en (0, 0).

import { applique, exponentielle, nature, spectre } from '../core/dim2.js';
import { champ } from '../ui/controls.js';
import { latexComplexe, latexMatrice, latexNombre } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { carte, legende, paragraphe, simule, toile } from './commun.js';

export const champPendule = (a, w2) => (x) => [x[1], -a * x[1] - w2 * Math.sin(x[0])];

// Puits atteint depuis x₀ : l'entier j tel que la trajectoire tend vers
// (2jπ, 0), ou null si elle n'est pas décidée avant tMax (amortissement nul,
// ou trajectoire sur la variété stable d'un col). Dès que l'énergie
// E = x₂²/2 − ω² cos x₁ passe sous ω², sommet des cols, la trajectoire reste
// prisonnière de son puits : E décroît le long des trajectoires.
export function puitsAtteint(x0, a, w2, { h = 0.02, tMax = 60 } = {}) {
  if (a <= 0) return null;
  const F = champPendule(a, w2);
  let x = x0.slice();
  for (let t = 0; t < tMax; t += h) {
    const E = (x[1] * x[1]) / 2 - w2 * Math.cos(x[0]);
    if (E < w2 * (1 - 1e-6)) return Math.round(x[0] / (2 * Math.PI)) || 0;
    const k1 = F(x);
    const k2 = F([x[0] + (h / 2) * k1[0], x[1] + (h / 2) * k1[1]]);
    const k3 = F([x[0] + (h / 2) * k2[0], x[1] + (h / 2) * k2[1]]);
    const k4 = F([x[0] + h * k3[0], x[1] + h * k3[1]]);
    x = [x[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), x[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
  }
  return null;
}

const CADRE = { x: [-2 * Math.PI - 0.6, 2 * Math.PI + 0.6], y: [-9, 9] };

export default {
  etat: { a: 1, w2: 9.81, x1: 2.5, x2: 5, lineaire: true, bassin: true },

  rappel: [
    'Si $f\'(x_e)$ est une matrice de Hurwitz, $x_e$ est asymptotiquement stable. Si $f\'(x_e)$ a une valeur propre de partie réelle strictement positive, $x_e$ n’est pas stable.',
    'Pour le pendule amorti, $J_f(0, 0) = \\begin{pmatrix} 0 & 1 \\\\ -g/l & -k/(ml^2) \\end{pmatrix}$ est Hurwitz : la position basse est asymptotiquement stable. $J_f(\\pi, 0)$ a une valeur propre strictement positive : la position haute est instable.',
    'Le discriminant $\\Delta = \\frac{k^2}{m^2l^4} - 4\\frac{g}{l}$ distingue nœud ($\\Delta > 0$), nœud impropre ($\\Delta = 0$) et foyer ($\\Delta < 0$). La stabilité n’est que locale : la linéarisation ne dit rien de la taille du bassin d’attraction.',
  ],

  essais: [
    { texte: 'Lâchez le pendule à l’horizontale, $x_0 = (\\pi/2, 0)$ : revient-il à la position basse ? La linéarisation ne permettait pas de le dire (poly).', etat: { x1: 1.5708, x2: 0 } },
    { texte: 'Lancez-le assez fort pour qu’il fasse un tour : dans quel bassin arrive-t-il ?', etat: { x1: 0, x2: 10 } },
    { texte: 'Augmentez l’amortissement jusqu’à $\\Delta > 0$ ($a > 2\\omega$) : le foyer devient un nœud, le pendule revient sans osciller.', etat: { a: 7, x1: 1, x2: 0 } },
    { texte: 'Comparez le pendule et son linéarisé : proches pour un petit écart à la verticale, très différents loin de $(0, 0)$.', etat: { x1: 0.3, x2: 0, lineaire: true } },
    { texte: 'Sans amortissement ($a = 0$), $J_f(0, 0)$ a des valeurs propres imaginaires pures : la linéarisation ne conclut pas, et les orbites sont fermées.', etat: { a: 0, x1: 1, x2: 0 } },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    const grille = document.createElement('div');
    grille.className = 'grille-2';
    zone.appendChild(grille);

    const cPortrait = carte(grille, 'Portrait de phase $(x_1, x_2)$');
    const canvas = toile(cPortrait, '4 / 3', () => dessine());
    canvas.classList.add('cliquable');
    const rep = new Repere(canvas, CADRE);
    const zoneLegende = document.createElement('div');
    cPortrait.appendChild(zoneLegende);
    const options = document.createElement('div');
    options.className = 'choix';
    options.innerHTML =
      '<label><input type="checkbox" data-cle="bassin"> bassins d’attraction</label>' +
      '<label><input type="checkbox" data-cle="lineaire"> linéarisé en (0, 0)</label>';
    cPortrait.appendChild(options);
    for (const c of options.querySelectorAll('input')) {
      c.addEventListener('change', () => {
        outils.change({ [c.dataset.cle]: c.checked });
        dessine();
      });
    }

    const cDroite = carte(grille, 'Linéarisés');
    const reglages = document.createElement('div');
    cDroite.appendChild(reglages);
    const champs = {
      a: champ(reglages, { latex: 'a', min: 0, max: 10, pas: 0.05, valeur: r.a }, (v) => {
        outils.change({ a: v });
        recalculeBassin();
      }),
      w2: champ(reglages, { latex: '\\omega^2', min: 1, max: 20, pas: 0.01, valeur: r.w2 }, (v) => {
        outils.change({ w2: v });
        recalculeBassin();
      }),
    };
    paragraphe(cDroite, 'Amortissement $a = k/(ml^2)$ et pulsation propre $\\omega^2 = g/l$.');
    const bas = paragraphe(cDroite, '', 'verdict');
    const haut = paragraphe(cDroite, '', 'verdict alerte');

    const cTemps = carte(zone, '$x_1(t)$');
    const canvasT = toile(cTemps, '3 / 1', () => dessine());
    const repT = new Repere(canvasT, { x: [0, 15], y: [-4, 4] });
    const legendeT = document.createElement('div');
    cTemps.appendChild(legendeT);

    canvas.addEventListener('pointerdown', (ev) => {
      const [x1, x2] = rep.versMonde(ev);
      outils.change({ x1: Number(x1.toFixed(3)), x2: Number(x2.toFixed(3)) });
      dessine();
    });

    // ---- Bassins : calculés par morceaux pour ne pas bloquer la page ------------------
    const NX = 110;
    const NY = 70;
    let bassin = null;
    let calcul = 0;
    function recalculeBassin() {
      const id = ++calcul;
      bassin = new Array(NX * NY).fill(undefined);
      let k = 0;
      const morceau = () => {
        if (id !== calcul) return;
        const fin = Math.min(NX * NY, k + 600);
        for (; k < fin; k++) {
          const i = k % NX;
          const j = Math.floor(k / NX);
          const x1 = CADRE.x[0] + ((i + 0.5) / NX) * (CADRE.x[1] - CADRE.x[0]);
          const x2 = CADRE.y[0] + ((j + 0.5) / NY) * (CADRE.y[1] - CADRE.y[0]);
          bassin[k] = puitsAtteint([x1, x2], r.a, r.w2);
        }
        dessine();
        if (k < NX * NY) setTimeout(morceau, 0);
      };
      morceau();
    }

    function dessine() {
      const col = couleurs();
      for (const c of options.querySelectorAll('input')) c.checked = Boolean(r[c.dataset.cle]);
      const F = champPendule(r.a, r.w2);
      const traj = simule((t, x) => F(x), [r.x1, r.x2], 15, 0.01);
      // Linéarisé en (0, 0) : ẋ = J x.
      const J = [
        [0, 1],
        [-r.w2, -r.a],
      ];
      const lin = traj.t.map((t) => applique(exponentielle(J, t), [r.x1, r.x2]));

      if (rep.prepare()) {
        if (r.bassin && bassin && r.a > 0) {
          const teintes = [col.zone, 'rgba(194, 94, 12, 0.13)', 'rgba(15, 123, 108, 0.13)'];
          const ctx = rep.ctx;
          ctx.save();
          rep.decoupe();
          const lx = rep.L / NX;
          const ly = rep.H / NY;
          for (let k = 0; k < NX * NY; k++) {
            const p = bassin[k];
            if (p === undefined || p === null) continue;
            ctx.fillStyle = p === 0 ? teintes[0] : teintes[1 + (Math.abs(p) % 2)];
            const i = k % NX;
            const j = Math.floor(k / NX);
            ctx.fillRect(rep.marges.gauche + i * lx, rep.marges.haut + rep.H - (j + 1) * ly, lx + 0.5, ly + 0.5);
          }
          ctx.restore();
        }
        rep.champ((x1, x2) => F([x1, x2]), { n: 22, couleur: col.discret });
        rep.axes({ noms: ['x₁', 'x₂'] });
        for (let j = -1; j <= 1; j++) rep.point(2 * j * Math.PI, 0, { rayon: 5, couleur: col.accent });
        for (const j of [-1, 0]) rep.point(Math.PI + 2 * j * Math.PI, 0, { rayon: 5, couleur: col.alerte, plein: false });
        if (r.lineaire) rep.trace(lin, { couleur: col.trait, largeur: 1.5, tirets: [6, 4] });
        rep.trace(traj.x, { couleur: col.perturbation, largeur: 2.2 });
        rep.point(r.x1, r.x2, { rayon: 5, couleur: col.perturbation });
      }
      zoneLegende.textContent = '';
      legende(zoneLegende, [
        { texte: 'pendule', couleur: col.perturbation },
        ...(r.lineaire ? [{ texte: 'linéarisé en $(0, 0)$', couleur: col.trait, tirets: true }] : []),
        ...(r.bassin && r.a > 0 ? [{ texte: 'bassin de $(0, 0)$ (bleu), des autres puits', couleur: col.accent }] : []),
      ]);

      // Linéarisés en (0, 0) et (π, 0).
      const tr0 = -r.a;
      const det0 = r.w2;
      const n0 = nature(tr0, det0);
      const vp0 = spectre(tr0, det0).valeurs;
      bas.className = `verdict ${n0.stabilite === 'asymptotiquement stable' ? 'ok' : ''}`;
      outils.rendTexte(
        bas,
        `En $(0, 0)$ : $J_f = ${latexMatrice(J)}$, valeurs propres $${vp0.map((z) => latexComplexe(z)).join(',\\ ')}$, ` +
          `$\\Delta = a^2 - 4\\omega^2 = ${latexNombre(r.a * r.a - 4 * r.w2)}$ : ${n0.nom}. ` +
          (r.a > 0 ? 'Matrice de Hurwitz : la position basse est asymptotiquement stable.' : 'Valeurs propres imaginaires pures : la linéarisation ne conclut pas (la position basse est stable, par l’énergie : voir Lyapunov).'),
      );
      const vpHaut = spectre(-r.a, -r.w2).valeurs;
      outils.rendTexte(
        haut,
        `En $(\\pi, 0)$ : $J_f = ${latexMatrice([[0, 1], [r.w2, -r.a]])}$, valeurs propres $${vpHaut.map((z) => latexComplexe(z)).join(',\\ ')}$ : un col, la position haute est instable.`,
      );

      // x₁(t).
      const ymax = Math.max(4, ...traj.x.map((x) => Math.abs(x[0]))) * 1.1;
      repT.fixeCadre([0, 15], [-ymax, ymax]);
      if (repT.prepare()) {
        repT.axes({ noms: ['t', 'x₁'] });
        for (const j of [-1, 0, 1]) repT.trace([[0, 2 * j * Math.PI], [15, 2 * j * Math.PI]], { couleur: col.accent, largeur: 1, tirets: [3, 4] });
        if (r.lineaire) repT.trace(traj.t.map((t, k) => [t, lin[k][0]]), { couleur: col.trait, largeur: 1.5, tirets: [6, 4] });
        repT.trace(traj.t.map((t, k) => [t, traj.x[k][0]]), { couleur: col.perturbation, largeur: 2.2 });
      }
      legendeT.textContent = '';
      legende(legendeT, [
        { texte: '$x_1(t)$, pendule', couleur: col.perturbation },
        ...(r.lineaire ? [{ texte: '$x_1(t)$, linéarisé', couleur: col.trait, tirets: true }] : []),
      ]);
    }

    outils.surTheme(dessine);
    recalculeBassin();
    return {
      applique() {
        champs.a.fixe(r.a);
        champs.w2.fixe(r.w2);
        recalculeBassin();
      },
    };
  },
};
