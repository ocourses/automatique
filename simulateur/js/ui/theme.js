// Couleurs lues dans les variables CSS, pour suivre les modes clair et sombre.

export function couleurs() {
  const s = getComputedStyle(document.documentElement);
  const v = (nom) => s.getPropertyValue(nom).trim();
  return {
    fond: v('--fond-carte'),
    trait: v('--texte'),
    discret: v('--discret'),
    grille: v('--grille'),
    accent: v('--accent'),
    zone: v('--zone-stable'),
  };
}

export function surChangementTheme(rappel) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rappel);
}
