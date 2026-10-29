// Gabarits d'un cours (js/modeles.js) : copies exactes des modèles, sinon une
// faute qui nomme la page et la première ligne qui diffère. Un faux cours est
// écrit dans un dossier temporaire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { PAGES, fautesModeles, verifieModeles } from '../js/modeles.js';
import { modele } from './aides/page.js';

function cours(pages) {
  const dossier = mkdtempSync(join(tmpdir(), 'cours-'));
  for (const [page, contenu] of Object.entries(pages)) writeFileSync(join(dossier, page), contenu);
  return pathToFileURL(`${dossier}/`);
}
const copies = () => Object.fromEntries(PAGES.map((p) => [p, modele(p)]));

test('modèles : des copies exactes passent', async () => {
  await verifieModeles(cours(copies()));
});

test('modèles : une page changée est nommée, avec sa première ligne différente', async () => {
  const pages = copies();
  pages['illustration.html'] = pages['illustration.html'].replace('Chargement…', 'Patience…');
  const ligne = modele('illustration.html').split('\n').findIndex((l) => l.includes('Chargement…')) + 1;
  assert.deepEqual(await fautesModeles(cours(pages)), [`illustration.html : diffère du modèle socle/modeles/illustration.html à la ligne ${ligne}`]);
});

test('modèles : une ligne en plus à la fin compte, une page absente aussi', async () => {
  const pages = copies();
  pages['index.html'] += '<!-- ajout -->\n';
  delete pages['illustration.html'];
  const lignes = modele('index.html').split('\n').length;
  assert.deepEqual(await fautesModeles(cours(pages)), [
    `index.html : diffère du modèle socle/modeles/index.html à la ligne ${lignes}`,
    'illustration.html : absente (copier socle/modeles/illustration.html)',
  ]);
  await assert.rejects(verifieModeles(cours(pages)), /gabarits : 2 faute\(s\)/);
});

test('modèles : `pages` restreint la vérification (un accueil propre au cours)', async () => {
  const pages = copies();
  pages['index.html'] = '<!doctype html>';
  await verifieModeles(cours(pages), ['illustration.html']);
});
