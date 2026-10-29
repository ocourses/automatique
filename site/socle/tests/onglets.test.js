// Onglets accessibles (js/ui/onglets.js) : onglet initial, onglets masqués,
// clic, navigation au clavier. Un faux DOM remplace le navigateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { initOnglets } from '../js/ui/onglets.js';
import { el, evenement, installeDom } from './aides/faux-dom.js';

const IDS = ['a', 'b', 'c'];

// Groupe « g » de trois onglets et de leurs panneaux ; `masques` : onglets cachés.
function groupe({ masques = [] } = {}) {
  const document = installeDom();
  const liste = el('div', { role: 'tablist', 'data-groupe': 'g' }, ...IDS.map((id) => el('button', { role: 'tab', 'data-onglet': id, hidden: masques.includes(id) })));
  const panneaux = IDS.map((id) => el('div', { role: 'tabpanel', 'data-groupe': 'g', 'data-panneau': id }));
  document.body.append(liste, ...panneaux);
  const onglet = (id) => liste.querySelector(`[data-onglet="${id}"]`);
  return {
    document,
    liste,
    onglet,
    ouverts: () => panneaux.filter((p) => !p.hidden).map((p) => p.dataset.panneau),
    touche: (key) => {
      const ev = evenement('keydown', { key });
      liste.dispatchEvent(ev);
      return ev;
    },
  };
}

test('onglets : l’onglet initial s’ouvre seul, sans appeler `change`', () => {
  const g = groupe();
  const changes = [];
  initOnglets('g', { defaut: 'a', initial: 'c', change: (id) => changes.push(id) });
  assert.deepEqual(g.ouverts(), ['c']);
  assert.deepEqual(IDS.map((id) => g.onglet(id).getAttribute('aria-selected')), ['false', 'false', 'true']);
  // Un seul onglet atteignable par Tab : l'onglet ouvert.
  assert.deepEqual(IDS.map((id) => g.onglet(id).tabIndex), [-1, -1, 0]);
  assert.deepEqual(changes, []);
});

test('onglets : un onglet initial masqué ou inconnu cède au défaut, un défaut masqué au premier visible', () => {
  let g = groupe({ masques: ['c'] });
  initOnglets('g', { defaut: 'b', initial: 'c' });
  assert.deepEqual(g.ouverts(), ['b']);
  g = groupe();
  initOnglets('g', { defaut: 'b', initial: 'inconnu' });
  assert.deepEqual(g.ouverts(), ['b']);
  g = groupe({ masques: ['a'] });
  initOnglets('g', { defaut: 'a' });
  assert.deepEqual(g.ouverts(), ['b']);
});

test('onglets : un clic ouvre l’onglet et appelle `change`', () => {
  const g = groupe();
  const changes = [];
  initOnglets('g', { defaut: 'a', change: (id) => changes.push(id) });
  g.onglet('b').dispatchEvent(evenement('click'));
  assert.deepEqual(g.ouverts(), ['b']);
  assert.deepEqual(changes, ['b']);
});

test('onglets : flèches (en boucle), Début et Fin, en sautant les onglets masqués', () => {
  const g = groupe({ masques: ['b'] });
  const changes = [];
  initOnglets('g', { defaut: 'a', change: (id) => changes.push(id) });
  g.onglet('a').focus();
  for (const [key, attendu] of [['ArrowRight', 'c'], ['ArrowRight', 'a'], ['ArrowLeft', 'c'], ['Home', 'a'], ['End', 'c']]) {
    assert.equal(g.touche(key).defaultPrevented, true, key);
    assert.equal(g.document.activeElement, g.onglet(attendu), key);
    assert.deepEqual(g.ouverts(), [attendu], key);
  }
  assert.deepEqual(changes, ['c', 'a', 'c', 'a', 'c']);
});

test('onglets : une autre touche, ou le focus hors des onglets, ne fait rien', () => {
  const g = groupe();
  initOnglets('g', { defaut: 'a' });
  g.onglet('a').focus();
  assert.equal(g.touche('Enter').defaultPrevented, false);
  g.document.body.focus();
  assert.equal(g.touche('ArrowRight').defaultPrevented, false);
  assert.deepEqual(g.ouverts(), ['a']);
});
