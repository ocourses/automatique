// Page d'une illustration (js/illustration.js) sur le modèle
// modeles/illustration.html : réglages lus et écrits dans l'URL, module monté avec
// ses outils, rappel, essais, « Réinitialiser », préférences sous
// `<id du cours>.illustration.<id>`, glossaire et navigation.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { demarreIllustration, lisEtat, versRecherche } from '../js/illustration.js';
import { coursFactice } from './aides/cours.js';
import { evenement } from './aides/faux-dom.js';
import { installePage } from './aides/page.js';

// Le cours factice, dont le module « a » relève ce que la page lui passe et ce
// qu'elle lui fait appliquer.
async function page(adresse = '?id=a', modifie = () => {}) {
  const cours = coursFactice();
  const releve = { outils: null, zone: null, appliques: [] };
  cours.modules.a.monte = (zone, outils) => {
    Object.assign(releve, { zone, outils });
    return { applique: (etat) => releve.appliques.push({ ...etat }) };
  };
  modifie(cours);
  const espions = installePage('illustration.html', adresse);
  await demarreIllustration(cours.config);
  const $ = (id) => espions.document.getElementById(id);
  return { ...cours, ...espions, releve, $ };
}

const clic = (element) => element.dispatchEvent(evenement('click'));
const boutons = (racine, texte) => racine.querySelectorAll('button').filter((b) => b.textContent === texte);
const reinitialiser = (document) => document.querySelector('.entete-actions').querySelectorAll('button').filter((b) => b.getAttribute('aria-label') === 'Réinitialiser');

test('lisEtat et versRecherche : aller-retour par l’URL, valeurs illisibles ou hors choix ignorées', () => {
  const defaut = { n: 3, fonction: 'dirichlet', anime: true };
  const q = versRecherche('x', { n: 1.5, fonction: 'sinus', anime: false });
  assert.equal(q.get('id'), 'x');
  assert.deepEqual(lisEtat(defaut, new URLSearchParams(q.toString())), { n: 1.5, fonction: 'sinus', anime: false });
  assert.deepEqual(lisEtat(defaut, new URLSearchParams('n=abc')), defaut);
  assert.equal(lisEtat(defaut, new URLSearchParams('fonction=foo'), { fonction: ['dirichlet', 'sinus'] }).fonction, 'dirichlet');
  assert.equal(versRecherche('x', { v: 0.1 + 0.2 }).get('v'), '0.3');
});

test('illustration : introuvable ou annoncée, la page le dit et ne charge rien', async () => {
  for (const adresse of ['?id=inconnue', '?id=b', '']) {
    const { $, charges } = await page(adresse);
    assert.equal($('titre').textContent, 'Illustration introuvable', adresse);
    assert.equal($('page').hidden, true);
    assert.equal($('introuvable').hidden, false);
    assert.deepEqual(charges, []);
    assert.equal($('page').ownerDocument.body.dataset.ok, '1', 'la page a démarré');
  }
});

test('illustration : titres de la page, du fil d’Ariane et de l’onglet, depuis le catalogue et la configuration', async () => {
  const { $, document, charges } = await page();
  assert.deepEqual(charges, ['a']);
  assert.equal(document.body.dataset.ok, '1');
  assert.equal(document.title, 'Illustration A · Cours factice');
  assert.equal($('titre').textContent, 'Illustration A');
  assert.equal($('source').textContent, 'Poly, 1.1');
  assert.equal($('fil-theme').textContent, 'Premier thème');
  assert.equal(document.querySelector('.retour').href, 'index.html#illustration-a');
  assert.deepEqual(document.querySelector('.entete-actions').querySelectorAll('a').map((a) => a.href), ['illustration.html?id=c']);
});

test('illustration : le module est monté dans la zone, avec l’état lu dans l’URL et ses outils', async () => {
  const { $, releve } = await page('?id=a&n=7&forme=triangle&anime=0');
  assert.ok(releve.zone === $('zone'));
  assert.deepEqual(releve.outils.etat, { n: 7, forme: 'carre', anime: false });
  assert.deepEqual(Object.keys(releve.outils).sort(), ['change', 'etat', 'glossaire', 'mouvementReduit', 'preferences', 'rend', 'rendTexte', 'surTheme']);
  assert.equal(releve.outils.mouvementReduit, false);
});

test('illustration : change(partiel) met l’état à jour et l’écrit dans l’URL', async () => {
  const { releve, adresses } = await page();
  releve.outils.change({ n: 4 });
  assert.equal(releve.outils.etat.n, 4);
  assert.deepEqual(adresses, ['?id=a&n=4&forme=carre&anime=1']);
});

