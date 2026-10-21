// Rendu KaTeX : `rend` pour une formule en mode display, `rendTexte` pour un
// texte contenant des formules entre $…$.

const options = { throwOnError: false };

export function rend(element, latex, display = true) {
  window.katex.render(latex, element, { ...options, displayMode: display });
}

export function rendTexte(element, texte) {
  element.textContent = '';
  texte.split(/(\$[^$]+\$)/).forEach((morceau) => {
    if (morceau.startsWith('$') && morceau.endsWith('$') && morceau.length > 1) {
      const span = document.createElement('span');
      window.katex.render(morceau.slice(1, -1), span, { ...options, displayMode: false });
      element.appendChild(span);
    } else if (morceau) {
      element.appendChild(document.createTextNode(morceau));
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
