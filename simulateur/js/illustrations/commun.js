// Briques communes aux illustrations : cartes, canevas, légendes, tableaux et
// intégration numérique d'une trajectoire.

import { rk4 } from '../core/ode.js';
import { typographie } from '../ui/format.js';
import { rendTexte } from '../ui/katex.js';

// Trajectoire de ẋ = F(t, x) sur [0, T] par RK4 de pas h : { t, x } où x[k]
// est l'état à t[k]. L'intégration s'arrête si l'état dépasse `borne`.
export function simule(F, x0, T, h = 0.01, borne = 1e6) {
  const t = [0];
  const x = [x0.slice()];
  let xk = x0.slice();
  const n = Math.round(T / h);
  for (let k = 1; k <= n; k++) {
    xk = rk4(F, (k - 1) * h, xk, h);
    if (!xk.every((v) => Number.isFinite(v) && Math.abs(v) < borne)) break;
    t.push(k * h);
    x.push(xk);
  }
  return { t, x };
}

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

// Canevas aux proportions données (largeur / hauteur), redessiné à chaque
// changement de taille par `dessine`.
export function toile(parent, proportions = '4 / 3', dessine = null) {
  const c = document.createElement('canvas');
  c.className = 'toile';
  c.style.setProperty('--proportions', proportions);
  parent.appendChild(c);
  if (dessine) new ResizeObserver(() => dessine()).observe(c);
  return c;
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

// Rend un objet saisissable à la souris sur un repère : `prend(x, y)` dit si
// le point visé saisit l'objet, `deplace(x, y)` est appelé pendant le geste.
export function glisse(canvas, repere, { prend = () => true, deplace, relache = () => {} }) {
  let actif = false;
  canvas.addEventListener('pointerdown', (ev) => {
    const [x, y] = repere.versMonde(ev);
    if (!prend(x, y)) return;
    actif = true;
    canvas.setPointerCapture(ev.pointerId);
    deplace(x, y);
    ev.preventDefault();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (actif) deplace(...repere.versMonde(ev));
  });
  const fin = () => {
    if (!actif) return;
    actif = false;
    relache();
  };
  canvas.addEventListener('pointerup', fin);
  canvas.addEventListener('pointercancel', fin);
}
