// Briques des illustrations : cartes, contenu, canevas, zoom. Un faux DOM remplace
// le navigateur ; les fonctions pures du zoom sont testées sans DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { el, evenement, installeDom } from './aides/faux-dom.js';
import { installeKatex } from './aides/faux-katex.js';

installeDom();
installeKatex();
const briques = await import('../js/briques/commun.js');
const { LARGEURS_ZOOM, borneTemps, dilate } = await import('../js/briques/interaction.js');

test('commun.js réunit toutes les briques', () => {
  for (const nom of ['carte', 'barreOutils', 'boutonInfo', 'boutonAide', 'repliable', 'choixRadios', 'legende', 'paragraphe', 'verdict', 'tableau', 'toile', 'glisse', 'zoomable']) {
    assert.equal(typeof briques[nom], 'function', nom);
  }
});

test('carte : une section, avec un titre h2 seulement s’il y en a un', () => {
  const parent = el('div');
  const avec = briques.carte(parent, 'Titre');
  const sans = briques.carte(parent);
  assert.equal(avec.querySelector('h2').textContent, 'Titre');
  assert.equal(sans.querySelector('h2'), null);
  assert.equal(parent.children.length, 2);
});

test('paragraphe : un paragraphe de classe `note` par défaut, sans zone englobante', () => {
  const parent = el('div');
  const p = briques.paragraphe(parent, 'texte');
  assert.equal(p.className, 'note');
  assert.equal(p.parentNode, parent);
  assert.equal(briques.paragraphe(parent, 'texte', '').className, '');
});

test('verdict : un paragraphe `verdict` dans une zone `zone-verdict`', () => {
  const parent = el('div');
  const p = briques.verdict(parent, 'ok');
  assert.equal(p.className, 'verdict');
  assert.equal(p.textContent, 'ok');
  assert.equal(p.parentNode.className, 'zone-verdict');
  assert.equal(p.parentNode.parentNode, parent);
});

test('paragraphe ne connaît plus `verdict` : pas de zone pour cette classe', () => {
  const parent = el('div');
  const p = briques.paragraphe(parent, 'ok', 'verdict');
  assert.equal(p.parentNode, parent);
});

test('repliable : identifiants uniques et déterministes, bascule et rappel', () => {
  const parent = el('div');
  const un = briques.repliable(parent, 'Un');
  const deux = briques.repliable(parent, 'Deux', { ouvert: true });
  assert.notEqual(un.contenu.id, deux.contenu.id);
  assert.match(un.contenu.id, /^repliable-\d+$/);
  const bouton = un.carte.querySelector('button');
  assert.equal(bouton.getAttribute('aria-controls'), un.contenu.id);
  assert.equal(un.contenu.hidden, true);
  assert.equal(deux.contenu.hidden, false);
  const vus = [];
  const trois = briques.repliable(parent, 'Trois', { change: (o) => vus.push(o) });
  trois.carte.querySelector('button').dispatchEvent(evenement('click', { bubbles: false }));
  trois.carte.querySelector('button').dispatchEvent(evenement('click', { bubbles: false }));
  assert.deepEqual(vus, [true, false]);
});

test('choixRadios : `fixe` coche l’option sans appeler `change`', () => {
  const parent = el('div');
  const appels = [];
  const choix = briques.choixRadios(parent, { nom: 'n', options: [{ valeur: 'a', texte: 'A' }, { valeur: 'b', texte: 'B' }], change: (v) => appels.push(v) });
  choix.fixe('b');
  const radios = choix.element.querySelectorAll('input');
  assert.deepEqual(radios.map((r) => r.checked), [false, true]);
  assert.deepEqual(appels, []);
});

test('tableau : un en-tête et une ligne par entrée', () => {
  const t = briques.tableau(el('div'), ['a', 'b'], [[1, 2], [3, 4]]);
  assert.equal(t.querySelectorAll('th').length, 2);
  assert.equal(t.querySelectorAll('tr').length, 3);
});

test('toile : un canevas carré garde ses proportions, un canevas large s’étire', () => {
  const parent = el('div');
  assert.equal(briques.toile(parent, '1 / 1').classList.contains('carree'), true);
  assert.equal(briques.toile(parent, '4 / 3').classList.contains('carree'), false);
});

test('dilate : dilate autour du centre, ou ne change rien hors des bornes', () => {
  assert.deepEqual(dilate([0, 2], 1, 2, LARGEURS_ZOOM.x), [-1, 3]);
  assert.deepEqual(dilate([0, 2], 0, 0.5, LARGEURS_ZOOM.x), [0, 1]);
  assert.deepEqual(dilate([0, 300], 0, 2, LARGEURS_ZOOM.x), [0, 300]);
  assert.deepEqual(dilate([0, 0.06], 0, 0.5, LARGEURS_ZOOM.x), [0, 0.06]);
});

test('borneTemps : l’abscisse reste ≥ 0 seulement si demandé', () => {
  assert.deepEqual(borneTemps([-1, 3], true), [0, 4]);
  assert.deepEqual(borneTemps([-1, 3], false), [-1, 3]);
  assert.deepEqual(borneTemps([2, 5], true), [2, 5]);
});
