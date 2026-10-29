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
    perturbation: v('--perturbation'),
    observateur: v('--observateur'),
    observateurZone: v('--observateur-zone'),
    zone: v('--zone-stable'),
    zone2: v('--zone-2'),
    zone3: v('--zone-3'),
    alerte: v('--alerte'),
    equilibre: v('--equilibre'),
    series: [1, 2, 3, 4].map((k) => v(`--serie-${k}`)),
  };
}

export function surChangementTheme(rappel) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rappel);
}
