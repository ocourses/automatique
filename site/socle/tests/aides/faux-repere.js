// Faux repère espion, pour les briques qui dessinent par un `Repere`
// (js/ui/repere.js) : chaque appel de dessin est relevé, avec ses nombres arrondis
// à 10⁻³, sa couleur et ses tirets, pour figer ce qu'une brique dessine sans
// dépendre du canevas. Les lignes brisées sont résumées (nombre de points, premier
// et dernier). `ctx` est un faux contexte 2D espion (faux-canevas.js), pour le
// texte dessiné directement.

import { fauxContexte } from './faux-canevas.js';

const arrondi = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 || 0 : Array.isArray(v) ? v.map(arrondi) : v);
const DESSINS = ['champ', 'droite', 'point', 'pointe', 'texte', 'region', 'axes', 'isoligne'];

export function fauxRepere(cadre = { x: [-2, 2], y: [-2, 2] }, { largeur = 400, hauteur = 400 } = {}) {
  const appels = [];
  const sx = largeur / (cadre.x[1] - cadre.x[0]);
  const sy = hauteur / (cadre.y[1] - cadre.y[0]);
  const rep = {
    cadre,
    sx,
    sy,
    appels,
    ctx: fauxContexte(),
    prepare: () => true,
    X: (x) => (x - cadre.x[0]) * sx,
    Y: (y) => (cadre.y[1] - y) * sy,
    contient: (x, y) => x >= cadre.x[0] && x <= cadre.x[1] && y >= cadre.y[0] && y <= cadre.y[1],
    trace: (pts, options = {}) => appels.push(['trace', pts.length, arrondi(pts[0]), arrondi(pts.at(-1)), arrondi(options.alpha ?? 1)]),
  };
  for (const nom of DESSINS) {
    rep[nom] = (...args) => {
      const options = args.find((a) => a && typeof a === 'object' && !Array.isArray(a)) ?? {};
      const valeurs = args.filter((a) => typeof a === 'number' || typeof a === 'string').map(arrondi);
      appels.push([nom, ...valeurs, ...(options.couleur ? [options.couleur] : []), ...(options.tirets?.length ? ['tirets'] : [])]);
    };
  }
  return rep;
}

// Nombre d'appels de chaque sorte : { trace: 12, point: 1, … }.
export const decompte = (appels) => appels.reduce((n, [nom]) => ({ ...n, [nom]: (n[nom] ?? 0) + 1 }), {});
