// Cartes des pages d'illustration : carte, barre d'outils, bouton « i » et bloc repliable.

import { attacheInfobulle } from '../ui/infobulle.js';
import { rendTexte } from '../ui/katex.js';

// Section .carte avec un titre h2 (facultatif) ; renvoie la section.
export function carte(parent, titre = null) {
  const s = document.createElement('section');
  s.className = 'carte';
  if (titre) {
    const h = document.createElement('h2');
    rendTexte(h, titre);
    s.appendChild(h);
  }
  parent.appendChild(s);
  return s;
}

// Barre d'outils au-dessus des cartes : les choix qui modifient toute la page
// (le système, l'étape, la forme) y sont, hors des boîtes de texte.
export function barreOutils(parent) {
  const barre = document.createElement('div');
  barre.className = 'barre-outils';
  parent.appendChild(barre);
  return barre;
}

// Bouton « i » en haut à droite d'une carte : il ouvre la légende de la figure
// dans une bulle. `elements` : [forme, variable CSS de la couleur, texte], la
// forme étant 'ligne', 'tirets', 'point', 'cercle' (point creux), 'fleche' ou
// 'zone' (aplat) ; le texte peut contenir des formules $…$.
export function boutonInfo(carteEl, elements, { titre = 'Ce que montre la figure', etiquette = 'Légende de la figure' } = {}) {
  return boutonAide(carteEl, { titre, etiquette }, (div) => {
    const liste = document.createElement('ul');
    liste.className = 'legende-bulle';
    for (const [forme, couleur, texte] of elements) {
      const li = document.createElement('li');
      const pastille = document.createElement('span');
      pastille.className = `pastille ${forme}`;
      pastille.style.setProperty('--couleur-pastille', `var(${couleur})`);
      if (forme === 'fleche') pastille.textContent = '→';
      const contenu = document.createElement('span');
      rendTexte(contenu, texte);
      li.append(pastille, contenu);
      liste.appendChild(li);
    }
    div.appendChild(liste);
  });
}

// Bouton « i » d'une carte dont la bulle contient autre chose qu'une légende :
// `remplis(div)` construit son contenu, sous le titre, à chaque ouverture.
export function boutonAide(carteEl, { titre, etiquette }, remplis) {
  carteEl.classList.add('carte-avec-info');
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'bouton-info';
  bouton.setAttribute('aria-label', etiquette);
  bouton.textContent = 'i';
  carteEl.appendChild(bouton);
  attacheInfobulle(bouton, () => {
    const div = document.createElement('div');
    const t = document.createElement('p');
    t.className = 'titre-bulle';
    t.textContent = titre;
    div.appendChild(t);
    remplis(div);
    return div;
  });
  return bouton;
}

let suivant = 0;

// Bloc repliable : un en-tête cliquable et un contenu, ouvert ou non selon `ouvert` ; `change(ouvert)` est appelé à chaque
// bascule (pour la garder dans les préférences). Renvoie { carte, contenu }.
export function repliable(parent, titre, { ouvert = false, change = () => {} } = {}) {
  const s = document.createElement('section');
  s.className = 'carte repliable';
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'entete-repliable';
  const libelle = document.createElement('span');
  rendTexte(libelle, titre);
  const etat = document.createElement('span');
  etat.className = 'etat-repliable';
  bouton.append(libelle, etat);
  const contenu = document.createElement('div');
  contenu.className = 'contenu-repliable';
  contenu.id = `repliable-${++suivant}`;
  bouton.setAttribute('aria-controls', contenu.id);
  s.append(bouton, contenu);
  parent.appendChild(s);
  const applique = (o) => {
    s.classList.toggle('ouvert', o);
    contenu.hidden = !o;
    bouton.setAttribute('aria-expanded', String(o));
    etat.textContent = o ? 'Replier' : 'Déplier';
  };
  bouton.addEventListener('click', () => {
    const o = contenu.hidden;
    applique(o);
    change(o);
  });
  applique(ouvert);
  return { carte: s, contenu, applique };
}
