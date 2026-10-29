// KaTeX : `chargeKatex` charge la feuille et le script depuis le CDN, `rend`
// rend une formule en mode display, `rendTexte` un texte contenant des formules
// entre $…$.

import { typographie } from './format.js';

const options = { throwOnError: false };

// Version et empreintes SRI : le seul endroit où elles sont écrites. Pour changer
// de version, recalculer chaque empreinte sur le fichier servi :
//   curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
const CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist';
export const KATEX = Object.freeze({
  feuille: Object.freeze({ href: `${CDN}/katex.min.css`, integrity: 'sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+' }),
  script: Object.freeze({ src: `${CDN}/katex.min.js`, integrity: 'sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg' }),
});

let chargement = null;

const charge = (element) =>
  new Promise((resolve, reject) => {
    element.addEventListener('load', resolve);
    element.addEventListener('error', () => reject(new Error(`KaTeX : chargement refusé (${element.href ?? element.src})`)));
  });

// Charge KaTeX une seule fois et rend `window.katex`, feuille et script chargés.
// Ne fait rien si KaTeX est déjà là. La feuille passe en tête de <head>, avant
// celles du site, qui peuvent donc la redéfinir.
export function chargeKatex() {
  if (window.katex) return Promise.resolve(window.katex);
  if (chargement) return chargement;
  const feuille = Object.assign(document.createElement('link'), { rel: 'stylesheet', crossOrigin: 'anonymous', ...KATEX.feuille });
  const script = Object.assign(document.createElement('script'), { crossOrigin: 'anonymous', ...KATEX.script });
  chargement = Promise.all([charge(feuille), charge(script)]).then(() => window.katex);
  document.head.prepend(feuille);
  document.head.append(script);
  return chargement;
}

export function rend(element, latex, display = true) {
  window.katex.render(latex, element, { ...options, displayMode: display });
}

export function rendTexte(element, texte) {
  element.textContent = '';
  let formule = null;
  texte.split(/(\$[^$]+\$)/).forEach((morceau) => {
    if (morceau.startsWith('$') && morceau.endsWith('$') && morceau.length > 1) {
      formule = document.createElement('span');
      window.katex.render(morceau.slice(1, -1), formule, { ...options, displayMode: false });
      element.appendChild(formule);
    } else if (morceau) {
      const t = typographie(morceau);
      // La ponctuation qui suit une formule reste collée à elle : on ne coupe
      // pas la ligne avant « , », « . » ou « : » (précédé d'une espace insécable).
      const colle = formule && t.match(/^(\u00a0[:;!?»]|[,.)])/);
      if (colle) {
        const bloc = document.createElement('span');
        bloc.className = 'insecable';
        formule.replaceWith(bloc);
        bloc.append(formule, colle[0]);
        element.appendChild(document.createTextNode(t.slice(colle[0].length)));
      } else {
        element.appendChild(document.createTextNode(t));
      }
      formule = null;
    }
  });
}

// Rend les formules $…$ des textes statiques de la page.
export function rendStatique(racine) {
  const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  const noeuds = [];
  while (marcheur.nextNode()) if (/\$[^$]+\$/.test(marcheur.currentNode.nodeValue)) noeuds.push(marcheur.currentNode);
  for (const noeud of noeuds) {
    const span = document.createElement('span');
    rendTexte(span, noeud.nodeValue);
    noeud.replaceWith(...span.childNodes);
  }
}
