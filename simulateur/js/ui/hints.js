// Indications courtes, qui renvoient aux résultats du poly.

import { kalman, rang } from '../core/linalg.js';
import { latexComplexe, latexNombre } from './format.js';
import { rendTexte } from './katex.js';

const TOL = 1e-9;

export function indications(sim) {
  const liste = [];
  const n = sim.A.length;

  // Contrôlabilité du linéarisé.
  const r = rang(kalman(sim.A, sim.B));
  liste.push(
    r === n
      ? {
          niveau: 'ok',
          texte: `$\\operatorname{rang} \\mathcal{C}(A,B) = ${n}$ : le linéarisé est contrôlable (critère de Kalman), on peut placer librement les valeurs propres de $A + BK$.`,
        }
      : {
          niveau: 'alerte',
          texte: `$\\operatorname{rang} \\mathcal{C}(A,B) = ${r} < ${n}$ : le linéarisé n'est pas contrôlable (critère de Kalman), certaines valeurs propres de $A + BK$ ne dépendent pas de $K$.`,
        },
  );

  // Stabilité du bouclé par linéarisation.
  const vp = sim.vpABK;
  const alpha = Math.max(...vp.map((z) => z.re));
  const spectre = vp.map((z) => latexComplexe(z)).join(',\\ ');
  if (alpha < -TOL) {
    liste.push({
      niveau: 'ok',
      texte: `$A + BK$ est Hurwitz ($\\lambda = ${spectre}$) : $x_e$ est localement asymptotiquement stable pour le système non linéaire bouclé (stabilité par linéarisation).`,
    });
    liste.push({
      niveau: 'info',
      texte: `Près de $x_e$, l'écart décroît comme $e^{\\alpha t}$ avec $\\alpha = \\max \\operatorname{Re} \\lambda = ${latexNombre(alpha)}$, soit un temps caractéristique $1/|\\alpha| \\approx ${latexNombre(1 / -alpha, 2)}$ s. Loin de $x_e$, rien n'est garanti : la stabilité n'est que locale.`,
    });
  } else if (alpha > TOL) {
    liste.push({
      niveau: 'alerte',
      texte: `$A + BK$ a une valeur propre de partie réelle strictement positive ($\\lambda = ${spectre}$) : $x_e$ n'est pas stable pour le bouclé (contraposée du théorème de linéarisation).`,
    });
  } else {
    liste.push({
      niveau: 'alerte',
      texte: `$A + BK$ a une valeur propre de partie réelle nulle ($\\lambda = ${spectre}$) : la linéarisation ne permet pas de conclure.`,
    });
  }

  if (sim.modele.indications) liste.push(...sim.modele.indications(sim.p, sim.K));
  if (sim.diverge) {
    liste.push({ niveau: 'alerte', texte: 'La simulation a divergé numériquement : réinitialisez la condition initiale.' });
  }
  return liste;
}

export function afficheIndications(ul, sim) {
  ul.textContent = '';
  for (const { niveau, texte } of indications(sim)) {
    const li = document.createElement('li');
    li.className = niveau;
    rendTexte(li, texte);
    ul.appendChild(li);
  }
}
