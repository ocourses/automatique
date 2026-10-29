// Diagramme de bifurcation dans le plan (trace, déterminant) : on déplace un
// point, et le portrait de phase, les valeurs propres, les directions propres
// et la solution x(t) = e^{tA}x₀ suivent (poly, portraits de phase ; TD1).

import { applique, exponentielle, matrice, nature, spectre } from '../../socle/js/core/dim2.js';
import { latexComplexeFixe, latexMatriceFixe, latexNombreFixe } from '../../socle/js/ui/format.js';
import { fermeInfobulle, infobulle } from '../../socle/js/ui/infobulle.js';
import { Repere } from '../../socle/js/ui/repere.js';
import { couleurs } from '../../socle/js/ui/theme.js';
import { boutonInfo, carte, choixRadios, glisse, legende, paragraphe, toile, verdict, zoomable } from './commun.js';
import { dessinePlan, plan } from '../../socle/js/briques/plan-trace-det.js';
import { Particules, dessinePortrait } from '../../socle/js/briques/portraits.js';

// Fonctions du plan (tr, det), exportées ici pour les tests.
export { aimante, pointDuPlan } from '../../socle/js/briques/plan-trace-det.js';

// Remarque propre à un cas du TD1, ou null. Pour P₅ (tr = det = 0), la forme
// réduite est [[0, 1], [0, 0]], non diagonalisable ; mais la matrice nulle a le
// même spectre (valeur propre double nulle) et est diagonalisable : la
// multiplicité géométrique y est égale à l'algébrique, et l'origine est stable.
export function remarqueCas(cas) {
  if (cas !== 'P₅') return null;
  return 'Pour être complet : la matrice nulle $A = 0_2$ a aussi pour spectre $\\{0, 0\\}$, mais elle est diagonalisable (multiplicités algébrique et géométrique égales à 2). Tout point est alors un équilibre, et l’origine est stable, sans être asymptotiquement stable.';
}

