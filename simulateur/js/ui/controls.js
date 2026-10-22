// Champs de réglage : curseur couplé à une saisie au clavier.

import { rend } from './katex.js';

function nombre(saisie) {
  return Number(String(saisie).replace(',', '.').replace('−', '-'));
}

// Ajoute une ligne « étiquette, curseur, saisie, unité » à `parent` et appelle
// `change(valeur)` à chaque modification valide.
export function champ(parent, { latex, min, max, pas, valeur, unite = '' }, change) {
  const ligne = document.createElement('div');
  ligne.className = 'champ';
  const etiquette = document.createElement('label');
  rend(etiquette, latex, false);
  const curseur = document.createElement('input');
  Object.assign(curseur, { type: 'range', min, max, step: pas, value: valeur });
  const saisie = document.createElement('input');
  Object.assign(saisie, { type: 'text', inputMode: 'decimal', value: String(Number(Number(valeur).toPrecision(6))).replace('.', ',') });
  saisie.setAttribute('aria-label', etiquette.textContent);
  curseur.setAttribute('aria-label', etiquette.textContent);
  const u = document.createElement('span');
  u.className = 'unite';
  u.textContent = unite;
  ligne.append(etiquette, curseur, saisie, u);
  parent.appendChild(ligne);

  curseur.addEventListener('input', () => {
    saisie.value = curseur.value.replace('.', ',');
    change(Number(curseur.value));
  });
  saisie.addEventListener('change', () => {
    const v = nombre(saisie.value);
    if (!Number.isFinite(v)) {
      saisie.value = curseur.value.replace('.', ',');
      return;
    }
    // La saisie au clavier peut sortir des bornes du curseur.
    curseur.value = v;
    change(v);
  });
  return {
    fixe(v) {
      curseur.value = v;
      saisie.value = String(Number(v.toPrecision(4))).replace('.', ',');
    },
  };
}

// Saisie numérique seule ; `change(valeur)` est appelé à chaque saisie valide.
export function saisieNombre(parent, latex, valeur, unite = '', change = null) {
  const ligne = document.createElement('div');
  ligne.className = 'champ champ-court';
  const etiquette = document.createElement('label');
  rend(etiquette, latex, false);
  const saisie = document.createElement('input');
  Object.assign(saisie, { type: 'text', inputMode: 'decimal' });
  saisie.setAttribute('aria-label', etiquette.textContent);
  const u = document.createElement('span');
  u.className = 'unite';
  u.textContent = unite;
  ligne.append(etiquette, saisie, u);
  parent.appendChild(ligne);
  const api = {
    ligne,
    lit: () => nombre(saisie.value),
    fixe: (v) => {
      saisie.value = String(Number(v.toPrecision(4))).replace('.', ',');
    },
  };
  api.fixe(valeur);
  if (change) {
    saisie.addEventListener('change', () => {
      const v = api.lit();
      if (Number.isFinite(v)) change(v);
    });
  }
  return api;
}
