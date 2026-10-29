// Faux canevas et faux contexte 2D espion : le contexte enregistre chaque appel
// (nom, arguments) et, pour le texte, l'alignement en vigueur à ce moment-là.
// `fauxCanevas` s'appelle après `installeDom()`.

export function fauxContexte({ largeurTexte = (t) => t.length * 6 } = {}) {
  const appels = [];
  const etat = { textAlign: 'start', font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1 };
  return new Proxy(
    {},
    {
      get(_, nom) {
        if (nom === 'appels') return appels;
        if (nom === 'measureText') return (t) => ({ width: largeurTexte(t) });
        if (nom === 'createRadialGradient') return () => ({ addColorStop() {} });
        if (nom in etat) return etat[nom];
        return (...args) => appels.push({ nom, args, textAlign: etat.textAlign });
      },
      set(_, nom, valeur) {
        etat[nom] = valeur;
        return true;
      },
    },
  );
}

export function fauxCanevas({ largeur = 400, hauteur = 200, gauche = 0, haut = 0, contexte = fauxContexte() } = {}) {
  const canevas = document.createElement('canvas');
  Object.assign(canevas, { width: 0, height: 0, contexte });
  canevas.getContext = () => contexte;
  canevas.getBoundingClientRect = () => ({ left: gauche, top: haut, width: largeur, height: hauteur });
  canevas.setPointerCapture = () => {};
  return canevas;
}
