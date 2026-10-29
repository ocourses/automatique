// Ce qu'on met dans une carte : choix, légende, paragraphe, verdict et tableau.

import { typographie } from '../ui/format.js';
import { rend, rendTexte } from '../ui/katex.js';

// Choix exclusif par boutons radio, le même partout. `options` :
// [{ valeur, texte | latex }] ; `change(valeur)` à chaque choix de l'utilisateur ;
// `fixe(valeur)` coche l'option sans appeler `change`.
export function choixRadios(parent, { nom, options, change }) {
  const element = document.createElement('div');
  element.className = 'choix';
  element.setAttribute('role', 'radiogroup');
  const radios = options.map(({ valeur, texte, latex }) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    Object.assign(input, { type: 'radio', name: nom, value: valeur });
    input.addEventListener('change', () => change(valeur));
    const nomOption = document.createElement('span');
    if (latex) rend(nomOption, latex, false);
    else nomOption.textContent = typographie(texte);
    label.append(input, ' ', nomOption);
    element.appendChild(label);
    return input;
  });
  parent.appendChild(element);
  return { element, fixe: (valeur) => radios.forEach((r) => (r.checked = r.value === valeur)) };
}

// Légende de courbes : [{ texte, couleur, tirets }].
export function legende(parent, items) {
  const p = document.createElement('p');
  p.className = 'legende-courbes';
  for (const { texte, couleur, tirets } of items) {
    const s = document.createElement('span');
    s.style.color = couleur;
    const trait = document.createElement('span');
    trait.className = `trait${tirets ? ' tirets' : ''}`;
    const t = document.createElement('span');
    t.style.color = 'var(--texte)';
    rendTexte(t, texte);
    s.append(trait, t);
    p.appendChild(s);
  }
  parent.appendChild(p);
  return p;
}

// Paragraphe de texte avec formules.
export function paragraphe(parent, texte, classe = 'note') {
  const p = document.createElement('p');
  if (classe) p.className = classe;
  rendTexte(p, texte);
  parent.appendChild(p);
  return p;
}

// Verdict : paragraphe de classe `verdict` dans une zone qui lui réserve deux
// lignes, pour que son liseret suive la hauteur du texte et que la figure ne
// change pas de taille. Renvoie le paragraphe.
export function verdict(parent, texte) {
  const zone = document.createElement('div');
  zone.className = 'zone-verdict';
  parent.appendChild(zone);
  return paragraphe(zone, texte, 'verdict');
}

// Tableau de valeurs : entetes (textes) et lignes (tableaux de textes).
export function tableau(parent, entetes, lignes) {
  const table = document.createElement('table');
  table.className = 'valeurs';
  const tr = document.createElement('tr');
  for (const e of entetes) {
    const th = document.createElement('th');
    th.textContent = typographie(e);
    tr.appendChild(th);
  }
  const thead = document.createElement('thead');
  thead.appendChild(tr);
  const tbody = document.createElement('tbody');
  for (const ligne of lignes) {
    const r = document.createElement('tr');
    for (const v of ligne) {
      const td = document.createElement('td');
      td.textContent = v;
      r.appendChild(td);
    }
    tbody.appendChild(r);
  }
  table.append(thead, tbody);
  parent.appendChild(table);
  return table;
}
