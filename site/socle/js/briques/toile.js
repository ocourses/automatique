// Canevas des illustrations.

// Canevas aux proportions données (largeur / hauteur), redessiné à chaque
// changement de taille par `dessine`.
export function toile(parent, proportions = '4 / 3', dessine = null) {
  const c = document.createElement('canvas');
  c.className = 'toile';
  c.style.setProperty('--proportions', proportions);
  // Un canevas carré (repère orthonormé) garde ses proportions quand la page
  // le fait entrer dans la hauteur de la fenêtre ; les autres s'étirent.
  const [l, h] = String(proportions).split('/').map(Number);
  if (l / (h || 1) <= 1.1) c.classList.add('carree');
  parent.appendChild(c);
  // Redessin à l'image suivante : dessiner dans le rappel de ResizeObserver
  // peut changer la mise en page (texte mis à jour), et le navigateur abandonne
  // alors les notifications suivantes, laissant un canevas étiré.
  if (dessine) {
    let attente = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(attente);
      attente = requestAnimationFrame(() => dessine());
    }).observe(c);
  }
  return c;
}
