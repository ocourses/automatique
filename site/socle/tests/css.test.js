// Feuilles du socle : aucune couleur en dur hors de theme.css (la charte), et
// `style.css` n'importe que des fichiers qui existent. Ces tests ne lisent que
// des fichiers publiés : ils tournent aussi côté étudiant.
// (L'outil scripts/residu-css.py est testé à côté de lui, en Python.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = fileURLToPath(new URL('../css/', import.meta.url));
const sansCommentaires = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');

// Une couleur littérale (#abc, rgb(), hsl()) ou nommée, dans la valeur d'une
// déclaration. `transparent` et `currentColor` restent permis.
const NOMMEES = 'white|black|red|green|blue|gray|grey|orange|yellow|purple|silver|navy|teal|maroon|pink|brown';
const COULEUR = new RegExp(`#[0-9a-fA-F]{3,8}\\b|\\b(?:rgb|rgba|hsl|hsla)\\(|:[^;{}]*\\b(?:${NOMMEES})\\b`);

test('aucune couleur en dur dans les composants', () => {
  for (const f of readdirSync(css).filter((f) => f.endsWith('.css') && f !== 'theme.css')) {
    const fautes = sansCommentaires(readFileSync(join(css, f), 'utf8'))
      .split('\n')
      .filter((l) => COULEUR.test(l));
    assert.deepEqual(fautes, [], `${f} : couleur en dur`);
  }
});

test('le détecteur de couleurs voit les couleurs nommées et littérales', () => {
  for (const l of ['color: white;', 'background: #fff;', 'fill: rgb(0 0 0);', 'border: 1px solid red;']) assert.match(l, COULEUR, l);
  for (const l of ['color: var(--texte);', 'background: transparent;', 'color: currentColor;', '.red-flag { margin: 0; }']) assert.doesNotMatch(l, COULEUR, l);
});

test('style.css importe des fichiers qui existent', () => {
  const imports = [...readFileSync(join(css, 'style.css'), 'utf8').matchAll(/@import url\('\.\/([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(imports.length > 0);
  for (const f of imports) assert.ok(existsSync(join(css, f)), f);
});
