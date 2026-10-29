// Intégrateurs à pas fixe (js/core/ode.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { euler, integre, rk4 } from '../js/core/ode.js';

const proche = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('RK4 et Euler sur ẋ = x', () => {
  const F = (t, x) => [x[0]];
  proche(integre(rk4, F, 0, [1], 1, 1e-2)[0], Math.E, 1e-8);
  proche(integre(euler, F, 0, [1], 1, 1e-4)[0], Math.E, 1e-3);
});

test('integre : le dernier pas est raccourci pour tomber sur t1', () => {
  const F = () => [1];
  assert.deepEqual(integre(euler, F, 0, [0], 1, 0.3), [1]);
});
