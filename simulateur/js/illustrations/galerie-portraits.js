// Les onze cas du TD1 côte à côte : portrait de phase de chaque point P₁…P₁₁
// du diagramme de bifurcation, avec sa nature et sa stabilité. Chaque portrait
// ouvre le diagramme de bifurcation en ce point.

import { CAS_TD1, matrice, nature, spectre } from '../core/dim2.js';
import { latexComplexe } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { paragraphe } from './commun.js';
import { dessinePortrait } from './portraits.js';

export default {
  etat: { forme: 'propres' },

  rappel: [
    'Le TD1 place onze points dans le plan $(\\operatorname{tr} A, \\det A)$ et demande l’allure des trajectoires de $\\dot y = \\Sigma y$, où $\\Sigma$ est la forme réduite de $A$ : diagonale, de rotation-homothétie ou bloc de Jordan.',
    'Les directions propres réelles (en tirets) sont invariantes par le flot. Pour une valeur propre nulle, toute une droite est faite d’équilibres (en rouge).',
    'L’origine est asymptotiquement stable pour $P_1$, $P_7$ et $P_{11}$ ; stable sans l’être asymptotiquement pour $P_4$ et $P_8$ ; instable pour les autres.',
  ],

  essais: [
    { texte: 'Repérez les trois cas asymptotiquement stables : que partagent leurs valeurs propres ?' },
    { texte: 'Comparez $P_4$ et $P_5$ : tous deux ont $\\det A = 0$. Pourquoi l’un est-il stable et l’autre non ?' },
    { texte: 'Pour $P_1$, $P_2$ et $P_3$, le TD1 donne $y_2 = y_1^{\\lambda_2/\\lambda_1}$ pour $y_0 = (1, 1)$ : retrouvez $\\sqrt{y_1}$, $y_1^2$ et $1/y_1$ sur les portraits.' },
    { texte: 'Passez en coordonnées « compagnon » : les portraits se déforment, la nature reste la même.', etat: { forme: 'compagnon' } },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    const barre = document.createElement('div');
    barre.className = 'carte choix';
    barre.innerHTML =
      '<label><input type="radio" name="forme" value="propres"> base propre (TD1)</label>' +
      '<label><input type="radio" name="forme" value="compagnon"> compagnon (x, ẋ)</label>';
    zone.appendChild(barre);
    const radios = [...barre.querySelectorAll('input')];
    for (const radio of radios) {
      radio.addEventListener('change', () => {
        outils.change({ forme: radio.value });
        dessine();
      });
    }

    const grille = document.createElement('div');
    grille.className = 'grille-3';
    zone.appendChild(grille);
    const vignettes = CAS_TD1.map((c) => {
      const lien = document.createElement('a');
      lien.className = 'carte exemple vignette';
      const h = document.createElement('h2');
      const canvas = document.createElement('canvas');
      canvas.className = 'toile';
      canvas.style.setProperty('--proportions', '1 / 1');
      lien.append(h, canvas);
      const nat = nature(c.tr, c.det);
      const { valeurs } = spectre(c.tr, c.det);
      h.textContent = `${c.cas} · ${nat.nom}`;
      paragraphe(lien, `$\\lambda = ${valeurs.map((z) => latexComplexe(z)).join(',\\ ')}$ : ${nat.stabilite}.`);
      grille.appendChild(lien);
      const rep = new Repere(canvas, { x: [-3, 3], y: [-3, 3], egal: true, marges: { gauche: 4, bas: 4, haut: 4, droite: 4 } });
      new ResizeObserver(() => dessineUne(c, rep)).observe(canvas);
      return { c, lien, rep };
    });

    function dessineUne(c, rep) {
      if (!rep.prepare()) return;
      dessinePortrait(rep, matrice(c.tr, c.det, r.forme), { couleurs: couleurs(), finesse: 0.7 });
    }

    function dessine() {
      for (const radio of radios) radio.checked = radio.value === r.forme;
      for (const { c, lien, rep } of vignettes) {
        lien.href = `illustration.html?id=bifurcation&tr=${c.tr}&det=${c.det}&forme=${r.forme}`;
        dessineUne(c, rep);
      }
    }

    outils.surTheme(dessine);
    dessine();
    return { applique: dessine };
  },
};