export default {
  // Préférences d'affichage (navigateur, hors du lien) : courbes du portrait
  // tracées ou en mouvement, avec ou sans particules.
  preferences: { mode: 'trace', particules: false },

  etat: { tr: -2, det: 4, forme: 'propres', x1: 2, x2: 1 },

  choix: { forme: ['propres', 'compagnon'], mode: ['trace', 'mouvement'] },

  termes: ['matrice de Hurwitz', 'asymptotiquement stable', 'nœud impropre', 'nœud', 'col', 'foyer', 'centre', 'diagonalisable'],

  rappel: [
    'Pour $n = 2$, la nature de l’origine pour $\\dot x = Ax$ se lit sur $\\operatorname{tr}(A) = \\lambda_1 + \\lambda_2$ et $\\det(A) = \\lambda_1\\lambda_2$, via le discriminant $\\Delta = \\operatorname{tr}(A)^2 - 4\\det(A)$ :',
    [
      '$\\Delta > 0$ : deux valeurs propres réelles distinctes. Col si $\\det A < 0$, nœud si $\\det A > 0$ ; si $\\det A = 0$, une droite d’équilibres.',
      '$\\Delta < 0$ : valeurs propres complexes conjuguées $\\alpha \\pm i\\beta$ avec $\\alpha = \\operatorname{tr}(A)/2$. Foyer si $\\operatorname{tr} A \\neq 0$, centre si $\\operatorname{tr} A = 0$.',
      '$\\Delta = 0$ : valeur propre double $\\lambda = \\operatorname{tr}(A)/2$. Nœud impropre si $A$ n’est pas diagonalisable.',
    ],
    'Dans les trois cas, l’origine est asymptotiquement stable si et seulement si $A$ est une matrice de Hurwitz, c’est-à-dire $\\operatorname{tr}(A) < 0$ et $\\det(A) > 0$ : le quart de plan coloré.',
  ],

  essais: [
    { texte: 'Partez d’un foyer puits ($P_7$) et augmentez la trace jusqu’à 0 : les spirales deviennent des ellipses (centre, $P_8$), puis s’ouvrent ($P_9$).', etat: { tr: -2, det: 4 }, preferences: { mode: 'trace' } },
    { texte: 'Depuis le foyer puits $P_7$, descendez verticalement jusqu’à la parabole $\\Delta = 0$ (en $\\det A = 1$) : les spirales disparaissent et une seule direction propre subsiste. C’est un nœud impropre, comme $P_{11}$.', etat: { tr: -2, det: 4 }, preferences: { mode: 'trace' } },
    { texte: 'Depuis le centre $P_8$, descendez le long de l’axe $\\operatorname{tr} A = 0$ et passez sous l’axe $\\det A = 0$ : l’origine devient un col ($P_3$). Les orbites entrent le long d’une direction propre et sortent le long de l’autre.', etat: { tr: 0, det: 3 }, preferences: { mode: 'trace' } },
    { texte: 'Placez-vous en $P_5$, à l’origine du plan : $A = \\begin{pmatrix} 0 & 1 \\\\ 0 & 0 \\end{pmatrix}$ n’est pas diagonalisable, et l’origine est instable. La remarque dit pourquoi la matrice nulle, de même spectre, se comporte autrement.', etat: { tr: 0, det: 0 }, preferences: { mode: 'trace' } },
    { texte: 'Sur l’axe $\\det = 0$, à gauche ($P_4$) : une droite d’équilibres apparaît. L’origine est-elle encore asymptotiquement stable ?', etat: { tr: -3, det: 0 }, preferences: { mode: 'trace' } },
    { texte: 'En coordonnées « compagnon », la même trace et le même déterminant donnent un portrait déformé, mais de même nature : la nature ne dépend que du spectre.', etat: { forme: 'compagnon' }, preferences: { mode: 'trace' } },
    { texte: 'Dans le portrait, mettez les courbes « en mouvement » : des arcs glissent le long des orbites, dans le sens du flot. Ajoutez les particules pour voir le flot les emporter. Ces choix sont gardés dans votre navigateur.' },
    { texte: 'Cliquez dans le portrait pour choisir $x_0$ et comparez $x(t)$ à la nature de l’équilibre : oscillations pour un foyer, aucune pour un nœud.' },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    // Deux colonnes : le plan (tr, det) au-dessus de la solution x(t) à gauche,
    // le portrait de phase sur toute la hauteur à droite.
    const colonnes = document.createElement('div');
    colonnes.className = 'deux-colonnes';
    zone.appendChild(colonnes);
    const gauche = document.createElement('div');
    gauche.className = 'colonne';
    colonnes.appendChild(gauche);

    // ---- Plan (trace, déterminant) ----------------------------------------------
    const cPlan = carte(gauche, 'Plan $(\\operatorname{tr} A, \\det A)$');
    const canvasPlan = toile(cPlan, '4 / 3', () => dessine());
    const repPlan = new Repere(canvasPlan, { x: [-5, 5], y: [-2.5, 6] });
    const texteVerdict = verdict(cPlan, '');

    // ---- x(t) ------------------------------------------------------------------------
    const cTemps = carte(gauche, 'Solution $x(t) = e^{tA}x_0$');
    const titreTemps = cTemps.querySelector('h2');
    const canvasTemps = toile(cTemps, '3 / 1', () => dessine());
    const repTemps = new Repere(canvasTemps, { x: [0, 8], y: [-3, 3] });
    const barre = document.createElement('div');
    barre.className = 'barre-legende';
    cTemps.appendChild(barre);
    const zoneLegende = document.createElement('div');
    barre.appendChild(zoneLegende);
    // Cadre de x(t) : automatique, ou fixé par le zoom et le déplacement.
    const zoomTemps = zoomable(canvasTemps, repTemps, {
      barre,
      auto: () => {
        const m = Math.max(1, Math.abs(r.x1), Math.abs(r.x2)) * 1.6;
        return { x: [0, 8], y: [-m, m] };
      },
      redessine: () => dessine(),
      tempsPositif: true,
    });

    const particules = new Particules(60);

    // ---- Portrait de phase ---------------------------------------------------------
    const cPortrait = carte(colonnes, 'Portrait de phase');
    // Légende de la figure dans une bulle, derrière un bouton « i ».
    boutonInfo(cPortrait, [
      ['ligne', '--texte', 'Trajectoires de $\\dot x = Ax$, du bord du cadre jusqu’à l’équilibre ; la flèche donne le sens du temps.'],
      ['fleche', '--discret', 'Champ de vecteurs : la vitesse $Ax$ en chaque point.'],
      ['tirets', '--accent', 'Directions propres réelles, invariantes par le flot.'],
      ['point', '--equilibre', 'Équilibre : l’origine, ou toute une droite d’équilibres quand $\\det A = 0$.'],
      ['point', '--perturbation', 'Condition initiale $x_0$ : cliquez ou faites glisser pour la déplacer. Sa solution est tracée dans « Solution », où $x_0$ est rappelé en $t = 0$.'],
      ['point', '--texte', 'Particules emportées par le flot (si elles sont affichées) : deux particules qui se rejoignent n’en font plus qu’une, et une autre apparaît ailleurs.'],
    ], { etiquette: 'Légende du portrait de phase' });
    const forme = choixRadios(cPortrait, {
      nom: 'forme',
      options: [{ valeur: 'propres', texte: 'base propre (TD1)' }, { valeur: 'compagnon', texte: 'compagnon (x, ẋ)' }],
      change: (valeur) => {
        outils.change({ forme: valeur });
        dessine();
      },
    });
    // Courbes tracées ou en mouvement, avec ou sans particules : préférences.
    const prefs = outils.preferences;
    const reglages = document.createElement('div');
    reglages.className = 'reglages-courbes';
    reglages.innerHTML =
      '<span class="groupe" role="radiogroup" aria-label="Courbes">Courbes ' +
      '<label><input type="radio" name="mode" value="trace"> tracées</label>' +
      '<label><input type="radio" name="mode" value="mouvement"> en mouvement</label></span>' +
      '<label class="case"><input type="checkbox" name="particules"> particules</label>';
    cPortrait.appendChild(reglages);
    const montreReglages = () => {
      for (const radio of reglages.querySelectorAll('[name=mode]')) radio.checked = radio.value === prefs.valeurs.mode;
      reglages.querySelector('[name=particules]').checked = prefs.valeurs.particules;
    };
    reglages.addEventListener('input', (ev) => {
      const cible = ev.target;
      prefs.change(cible.name === 'mode' ? { mode: cible.value } : { particules: cible.checked });
      montreReglages();
      dessine();
    });
    const canvasPortrait = toile(cPortrait, '1 / 1', () => dessine());
    canvasPortrait.classList.add('cliquable');
    const repPortrait = new Repere(canvasPortrait, { x: [-3, 3], y: [-3, 3], egal: true });
    // Texte sous la figure : sa hauteur est réservée pour que la figure ne
    // change pas de taille quand les formules changent.
    const bloc = document.createElement('div');
    bloc.className = 'bloc-maths';
    cPortrait.appendChild(bloc);
    const noteForme = paragraphe(bloc, '', '');
    const formule = document.createElement('div');
    formule.className = 'formule';
    bloc.appendChild(formule);
    const details = paragraphe(bloc, '', '');
    const proprietes = paragraphe(bloc, '', '');
    const remarque = paragraphe(bloc, '', 'note');
    let casAffiche = null;

    plan(canvasPlan, repPlan, (point) => {
      outils.change(point);
      dessine();
    });
    glisse(canvasPortrait, repPortrait, {
      deplace: (x, y) => {
        outils.change({ x1: Number(x.toFixed(3)), x2: Number(y.toFixed(3)) });
        dessine();
      },
    });

    let formeAffichee = null;
    // En mouvement, chaque courbe est un arc qui glisse le long de son orbite ;
    // sa longueur, 0,38 × la taille du cadre, est mesurée le long de la courbe.
    const optionsCourbes = () => (prefs.valeurs.mode === 'trace' ? {} : { arc: 0.38 });
    let temps = 0; // secondes d'animation, pour les arcs glissants
    montreReglages();

    function dessine() {
      const col = couleurs();
      const A = matrice(r.tr, r.det, r.forme);
      const n = nature(r.tr, r.det);
      const { valeurs, delta } = spectre(r.tr, r.det);
      forme.fixe(r.forme);

      // Plan (tr, det).
      dessinePlan(repPlan, r.tr, r.det, col);
      texteVerdict.className = `verdict ${n.stabilite === 'asymptotiquement stable' ? 'ok' : n.stabilite === 'instable' ? 'alerte' : ''}`;
      outils.rendTexte(
        texteVerdict,
        `${n.nom[0].toUpperCase()}${n.nom.slice(1)} : l’origine est ${n.stabilite} (cas ${n.cas} du TD1).`,
      );
      outils.rendTexte(
        details,
        `$\\operatorname{tr} A = ${latexNombreFixe(r.tr)}$, $\\det A = ${latexNombreFixe(r.det)}$, $\\Delta = ${latexNombreFixe(delta)}$.`,
      );
      outils.rendTexte(proprietes, `Valeurs propres : $${valeurs.map((z) => latexComplexeFixe(z)).join(',\\ ')}$.`);
      // La remarque n'est reconstruite que quand le cas change : sa bulle de
      // glossaire reste utilisable pendant les animations.
      if (n.cas !== casAffiche) {
        casAffiche = n.cas;
        const texteRemarque = remarqueCas(n.cas);
        remarque.hidden = !texteRemarque;
        if (texteRemarque) {
          outils.rendTexte(remarque, texteRemarque);
          outils.glossaire(remarque, ['diagonalisable']);
        }
        fermeInfobulle();
      }

      // Portrait.
      if (repPortrait.prepare()) {
        dessinePortrait(repPortrait, A, { couleurs: col, ...optionsCourbes(), temps });
        repPortrait.axes({ noms: r.forme === 'propres' ? ['y₁', 'y₂'] : ['x', 'ẋ'], grille: false });
        if (prefs.valeurs.particules && !outils.mouvementReduit) particules.dessine(repPortrait, col.trait);
        repPortrait.point(r.x1, r.x2, { rayon: 5, couleur: col.perturbation });
      }
      if (r.forme !== formeAffichee) {
        formeAffichee = r.forme;
        if (r.forme === 'propres') {
          outils.rendTexte(noteForme, 'Avec le changement de variable $x = Py$ du TD1, on a $\\dot y = \\Sigma\\,y$, où $\\Sigma$ est la forme réduite de $A$ :');
        } else {
          outils.rendTexte(noteForme, 'Dans le plan $(x, \\dot x)$, $A$ est la matrice compagnon de $\\ddot x - (\\operatorname{tr} A)\\,\\dot x + (\\det A)\\,x = 0$ :');
          infobulle(
            noteForme,
            'matrice compagnon',
            'Matrice qui met une équation d’ordre 2 sous la forme d’un système d’ordre 1 sur l’état (x, ẋ). Ici, pour ẍ = (tr A) ẋ − (det A) x, c’est la matrice [[0, 1], [−det A, tr A]].',
          );
        }
        fermeInfobulle();
      }
      outils.rend(formule, `${r.forme === 'propres' ? '\\Sigma' : 'A'} = ${latexMatriceFixe(A)}`);
      outils.rendTexte(titreTemps, r.forme === 'propres' ? 'Solution $y(t) = e^{t\\Sigma}y_0$' : 'Solution $x(t) = e^{tA}x_0$');

      // x(t), sur la plage de temps visible.
      const cadre = zoomTemps.cadre();
      const [t0, t1] = cadre.x;
      const pts1 = [];
      const pts2 = [];
      for (let k = 0; k <= 400; k++) {
        const t = t0 + ((t1 - t0) * k) / 400;
        const x = applique(exponentielle(A, t), [r.x1, r.x2]);
        pts1.push([t, x[0]]);
        pts2.push([t, x[1]]);
      }
      repTemps.fixeCadre(cadre.x, cadre.y);
      if (repTemps.prepare()) {
        repTemps.axes({ noms: ['t', ''] });
        repTemps.trace(pts1, { couleur: col.accent });
        repTemps.trace(pts2, { couleur: col.trait });
        // Rappel de x₀ en t = 0, de la couleur du point du portrait.
        if (repTemps.contient(0, r.x1)) repTemps.point(0, r.x1, { rayon: 5, couleur: col.perturbation });
        if (repTemps.contient(0, r.x2)) repTemps.point(0, r.x2, { rayon: 5, couleur: col.perturbation });
      }
      zoneLegende.textContent = '';
      const noms = r.forme === 'propres' ? ['y_1(t)', 'y_2(t)'] : ['x(t)', '\\dot x(t)'];
      legende(zoneLegende, [
        { texte: `$${noms[0]}$`, couleur: col.accent },
        { texte: `$${noms[1]}$`, couleur: col.trait },
      ]);
    }

    // Animation des arcs et des particules ; une figure immobile (courbes
    // tracées, sans particules) n'est pas redessinée à chaque image.
    let avant = performance.now();
    const anime = (maintenant) => {
      const dt = Math.max(0, Math.min(0.05, (maintenant - avant) / 1000));
      avant = maintenant;
      temps += dt;
      const bouge = prefs.valeurs.mode === 'mouvement' || prefs.valeurs.particules;
      if (bouge && repPortrait.cadre) {
        const A = matrice(r.tr, r.det, r.forme);
        if (prefs.valeurs.particules) particules.avance(A, repPortrait, 0.6 * dt);
        if (repPortrait.prepare()) {
          const col = couleurs();
          dessinePortrait(repPortrait, A, { couleurs: col, ...optionsCourbes(), temps });
          repPortrait.axes({ noms: r.forme === 'propres' ? ['y₁', 'y₂'] : ['x', 'ẋ'], grille: false });
          if (prefs.valeurs.particules) particules.dessine(repPortrait, col.trait);
          repPortrait.point(r.x1, r.x2, { rayon: 5, couleur: col.perturbation });
        }
      }
      requestAnimationFrame(anime);
    };
    if (!outils.mouvementReduit) requestAnimationFrame(anime);

    outils.surTheme(dessine);
    dessine();
    return {
      applique() {
        montreReglages();
        dessine();
      },
    };
  },
};
