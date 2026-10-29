// Catalogue et parcours (js/catalogue.js, js/parcours.js) : retrouver une
// illustration, l'ordre de lecture (avec les pages qu'un cours ajoute à un thème),
// les pages voisines et la navigation de l'en-tête. Un faux DOM remplace le navigateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { disponibles, trouve } from '../js/catalogue.js';
import { ancre, installeNavigation, parcours, precedente, suivante } from '../js/parcours.js';
import { coursFactice } from './aides/cours.js';
import { el, installeDom } from './aides/faux-dom.js';

const { config } = coursFactice();
const segway = { genre: 'exemple', id: 'segway', titre: 'Segway : le pendule « inversé »', lien: 'exemple.html?id=segway' };
const ids = (pages) => pages.map((p) => `${p.genre}-${p.id}`);

test('catalogue : trouve le thème et l’illustration, ou null', () => {
  const { theme, illustration } = trouve(config.themes, 'c');
  assert.equal(theme.id, 't2');
  assert.equal(illustration.titre, 'Illustration C');
  assert.equal(trouve(config.themes, 'inconnue'), null);
  assert.deepEqual(disponibles(config.themes[0]).map((i) => i.id), ['a']);
});

test('parcours : les illustrations disponibles, thème par thème, avec leur lien', () => {
  assert.deepEqual(parcours(config), [
    { genre: 'illustration', id: 'a', titre: 'Illustration A', lien: 'illustration.html?id=a' },
    { genre: 'illustration', id: 'c', titre: 'Illustration C', lien: 'illustration.html?id=c' },
  ]);
});

test('parcours : les pages d’un thème suivent ses illustrations', () => {
  const pagesDuTheme = (theme) => (theme.id === 't1' ? [segway] : []);
  assert.deepEqual(ids(parcours({ ...config, pagesDuTheme })), ['illustration-a', 'exemple-segway', 'illustration-c']);
});

test('parcours : pages voisines, null aux deux bouts et hors du parcours', () => {
  const pages = parcours({ ...config, pagesDuTheme: (t) => (t.id === 't1' ? [segway] : []) });
  assert.equal(suivante(pages, 'illustration', 'a').id, 'segway');
  assert.equal(precedente(pages, 'illustration', 'c').id, 'segway');
  assert.equal(precedente(pages, 'illustration', 'a'), null);
  assert.equal(suivante(pages, 'illustration', 'c'), null);
  assert.equal(suivante(pages, 'illustration', 'b'), null);
  // Le genre distingue deux pages de même identifiant.
  assert.equal(suivante(pages, 'exemple', 'a'), null);
  assert.equal(ancre('exemple', 'segway'), 'exemple-segway');
});

// En-tête d'une page d'illustration : le lien de retour et la zone des actions.
function entete() {
  const document = installeDom();
  const retour = el('a', { class: 'retour', href: 'index.html' }, '← Accueil');
  const actions = el('div', { class: 'entete-actions' });
  document.body.append(el('header', {}, retour, actions));
  return { retour, actions };
}

test('navigation : retour à la carte de la page, et pages voisines dans l’en-tête', () => {
  const pages = parcours({ ...config, pagesDuTheme: (t) => (t.id === 't1' ? [segway] : []) });
  const { retour, actions } = entete();
  installeNavigation(pages, 'exemple', 'segway');
  assert.equal(retour.href, 'index.html#exemple-segway');
  const liens = actions.querySelectorAll('a');
  assert.deepEqual(liens.map((a) => [a.textContent, a.href]), [
    ['← Page précédente', 'illustration.html?id=a'],
    ['Page suivante →', 'illustration.html?id=c'],
  ]);
  assert.equal(liens.every((a) => a.className === 'bouton-lien'), true);
});

test('navigation : pas de page précédente au début, et un titre en typographie française', () => {
  const pages = parcours({ ...config, pagesDuTheme: (t) => (t.id === 't1' ? [segway] : []) });
  const { actions } = entete();
  installeNavigation(pages, 'illustration', 'a');
  const [lien] = actions.querySelectorAll('a');
  assert.equal(actions.querySelectorAll('a').length, 1);
  assert.equal(lien.textContent, 'Page suivante →');
  assert.equal(lien.title, 'Segway : le pendule « inversé »');
});

test('navigation : une page sans en-tête ne lève rien', () => {
  installeDom();
  assert.doesNotThrow(() => installeNavigation(parcours(config), 'illustration', 'a'));
});
