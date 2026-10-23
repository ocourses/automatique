// Pendule simple amorti (poly, stabilité par linéarisation) :
//   ẋ₁ = x₂,  ẋ₂ = −a x₂ − ω² sin x₁,  avec a = k/(ml²) et ω² = g/l.
// Les équilibres (2jπ, 0) sont des puits (nœud, nœud impropre ou foyer selon
// le signe de Δ = a² − 4ω²), les (π + 2jπ, 0) des cols. Le portrait colorie
// le bassin d'attraction de chaque puits, et compare, d'un clic, la
// trajectoire du pendule à celle de son linéarisé en (0, 0).

import { applique, exponentielle, nature, spectre } from '../core/dim2.js';
import { champ } from '../ui/controls.js';
import { latexComplexeFixe, latexMatriceFixe, latexNombreFixe } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { boutonInfo, carte, glisse, legende, paragraphe, simule, toile, zoomable } from './commun.js';

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

  termes: ['matrice de Hurwitz', 'asymptotiquement stable', 'bassin d’attraction', 'nœud impropre', 'nœud', 'foyer'],

  rappel: [
    'Pendule amorti, d’angle $x_1$ et de vitesse angulaire $x_2$ :',
    '$$\\begin{cases} \\dot x_1 = x_2 \\\\ \\dot x_2 = -a\\,x_2 - \\omega^2 \\sin x_1 \\end{cases}$$',
    'soit $\\dot x = f(x)$ avec $a = k/(ml^2)$, $\\omega^2 = g/l$ et',
    '$$f(x) = \\begin{pmatrix} x_2 \\\\ -a\\,x_2 - \\omega^2 \\sin x_1 \\end{pmatrix},$$',
    'Si $f\'(x_e)$ est une matrice de Hurwitz, $x_e$ est asymptotiquement stable ; si elle a une valeur propre de partie réelle strictement positive, $x_e$ n’est pas stable. Ici :',
    '$$J_f(x_1, x_2) = \\begin{pmatrix} 0 & 1 \\\\ -\\omega^2\\cos x_1 & -a \\end{pmatrix}.$$',
    '$$J_f(0, 0) = \\begin{pmatrix} 0 & 1 \\\\ -g/l & -k/(ml^2) \\end{pmatrix}$$',
    'est Hurwitz : la position basse $(0, 0)$ est asymptotiquement stable. $J_f(\\pi, 0)$ a une valeur propre strictement positive : la position haute est instable.',
    'Le discriminant $\\Delta = \\frac{k^2}{m^2l^4} - 4\\frac{g}{l}$ distingue :',
    ['$\\Delta > 0$ : nœud, le pendule revient sans osciller ;', '$\\Delta = 0$ : nœud impropre ;', '$\\Delta < 0$ : foyer, il revient en oscillant.'],
    'La stabilité n’est que locale : la linéarisation ne dit rien de la taille du bassin d’attraction.',
  ],

  // Chaque essai fixe a et ω² : le texte décrit alors exactement ce qu'on voit.
  essais: [
    { texte: 'Lâchez le pendule à l’horizontale, $x_0 = (\\pi/2, 0)$ : revient-il à la position basse ? La linéarisation ne permettait pas de le dire (poly).', etat: { a: 1, w2: 9.81, x1: 1.5708, x2: 0 } },
    { texte: 'Avec $a = 0{,}5$, lancez-le assez fort, $x_0 = (0 ; 7{,}5)$ : il passe par la position haute puis se stabilise en $(2\\pi, 0)$, un autre puits. À $x_2 = 6$ il revient en $(0, 0)$.', etat: { a: 0.5, w2: 9.81, x1: 0, x2: 7.5 } },
    { texte: 'Partez de $a = 1$ et augmentez l’amortissement jusqu’à $\\Delta > 0$ ($a > 2\\omega \\approx 6{,}3$) : le foyer devient un nœud, le pendule revient sans osciller.', etat: { a: 1, w2: 9.81, x1: 1, x2: 0 } },
    { texte: 'Comparez le pendule et son linéarisé : proches pour un petit écart à la verticale, très différents loin de $(0, 0)$.', etat: { a: 1, w2: 9.81, x1: 0.3, x2: 0, lineaire: true } },
    { texte: 'Sans amortissement ($a = 0$), $J_f(0, 0)$ a des valeurs propres imaginaires pures : la linéarisation ne conclut pas, et les orbites sont fermées.', etat: { a: 0, w2: 9.81, x1: 1, x2: 0 } },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    const grille = document.createElement('div');
    grille.className = 'grille-2';
    zone.appendChild(grille);

    // ---- Portrait de phase ---------------------------------------------------------------
    const cPortrait = carte(grille, 'Portrait de phase $(x_1, x_2)$');
    boutonInfo(cPortrait, [
      ['ligne', '--accent', 'La trajectoire du pendule depuis $x_0$, sur $15$ s.'],
      ['tirets', '--texte', 'Celle de son linéarisé en $(0, 0)$, $\\dot x = J_f(0, 0)\\,x$.'],
      ['point', '--equilibre', 'Les puits $(2j\\pi, 0)$, positions basses : asymptotiquement stables si $a > 0$.'],
      ['cercle', '--equilibre', 'Les cols $(\\pi + 2j\\pi, 0)$, positions hautes : instables.'],
      ['zone', '--zone-stable', 'Bassin d’attraction de $(0, 0)$ ; ceux des autres puits sont en orange et en vert.'],
      ['point', '--perturbation', 'La condition initiale $x_0$ : cliquez ou faites glisser.'],
    ]);
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
    const canvas = toile(cPortrait, '4 / 3', () => dessine());
    canvas.classList.add('cliquable');
    const rep = new Repere(canvas, CADRE);
    glisse(canvas, rep, {
      deplace: (x1, x2) => {
        outils.change({ x1: Number(x1.toFixed(3)), x2: Number(x2.toFixed(3)) });
        dessine();
      },
    });

    // ---- Paramètres et linéarisés --------------------------------------------------------------
    const cDroite = carte(grille, 'Paramètres et linéarisés');
    const reglages = document.createElement('div');
    cDroite.appendChild(reglages);
    const champs = {
      a: champ(reglages, { latex: 'a', min: 0, max: 10, pas: 0.05, pasFleche: 0.1, valeur: r.a }, (v) => {
        outils.change({ a: v });
        recalculeBassin();
      }),
      w2: champ(reglages, { latex: '\\omega^2', min: 1, max: 20, pas: 0.01, pasFleche: 0.1, valeur: r.w2 }, (v) => {
        outils.change({ w2: v });
        recalculeBassin();
      }),
    };
    paragraphe(cDroite, 'Amortissement $a = k/(ml^2)$ et pulsation propre $\\omega^2 = g/l$.', 'note');
    // Chaque linéarisé : un titre, la jacobienne centrée, puis sa conclusion.
    const bloc = (titre) => {
      const v = document.createElement('div');
      v.className = 'verdict';
      const t = paragraphe(v, titre, '');
      const f = document.createElement('div');
      f.className = 'formule';
      v.appendChild(f);
      // Valeurs propres : une formule à part, de largeur fixe ; le texte qui suit
      // (nom du cas, conclusion) change de longueur mais garde sa place.
      const g = document.createElement('div');
      g.className = 'formule compacte';
      v.appendChild(g);
      const c = paragraphe(v, '', '');
      c.classList.add('conclusion-fixe');
      cDroite.appendChild(v);
      return { v, t, f, g, c };
    };
    const bas = bloc('En $(0, 0)$, position basse :');
    const haut = bloc('En $(\\pi, 0)$, position haute :');

    // ---- x₁(t) ---------------------------------------------------------------------------------
    const cTemps = carte(zone, 'Angle $x_1(t)$');
    const canvasT = toile(cTemps, '3 / 1', () => dessine());
    const repT = new Repere(canvasT, { x: [0, 15], y: [-4, 4] });
    const barreT = document.createElement('div');
    barreT.className = 'barre-legende';
    cTemps.appendChild(barreT);
    const legendeT = document.createElement('div');
    barreT.appendChild(legendeT);
    let traj = null;
    const zoomT = zoomable(canvasT, repT, {
      barre: barreT,
      auto: () => {
        const ymax = Math.max(4, ...(traj ? traj.x.map((x) => Math.abs(x[0])) : [4])) * 1.1;
        return { x: [0, 15], y: [-ymax, ymax] };
      },
      redessine: () => dessine(),
      tempsPositif: true,
    });

    // ---- Bassins : calculés par morceaux pour ne pas bloquer la page ------------------
    const NX = 110;
    const NY = 70;
    // Les bassins affichés restent à l'écran pendant que les nouveaux se calculent
    // en arrière-plan ; une fois prêts, ils apparaissent en fondu par-dessus.
    let bassin = null;
    let complet = false;
    let ancien = null;
    let opacite = 1;
    let calcul = 0;
    const DUREE_FONDU = 350;
    function fondu(debut) {
      opacite = outils.mouvementReduit ? 1 : Math.min(1, (performance.now() - debut) / DUREE_FONDU);
      if (opacite >= 1) ancien = null;
      dessine();
      if (opacite < 1) requestAnimationFrame(() => fondu(debut));
    }
    function recalculeBassin() {
      const id = ++calcul;
      const nouveau = new Array(NX * NY).fill(undefined);
      // Tant qu'aucun bassin complet n'est affiché, on montre le calcul qui avance.
      if (!complet) bassin = nouveau;
      let k = 0;
      const morceau = () => {
        if (id !== calcul) return;
        const fin = Math.min(NX * NY, k + 600);
        for (; k < fin; k++) {
          const i = k % NX;
          const j = Math.floor(k / NX);
          const x1 = CADRE.x[0] + ((i + 0.5) / NX) * (CADRE.x[1] - CADRE.x[0]);
          const x2 = CADRE.y[0] + ((j + 0.5) / NY) * (CADRE.y[1] - CADRE.y[0]);
          nouveau[k] = puitsAtteint([x1, x2], r.a, r.w2);
        }
        if (k < NX * NY) {
          if (!complet) dessine();
          setTimeout(morceau, 0);
        } else if (complet) {
          ancien = bassin;
          bassin = nouveau;
          fondu(performance.now());
        } else {
          complet = true;
          dessine();
        }
      };
      morceau();
    }

    // Aplat des bassins d'une grille, avec l'opacité donnée.
    function aplat(grille, col, alpha) {
      const teintes = [col.zone, col.zone2, col.zone3];
      const ctx = rep.ctx;
      ctx.save();
      rep.decoupe();
      ctx.globalAlpha = alpha;
      const lx = rep.L / NX;
      const ly = rep.H / NY;
      for (let k = 0; k < NX * NY; k++) {
        const p = grille[k];
        if (p === undefined || p === null) continue;
        ctx.fillStyle = p === 0 ? teintes[0] : teintes[1 + (Math.abs(p) % 2)];
        const i = k % NX;
        const j = Math.floor(k / NX);
        ctx.fillRect(rep.marges.gauche + i * lx, rep.marges.haut + rep.H - (j + 1) * ly, lx + 0.5, ly + 0.5);
      }
      ctx.restore();
    }

    function dessine() {
      const col = couleurs();
      for (const c of options.querySelectorAll('input')) c.checked = Boolean(r[c.dataset.cle]);
      const F = champPendule(r.a, r.w2);
      // Assez long pour couvrir un zoom arrière de la courbe x₁(t).
      const duree = Math.max(15, zoomT.cadre().x[1]);
      traj = simule((t, x) => F(x), [r.x1, r.x2], duree, 0.01);
      // Linéarisé en (0, 0) : ẋ = J x.
      const J = [
        [0, 1],
        [-r.w2, -r.a],
      ];
      const lin = traj.t.map((t) => applique(exponentielle(J, t), [r.x1, r.x2]));
      const sur15 = (pts) => pts.slice(0, 1501);

      if (rep.prepare()) {
        if (r.bassin && bassin && r.a > 0) {
          if (ancien) aplat(ancien, col, 1);
          aplat(bassin, col, ancien ? opacite : 1);
        }
        rep.champ((x1, x2) => F([x1, x2]), { n: 22, couleur: col.discret });
        rep.axes({ noms: ['x₁', 'x₂'] });
        if (r.lineaire) rep.trace(sur15(lin), { couleur: col.trait, largeur: 1.5, tirets: [6, 4] });
        rep.trace(sur15(traj.x), { couleur: col.accent, largeur: 2.2 });
        for (let j = -1; j <= 1; j++) rep.point(2 * j * Math.PI, 0, { rayon: 5, couleur: col.equilibre });
        for (const j of [-1, 0]) rep.point(Math.PI + 2 * j * Math.PI, 0, { rayon: 5, couleur: col.equilibre, plein: false });
        rep.point(r.x1, r.x2, { rayon: 5, couleur: col.perturbation });
      }

      // Linéarisés en (0, 0) et (π, 0).
      const n0 = nature(-r.a, r.w2);
      const vp0 = spectre(-r.a, r.w2).valeurs;
      bas.v.className = `verdict ${n0.stabilite === 'asymptotiquement stable' ? 'ok' : ''}`;
      outils.rend(bas.f, `J_f(0, 0) = ${latexMatriceFixe(J)}`);
      const ecrit = (vp) => vp.map((z, k) => `\\lambda_${k + 1} = ${latexComplexeFixe(z)}`).join(',\\quad ');
      outils.rend(bas.g, `\\begin{gathered} ${ecrit(vp0)} \\\\ \\Delta = a^2 - 4\\omega^2 = ${latexNombreFixe(r.a * r.a - 4 * r.w2, 2, 2)} \\end{gathered}`);
      outils.rendTexte(
        bas.c,
        `${n0.nom[0].toUpperCase()}${n0.nom.slice(1)}. ` +
          (r.a > 0 ? 'Matrice de Hurwitz : asymptotiquement stable.' : 'Imaginaires purs : la linéarisation ne conclut pas.'),
      );
      const vpHaut = spectre(-r.a, -r.w2).valeurs;
      haut.v.className = 'verdict alerte';
      outils.rend(haut.f, `J_f(\\pi, 0) = ${latexMatriceFixe([[0, 1], [r.w2, -r.a]])}`);
      outils.rend(haut.g, ecrit(vpHaut));
      outils.rendTexte(haut.c, 'Un col : instable.');

      // x₁(t), avec les positions basses (puits) en tirets violets et x₁(0) rappelé.
      const cadre = zoomT.cadre();
      repT.fixeCadre(cadre.x, cadre.y);
      if (repT.prepare()) {
        repT.axes({ noms: ['t', 'x₁'] });
        for (let j = -3; j <= 3; j++) repT.trace([[cadre.x[0], 2 * j * Math.PI], [cadre.x[1], 2 * j * Math.PI]], { couleur: col.equilibre, largeur: 1, tirets: [3, 4] });
        if (r.lineaire) repT.trace(traj.t.map((t, k) => [t, lin[k][0]]), { couleur: col.trait, largeur: 1.5, tirets: [6, 4] });
        repT.trace(traj.t.map((t, k) => [t, traj.x[k][0]]), { couleur: col.accent, largeur: 2.2 });
        if (repT.contient(0, r.x1)) repT.point(0, r.x1, { rayon: 5, couleur: col.perturbation });
      }
      legendeT.textContent = '';
      legende(legendeT, [
        { texte: 'pendule', couleur: col.accent },
        ...(r.lineaire ? [{ texte: 'linéarisé', couleur: col.trait, tirets: true }] : []),
        { texte: 'positions basses $2j\\pi$', couleur: col.equilibre, tirets: true },
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
