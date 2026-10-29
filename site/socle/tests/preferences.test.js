// Préférences d'affichage d'une illustration : localStorage, types vérifiés,
// stockage absent ou défaillant.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Preferences, VERSION } from '../js/ui/preferences.js';
import { fauxStockage } from './aides/faux-stockage.js';

const faux = fauxStockage;
const DEFAUT = { longueur: 100, particules: true, nombre: 45 };

test('préférences : valeurs par défaut quand rien n’est gardé', () => {
  assert.deepEqual(new Preferences('k', DEFAUT, faux()).valeurs, DEFAUT);
});

test('préférences : une modification est gardée et relue', () => {
  const stockage = faux();
  new Preferences('k', DEFAUT, stockage).change({ longueur: 30, particules: false });
  assert.deepEqual(new Preferences('k', DEFAUT, stockage).valeurs, { longueur: 30, particules: false, nombre: 45 });
  // Une clé par illustration.
  assert.deepEqual(new Preferences('autre', DEFAUT, stockage).valeurs, DEFAUT);
});

test('préférences : clés inconnues, mauvais types et nombres non finis sont ignorés', () => {
  const stockage = faux();
  stockage.setItem('k', JSON.stringify({ version: VERSION, valeurs: { longueur: 'long', particules: 1, nombre: 80, intrus: 3 } }));
  const p = new Preferences('k', DEFAUT, stockage);
  assert.deepEqual(p.valeurs, { ...DEFAUT, nombre: 80 });
  p.change({ nombre: NaN, longueur: Infinity, autre: true });
  assert.deepEqual(p.valeurs, { ...DEFAUT, nombre: 80 });
});

test('préférences : JSON corrompu ou version inconnue, valeurs par défaut', () => {
  const stockage = faux();
  stockage.setItem('k', '{pas du json');
  assert.deepEqual(new Preferences('k', DEFAUT, stockage).valeurs, DEFAUT);
  stockage.setItem('k', JSON.stringify({ version: VERSION + 1, valeurs: { nombre: 7 } }));
  assert.deepEqual(new Preferences('k', DEFAUT, stockage).valeurs, DEFAUT);
});

test('préférences : sans stockage, ou stockage qui refuse l’écriture, la page marche', () => {
  const sans = new Preferences('k', DEFAUT, null);
  sans.change({ nombre: 10 });
  assert.equal(sans.valeurs.nombre, 10);
  const plein = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const p = new Preferences('k', DEFAUT, plein);
  assert.doesNotThrow(() => p.change({ nombre: 20 }));
  assert.equal(p.valeurs.nombre, 20);
});

test('préférences : un texte hors des valeurs permises est ignoré', () => {
  const stockage = faux();
  stockage.setItem('k', JSON.stringify({ version: VERSION, valeurs: { mode: 'xyz' } }));
  const choix = { mode: ['trace', 'mouvement'] };
  const p = new Preferences('k', { mode: 'trace' }, stockage, choix);
  assert.equal(p.valeurs.mode, 'trace');
  p.change({ mode: 'mouvement' });
  assert.equal(p.valeurs.mode, 'mouvement');
  p.change({ mode: 'autre' });
  assert.equal(p.valeurs.mode, 'mouvement');
});
