// Tests de la description des exemples (Modele), des réglages sérialisables,
// de la mémoire du navigateur, du tirage des chocs et des graduations d'axe.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GenerateurChocs } from '../js/core/chocs.js';
import { Modele, estLineaire, verifie } from '../js/core/modele.js';
import { applique, capture } from '../js/core/reglages.js';
import { Simulation } from '../js/core/sim.js';
import { AFFICHAGE_DEFAUT, Memoire, normaliseAffichage } from '../js/ui/etat.js';
import { etiquettesAxe } from '../js/ui/format.js';
import { depuisURL, porteReglages } from '../js/ui/url.js';
import { catalogue } from '../js/exemples/catalogue.js';
import pendule from '../js/exemples/pendule-couple.js';
import pharma from '../js/exemples/pharmacocinetique.js';

const exemples = await Promise.all(
  catalogue.filter((e) => e.disponible).map(async (e) => (await import(`../js/exemples/${e.id}.js`)).default),
);
const parId = Object.fromEntries(exemples.map((m) => [m.id, m]));

// Générateur pseudo-aléatoire reproductible (congruentiel).
function graine(s) {
  let x = s;
  return () => {
    x = (1664525 * x + 1013904223) % 2 ** 32;
    return x / 2 ** 32;
  };
}

// ---- Modele -----------------------------------------------------------------

test('chaque exemple du catalogue est une description valide', () => {
  for (const m of exemples) assert.deepEqual(verifie(m), [], m.id);
});

test('linéarité détectée : double intégrateur et pharmacocinétique seulement', () => {
  const lineaires = exemples.filter((m) => estLineaire(m)).map((m) => m.id).sort();
  assert.deepEqual(lineaires, ['double-integrateur', 'pharmacocinetique']);
});

test('disposition : déclarée par l’exemple, sinon déduite de la présence d’une scène', () => {
  assert.equal(new Modele(parId['double-integrateur']).disposition, 'large');
  assert.equal(new Modele(parId.segway).disposition, 'large');
  assert.equal(new Modele(pendule).disposition, 'colonnes');
  assert.equal(new Modele(pharma).disposition, 'courbes');
  assert.equal(new Modele(parId.satellite).disposition, 'courbes');
});

test('propriétés dérivées du modèle', () => {
  const m = new Modele(pharma);
  assert.equal(m.aScene, false);
  assert.equal(m.aObservateur, true);
  assert.equal(m.aPortrait, true);
  assert.equal(m.uneCommande, true);
  assert.equal(new Modele(parId.satellite).uneCommande, false);
  assert.equal(Modele.de(m), m);
});

test('une description incohérente est refusée avec un message lisible', () => {
  assert.throws(() => new Modele({ ...pendule, x0: [0.3] }), /x0.*2 composantes/);
  assert.throws(() => new Modele({ ...pendule, disposition: 'diagonale' }), /disposition/);
  assert.throws(() => new Modele({ ...pharma, disposition: 'large' }), /demande une scène/);
  assert.throws(() => new Modele({ ...pendule, equilibre: () => ({ xe: [0.5, 0], ue: [0] }) }), /n’est pas un équilibre/);
  const { f, ...sansF } = pendule;
  assert.ok(f);
  assert.throws(() => new Modele(sansF), /« f » manquant/);
});

test('linéarité : déclaration explicite prioritaire', () => {
  assert.equal(new Modele({ ...pendule, lineaire: true }).lineaire, true);
  assert.equal(new Modele(pendule).lineaire, false);
});

// ---- Réglages -----------------------------------------------------------------

test('réglages : capture puis applique redonne la même simulation', () => {
  const a = new Simulation(pharma);
  a.fixeParametre('xe', 2);
  a.fixeGains([[-0.5, -1]]);
  a.fixeMode('loi');
  a.fixeLoi('ue - 0.5*x1');
  a.perturbation = { type: 'creneau', e: 0.3, debut: 2, duree: 1 };
  a.sigma = 0.02;
  a.saturation = { active: false, umax: 1.5 };
  a.Te = 0.1;
  a.fixeSeuil(0.05);
  a.fixeL([12, 8]);
  a.obs.h = 0.02;
  a.obs.xh0 = [0.1, 0.2];
  a.fixeRetourEstime(false);
  const r = JSON.parse(JSON.stringify(capture(a, [0.5, 0.5])));
  const b = new Simulation(pharma);
  const ci = applique(b, r);
  assert.deepEqual(ci, [0.5, 0.5]);
  assert.deepEqual(capture(b, ci), r);
  // La saturation inactive garde sa borne (le stockage la retient, pas l'URL).
  assert.deepEqual(b.saturation, { active: false, umax: 1.5 });
});

test('réglages : les valeurs illisibles sont ignorées', () => {
  const sim = new Simulation(pendule);
  const ci = applique(sim, { p: { m: 'lourd', l: 1.5 }, K: [[1]], x0: [1, 2, 3], sigma: -1, mode: 'autre', seuil: 0 });
  assert.equal(sim.p.m, 1);
  assert.equal(sim.p.l, 1.5);
  assert.deepEqual(sim.K, [[20, 5]]);
  assert.deepEqual(ci, pendule.x0);
  assert.equal(sim.sigma, 0);
  assert.equal(sim.mode, 'gains');
  assert.equal(sim.seuil, 0.01);
});

test('URL : seul l’identifiant ne porte pas de réglages', () => {
  assert.equal(porteReglages(new URLSearchParams('id=pendule-couple')), false);
  assert.equal(porteReglages(new URLSearchParams('id=pendule-couple&K=1,2')), true);
  // Un K de mauvaise dimension est ignoré.
  assert.equal(depuisURL(new URLSearchParams('K=1,2,3'), 2, 1).reglages.K, undefined);
});

