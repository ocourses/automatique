// Le flot déforme le plan (poly, exponentielle de matrice) : le disque unité,
// la grille du carré unité et un petit drapeau (pour voir l'orientation)
// emportés par x ↦ e^{tA}x. On choisit A dans le plan (trace, déterminant) du
// TD1. Rotation-homothétie pour des valeurs propres complexes, contraction ou
// dilatation selon les directions propres, cisaillement pour un bloc de Jordan.
// En complément, repliable, le contre-exemple du poly : e^A e^B ≠ e^{A+B} quand
// A et B ne commutent pas.

import { applique, exponentielle, matrice, nature } from '../core/dim2.js';
import { champ } from '../ui/controls.js';
import { latexMatrice, latexMatriceFixe, latexNombre, latexNombreFixe } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { boutonInfo, carte, legende, paragraphe, repliable, toile } from './commun.js';
import { dessinePlan, plan } from './plan-trace-det.js';

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

// Le cercle unité, la grille du carré [−1, 1]² et un drapeau dans le disque :
// un mât et une flamme triangulaire tournée vers la droite, sans symétrie.
const CERCLE = Array.from({ length: 121 }, (_, k) => [Math.cos((2 * Math.PI * k) / 120), Math.sin((2 * Math.PI * k) / 120)]);
const GRILLE = [-1, -0.5, 0, 0.5, 1].flatMap((c) => {
  const pas = Array.from({ length: 21 }, (_, k) => -1 + k / 10);
  return [pas.map((s) => [c, s]), pas.map((s) => [s, c])];
});
const MAT = [
  [-0.35, -0.6],
  [-0.35, 0.62],
];
const FLAMME = [
  [-0.35, 0.62],
  [0.5, 0.4],
  [-0.35, 0.18],
];

// Animation en boucle : t va de 0 à T_BOUCLE en T_BOUCLE secondes, s'arrête un
// instant, puis repart de 0.
const T_BOUCLE = 3;
const PAUSE = 0.6;

