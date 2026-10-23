// Tirage des chocs : on redonne le plus souvent un choc voisin du précédent
// (même sens, intensité proche), et de temps en temps un choc complètement
// nouveau (sens et intensité tirés uniformément).
//
// Avec PROBA_NOUVEAU = 1/7, un choc nouveau arrive en moyenne tous les 7 clics :
// sur 5 à 10 clics, la probabilité d'en avoir au moins un vaut de 1/2 à 4/5,
// environ 2/3 sur 7 clics.

export const PROBA_NOUVEAU = 1 / 7;
export const INTENSITE_MAX = 2; // en multiple du choc de l'exemple
export const DISPERSION = 0.15; // écart-type relatif d'un choc voisin, rapporté à INTENSITE_MAX

function gaussienne(aleatoire) {
  let u = 0;
  while (u === 0) u = aleatoire();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * aleatoire());
}

export class GenerateurChocs {
  constructor({ probaNouveau = PROBA_NOUVEAU, max = INTENSITE_MAX, dispersion = DISPERSION, aleatoire = Math.random } = {}) {
    Object.assign(this, { probaNouveau, max, dispersion, aleatoire });
    this.precedent = null; // { sens, intensite }
  }

  // Choc suivant : { sens (±1), intensite (dans [0, max]), nouveau }.
  // Le facteur à appliquer au choc de l'exemple est sens × intensité.
  suivant() {
    const a = this.aleatoire;
    const nouveau = this.precedent === null || a() < this.probaNouveau;
    let sens;
    let intensite;
    if (nouveau) {
      sens = a() < 0.5 ? -1 : 1;
      intensite = this.max * a();
    } else {
      sens = this.precedent.sens;
      const bruit = this.dispersion * this.max * gaussienne(a);
      intensite = Math.min(this.max, Math.max(0, this.precedent.intensite + bruit));
    }
    this.precedent = { sens, intensite };
    return { sens, intensite, nouveau, facteur: sens * intensite };
  }
}
