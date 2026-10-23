// Tests du parseur de la loi libre.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compile, ErreurExpression } from '../js/core/expr.js';

const vaut = (texte, env, attendu) => assert.equal(compile(texte, Object.keys(env)).evalue(env), attendu);

test('priorités et associativité', () => {
  vaut('1 + 2*3', {}, 7);
  vaut('(1 + 2)*3', {}, 9);
  vaut('2^3^2', {}, 512);
  vaut('-x^2', { x: 3 }, -9);
  vaut('8/4/2', {}, 1);
  vaut('2e-1 + .5', {}, 0.7);
  vaut('10 − 4', {}, 6);
});

test('variables, fonctions et constantes', () => {
  vaut('20*x1 + 5*x2', { x1: 0.1, x2: -0.2 }, 1);
  vaut('sat(x, 2)', { x: 5 }, 2);
  vaut('max(a, b, 3)', { a: 1, b: 2 }, 3);
  vaut('cos(pi)', {}, -1);
  assert.deepEqual([...compile('ue + k*ix1', ['ue', 'k', 'ix1']).variables].sort(), ['ix1', 'k', 'ue']);
});

test('erreurs explicites et aucun accès au JavaScript', () => {
  const erreur = (texte, motif) =>
    assert.throws(() => compile(texte, ['x1']), (e) => e instanceof ErreurExpression && motif.test(e.message));
  erreur('', /vide/);
  erreur('x1 +', /attendu/);
  erreur('(x1', /« \) » attendu/);
  erreur('y', /variable inconnue « y »/);
  erreur('alert(1)', /fonction inconnue/);
  erreur('constructor', /variable inconnue/);
  erreur('x1; x1', /caractère inattendu/);
  erreur('x1[0]', /caractère inattendu/);
});
