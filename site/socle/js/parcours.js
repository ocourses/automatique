// Parcours d'un cours : l'ordre de lecture des pages, les pages voisines et le
// retour à l'accueil au niveau de la carte de la page quittée.
//
// L'ordre est celui du catalogue : thème par thème, ses illustrations disponibles,
// puis les pages que le cours ajoute à ce thème par `pagesDuTheme(theme)` (des
// pages à lui, comme les exemples d'un simulateur). Une page est
// { genre, id, titre, lien } ; le genre distingue les identifiants (`illustration`).

import { disponibles } from './catalogue.js';
import { typographie } from './ui/format.js';

// Identifiant de la carte d'une page sur l'accueil.
export const ancre = (genre, id) => `${genre}-${id}`;

// Les pages du cours, dans l'ordre de lecture.
export function parcours({ themes, pagesDuTheme = () => [] }) {
  return themes.flatMap((theme) => [
    ...disponibles(theme).map((i) => ({ genre: 'illustration', id: i.id, titre: i.titre, lien: `illustration.html?id=${i.id}` })),
    ...pagesDuTheme(theme),
  ]);
}

// Page voisine de (genre, id) dans `pages` (`decalage` = −1 ou +1), ou null
// avant la première, après la dernière et pour une page hors du parcours.
function voisine(pages, genre, id, decalage) {
  const k = pages.findIndex((p) => p.genre === genre && p.id === id);
  return k >= 0 ? (pages[k + decalage] ?? null) : null;
}

export const suivante = (pages, genre, id) => voisine(pages, genre, id, 1);
export const precedente = (pages, genre, id) => voisine(pages, genre, id, -1);

// Branche l'en-tête de la page : « ← Accueil » revient à la carte de la page, et
// « ← Page précédente » et « Page suivante → » (absentes aux deux bouts du
// parcours) passent aux pages voisines.
export function installeNavigation(pages, genre, id) {
  const retour = document.querySelector('.retour');
  if (retour) retour.href = `index.html#${ancre(genre, id)}`;
  const actions = document.querySelector('.entete-actions');
  if (!actions) return;
  const lien = (page, texte) => {
    if (!page) return;
    const a = document.createElement('a');
    a.className = 'bouton-lien';
    a.href = page.lien;
    a.textContent = texte;
    a.title = typographie(page.titre);
    actions.appendChild(a);
  };
  lien(precedente(pages, genre, id), '← Page précédente');
  lien(suivante(pages, genre, id), 'Page suivante →');
}
