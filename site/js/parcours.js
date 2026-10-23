// Parcours du cours : l'ordre de lecture des pages (les illustrations par
// thème, puis les exemples du simulateur), le lien « page suivante » et le
// retour à l'accueil au niveau de la carte de la page quittée.

import { catalogue as exemples } from './exemples/catalogue.js';
import { themes } from './illustrations/catalogue.js';
import { typographie } from './ui/format.js';

// Les pages dans l'ordre de l'accueil : thème par thème, et le simulateur à la
// place du thème qui le contient (celui qui porte `simulateur`).
const illustrations = (theme) =>
  theme.illustrations
    .filter((i) => i.disponible)
    .map((i) => ({ genre: 'illustration', id: i.id, titre: i.titre, lien: `illustration.html?id=${i.id}` }));
const simulateur = exemples
  .filter((e) => e.disponible)
  .map((e) => ({ genre: 'exemple', id: e.id, titre: e.sous_titre ? `${e.titre} (${e.sous_titre})` : e.titre, lien: `exemple.html?id=${e.id}` }));

export const parcours = themes.flatMap((theme) => [...illustrations(theme), ...(theme.simulateur ? simulateur : [])]);

// Identifiant de la carte d'une page sur l'accueil.
export const ancre = (genre, id) => `${genre}-${id}`;

// Page voisine de celle-ci dans le parcours (`decalage` = −1 ou +1), ou null
// avant la première et après la dernière.
function voisine(genre, id, decalage) {
  const k = parcours.findIndex((p) => p.genre === genre && p.id === id);
  return k >= 0 ? (parcours[k + decalage] ?? null) : null;
}

export const suivante = (genre, id) => voisine(genre, id, 1);
export const precedente = (genre, id) => voisine(genre, id, -1);

// Branche l'en-tête de la page : « ← Accueil » revient à la carte de la page, et
// « ← Page précédente » et « Page suivante → » (absentes aux deux bouts du
// parcours) passent aux pages voisines.
export function installeNavigation(genre, id) {
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
  lien(precedente(genre, id), '← Page précédente');
  lien(suivante(genre, id), 'Page suivante →');
}
