// Le flot déforme le plan (poly, exponentielle de matrice) : un disque de
// conditions initiales et une lettre « F » (pour voir l'orientation) emportés
// par x ↦ e^{tA}x. Rotation-homothétie pour des valeurs propres complexes,
// contraction ou dilatation selon les directions propres, cisaillement pour un
// bloc de Jordan. En complément, le contre-exemple du poly : e^A e^B ≠ e^{A+B}
// quand A et B ne commutent pas.

import { applique, exponentielle, matrice, nature } from '../core/dim2.js';
import { champ } from '../ui/controls.js';
import { latexMatrice, latexNombre } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { carte, legende, paragraphe, toile } from './commun.js';

// Produit de matrices (2, 2).
export const produit = (M, N) => [
  [M[0][0] * N[0][0] + M[0][1] * N[1][0], M[0][0] * N[0][1] + M[0][1] * N[1][1]],
  [M[1][0] * N[0][0] + M[1][1] * N[1][0], M[1][0] * N[0][1] + M[1][1] * N[1][1]],
];

// Contre-exemple du poly : A = [[0, 1], [0, 0]], B = [[0, 0], [1, 0]].
export const A_CE = [
  [0, 1],
  [0, 0],
];
export const B_CE = [
  [0, 0],
  [1, 0],
];

// La lettre F, dans le disque unité, et le cercle unité.
const LETTRE_F = [
  [-0.3, -0.6],
  [-0.3, 0.6],
  [0.35, 0.6],
  [-0.3, 0.6],
  [-0.3, 0.05],
  [0.2, 0.05],
];
const CERCLE = Array.from({ length: 121 }, (_, k) => [Math.cos((2 * Math.PI * k) / 120), Math.sin((2 * Math.PI * k) / 120)]);

const PRESETS = {
  rotation: { tr: -0.4, det: 4, texte: 'foyer' },
  noeud: { tr: -1, det: -2, texte: 'col' },
  jordan: { tr: 0, det: 0, texte: 'cisaillement' },
};

