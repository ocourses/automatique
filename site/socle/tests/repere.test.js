// Repère 2D : graduations « rondes », passage du monde aux pixels et retour,
// alignement des graduations au bord droit, axes partiels. Un faux contexte 2D
// espion enregistre les appels de dessin.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fauxCanevas, fauxContexte } from './aides/faux-canevas.js';
import { installeDom, installeStyleCalcule } from './aides/faux-dom.js';

installeDom();
installeStyleCalcule();
const { graduations, Repere } = await import('../js/ui/repere.js');

const proche = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('graduations : des valeurs rondes, régulières, dans l’intervalle', () => {
  const g = graduations(0, 10, 550);
  assert.equal(g[0], 0);
  assert.equal(g.at(-1), 10);
  const pas = g[1] - g[0];
  assert.ok([1, 2, 5].some((k) => Math.abs(Math.log10(pas / k) % 1) < 1e-9), `pas ${pas}`);
  g.slice(1).forEach((v, i) => proche(v - g[i], pas));
});

test('graduations : un intervalle négatif contient 0 exactement', () => {
  const g = graduations(-3, 3, 330);
  assert.ok(g.includes(0));
  assert.ok(g.every((v) => v >= -3 && v <= 3));
});

test('graduations : intervalle vide ou à l’envers, aucune graduation', () => {
  assert.deepEqual(graduations(2, 2, 400), []);
  assert.deepEqual(graduations(5, 1, 400), []);
});

test('graduations : très petite et très grande échelle', () => {
  const petit = graduations(0, 3e-7, 400);
  assert.ok(petit.length >= 2 && petit.at(-1) <= 3e-7 * (1 + 1e-9));
  const grand = graduations(0, 4e9, 400);
  assert.ok(grand.length >= 2 && grand.every((v) => v === 0 || Math.log10(v / 1) % 1 !== undefined));
  assert.ok(grand.at(-1) <= 4e9);
});

function repere({ egal = false, x = [0, 10], y = [0, 4], largeur = 400, hauteur = 200, ...reste } = {}) {
  const canevas = fauxCanevas({ largeur, hauteur, gauche: 10, haut: 20, ...reste });
  const r = new Repere(canevas, { x, y, egal });
  assert.ok(r.prepare());
  return r;
}

test('Repere : le monde, les pixels et retour (x et y)', () => {
  for (const egal of [false, true]) {
    const r = repere({ egal, x: [-2, 6], y: [-1, 3] });
    for (const [x, y] of [[0, 0], [-2, 3], [5.5, -0.7], [3.1, 2.9]]) {
      const [rx, ry] = r.versMonde({ clientX: 10 + r.X(x), clientY: 20 + r.Y(y) });
      proche(rx, x, 1e-9);
      proche(ry, y, 1e-9);
    }
  }
});

test('Repere : `egal` donne la même échelle aux deux axes', () => {
  const r = repere({ egal: true, x: [0, 1], y: [0, 1] });
  proche(r.sx, r.sy);
  const libre = repere({ egal: false, x: [0, 1], y: [0, 1] });
  assert.ok(Math.abs(libre.sx - libre.sy) > 1);
});

test('Repere : un canevas masqué n’est pas dessiné', () => {
  const r = new Repere(fauxCanevas({ largeur: 1, hauteur: 1 }), { x: [0, 1], y: [0, 1] });
  assert.equal(r.prepare(), false);
});

const textes = (r) => r.ctx.appels.filter((a) => a.nom === 'fillText');

test('Repere.axes : une graduation trop proche du bord droit est alignée sur le bord', () => {
  // Texte de 10 px par caractère : « 10 » déborderait du canevas de 400 px.
  const r = repere({ contexte: fauxContexte({ largeurTexte: (t) => t.length * 10 }) });
  r.axes();
  const dix = textes(r).find((a) => a.args[0] === '10');
  assert.equal(dix.textAlign, 'right');
  assert.equal(dix.args[1], 399);
  const quatre = textes(r).find((a) => a.args[0] === '4' && a.args[2] > 100);
  assert.equal(quatre.textAlign, 'center');
});

test('Repere.axes : sans débordement, toutes les graduations sont centrées', () => {
  const r = repere();
  r.axes();
  const abscisses = textes(r).filter((a) => a.textAlign === 'center');
  assert.ok(abscisses.length >= 5);
  assert.ok(textes(r).every((a) => a.textAlign !== 'right' || a.args[1] < 40));
});

test('Repere.axes : `ordonnees: false` ne grade que l’axe des abscisses', () => {
  const r = repere();
  r.axes({ ordonnees: false });
  assert.ok(textes(r).every((a) => a.textAlign !== 'right' || a.args[1] > 40), 'aucune graduation à gauche');
});

test('Repere.axes : `dans` place les graduations sous l’axe, pas au bas du canevas', () => {
  const r = repere({ y: [-2, 2] });
  r.axes({ dans: { x: [0, 10], y: [-1, 1] } });
  const sousAxe = textes(r).find((a) => a.args[0] === '0' && a.textAlign === 'center');
  proche(sousAxe.args[2], r.Y(0) + 14);
});