// ---- Mémoire du navigateur ----------------------------------------------------------

class StockageFactice {
  constructor() {
    this.d = new Map();
  }
  getItem(k) {
    return this.d.has(k) ? this.d.get(k) : null;
  }
  setItem(k, v) {
    this.d.set(k, String(v));
  }
  removeItem(k) {
    this.d.delete(k);
  }
}

test('mémoire : écrit, relit, efface, une clé par exemple', () => {
  const s = new StockageFactice();
  const a = new Memoire('pendule-couple', s);
  const b = new Memoire('segway', s);
  assert.equal(a.lit(), null);
  const affichage = { ...AFFICHAGE_DEFAUT, vitesse: 2, consoleRepliee: true, onglets: { reglages: 'systeme' } };
  a.ecrit({ sigma: 0.1 }, affichage);
  assert.deepEqual(a.lit(), { reglages: { sigma: 0.1 }, affichage });
  assert.equal(b.lit(), null);
  a.efface();
  assert.equal(a.lit(), null);
});

test('mémoire : contenu illisible, ancienne version ou stockage absent', () => {
  const s = new StockageFactice();
  const a = new Memoire('x', s);
  s.setItem(a.cle, '{pas du json');
  assert.equal(a.lit(), null);
  s.setItem(a.cle, JSON.stringify({ version: 0, reglages: {} }));
  assert.equal(a.lit(), null);
  const sans = new Memoire('x', null);
  sans.ecrit({}, AFFICHAGE_DEFAUT);
  assert.equal(sans.lit(), null);
  const refuse = new Memoire('x', {
    getItem() {
      throw new Error('refusé');
    },
    setItem() {
      throw new Error('plein');
    },
    removeItem() {},
  });
  assert.equal(refuse.lit(), null);
  refuse.ecrit({}, AFFICHAGE_DEFAUT); // ne lève pas
});

test('affichage : valeurs invalides remplacées par les valeurs par défaut', () => {
  assert.deepEqual(normaliseAffichage({ vitesse: 3, fantome: 'oui', onglets: { a: 'b', c: 4 } }), {
    ...AFFICHAGE_DEFAUT,
    onglets: { a: 'b' },
  });
  assert.deepEqual(normaliseAffichage(), { ...AFFICHAGE_DEFAUT, onglets: {} });
});

// ---- Chocs -------------------------------------------------------------------------

test('chocs : le premier est nouveau, les suivants le plus souvent voisins', () => {
  const g = new GenerateurChocs({ aleatoire: graine(1) });
  const premier = g.suivant();
  assert.equal(premier.nouveau, true);
  let nouveaux = 0;
  let memeSens = 0;
  let precedent = premier;
  const N = 20000;
  for (let k = 0; k < N; k++) {
    const c = g.suivant();
    assert.ok(c.intensite >= 0 && c.intensite <= g.max);
    assert.ok(c.sens === 1 || c.sens === -1);
    assert.equal(c.facteur, c.sens * c.intensite);
    if (c.nouveau) nouveaux++;
    else {
      assert.equal(c.sens, precedent.sens);
      assert.ok(Math.abs(c.intensite - precedent.intensite) < 6 * g.dispersion * g.max);
    }
    if (c.sens === precedent.sens) memeSens++;
    precedent = c;
  }
  // Un choc nouveau tous les 7 clics environ ; le sens ne change qu'à un choc nouveau, une fois sur deux.
  assert.ok(Math.abs(nouveaux / N - 1 / 7) < 0.01, `${nouveaux / N}`);
  assert.ok(Math.abs(1 - memeSens / N - 1 / 14) < 0.01, `${memeSens / N}`);
});

test('chocs : un choc nouveau tire sens et intensité uniformément', () => {
  const g = new GenerateurChocs({ probaNouveau: 1, aleatoire: graine(7) });
  const N = 20000;
  let positifs = 0;
  let somme = 0;
  for (let k = 0; k < N; k++) {
    const c = g.suivant();
    if (c.sens > 0) positifs++;
    somme += c.intensite;
  }
  assert.ok(Math.abs(positifs / N - 0.5) < 0.02);
  assert.ok(Math.abs(somme / N - g.max / 2) < 0.03);
});

test('choc appliqué : facteur × choc de l’exemple, sur le système et le fantôme', () => {
  const sim = new Simulation(pendule);
  sim.reinitialise([0, 0]);
  const dv = sim.choc(-0.5);
  assert.deepEqual(dv, [-0, -0.75]);
  assert.equal(sim.x[1], -0.75);
  assert.equal(sim.fantome[1], -0.75);
});

// ---- Graduations ---------------------------------------------------------------------

test('graduations : ordre de grandeur visible près de 0', () => {
  assert.deepEqual(etiquettesAxe([-0.002, -0.001, 0, 0.001, 0.002]), ['−2e−3', '−1e−3', '0', '1e−3', '2e−3']);
  assert.deepEqual(etiquettesAxe([0, 5e-10, 1e-9, 1.5e-9]), ['0', '0,5e−9', '1,0e−9', '1,5e−9']);
  assert.deepEqual(etiquettesAxe([-1, -0.5, 0, 0.5, 1]), ['−1,0', '−0,5', '0', '0,5', '1,0']);
  assert.deepEqual(etiquettesAxe([0, 20, 40]), ['0', '20', '40']);
  assert.deepEqual(etiquettesAxe([0, 2e5, 4e5]), ['0', '2e5', '4e5']);
  assert.deepEqual(etiquettesAxe([0.01, 0.02, 0.03]), ['0,01', '0,02', '0,03']);
  assert.deepEqual(etiquettesAxe([0, 0]), ['0', '0']);
});
