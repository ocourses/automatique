// rendTexte : formules $…$ et typographie ; la ponctuation qui suit une formule
// reste collée à elle (jamais de fin de ligne entre les deux).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { installeDom } from './aides/faux-dom.js';
import { installeKatex } from './aides/faux-katex.js';

installeDom();
installeKatex();
const { rendTexte } = await import('../js/ui/katex.js');

const rend = (texte) => {
  const p = document.createElement('p');
  rendTexte(p, texte);
  return p;
};

test('rendTexte : la ponctuation qui suit une formule reste collée à elle', () => {
  for (const [texte, colle] of [
    ['soit $x$, puis', 'x,'],
    ['donc $y$.', 'y.'],
    ['($z$)', 'z)'],
    ['on a $f$ : ok', 'f\u00a0:'],
  ]) {
    assert.equal(rend(texte).querySelector('.insecable')?.textContent, colle, texte);
  }
});

test('rendTexte : le texte est conservé, ponctuation comprise', () => {
  assert.equal(rend('soit $x$, puis').textContent, 'soit x, puis');
  assert.equal(rend('on a $f$ : ok').textContent, 'on a f\u00a0: ok');
});

test('rendTexte : sans ponctuation après la formule, pas de bloc insécable', () => {
  assert.equal(rend('soit $x$ et $y$').querySelector('.insecable'), null);
  assert.equal(rend('$x$').querySelector('.insecable'), null);
});

test('rendTexte : une formule suivie d’une formule garde chacune la sienne', () => {
  assert.equal(rend('$a$, $b$.').textContent, 'a, b.');
});

test('rendTexte : appliquer deux fois remplace le contenu', () => {
  const p = rend('$a$');
  rendTexte(p, 'plus rien');
  assert.equal(p.textContent, 'plus rien');
});
