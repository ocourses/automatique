// Champs de réglage : pas ▲ ▼ ↑ ↓ d'une boîte de saisie (ajoutePas), bornes qui
// changent après coup (`champ`, `bornes`, `fixeMax`), nom accessible d'une
// étiquette KaTeX. Un faux DOM remplace le navigateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { el, evenement, installeDom } from './aides/faux-dom.js';
import { installeKatex } from './aides/faux-katex.js';

installeDom();
installeKatex();
const { ajoutePas, champ } = await import('../js/ui/controls.js');

const appuie = (saisie, key, details = {}) => saisie.dispatchEvent(evenement('keydown', { key, ...details }));
const change = (saisie) => saisie.dispatchEvent(evenement('change', { bubbles: false }));

// Une saisie dans un parent : ajoutePas l'enveloppe, donc la remplace chez son parent.
const saisieA = (valeur) => {
  const saisie = el('input');
  saisie.value = valeur;
  el('div', {}, saisie);
  return saisie;
};

test('ajoutePas : un pas par flèche, borné par min et max', () => {
  const saisie = saisieA('0,9');
  ajoutePas(saisie, { pas: 0.1, min: 0, max: 1 });
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '1');
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '1');
  appuie(saisie, 'PageDown');
  assert.equal(saisie.value, '0');
});

test('ajoutePas : chaque pas émet « change »', () => {
  const saisie = saisieA('0');
  let changements = 0;
  saisie.addEventListener('change', () => changements++);
  ajoutePas(saisie, { pas: 1, min: 0, max: 5 });
  appuie(saisie, 'ArrowUp');
  appuie(saisie, 'ArrowUp', { shiftKey: true });
  assert.equal(changements, 2);
  assert.equal(saisie.value, '5');
});

test('ajoutePas : les bornes d’un objet `limites` sont relues à chaque pas', () => {
  const saisie = saisieA('5');
  const limites = { min: 0, max: 5 };
  ajoutePas(saisie, { pas: 1, limites });
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '5');
  limites.max = 8;
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '6');
});

test('ajoutePas : `max` modifié dans l’objet d’options est relu', () => {
  const saisie = saisieA('3');
  const options = { pas: 1, min: 0, max: 3 };
  ajoutePas(saisie, options);
  options.max = 4;
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '4');
});

test('ajoutePas : `lis` lit la valeur écrite (ici une fraction)', () => {
  const saisie = saisieA('1/2');
  const lis = (t) => (t.includes('/') ? Number(t.split('/')[0]) / Number(t.split('/')[1]) : Number(t));
  ajoutePas(saisie, { pas: 0.25, lis });
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '0,75');
});

// Construit un champ et renvoie ses éléments : curseur, saisie, et l'API.
function fabrique(options = {}) {
  const parent = el('div');
  const appels = [];
  const api = champ(parent, { latex: 't_0', min: 0, max: 1, pas: 0.1, valeur: 0.5, ...options }, (v) => appels.push(v));
  const ligne = parent.children[0];
  const [, curseur, boite] = ligne.children;
  return { api, curseur, saisie: boite.children[0], appels };
}

test('champ : `bornes` borne le curseur et les flèches', () => {
  const { api, curseur, saisie } = fabrique();
  api.bornes(0, 2);
  assert.deepEqual([curseur.min, curseur.max], [0, 2]);
  saisie.value = '1,9';
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '2');
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '2');
});

test('champ : `fixeMax` change le maximum seulement, et les flèches le suivent', () => {
  const { api, curseur, saisie } = fabrique({ min: 1, max: 3 });
  api.fixeMax(5);
  assert.deepEqual([curseur.min, curseur.max], [1, 5]);
  saisie.value = '4,9';
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '5');
  appuie(saisie, 'ArrowUp');
  assert.equal(saisie.value, '5');
});

test('champ : la saisie au clavier peut sortir des bornes', () => {
  const { curseur, saisie, appels } = fabrique({ max: 1 });
  saisie.value = '9';
  change(saisie);
  assert.equal(curseur.value, '9');
  assert.deepEqual(appels, [9]);
});

test('champ : une saisie illisible rend au champ la valeur du curseur', () => {
  const { saisie, appels } = fabrique({ valeur: 0.5 });
  saisie.value = 'abc';
  change(saisie);
  assert.equal(saisie.value, '0,5');
  assert.deepEqual(appels, []);
});

test('champ : le nom accessible est le texte MathML, sans la source LaTeX répétée', () => {
  installeKatex({ mathml: true });
  const { curseur, saisie } = fabrique();
  installeKatex();
  assert.equal(saisie.getAttribute('aria-label'), 't0');
  assert.equal(curseur.getAttribute('aria-label'), 't0');
});
