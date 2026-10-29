// Une page du socle sous Node : le corps du modèle (modeles/<page>), dans un faux
// DOM neuf, avec ce que le navigateur fournit autour (adresse, historique,
// stockage local, `matchMedia`, faux KaTeX). Rend des espions : les adresses
// écrites par `history.replaceState`, le stockage, les écouteurs de `window` et
// le document (`document.defile` : l'élément vers lequel la page a défilé).
//
// Usage : const page = installePage('illustration.html', '?id=a');

import { readFileSync } from 'node:fs';

import { chargeCorps, installeDom } from './faux-dom.js';
import { installeKatex } from './faux-katex.js';
import { fauxStockage } from './faux-stockage.js';

export const modele = (page) => readFileSync(new URL(`../../modeles/${page}`, import.meta.url), 'utf8');

export function installePage(page, adresse = '') {
  const document = installeDom();
  chargeCorps(modele(page));
  installeKatex();
  const espions = { adresses: [], ecouteurs: {}, stockage: fauxStockage(), document };
  const location = new URL(`https://cours.test/${page}${adresse}`);
  Object.assign(globalThis.window, {
    matchMedia: (requete) => ({ matches: false, media: requete, addEventListener() {} }),
    addEventListener: (type, rappel) => (espions.ecouteurs[type] ??= []).push(rappel),
  });
  Object.assign(globalThis, {
    location,
    localStorage: espions.stockage,
    history: {
      replaceState(_etat, _titre, url) {
        espions.adresses.push(url);
        location.search = url;
      },
    },
  });
  return espions;
}
