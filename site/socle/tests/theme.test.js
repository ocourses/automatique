// Contrat entre js/ui/theme.js et css/theme.css : chaque variable que lit
// `couleurs()` est définie dans le thème clair et dans le thème sombre. Un
// espion de getComputedStyle relève les variables lues.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lues = [];
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: (nom) => (lues.push(nom), '') });
const { couleurs } = await import('../js/ui/theme.js');

const css = await readFile(new URL('../css/theme.css', import.meta.url), 'utf8');
const [clair, sombre] = css.split('@media (prefers-color-scheme: dark)');
const definies = (bloc) => new Set([...bloc.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

test('theme : chaque variable lue par couleurs() est définie en clair et en sombre', () => {
  couleurs();
  assert.ok(lues.length > 0);
  const [enClair, enSombre] = [definies(clair), definies(sombre)];
  for (const nom of lues) {
    assert.ok(enClair.has(nom), `${nom} absente du thème clair`);
    assert.ok(enSombre.has(nom), `${nom} absente du thème sombre`);
  }
});
