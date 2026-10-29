// Moteur du glossaire : souligne les termes du cours dans un texte, avec la
// définition du poly en infobulle. Les données sont la clé `glossaire` de
// site.config.js : { <terme>: { formes, definition, source } }, les formes telles
// qu'elles apparaissent dans les textes (casse, accord, apostrophe typographique).

import { souligne } from './ui/infobulle.js';
import { rendTexte } from './ui/katex.js';

// Contenu d'une infobulle : le terme, sa définition, sa source.
function bulle(cle, { definition, source }) {
  return () => {
    const div = document.createElement('div');
    const titre = document.createElement('p');
    titre.className = 'titre-bulle';
    titre.textContent = cle[0].toUpperCase() + cle.slice(1);
    const corps = document.createElement('p');
    corps.className = 'corps-bulle';
    rendTexte(corps, definition);
    const origine = document.createElement('p');
    origine.className = 'source-bulle';
    origine.textContent = source;
    div.append(titre, corps, origine);
    return div;
  };
}

// Souligne dans `racine` la première occurrence de chacun des termes `cles` de
// `glossaire`. Les termes les plus longs passent d'abord, pour qu'un terme
// composé (« tribu engendrée ») ne soit pas pris pour l'un de ses mots (« tribu »).
export function appliqueGlossaire(glossaire, racine, cles) {
  for (const cle of cles) if (!glossaire[cle]) throw new Error(`Terme absent du glossaire : ${cle}`);
  const longueur = (cle) => Math.max(...glossaire[cle].formes.map((f) => f.length));
  for (const cle of [...cles].sort((a, b) => longueur(b) - longueur(a))) souligne(racine, glossaire[cle].formes, bulle(cle, glossaire[cle]));
}
