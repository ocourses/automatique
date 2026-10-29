// Brique plan-trace-det (js/briques/plan-trace-det.js), caractérisée avant la
// migration des cours (décision 13) : aimantation et arrondi du point choisi, et
// ce que dessine le plan, relevé par un faux repère.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AIMANT, PLACEMENT, aimante, borneLe, dessinePlan, pointDuPlan } from '../js/briques/plan-trace-det.js';
import { installeDom } from './aides/faux-dom.js';
import { decompte, fauxRepere } from './aides/faux-repere.js';

installeDom();
const COULEURS = { zone: 'zone', discret: 'discret', trait: 'trait', accent: 'accent', alerte: 'alerte', equilibre: 'equilibre' };
const plan = (tr, det, options) => {
  const rep = fauxRepere({ x: [-6, 6], y: [-3, 7] });
  dessinePlan(rep, tr, det, COULEURS, options);
  return rep;
};

test('aimante : le point se colle aux axes et à la parabole, juste en deçà du seuil seulement', () => {
  assert.deepEqual(aimante(0.099, 1, 0.1, 0.1), [0, 1]);
  assert.deepEqual(aimante(0.1, 1, 0.1, 0.1), [0.1, 1]);
  assert.deepEqual(aimante(2, 0.099, 0.1, 0.1), [2, 0]);
  assert.deepEqual(aimante(2, 1.099, 0.1, 0.1), [2, 1]);
  assert.deepEqual(aimante(2, 1.1, 0.1, 0.1), [2, 1.1]);
  assert.equal(AIMANT, 9);
});

test('pointDuPlan : arrondi à 10⁻³ ; sur la parabole, le déterminant suit la trace arrondie', () => {
  assert.deepEqual(pointDuPlan(1.23456, 0.98765, 0, 0), { tr: 1.235, det: 0.988 });
  const p = pointDuPlan(2.0004, 1.001, 0.1, 0.1);
  assert.equal(p.det, (p.tr * p.tr) / 4);
});

test('borneLe : le point est ramené dans le rectangle autorisé', () => {
  assert.deepEqual(borneLe({ tr: 8, det: -4 }, { tr: [-2, 3], det: [0, 5] }), { tr: 3, det: 0 });
  assert.deepEqual(borneLe({ tr: 1, det: 2 }, { tr: [-2, 3], det: [0, 5] }), { tr: 1, det: 2 });
});

test('PLACEMENT : les points déplacés pour la lisibilité', () => {
  assert.deepEqual(PLACEMENT, {
    'P₁': { tr: -4, det: 2, cote: 'bas-droite' },
    'P₂': { tr: 4, det: 2, cote: 'bas-gauche' },
    'P₃': { tr: 0, det: -1.5 },
    'P₁₀': { cote: 'bas-droite' },
  });
});

test('dessinePlan : zone de stabilité, axes, parabole, les onze cas étiquetés, puis le point choisi', () => {
  const rep = plan(-1, 2);
  assert.deepEqual(decompte(rep.appels), { region: 1, axes: 1, trace: 3, texte: 1, point: 12 });
  assert.equal(rep.ctx.appels.filter((a) => a.nom === 'fillText').length, 22, 'P et indice pour chaque cas');
  assert.deepEqual(rep.appels.at(-1), ['point', -1, 2, 'accent']);
  assert.deepEqual(rep.appels.find(([nom]) => nom === 'point'), ['point', -4, 2, 'discret'], 'P₁ à sa place de PLACEMENT');
});

test('dessinePlan : le point choisi est en alerte hors de la stabilité asymptotique', () => {
  assert.deepEqual(plan(0, 3).appels.at(-1), ['point', 0, 3, 'alerte'], 'centre : stable, pas asymptotiquement');
  assert.deepEqual(plan(1, 2).appels.at(-1), ['point', 1, 2, 'alerte']);
});

test('dessinePlan : avec un rectangle autorisé, le dehors est grisé et les onze cas disparaissent', () => {
  const rep = plan(-1, 2, { autorise: { tr: [-2, 0], det: [0, 3] } });
  assert.deepEqual(decompte(rep.appels), { region: 2, axes: 1, trace: 3, texte: 1, point: 1 });
  assert.equal(rep.ctx.appels.filter((a) => a.nom === 'fillText').length, 0);
});

test('dessinePlan : sans étiquettes, les points des cas restent', () => {
  const rep = plan(-1, 2, { etiquettes: false });
  assert.equal(decompte(rep.appels).point, 12);
  assert.equal(rep.ctx.appels.filter((a) => a.nom === 'fillText').length, 0);
});
