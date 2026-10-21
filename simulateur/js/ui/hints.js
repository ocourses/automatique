// Indications courtes, qui renvoient aux résultats du poly et des TD.

import { kalman, rang } from '../core/linalg.js';
import { latexComplexe, latexNombre } from './format.js';
import { rendTexte } from './katex.js';

const TOL = 1e-9;

// Nom de la matrice du bouclé linéarisé selon le mode du contrôleur.
export function nomBoucle(sim) {
  return sim.loiActive ? 'J_g(x_e)' : 'A + BK';
}

export function indications(sim) {
  const liste = [];
  const n = sim.A.length;
  const J = nomBoucle(sim);

  if (sim.mode === 'loi' && sim.erreurLoi) {
    liste.push({ niveau: 'alerte', texte: `Loi libre : ${sim.erreurLoi}. La dernière loi valide reste appliquée.` });
  }

  // Contrôlabilité du linéarisé.
  const r = rang(kalman(sim.A, sim.B));
  liste.push(
    r === n
      ? {
          niveau: 'ok',
          texte: `$\\operatorname{rang} \\mathcal{C}(A,B) = ${n}$ : le linéarisé est contrôlable (critère de Kalman), on peut placer librement les valeurs propres de $A + BK$.`,
        }
      : {
          niveau: 'alerte',
          texte: `$\\operatorname{rang} \\mathcal{C}(A,B) = ${r} < ${n}$ : le linéarisé n'est pas contrôlable (critère de Kalman), certaines valeurs propres de $A + BK$ ne dépendent pas de $K$.`,
        },
  );

  if (sim.loiActive) {
    const prim = sim.integrales.map((k) => (k < n ? `ix_${k + 1}` : 'iy'));
    liste.push({
      niveau: 'info',
      texte:
        `Loi libre : $${J}$ est la jacobienne en $x_e$ du système bouclé` +
        (prim.length ? `, dont l'état est augmenté des primitives $${prim.join(', ')}$ (action intégrale).` : '.'),
    });
  }

  if (!sim.equilibreBoucle) {
    liste.push({
      niveau: 'alerte',
      texte: `$x_e$ n'est pas un point d'équilibre du bouclé : $f(x_e, u(x_e)) \\neq 0$. Vérifiez que la loi vaut $u_e$ en $x_e$ (par exemple $u = u_e + \\dots$).`,
    });
  } else {
    // Stabilité du bouclé par linéarisation.
    const vp = sim.vpBF;
    const alpha = Math.max(...vp.map((z) => z.re));
    const spectre = vp.map((z) => latexComplexe(z)).join(',\\ ');
    if (alpha < -TOL) {
      liste.push({
        niveau: 'ok',
        texte: `$${J}$ est Hurwitz ($\\lambda = ${spectre}$) : $x_e$ est localement asymptotiquement stable pour le système non linéaire bouclé (stabilité par linéarisation).`,
      });
      liste.push({
        niveau: 'info',
        texte: `Près de $x_e$, l'écart décroît comme $e^{\\alpha t}$ avec $\\alpha = \\max \\operatorname{Re} \\lambda = ${latexNombre(alpha)}$, soit un temps caractéristique $1/|\\alpha| \\approx ${latexNombre(1 / -alpha, 2)}$ s. Loin de $x_e$, rien n'est garanti : la stabilité n'est que locale.`,
      });
    } else if (alpha > TOL) {
      liste.push({
        niveau: 'alerte',
        texte: `$${J}$ a une valeur propre de partie réelle strictement positive ($\\lambda = ${spectre}$) : $x_e$ n'est pas stable pour le bouclé (contraposée du théorème de linéarisation).`,
      });
    } else {
      liste.push({
        niveau: 'alerte',
        texte: `$${J}$ a une valeur propre de partie réelle nulle ($\\lambda = ${spectre}$) : la linéarisation ne permet pas de conclure.`,
      });
    }
  }

  // Perturbation constante et retour d'état : erreur statique (TD2).
  const xinf = sim.equilibrePerturbe();
  if (xinf) {
    const decalage = xinf.map((v, i) => latexNombre(v - sim.xe[i])).join(', ');
    liste.push({
      niveau: 'info',
      texte: `Perturbation constante $e$ : le linéarisé bouclé converge vers $x_\\infty$ avec $x_\\infty - x_e = (${decalage})$, c'est l'erreur statique (TD2). Une action intégrale (loi libre avec $ix_1$) la supprime.`,
    });
  }
  if (sim.saturation.active) {
    liste.push({
      niveau: 'info',
      texte: `Saturation $|u| \\le ${latexNombre(sim.saturation.umax)}$ : tant qu'elle n'est pas atteinte, le bouclé est inchangé près de $x_e$, mais le bassin d'attraction peut se réduire fortement.`,
    });
  }
  if (sim.sigma > 0) {
    liste.push({
      niveau: 'info',
      texte: `Bruit de mesure ($\\sigma = ${latexNombre(sim.sigma)}$) : le contrôleur ne voit que la mesure bruitée, l'état reste au voisinage de $x_e$ sans y converger exactement.`,
    });
  }

  if (sim.modele.indications && !sim.loiActive) liste.push(...sim.modele.indications(sim.p, sim.K));
  if (sim.diverge) {
    liste.push({ niveau: 'alerte', texte: 'La simulation a divergé numériquement : réinitialisez la condition initiale.' });
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
