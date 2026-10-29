// Configuration d'un cours (js/config.js) : forme de site.config.js, contrat des
// modules d'illustration, parcours. Un cours factice et valide (tests/aides/cours.js)
// est abîmé d'une seule façon par cas : chaque faute doit être relevée, et nommée.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fautesConfig, fautesCours, valideConfig, verifieCours } from '../js/config.js';
import { coursFactice } from './aides/cours.js';

// Une seule faute, qui contient `attendu`.
const uneFaute = (fautes, attendu, cas) => {
  assert.equal(fautes.length, 1, `${cas} : ${JSON.stringify(fautes)}`);
  assert.match(fautes[0], attendu, cas);
};

test('config : le cours factice est valide, sans rien charger', async () => {
  const { config, charges } = coursFactice();
  assert.deepEqual(fautesConfig(config), []);
  assert.equal(valideConfig(config), config);
  assert.deepEqual(charges, []);
  assert.deepEqual(await fautesCours(config), []);
});

test('config : chaque faute de forme est relevée et nommée', () => {
  const cas = [
    ['id en majuscules', (c) => (c.id = 'Mesure'), /configuration\.id/],
    ['titre vide', (c) => (c.titre = ' '), /configuration\.titre/],
    ['sous-titre absent', (c) => delete c.sousTitre, /configuration\.sousTitre/],
    ['intro vide', (c) => (c.intro = []), /configuration\.intro/],
    ['intro qui n’est pas du texte', (c) => (c.intro = ['ok', 3]), /configuration\.intro/],
    ['dépôt sans organisation', (c) => (c.depotIssues = 'mesure'), /depotIssues/],
    ['charge absente', (c) => delete c.charge, /configuration\.charge/],
    ['pagesDuTheme qui n’est pas une fonction', (c) => (c.pagesDuTheme = []), /pagesDuTheme/],
    ['clé mal orthographiée', (c) => (c.sousTitres = 'x'), /clé inconnue « sousTitres »/],
    ['aucun thème', (c) => (c.themes = []), /configuration\.themes/],
    ['thème sans source', (c) => delete c.themes[0].source, /themes\[0\]\.source/],
    ['clé inconnue dans un thème', (c) => (c.themes[1].simulateur = true), /themes\[1\] : clé inconnue « simulateur »/],
    ['thème en double', (c) => (c.themes[1].id = 't1'), /« t1 » en double/],
    ['illustration en double, dans un autre thème', (c) => (c.themes[1].illustrations[0].id = 'a'), /« a » en double/],
    ['identifiant d’illustration invalide', (c) => (c.themes[0].illustrations[0].id = 'A b'), /illustrations\[0\]\.id/],
    ['disponible qui n’est pas un booléen', (c) => (c.themes[0].illustrations[1].disponible = 'non'), /disponible/],
    ['résumé absent', (c) => delete c.themes[1].illustrations[0].resume, /illustrations\[0\]\.resume/],
    ['glossaire absent', (c) => delete c.glossaire, /configuration\.glossaire/],
    ['terme sans forme', (c) => (c.glossaire.tribu.formes = []), /glossaire\.tribu\.formes/],
    ['terme sans définition', (c) => delete c.glossaire.tribu.definition, /glossaire\.tribu\.definition/],
  ];
  for (const [nom, abime, attendu] of cas) {
    const { config } = coursFactice();
    abime(config);
    uneFaute(fautesConfig(config), attendu, nom);
  }
  uneFaute(fautesConfig(null), /doit être un objet/, 'configuration nulle');
});

test('config : toutes les fautes sont listées d’un coup, dans une seule erreur', () => {
  const { config } = coursFactice();
  Object.assign(config, { id: 'X', depotIssues: '', intro: [] });
  assert.equal(fautesConfig(config).length, 3);
  assert.throws(
    () => valideConfig(config),
    (e) => /3 faute\(s\)/.test(e.message) && ['configuration.id', 'configuration.intro', 'depotIssues'].every((m) => e.message.includes(m)),
  );
});

test('cours : seuls les modules des illustrations disponibles sont chargés', async () => {
  const { config, charges } = coursFactice();
  await verifieCours(config);
  assert.deepEqual(charges, ['a', 'c']);
});

test('cours : une configuration fautive ne fait charger aucun module', async () => {
  const { config, charges } = coursFactice();
  config.id = 'X';
  await assert.rejects(verifieCours(config), /configuration\.id/);
  assert.deepEqual(charges, []);
});

test('cours : chaque écart au contrat d’un module est relevé et nommé', async () => {
  const cas = [
    ['monte absente', (m) => delete m.monte, /illustration a : monte/],
    ['clé inconnue', (m) => (m.reglages = {}), /clé inconnue « reglages »/],
    ['etat qui n’est pas un objet', (m) => (m.etat = []), /illustration a\.etat/],
    ['essai qui règle un réglage inconnu', (m) => (m.essais[0].etat.taille = 2), /essai 1, réglage : « taille » inconnu/],
    ['essai d’un autre type', (m) => (m.essais[0].etat.n = '5'), /« n » de type string, number attendu/],
    ['essai hors des choix', (m) => (m.essais[0].etat.forme = 'triangle'), /« forme = triangle » hors de ses choix/],
    ['essai qui règle une préférence inconnue', (m) => (m.essais[1].preferences.zoom = 2), /essai 2, préférence : « zoom » inconnu/],
    ['onglet hors des choix de la page', (m) => (m.essais[1].preferences.onglet = 'notes'), /« onglet = notes » hors de ses choix/],
    ['essai sans texte', (m) => (m.essais[0].texte = ''), /essai 1\.texte/],
    ['terme absent du glossaire', (m) => m.termes.push('mesure'), /terme « mesure » absent du glossaire/],
  ];
  for (const [nom, abime, attendu] of cas) {
    const { config, modules } = coursFactice();
    abime(modules.a);
    uneFaute(await fautesCours(config), attendu, nom);
  }
});

test('cours : un module absent, sans export par défaut ou qui ne se charge pas est relevé', async () => {
  let { config, modules } = coursFactice();
  delete modules.c;
  uneFaute(await fautesCours(config), /illustration c : le module doit exporter par défaut un objet/, 'module absent');
  ({ config } = coursFactice());
  config.charge = async (id) => {
    if (id === 'c') throw new Error('Cannot find module c.js');
    return { default: coursFactice().modules[id] };
  };
  uneFaute(await fautesCours(config), /illustration c : le module ne se charge pas \(Cannot find module c\.js\)/, 'import qui échoue');
});

test('cours : les pages ajoutées par pagesDuTheme sont vérifiées', async () => {
  const page = { genre: 'exemple', id: 'segway', titre: 'Segway', lien: 'exemple.html?id=segway' };
  const { config } = coursFactice();
  config.pagesDuTheme = (theme) => (theme.id === 't2' ? [page] : []);
  assert.deepEqual(await fautesCours(config), []);
  config.pagesDuTheme = () => [page];
  uneFaute(await fautesCours(config), /parcours\[3\] : page « exemple-segway » en double/, 'page ajoutée à deux thèmes');
  config.pagesDuTheme = (theme) => (theme.id === 't2' ? [{ ...page, lien: '' }] : []);
  uneFaute(await fautesCours(config), /parcours\[2\]\.lien/, 'page sans lien');
  config.pagesDuTheme = () => {
    throw new Error('catalogue introuvable');
  };
  uneFaute(await fautesCours(config), /pagesDuTheme a échoué \(catalogue introuvable\)/, 'pagesDuTheme qui lève');
});
