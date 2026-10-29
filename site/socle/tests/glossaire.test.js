// Moteur du glossaire (js/glossaire.js) : termes les plus longs d'abord, terme
// inconnu refusé avant toute modification, contenu de l'infobulle.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { appliqueGlossaire } from '../js/glossaire.js';
import { el, evenement, installeDom } from './aides/faux-dom.js';
import { installeKatex } from './aides/faux-katex.js';

const document = installeDom();
installeKatex();
const GLOSSAIRE = {
  tribu: { formes: ['tribus', 'tribu'], definition: 'Famille de parties de $E$.', source: 'Poly, définition 2.1' },
  'tribu engendrée': { formes: ['tribu engendrée'], definition: 'La plus petite tribu.', source: 'Poly, définition 2.3' },
};
const paragraphe = (texte) => document.body.appendChild(el('p', {}, texte));
const termes = (p) => p.querySelectorAll('.terme').map((t) => t.textContent);

test('glossaire : le terme le plus long passe d’abord, quel que soit l’ordre demandé', () => {
  const p = paragraphe('La tribu engendrée par une tribu.');
  appliqueGlossaire(GLOSSAIRE, p, ['tribu', 'tribu engendrée']);
  assert.deepEqual(termes(p), ['tribu engendrée', 'tribu']);
});

test('glossaire : un terme inconnu lève, sans rien souligner', () => {
  const p = paragraphe('Une tribu.');
  assert.throws(() => appliqueGlossaire(GLOSSAIRE, p, ['tribu', 'mesure']), /Terme absent du glossaire : mesure/);
  assert.deepEqual(termes(p), []);
});

test('glossaire : l’infobulle donne le terme, sa définition (formules rendues) et sa source', () => {
  const p = paragraphe('Des tribus.');
  appliqueGlossaire(GLOSSAIRE, p, ['tribu']);
  p.querySelector('.terme').dispatchEvent(evenement('focus', { bubbles: false }));
  const bulle = document.querySelector('[role=tooltip]');
  assert.deepEqual(
    bulle.querySelectorAll('p').map((e) => [e.className, e.textContent]),
    [
      ['titre-bulle', 'Tribu'],
      ['corps-bulle', 'Famille de parties de E.'],
      ['source-bulle', 'Poly, définition 2.1'],
    ],
  );
});
