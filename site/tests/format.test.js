// Tests des formats d'affichage de la console.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { latexVecteur, nombreCourt, polynomeLatex } from '../js/ui/format.js';

test('nombreCourt : 4 chiffres, virgule française, notation scientifique aux extrêmes', () => {
  assert.equal(nombreCourt(0), '0');
  assert.equal(nombreCourt(0.0021), '0,0021');
  assert.equal(nombreCourt(-12.3456789), '−12,35');
  assert.equal(nombreCourt(2.34e-5), '2,34e-5');
  assert.equal(nombreCourt(-2.5e-7), '−2,5e-7');
  assert.equal(nombreCourt(123456), '1,235e5');
  assert.equal(nombreCourt(NaN), '—');
});

test('polynomeLatex : signes, coefficients unitaires et termes nuls', () => {
  assert.equal(polynomeLatex([1, 5, 10.2]), '\\lambda^{2} + 5\\lambda + 10{,}2');
  assert.equal(polynomeLatex([1, 0, -3]), '\\lambda^{2} - 3');
  assert.equal(polynomeLatex([1, 0, 0, 0, 1]), '\\lambda^{4} + 1');
  assert.equal(polynomeLatex([1, -1]), '\\lambda - 1');
});

test('latexVecteur : un scalaire sans parenthèses, un vecteur séparé par « ; »', () => {
  assert.equal(latexVecteur([7.04]), '7{,}04');
  assert.equal(latexVecteur([0.8, 0]), '\\left(0{,}8\\ ;\\ 0\\right)');
});