test('illustration : un changement en attente est écrit quand on quitte la page', async () => {
  const { releve, adresses, ecouteurs } = await page();
  releve.outils.change({ n: 4 });
  releve.outils.change({ n: 5 });
  assert.equal(adresses.length, 1, 'deuxième écriture différée');
  ecouteurs.pagehide.forEach((f) => f());
  assert.equal(adresses.at(-1), '?id=a&n=5&forme=carre&anime=1');
});

test('illustration : préférences sous <id du cours>.illustration.<id>, onglet compris', async () => {
  const { releve, stockage } = await page();
  assert.deepEqual(releve.outils.preferences.valeurs, { onglet: 'rappel', particules: true });
  releve.outils.preferences.change({ particules: false });
  assert.deepEqual([...stockage.donnees.keys()], ['cours-factice.illustration.a']);
});

test('illustration : le rappel rend textes, formule seule et liste à puces', async () => {
  const { $ } = await page('?id=a', ({ modules }) => {
    modules.a.rappel = ['Texte $x$.', '$$y$$', ['un', 'deux']];
    modules.a.termes = [];
  });
  const rappel = $('rappel');
  assert.deepEqual(rappel.children.map((e) => e.tagName), ['P', 'P', 'UL']);
  assert.equal(rappel.children[1].textContent, 'y');
  assert.deepEqual(rappel.children[2].children.map((li) => li.textContent), ['un', 'deux']);
});

test('illustration : un essai avec réglage a son bouton, qui applique réglage et préférences', async () => {
  const { $, releve } = await page('?id=a', ({ modules }) => {
    modules.a.essais[0].preferences = { particules: false };
  });
  const essais = $('essais').children;
  assert.equal(essais.length, 2);
  assert.equal($('onglet-essais').hidden, false);
  assert.equal(boutons(essais[1], 'Essayer').length, 0, 'sans réglage, pas de bouton');
  clic(boutons(essais[0], 'Essayer')[0]);
  assert.deepEqual(releve.appliques, [{ forme: 'rond', n: 5 }]);
  assert.deepEqual(releve.outils.etat, { n: 5, forme: 'rond', anime: true });
  assert.equal(releve.outils.preferences.valeurs.particules, false);
});

test('illustration : sans essai, l’onglet « À essayer » est caché', async () => {
  const { $ } = await page('?id=a', ({ modules }) => (modules.a.essais = []));
  assert.equal($('onglet-essais').hidden, true);
});

test('illustration : « Réinitialiser » remet les réglages par défaut, et n’existe pas sans réglage', async () => {
  const { document, releve } = await page('?id=a&n=9');
  const [reinit] = reinitialiser(document);
  assert.ok(reinit === document.querySelector('.entete-actions').children[0], 'en tête des actions');
  assert.equal(reinit.textContent, '↺', 'le symbole seul, pour que les titres longs tiennent sur une ligne (#26)');
  assert.match(reinit.title, /^Réinitialiser : /);
  clic(reinit);
  assert.deepEqual(releve.appliques, [{ n: 3, forme: 'carre', anime: true }]);
  assert.equal(releve.outils.etat.n, 3);

  const sans = await page('?id=a', ({ modules }) => {
    delete modules.a.etat;
    modules.a.essais = [];
  });
  assert.equal(reinitialiser(sans.document).length, 0);
});

test('illustration : les termes du module sont soulignés dans le rappel et les essais, et par outils.glossaire', async () => {
  const { $, document, releve } = await page('?id=a', ({ modules }) => {
    modules.a.essais = [{ texte: 'Une tribu encore.' }];
  });
  assert.equal($('rappel').querySelector('.terme').textContent, 'tribu');
  assert.equal($('essais').querySelector('.terme').textContent, 'tribu');
  const p = document.createElement('p');
  p.textContent = 'les tribus';
  releve.outils.glossaire(p, ['tribu']);
  assert.equal(p.querySelector('.terme').textContent, 'tribus');
});

test('illustration : l’onglet ouvert est celui des préférences, et changer d’onglet l’enregistre', async () => {
  const { document, stockage } = await page('?id=a', ({ config }) => {
    config.id = 'autre';
  });
  const [rappel, essais] = document.querySelectorAll('[role=tab]');
  assert.equal(rappel.getAttribute('aria-selected'), 'true');
  clic(essais);
  assert.match(stockage.donnees.get('autre.illustration.a'), /"onglet":"essais"/);
});

test('illustration : une configuration fausse lève, sans rien charger', async () => {
  const cours = coursFactice();
  installePage('illustration.html', '?id=a');
  await assert.rejects(demarreIllustration({ ...cours.config, id: 'Majuscules' }), /configuration\.id/);
  assert.deepEqual(cours.charges, []);
});
