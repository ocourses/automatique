// Brique portraits (js/briques/portraits.js), caractérisée avant la migration des
// cours (décision 13) : orbites, ce que dessine un portrait (relevé par un faux
// repère) et particules emportées par le flot, avec un hasard rendu déterministe.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Particules, dessinePortrait, orbitesDuPortrait } from '../js/briques/portraits.js';
import { decompte, fauxRepere } from './aides/faux-repere.js';

const COULEURS = { discret: 'discret', trait: 'trait', accent: 'accent', equilibre: 'equilibre' };
const MATRICES = {
  centre: [[0, -1], [1, 0]],
  col: [[1, 0], [0, -1]],
  equilibres: [[1, 1], [1, 1]],
  jordan: [[-1, 1], [0, -1]],
};
const portrait = (A, options = {}) => {
  const rep = fauxRepere();
  dessinePortrait(rep, A, { couleurs: COULEURS, finesse: 0.5, ...options });
  return rep.appels;
};
// Suite pseudo-aléatoire fixe à la place de Math.random, rétablie après `f`.
function sansHasard(t, f) {
  let graine = 1;
  t.mock.method(Math, 'random', () => ((graine = (graine * 16807) % 2147483647) - 1) / 2147483646);
  return f();
}

test('orbitesDuPortrait : les orbites d’un centre restent dans le cadre', () => {
  const orbites = orbitesDuPortrait(MATRICES.centre, { x: [-2, 2], y: [-2, 2] }, { departs: 8 });
  assert.ok(orbites.length > 0);
  for (const orbite of orbites) for (const [x, y] of orbite) assert.ok(x >= -2 && x <= 2 && y >= -2 && y <= 2);
});

test('dessinePortrait : champ, orbites fléchées et équilibre, pour chaque sorte de portrait', () => {
  const attendus = {
    centre: { champ: 1, trace: 10, pointe: 10, point: 1 },
    col: { champ: 1, droite: 2, trace: 5, pointe: 5, point: 1 },
    equilibres: { champ: 1, droite: 3, trace: 8, pointe: 8, point: 1 },
    jordan: { champ: 1, droite: 1, trace: 9, pointe: 9, point: 1 },
  };
  for (const [nom, A] of Object.entries(MATRICES)) {
    const appels = portrait(A);
    assert.deepEqual(decompte(appels), attendus[nom], nom);
    assert.deepEqual(appels.at(-1), ['point', 0, 0, 'equilibre'], nom);
  }
});

test('dessinePortrait : directions propres en tirets, droite d’équilibres pleine', () => {
  const droites = (A) => portrait(A).filter(([nom]) => nom === 'droite');
  assert.deepEqual(droites(MATRICES.centre), []);
  assert.deepEqual(droites(MATRICES.col), [['droite', 0, 0, 0, 1, 'accent', 'tirets'], ['droite', 0, 0, 1, 0, 'accent', 'tirets']]);
  assert.deepEqual(droites(MATRICES.equilibres), [
    ['droite', 0, 0, -1, 1, 'equilibre'],
    ['droite', 0, 0, -0.707, 0.707, 'accent', 'tirets'],
    ['droite', 0, 0, -0.707, -0.707, 'accent', 'tirets'],
  ]);
  assert.deepEqual(droites(MATRICES.jordan), [['droite', 0, 0, -1, 0, 'accent', 'tirets']]);
});

test('dessinePortrait : sans champ, et en arcs glissants (animation)', () => {
  assert.equal(decompte(portrait(MATRICES.col, { champ: false })).champ, undefined);
  const arcs = { centre: [40, 6], col: [20, 1], equilibres: [32, 4], jordan: [36, 6] };
  for (const [nom, A] of Object.entries(MATRICES)) {
    const n = decompte(portrait(A, { arc: 0.3, temps: 1.5 }));
    assert.deepEqual([n.trace, n.pointe], arcs[nom], nom);
  }
});

test('Particules : n particules, toujours dans le cadre', (t) => {
  sansHasard(t, () => {
    const rep = fauxRepere();
    const particules = new Particules(30);
    for (let k = 0; k < 50; k++) particules.avance(MATRICES.jordan, rep, 0.1);
    assert.equal(particules.pts.length, 30);
    for (const { x } of particules.pts) assert.ok(rep.contient(...x), `${x} hors du cadre`);
    particules.dessine(rep, 'trait');
    assert.deepEqual(decompte(rep.appels), { point: 30 });
  });
});

test('Particules : deux particules confondues n’en font plus qu’une, l’autre renaît', (t) => {
  sansHasard(t, () => {
    const rep = fauxRepere();
    const particules = new Particules(2);
    particules.pts = [{ x: [1, 1], age: 1 }, { x: [1, 1], age: 1 }];
    particules.avance([[0, 0], [0, 0]], rep, 0.1);
    assert.deepEqual(particules.pts[0], { x: [1, 1], age: 1.1 });
    assert.equal(particules.pts[1].age, 0, 'la seconde renaît');
    assert.notDeepEqual(particules.pts[1].x, [1, 1]);
  });
});

test('Particules : une particule trop vieille, sortie du cadre ou arrivée à l’équilibre renaît', (t) => {
  sansHasard(t, () => {
    const rep = fauxRepere();
    const particules = new Particules(4);
    particules.pts = [{ x: [1, 1], age: 7.95 }, { x: [5, 0], age: 1 }, { x: [0.03, 0], age: 1 }, { x: [-1, 1], age: 1 }];
    particules.avance([[0, 0], [0, 0]], rep, 0.1);
    assert.deepEqual(particules.pts.map((p) => p.age), [0, 0, 0, 1.1], 'la dernière, ordinaire, vieillit');
  });
});
