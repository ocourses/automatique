// Faux KaTeX : écrit la source LaTeX dans l'élément. Avec `mathml`, reproduit la
// structure de KaTeX : le texte MathML suivi de l'annotation qui répète la source.
// À appeler après `installeDom()`.

export function installeKatex({ mathml = false } = {}) {
  globalThis.window.katex = {
    render(source, element) {
      if (!mathml) {
        element.textContent = source;
        return;
      }
      const enveloppe = document.createElement('span');
      enveloppe.className = 'katex-mathml';
      const lisible = document.createElement('span');
      lisible.textContent = source.replace(/_/g, '');
      const annotation = document.createElement('annotation');
      annotation.textContent = source;
      enveloppe.append(lisible, annotation);
      element.append(enveloppe);
    },
  };
}