export default {
  etat: { tr: -0.4, det: 4, t: 1 },

  // Préférences : animation en boucle, contre-exemple déplié. Les essais lancent
  // l'animation, sauf celui qui fixe un instant négatif.
  preferences: { anime: false, contreExemple: false },

  termes: ['flot'],

  rappel: [
    'La solution de $\\dot x = Ax$, $x(0) = x_0$ est $x(t) = e^{tA}x_0$ : le flot au temps $t$ est l’application linéaire $x_0 \\mapsto e^{tA}x_0$.',
    [
      'Valeurs propres $\\alpha \\pm i\\beta$ : $e^{tA} = e^{\\alpha t}P\\,R(-\\beta t)\\,P^{-1}$, une rotation suivie d’une homothétie.',
      'Bloc de Jordan : $e^{tJ_\\lambda} = e^{\\lambda t}\\begin{pmatrix} 1 & t \\\\ 0 & 1 \\end{pmatrix}$, un cisaillement.',
      'L’aire est multipliée par $\\det e^{tA} = e^{t\\operatorname{tr} A}$.',
    ],
    'Si $A$ et $B$ commutent, $e^{A}e^{B} = e^{A+B}$. La commutativité est nécessaire : voir le contre-exemple, à déplier sous la figure.',
  ],

  essais: [
    { texte: 'Foyer : le disque tourne et se contracte au fil du temps ; le drapeau garde son orientation.', etat: { tr: -0.4, det: 4, t: 1 }, preferences: { anime: true } },
    { texte: 'Bloc de Jordan nilpotent ($\\operatorname{tr} A = \\det A = 0$) : $e^{tA} = I + tN$, la grille est cisaillée, sans rotation ni contraction.', etat: { tr: 0, det: 0, t: 1.5 }, preferences: { anime: true } },
    { texte: 'Col : le disque s’étire le long d’une direction propre et s’écrase le long de l’autre ; l’aire, elle, suit $e^{t \\operatorname{tr} A}$.', etat: { tr: -1, det: -2, t: 1 }, preferences: { anime: true } },
    { texte: 'Prenez $t < 0$ : le flot remonte le temps, et $e^{-tA} = (e^{tA})^{-1}$.', etat: { t: -0.8 }, preferences: { anime: false } },
    { texte: 'Animez en boucle, puis déplacez le point dans le plan : la déformation change de nature en traversant la parabole $\\Delta = 0$ ou l’axe $\\det A = 0$.', etat: {}, preferences: { anime: true } },
    { texte: 'Dépliez le contre-exemple : $e^Ae^B$, $e^Be^A$ et $e^{A+B}$ envoient le disque et le drapeau sur trois figures différentes.', etat: {}, preferences: { contreExemple: true } },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    const prefs = outils.preferences;

    const colonnes = document.createElement('div');
    colonnes.className = 'deux-colonnes';
    zone.appendChild(colonnes);
    const gauche = document.createElement('div');
    gauche.className = 'colonne';
    colonnes.appendChild(gauche);

    // ---- Plan (tr, det) --------------------------------------------------------------
    const cPlan = carte(gauche, 'Matrice $A$ dans le plan $(\\operatorname{tr} A, \\det A)$');
    const canvasPlan = toile(cPlan, '4 / 3', () => dessine());
    const repPlan = new Repere(canvasPlan, { x: [-5, 5], y: [-2.5, 6] });
    plan(canvasPlan, repPlan, (point) => {
      outils.change(point);
      dessine();
    });

    // ---- Instant t et formules ---------------------------------------------------------
    const cT = carte(gauche, 'Instant $t$');
    const champT = champ(cT, { latex: 't', min: -2, max: 3, pas: 0.01, pasFleche: 0.1, valeur: r.t }, (v) => {
      arrete();
      outils.change({ t: v });
      dessine();
    });
    const case_ = document.createElement('label');
    case_.className = 'case';
    case_.innerHTML = `<input type="checkbox" name="anime"> animer en boucle (t de 0 à ${T_BOUCLE})`;
    cT.appendChild(case_);
    const caseAnime = case_.querySelector('input');
    caseAnime.disabled = outils.mouvementReduit;
    caseAnime.addEventListener('change', () => {
      prefs.change({ anime: caseAnime.checked });
      debut = null;
    });
    // Les deux matrices sur une ligne centrée, puis la nature et l'aire.
    const formule = document.createElement('div');
    formule.className = 'formule';
    cT.appendChild(formule);
    const nat = paragraphe(cT, '', '');

    // ---- Image par e^{tA} ---------------------------------------------------------------
    const cFlot = carte(colonnes, 'Image par $e^{tA}$');
    boutonInfo(cFlot, [
      ['tirets', '--discret', 'Le disque unité et le drapeau au temps $0$.'],
      ['zone', '--zone-stable', 'Image du disque unité par $e^{tA}$ : son aire est $\\pi\\,e^{t\\operatorname{tr} A}$.'],
      ['ligne', '--discret', 'Image de la grille du carré $[-1, 1]^2$ : une application linéaire envoie des droites sur des droites, et garde le parallélisme.'],
      ['ligne', '--texte', 'Image du drapeau : $\\det e^{tA} > 0$, l’orientation est conservée.'],
    ]);
    const canvas = toile(cFlot, '1 / 1', () => dessine());
    const rep = new Repere(canvas, { x: [-2.2, 2.2], y: [-2.2, 2.2], egal: true });
    const zoneLegende = document.createElement('div');
    cFlot.appendChild(zoneLegende);

    // ---- Contre-exemple, repliable -------------------------------------------------------
    const ce = repliable(zone, 'Contre-exemple : $e^A e^B \\neq e^{A+B}$', {
      ouvert: prefs.valeurs.contreExemple,
      change: (ouvert) => {
        prefs.change({ contreExemple: ouvert });
        dessine();
      },
    });
    const grilleCE = document.createElement('div');
    grilleCE.className = 'grille-3';
    ce.contenu.appendChild(grilleCE);
    const eA = exponentielle(A_CE, 1);
    const eB = exponentielle(B_CE, 1);
    const somme = [
      [A_CE[0][0] + B_CE[0][0], A_CE[0][1] + B_CE[0][1]],
      [A_CE[1][0] + B_CE[1][0], A_CE[1][1] + B_CE[1][1]],
    ];
    const vues = [
      { titre: 'e^A e^B', M: produit(eA, eB) },
      { titre: 'e^B e^A', M: produit(eB, eA) },
      { titre: 'e^{A+B}', M: exponentielle(somme, 1) },
    ].map(({ titre, M }) => {
      // Figure à gauche, formule à droite : la place libre est en largeur.
      const d = document.createElement('div');
      d.className = 'figure-et-formule';
      grilleCE.appendChild(d);
      const c = toile(d, '1 / 1', () => dessine());
      const f = document.createElement('div');
      f.className = 'formule';
      outils.rend(f, `${titre} = ${latexMatrice(M)}`);
      d.appendChild(f);
      return { M, rep: new Repere(c, { x: [-2.5, 2.5], y: [-2.5, 2.5], egal: true, marges: { gauche: 4, bas: 4, haut: 4, droite: 4 } }) };
    });
    paragraphe(
      ce.contenu,
      'Ici $A = \\begin{pmatrix} 0 & 1 \\\\ 0 & 0 \\end{pmatrix}$, $B = \\begin{pmatrix} 0 & 0 \\\\ 1 & 0 \\end{pmatrix}$ et $AB \\neq BA$ : trois figures différentes. Comme $(A + B)^2 = I_2$, $e^{A+B} = \\cosh(1)\\,I_2 + \\sinh(1)\\,(A + B)$.',
      'note',
    );

    // ---- Dessin ------------------------------------------------------------------------------
    const image = (M, pts) => pts.map((p) => applique(M, p));

    // Disque (aplat et bord), grille et drapeau, images par M ; les originaux en tirets.
    function figure(repere, M, col, { originaux = true, grille = true } = {}) {
      if (originaux) {
        repere.trace(CERCLE, { couleur: col.discret, largeur: 1, tirets: [4, 4] });
        repere.trace(MAT, { couleur: col.discret, largeur: 1.2, tirets: [4, 4] });
        repere.trace(FLAMME, { couleur: col.discret, largeur: 1.2, tirets: [4, 4] });
      }
      const disque = image(M, CERCLE);
      const ctx = repere.ctx;
      ctx.save();
      repere.decoupe();
      ctx.fillStyle = col.zone;
      ctx.beginPath();
      disque.forEach(([x, y], k) => (k ? ctx.lineTo(repere.X(x), repere.Y(y)) : ctx.moveTo(repere.X(x), repere.Y(y))));
      ctx.fill();
      ctx.restore();
      if (grille) for (const l of GRILLE) repere.trace(image(M, l), { couleur: col.discret, largeur: 0.8, alpha: 0.7 });
      repere.trace(disque, { couleur: col.accent, largeur: 2 });
      repere.trace(image(M, MAT), { couleur: col.trait, largeur: 2.5 });
      const flamme = image(M, FLAMME);
      ctx.save();
      repere.decoupe();
      ctx.fillStyle = col.trait;
      ctx.beginPath();
      flamme.forEach(([x, y], k) => (k ? ctx.lineTo(repere.X(x), repere.Y(y)) : ctx.moveTo(repere.X(x), repere.Y(y))));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function dessine() {
      const col = couleurs();
      const A = matrice(r.tr, r.det);
      const E = exponentielle(A, r.t);
      dessinePlan(repPlan, r.tr, r.det, col);
      if (rep.prepare()) {
        rep.axes({ noms: ['x₁', 'x₂'] });
        figure(rep, E, col);
      }
      zoneLegende.textContent = '';
      legende(zoneLegende, [
        { texte: 'au temps $0$', couleur: col.discret, tirets: true },
        { texte: `au temps $t = ${latexNombreFixe(r.t)}$`, couleur: col.accent },
      ]);
      caseAnime.checked = prefs.valeurs.anime && !outils.mouvementReduit;
      outils.rend(formule, `A = ${latexMatriceFixe(A)}, \\qquad e^{tA} = ${latexMatriceFixe(E)}`);
      const n = nature(r.tr, r.det);
      outils.rendTexte(
        nat,
        `${n.nom[0].toUpperCase()}${n.nom.slice(1)} (cas ${n.cas} du TD1). Aire de l’image : $\\pi \\det e^{tA} = \\pi\\,e^{t\\operatorname{tr} A} = ${latexNombreFixe(Math.PI * Math.exp(r.t * r.tr))}$.`,
      );

      if (!ce.contenu.hidden) {
        for (const v of vues) {
          if (!v.rep.prepare()) continue;
          v.rep.axes({ grille: false });
          figure(v.rep, v.M, col, { grille: false });
        }
      }
    }

    // ---- Animation en boucle ------------------------------------------------------------------
    let debut = null;
    const arrete = () => {
      if (prefs.valeurs.anime) prefs.change({ anime: false });
      caseAnime.checked = false;
    };
    const anime = (maintenant) => {
      if (prefs.valeurs.anime) {
        if (debut === null) debut = maintenant;
        const s = ((maintenant - debut) / 1000) % (T_BOUCLE + PAUSE);
        const t = Number(Math.min(s, T_BOUCLE).toFixed(2));
        if (t !== r.t) {
          outils.change({ t });
          champT.fixe(t);
          dessine();
        }
      } else {
        debut = null;
      }
      requestAnimationFrame(anime);
    };
    if (!outils.mouvementReduit) requestAnimationFrame(anime);

    outils.surTheme(dessine);
    dessine();
    return {
      applique() {
        champT.fixe(r.t);
        ce.applique(prefs.valeurs.contreExemple);
        debut = null;
        dessine();
      },
    };
  },
};
