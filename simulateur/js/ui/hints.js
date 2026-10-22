// Indications courtes, qui renvoient aux résultats du poly et des TD.

import { kalman, rang } from '../core/linalg.js';
import { latexComplexe, latexNombre } from './format.js';
import { rendTexte } from './katex.js';

const TOL = 1e-9;

// Nom de la matrice du bouclé linéarisé selon le mode du contrôleur.
export function nomBoucle(sim) {
  return sim.loiActive ? 'J_g(x_e)' : 'A + BK';
}

function indicationsObservateur(sim) {
  const liste = [];
  const n = sim.A.length;
  const alpha = Math.max(...sim.vpObs.map((z) => z.re));
  const spectre = sim.vpObs.map((z) => latexComplexe(z)).join(',\\ ');
  const h = sim.obs.h;

  liste.push(
    sim.observable
      ? {
          niveau: 'ok',
          texte: `Le couple $(A, C)$ est observable (Kalman pour $(A^\\top, C^\\top)$) : on peut placer librement les valeurs propres de $A - LC$.`,
        }
      : {
          niveau: 'alerte',
          texte: `Le couple $(A, C)$ n'est pas observable (Kalman pour $(A^\\top, C^\\top)$) : certaines valeurs propres de $A - LC$ ne dépendent pas de $L$.`,
        },
  );

  if (alpha < -TOL) {
    liste.push({
      niveau: 'ok',
      texte: `$A - LC$ est Hurwitz ($\\lambda = ${spectre}$) : l'erreur $e = x - \\hat x$ vérifie $\\dot e = (A - LC)\\,e$ et tend vers $0$ quelles que soient les conditions initiales.`,
    });
  } else {
    liste.push({
      niveau: 'alerte',
      texte: `$A - LC$ n'est pas Hurwitz ($\\lambda = ${spectre}$) : l'erreur d'estimation ne tend pas vers $0$ en général (le jumeau numérique dérive, cas $L = 0$ du TD4).`,
    });
  }

  // Euler explicite de pas h : e_{k+1} = (I + h(A − LC)) e_k, stable si |1 + hλ| < 1.
  const rho = sim.rhoEuler;
  const hMax = sim.hMax;
  if (hMax > 0 && rho < 1) {
    liste.push({
      niveau: 'ok',
      texte: `Euler explicite, $h = ${latexNombre(h)}$ s : $\\rho = \\max|1 + h\\lambda| = ${latexNombre(rho)} < 1$, l'erreur discrète converge. Pas maximal $h_{\\max} = ${latexNombre(hMax)}$ s.`,
    });
  } else if (hMax > 0) {
    liste.push({
      niveau: 'alerte',
      texte: `Euler explicite, $h = ${latexNombre(h)}$ s : $\\rho = \\max|1 + h\\lambda| = ${latexNombre(rho)} \\ge 1$, l'observateur discret ne converge pas alors que l'observateur continu converge. Il faut $h < h_{\\max} = ${latexNombre(hMax)}$ s : plus l'observateur est rapide, plus le pas doit être petit.`,
    });
  } else {
    liste.push({
      niveau: 'alerte',
      texte: `Euler explicite : aucune valeur de $h$ ne convient, puisque $A - LC$ a une valeur propre de partie réelle positive ou nulle.`,
    });
  }

  if (sim.retourEstime && sim.mode === 'gains') {
    liste.push({
      niveau: 'info',
      texte: `Retour d'état sur $\\hat x$ : le spectre du système complet $(x, e)$ est celui de $A + BK$ réuni à celui de $A - LC$ (principe de séparation), on règle les deux séparément. Choisissez $L$ plus rapide que $K$, sans dépasser $h_{\\max}$.`,
    });
  }
  if (sim.Te > 0) {
    liste.push({
      niveau: 'info',
      texte: `Commande échantillonnée : $u$ est recalculée tous les $T_e = ${latexNombre(sim.Te)}$ s et tenue constante entre deux mises à jour.`,
    });
  }
  return liste;
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

  // Observateur de Luenberger : observabilité, convergence de l'erreur, critère d'Euler (TD4).
  if (sim.obs) liste.push(...indicationsObservateur(sim));

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

  if (!sim.obs && sim.Te > 0) {
    liste.push({
      niveau: 'info',
      texte: `Commande échantillonnée : $u$ est recalculée tous les $T_e = ${latexNombre(sim.Te)}$ s et tenue constante entre deux mises à jour. Un échantillonnage trop lent dégrade la stabilité du bouclé.`,
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