export default {
  etat: { tr: -0.4, det: 4, t: 1 },

  rappel: [
    'La solution de $\\dot x = Ax$, $x(0) = x_0$ est $x(t) = e^{tA}x_0$ : le flot au temps $t$ est l’application linéaire $x_0 \\mapsto e^{tA}x_0$.',
    'Valeurs propres $\\alpha \\pm i\\beta$ : $e^{tA} = e^{\\alpha t}P\\,R(-\\beta t)\\,P^{-1}$, une rotation suivie d’une homothétie. Bloc de Jordan : $e^{tJ_\\lambda} = e^{\\lambda t}\\begin{pmatrix} 1 & t \\\\ 0 & 1 \\end{pmatrix}$, un cisaillement.',
    'Si $A$ et $B$ commutent, $e^{A}e^{B} = e^{A+B}$. La commutativité est nécessaire : pour $A = \\begin{pmatrix} 0 & 1 \\\\ 0 & 0 \\end{pmatrix}$ et $B = \\begin{pmatrix} 0 & 0 \\\\ 1 & 0 \\end{pmatrix}$, $e^Ae^B \\neq e^{A+B}$.',
  ],

  essais: [
    { texte: 'Foyer : faites varier $t$. Le disque tourne et se contracte ; la lettre F garde son orientation.', etat: { tr: -0.4, det: 4, t: 1 } },
    { texte: 'Bloc de Jordan nilpotent ($\\operatorname{tr} = \\det = 0$) : $e^{tA} = I + tN$, le disque est cisaillé, sans rotation ni contraction.', etat: { tr: 0, det: 0, t: 1.5 } },
    { texte: 'Col : le disque s’étire le long d’une direction propre et s’écrase le long de l’autre.', etat: { tr: -1, det: -2, t: 1 } },
    { texte: 'Prenez $t < 0$ : le flot remonte le temps, et $e^{-tA} = (e^{tA})^{-1}$.', etat: { t: -0.8 } },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    const grille = document.createElement('div');
    grille.className = 'grille-2';
    zone.appendChild(grille);

    const cFlot = carte(grille, 'Image du disque unité par $e^{tA}$');
    const canvas = toile(cFlot, '1 / 1', () => dessine());
    const rep = new Repere(canvas, { x: [-3, 3], y: [-3, 3], egal: true });
    const zoneLegende = document.createElement('div');
    cFlot.appendChild(zoneLegende);

    const cReglages = carte(grille, 'Matrice $A$ et instant $t$');
    const boutons = document.createElement('div');
    boutons.className = 'etapes';
    cReglages.appendChild(boutons);
    const champs = {};
    for (const [nom, p] of Object.entries(PRESETS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = p.texte;
      b.addEventListener('click', () => {
        outils.change({ tr: p.tr, det: p.det });
        champs.tr.fixe(p.tr);
        champs.det.fixe(p.det);
        dessine();
      });
      boutons.appendChild(b);
    }
    for (const [cle, latex, min, max, pas] of [
      ['tr', '\\operatorname{tr}', -3, 3, 0.05],
      ['det', '\\det', -3, 6, 0.05],
      ['t', 't', -2, 3, 0.01],
    ]) {
      champs[cle] = champ(cReglages, { latex, min, max, pas, valeur: r[cle] }, (v) => {
        outils.change({ [cle]: v });
        dessine();
      });
    }
    const lecture = document.createElement('button');
    lecture.type = 'button';
    lecture.textContent = 'Animer t de 0 à 3';
    cReglages.appendChild(lecture);
    const formules = paragraphe(cReglages, '', '');

    // Contre-exemple e^A e^B ≠ e^{A+B}.
    const cCE = carte(zone, 'Contre-exemple : $e^A e^B \\neq e^{A+B}$');
    const grilleCE = document.createElement('div');
    grilleCE.className = 'grille-3';
    cCE.appendChild(grilleCE);
    const eA = exponentielle(A_CE, 1);
    const eB = exponentielle(B_CE, 1);
    const somme = [
      [A_CE[0][0] + B_CE[0][0], A_CE[0][1] + B_CE[0][1]],
      [A_CE[1][0] + B_CE[1][0], A_CE[1][1] + B_CE[1][1]],
    ];
    const vues = [
      { titre: '$e^A e^B$', M: produit(eA, eB) },
      { titre: '$e^B e^A$', M: produit(eB, eA) },
      { titre: '$e^{A+B}$', M: exponentielle(somme, 1) },
    ].map(({ titre, M }) => {
      const d = document.createElement('div');
      grilleCE.appendChild(d);
      const h = document.createElement('p');
      outils.rendTexte(h, `${titre} $= ${latexMatrice(M)}$`);
      d.appendChild(h);
      const c = toile(d, '1 / 1', () => dessine());
      return { M, rep: new Repere(c, { x: [-3, 3], y: [-3, 3], egal: true, marges: { gauche: 26, bas: 18, haut: 6, droite: 6 } }) };
    });
    paragraphe(cCE, 'Les trois applications envoient le disque et la lettre F sur des figures différentes : $A$ et $B$ ne commutent pas ($AB \\neq BA$). On a $e^{A+B} = \\cosh(1)\\,I_2 + \\sinh(1)\\,(A + B)$ car $(A + B)^2 = I_2$.');

    let animation = null;
    lecture.addEventListener('click', () => {
      if (outils.mouvementReduit) {
        outils.change({ t: 3 });
        champs.t.fixe(3);
        dessine();
        return;
      }
      const debut = performance.now();
      cancelAnimationFrame(animation);
      const pas = (maintenant) => {
        const t = Math.min(3, (maintenant - debut) / 1000);
        outils.change({ t: Number(t.toFixed(2)) });
        champs.t.fixe(Number(t.toFixed(2)));
        dessine();
        if (t < 3) animation = requestAnimationFrame(pas);
      };
      animation = requestAnimationFrame(pas);
    });

    const image = (M, pts) => pts.map((p) => applique(M, p));

    function dessine() {
      const col = couleurs();
      const A = matrice(r.tr, r.det);
      const E = exponentielle(A, r.t);
      if (rep.prepare()) {
        rep.axes({ noms: ['x₁', 'x₂'] });
        rep.trace(CERCLE, { couleur: col.discret, largeur: 1, tirets: [4, 4] });
        rep.trace(LETTRE_F, { couleur: col.discret, largeur: 1.5, tirets: [4, 4] });
        const ctx = rep.ctx;
        const disque = image(E, CERCLE);
        ctx.save();
        rep.decoupe();
        ctx.fillStyle = col.zone;
        ctx.beginPath();
        disque.forEach(([x, y], k) => (k ? ctx.lineTo(rep.X(x), rep.Y(y)) : ctx.moveTo(rep.X(x), rep.Y(y))));
        ctx.fill();
        ctx.restore();
        rep.trace(disque, { couleur: col.accent, largeur: 2 });
        rep.trace(image(E, LETTRE_F), { couleur: col.perturbation, largeur: 3 });
      }
      zoneLegende.textContent = '';
      legende(zoneLegende, [
        { texte: 'disque unité et F au temps 0', couleur: col.discret, tirets: true },
        { texte: 'leurs images par $e^{tA}$', couleur: col.accent },
      ]);
      const detE = E[0][0] * E[1][1] - E[0][1] * E[1][0];
      outils.rendTexte(
        formules,
        `$A = ${latexMatrice(A)}$ (${nature(r.tr, r.det).nom}), $e^{tA} = ${latexMatrice(E)}$. ` +
          `Aire de l’image : $\\pi \\det e^{tA} = \\pi\\,e^{t\\operatorname{tr}A} = ${latexNombre(Math.PI * detE)}$.`,
      );

      for (const v of vues) {
        if (!v.rep.prepare()) continue;
        v.rep.axes({ grille: false });
        v.rep.trace(CERCLE, { couleur: col.discret, largeur: 1, tirets: [4, 4] });
        v.rep.trace(image(v.M, CERCLE), { couleur: col.accent, largeur: 2 });
        v.rep.trace(image(v.M, LETTRE_F), { couleur: col.perturbation, largeur: 2.5 });
      }
    }

    outils.surTheme(dessine);
    dessine();
    return {
      applique() {
        for (const cle of ['tr', 'det', 't']) champs[cle].fixe(r[cle]);
        dessine();
      },
    };
  },
};
