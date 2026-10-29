// Contrat JS ↔ CSS : toute classe que le JavaScript du socle pose sur un élément
// est définie dans les feuilles du socle (critère de fin de #6).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = fileURLToPath(new URL('../', import.meta.url));
const lis = (dossier, motif) =>
  readdirSync(join(racine, dossier), { recursive: true })
    .filter((f) => motif.test(f))
    .map((f) => readFileSync(join(racine, dossier, f), 'utf8'));

// Classes posées par le JavaScript : `className = '…'`, début d'un `className = `…``
// (le reste dépend de variables), `classList.add/toggle('…')` et `class="…"` dans
// du HTML construit. Les variantes d'une classe (`pastille ${forme}`) ne sont pas
// listées : une variante peut ne rien styler à dessein (`.pastille.fleche`). Une classe
// ajoutée par condition dans un gabarit (`${tirets ? ' tirets' : ''}`) est relevée aussi.
const POSEES = [/className = '([^'$`]+)'/g, /className = `([\w-]+)/g, /\?\s*' ([\w-]+)'/g, /classList\.(?:add|toggle)\('([^'$`]+)'/g, /class="([^"$]+)"/g];
const classesPosees = () => {
  const noms = new Set();
  for (const source of lis('js', /\.js$/)) {
    for (const motif of POSEES) for (const m of source.matchAll(motif)) m[1].split(/\s+/).filter(Boolean).forEach((n) => noms.add(n));
  }
  return noms;
};

test('contrat JS ↔ CSS : chaque classe posée par le socle est définie dans css/', () => {
  const css = lis('css', /\.css$/).join('\n');
  const manquantes = [...classesPosees()].filter((n) => !new RegExp(`\\.${n}(?![\\w-])`).test(css)).sort();
  assert.deepEqual(manquantes, []);
});

test('contrat JS ↔ CSS : le relevé des classes posées n’est pas vide', () => {
  assert.ok(classesPosees().size > 10);
});
