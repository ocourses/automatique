// Diagramme de bifurcation dans le plan (trace, déterminant) : on déplace un
// point, et le portrait de phase, les valeurs propres, les directions propres
// et la solution x(t) = e^{tA}x₀ suivent (poly, portraits de phase ; TD1).

import { CAS_TD1, applique, exponentielle, matrice, nature, spectre } from '../core/dim2.js';
import { latexComplexe, latexMatrice, latexNombre } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { carte, glisse, legende, paragraphe, toile } from './commun.js';
import { Particules, dessinePortrait } from './portraits.js';

const AIMANT = 9; // px : le point se colle aux axes et à la parabole

// Aimantation du point (tr, det) sur det = 0, tr = 0 et la parabole Δ = 0,
// à `seuilTr` et `seuilDet` près (en unités du plan).
export function aimante(tr, det, seuilTr, seuilDet) {
  let [t, d] = [tr, det];
  if (Math.abs(t) < seuilTr) t = 0;
  if (Math.abs(d) < seuilDet) d = 0;
  else if (Math.abs(d - (t * t) / 4) < seuilDet) d = (t * t) / 4;
  return [t, d];
}

export default {
  etat: { tr: -2, det: 4, forme: 'propres', x1: 2, x2: 1 },

  rappel: [
    'Pour $n = 2$, la nature de l’origine pour $\\dot x = Ax$ se lit sur $\\operatorname{tr}(A) = \\lambda_1 + \\lambda_2$ et $\\det(A) = \\lambda_1\\lambda_2$, via le discriminant $\\Delta = \\operatorname{tr}(A)^2 - 4\\det(A)$.',
    '$\\Delta > 0$ : valeurs propres réelles distinctes, nœud ou col. $\\Delta < 0$ : valeurs propres complexes conjuguées, foyer ou centre. $\\Delta = 0$ : valeur propre double, nœud impropre si $A$ n’est pas diagonalisable.',
    'L’origine est asymptotiquement stable si et seulement si $A$ est une matrice de Hurwitz, c’est-à-dire $\\operatorname{tr}(A) < 0$ et $\\det(A) > 0$ : le quart de plan coloré.',
  ],

  essais: [
    { texte: 'Partez d’un foyer puits ($P_7$) et augmentez la trace jusqu’à 0 : les spirales deviennent des ellipses (centre, $P_8$), puis s’ouvrent ($P_9$).', etat: { tr: -2, det: 4 } },
    { texte: 'Descendez sur la parabole $\\Delta = 0$ depuis un foyer : les spirales disparaissent et une seule direction propre subsiste (nœud impropre, $P_{11}$).', etat: { tr: -4, det: 4 } },
    { texte: 'Passez sous l’axe $\\det = 0$ : l’origine devient un col. Les orbites entrent le long d’une direction propre et sortent le long de l’autre.', etat: { tr: 0, det: -1 } },
    { texte: 'Sur l’axe $\\det = 0$, à gauche ($P_4$) : une droite d’équilibres apparaît. L’origine est-elle encore asymptotiquement stable ?', etat: { tr: -3, det: 0 } },
    { texte: 'En coordonnées « compagnon », la même trace et le même déterminant donnent un portrait déformé, mais de même nature : la nature ne dépend que du spectre.', etat: { forme: 'compagnon' } },
    { texte: 'Cliquez dans le portrait pour choisir $x_0$ et comparez $x(t)$ à la nature de l’équilibre : oscillations pour un foyer, aucune pour un nœud.' },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    const grille = document.createElement('div');
    grille.className = 'grille-2';
    zone.appendChild(grille);

    // ---- Plan (trace, déterminant) ----------------------------------------------
    const cPlan = carte(grille, 'Plan $(\\operatorname{tr} A, \\det A)$');
    const canvasPlan = toile(cPlan, '4 / 3', () => dessine());
    canvasPlan.classList.add('saisissable');
    const repPlan = new Repere(canvasPlan, { x: [-5, 5], y: [-2.5, 6] });
    const verdict = paragraphe(cPlan, '', 'verdict');
    const details = paragraphe(cPlan, '', '');

    // ---- Portrait de phase ---------------------------------------------------------
    const cPortrait = carte(grille, 'Portrait de phase');
    const choix = document.createElement('div');
    choix.className = 'choix';
    choix.innerHTML =
      '<label><input type="radio" name="forme" value="propres"> base propre (TD1)</label>' +
      '<label><input type="radio" name="forme" value="compagnon"> compagnon (x, ẋ)</label>';
    cPortrait.appendChild(choix);
    const radios = [...choix.querySelectorAll('input')];
    for (const radio of radios) {
      radio.addEventListener('change', () => {
        outils.change({ forme: radio.value });
        dessine();
      });
    }
    const canvasPortrait = toile(cPortrait, '1 / 1', () => dessine());
    canvasPortrait.classList.add('cliquable');
    const repPortrait = new Repere(canvasPortrait, { x: [-3, 3], y: [-3, 3], egal: true });
    const noteMatrice = paragraphe(cPortrait, '', '');

    // ---- x(t) ------------------------------------------------------------------------
    const cTemps = carte(zone, 'Solution $x(t) = e^{tA}x_0$');
    const canvasTemps = toile(cTemps, '3 / 1', () => dessine());
    const repTemps = new Repere(canvasTemps, { x: [0, 8], y: [-3, 3] });
    const zoneLegende = document.createElement('div');
    cTemps.appendChild(zoneLegende);

    glisse(canvasPlan, repPlan, {
      deplace: (x, y) => {
        const [tr, det] = aimante(x, y, AIMANT / repPlan.sx, AIMANT / repPlan.sy);
        outils.change({ tr: Number(tr.toFixed(3)), det: Number(det.toFixed(3)) });
        dessine();
      },
    });
    glisse(canvasPortrait, repPortrait, {
      deplace: (x, y) => {
        outils.change({ x1: Number(x.toFixed(3)), x2: Number(y.toFixed(3)) });
        dessine();
      },
    });

    const particules = new Particules(45);

    function dessine() {
      const col = couleurs();
      const A = matrice(r.tr, r.det, r.forme);
      const n = nature(r.tr, r.det);
      const { valeurs, delta } = spectre(r.tr, r.det);
      for (const radio of radios) radio.checked = radio.value === r.forme;

      // Plan (tr, det).
      if (repPlan.prepare()) {
        repPlan.region((t, d) => t < 0 && d > 0, { couleur: col.zone, pas: 4 });
        repPlan.axes({ noms: ['tr A', 'det A'] });
        const parabole = [];
        for (let t = -6; t <= 6; t += 0.05) parabole.push([t, (t * t) / 4]);
        repPlan.trace(parabole, { couleur: col.accent, largeur: 1.5 });
        repPlan.texte(4.6, 4.6 * 4.6 / 4, 'Δ = 0', { couleur: col.accent, align: 'right', dx: -6 });
        for (const c of CAS_TD1) {
          repPlan.point(c.tr, c.det, { rayon: 3, couleur: col.discret });
          repPlan.texte(c.tr, c.det, c.cas, { couleur: col.discret, dx: 5, dy: -5, police: '11px system-ui, sans-serif' });
        }
        repPlan.point(r.tr, r.det, { rayon: 7, couleur: n.stabilite === 'asymptotiquement stable' ? col.accent : col.alerte });
      }
      verdict.className = `verdict ${n.stabilite === 'asymptotiquement stable' ? 'ok' : n.stabilite === 'instable' ? 'alerte' : ''}`;
      outils.rendTexte(
        verdict,
        `${n.nom[0].toUpperCase()}${n.nom.slice(1)} (cas ${n.cas} du TD1) : l’origine est ${n.stabilite}.`,
      );
      outils.rendTexte(
        details,
        `$\\operatorname{tr} A = ${latexNombre(r.tr)}$, $\\det A = ${latexNombre(r.det)}$, $\\Delta = ${latexNombre(delta)}$. ` +
          `Valeurs propres : $${valeurs.map((z) => latexComplexe(z)).join(',\\ ')}$.`,
      );

      // Portrait.
      if (repPortrait.prepare()) {
        dessinePortrait(repPortrait, A, { couleurs: col });
        repPortrait.axes({ noms: r.forme === 'propres' ? ['y₁', 'y₂'] : ['x', 'ẋ'], grille: false });
        if (!outils.mouvementReduit) particules.dessine(repPortrait, col.observateur);
        repPortrait.point(r.x1, r.x2, { rayon: 5, couleur: col.perturbation });
      }
      outils.rendTexte(
        noteMatrice,
        `$A = ${latexMatrice(A)}$. ${r.forme === 'propres' ? 'Forme réduite du TD1 : directions propres en tirets selon les axes.' : 'Matrice compagnon de $\\ddot x - (\\operatorname{tr} A)\\,\\dot x + (\\det A)\\,x = 0$.'} ` +
          'Les points verts sont emportés par le flot ; le point orange est $x_0$ (cliquez pour le déplacer).',
      );

      // x(t).
      const pts1 = [];
      const pts2 = [];
      for (let k = 0; k <= 400; k++) {
        const t = (8 * k) / 400;
        const x = applique(exponentielle(A, t), [r.x1, r.x2]);
        pts1.push([t, x[0]]);
        pts2.push([t, x[1]]);
      }
      const m = Math.max(1, Math.abs(r.x1), Math.abs(r.x2)) * 1.6;
      repTemps.fixeCadre([0, 8], [-m, m]);
      if (repTemps.prepare()) {
        repTemps.axes({ noms: ['t', ''] });
        repTemps.trace(pts1, { couleur: col.accent });
        repTemps.trace(pts2, { couleur: col.trait });
      }
      zoneLegende.textContent = '';
      const noms = r.forme === 'propres' ? ['y_1(t)', 'y_2(t)'] : ['x(t)', '\\dot x(t)'];
      legende(zoneLegende, [
        { texte: `$${noms[0]}$`, couleur: col.accent },
        { texte: `$${noms[1]}$`, couleur: col.trait },
      ]);
    }

    // Animation des particules.
    let avant = performance.now();
    const anime = (maintenant) => {
      const dt = Math.min(0.05, (maintenant - avant) / 1000);
      avant = maintenant;
      if (repPortrait.cadre) {
        particules.avance(matrice(r.tr, r.det, r.forme), repPortrait, 0.6 * dt);
        if (repPortrait.prepare()) {
          const col = couleurs();
          dessinePortrait(repPortrait, matrice(r.tr, r.det, r.forme), { couleurs: col });
          repPortrait.axes({ noms: r.forme === 'propres' ? ['y₁', 'y₂'] : ['x', 'ẋ'], grille: false });
          particules.dessine(repPortrait, col.observateur);
          repPortrait.point(r.x1, r.x2, { rayon: 5, couleur: col.perturbation });
        }
      }
      requestAnimationFrame(anime);
    };
    if (!outils.mouvementReduit) requestAnimationFrame(anime);

    outils.surTheme(dessine);
    dessine();
    return { applique: dessine };
  },
};
