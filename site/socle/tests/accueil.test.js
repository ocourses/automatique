// Accueil (js/accueil.js) sur le modèle modeles/index.html : titres, introduction,
// signalement et catalogue viennent de la configuration ; le même code produit
// l'accueil de chaque cours.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { demarreAccueil } from '../js/accueil.js';
import { coursFactice } from './aides/cours.js';
import { installePage } from './aides/page.js';

const accueil = async (config = coursFactice().config, adresse = '') => {
  const { document } = installePage('index.html', adresse);
  await demarreAccueil(config);
  return document;
};

// Les configurations des trois cours (docs/conception.md, « Exemples »), sur le
// catalogue du cours factice.
const COURS = [
  ['automatique', 'Automatique', 'Automatique, première année — ENSEEIHT, Sciences du numérique'],
  ['calcul-differentiel-edo', 'Calcul différentiel et EDO', 'Calcul différentiel et équations différentielles ordinaires — parcours ModIA, INP-ENSEEIHT et INSA Toulouse'],
  ['mesure-integration', 'Mesure et intégration', 'Mesure et intégration, première année — ENSEEIHT, Sciences du numérique'],
].map(([id, titre, sousTitre]) => ({ ...coursFactice().config, id, titre, sousTitre, depotIssues: `ocourses/${id}` }));

test('accueil : titres, sous-titre et dépôt des issues de chaque cours, avec le même code', async () => {
  for (const config of COURS) {
    const document = await accueil(config);
    assert.equal(document.title, `${config.titre} : explorer le cours`);
    assert.equal(document.getElementById('titre').textContent, `${config.titre} : explorer le cours`);
    assert.equal(document.getElementById('sous-titre').textContent, config.sousTitre);
    assert.equal(document.getElementById('issues').href, `https://github.com/ocourses/${config.id}/issues`);
    assert.equal(document.body.dataset.ok, '1');
  }
});

test('accueil : les paragraphes d’introduction, dans l’ordre, avant le signalement, formules rendues', async () => {
  const config = { ...coursFactice().config, intro: ['Premier $x$.', 'Second.'] };
  const document = await accueil(config);
  const intro = document.body.querySelectorAll('.intro').filter((p) => !p.closest('noscript'));
  assert.deepEqual(
    intro.map((p) => p.textContent.replace(/\s+/g, ' ').trim().slice(0, 12)),
    ['Premier x.', 'Second.', 'Une erreur, '],
  );
  assert.equal(intro.at(-1).id, 'signalement');
  assert.equal(intro[0].querySelector('.insecable').textContent, 'x.');
});

test('accueil : une section #theme-<id> par thème, une carte par illustration', async () => {
  const document = await accueil();
  const sections = document.querySelectorAll('section');
  assert.deepEqual(sections.map((s) => s.id), ['theme-t1', 'theme-t2']);
  assert.equal(sections[0].querySelector('h2').textContent, 'Premier thème');
  assert.equal(sections[0].querySelector('.source').textContent, 'Poly, chapitre 1');
  const cartes = document.querySelectorAll('.carte');
  assert.deepEqual(cartes.map((c) => c.id), ['illustration-a', 'illustration-b', 'illustration-c']);
  assert.deepEqual(cartes.map((c) => c.tagName), ['A', 'DIV', 'A']);
  assert.equal(cartes[0].href, 'illustration.html?id=a');
  assert.equal(cartes[0].className, 'carte exemple');
});

test('accueil : une illustration annoncée est une carte « à venir », sans lien', async () => {
  const document = await accueil();
  const b = document.getElementById('illustration-b');
  assert.equal(b.className, 'carte exemple a-venir');
  assert.equal(b.querySelector('.badge').textContent, 'à venir');
  assert.equal(b.href, undefined);
});

test('accueil : au retour d’une page, défile jusqu’à sa carte', async () => {
  assert.equal((await accueil(undefined, '#illustration-c')).defile?.id, 'illustration-c');
  assert.equal((await accueil(undefined, '#absente')).defile, undefined);
  assert.equal((await accueil()).defile, undefined);
});

test('accueil : une configuration fausse lève, sans rien remplir', async () => {
  const { document } = installePage('index.html');
  await assert.rejects(demarreAccueil({ ...coursFactice().config, titre: '' }), /configuration\.titre/);
  assert.equal(document.getElementById('titre').textContent, '');
  assert.equal(document.body.dataset.ok, undefined);
});
