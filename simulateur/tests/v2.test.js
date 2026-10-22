// Tests de V2 : observateur de Luenberger, critère d'Euler, retour d'état sur x̂,
// commande échantillonnée. Les valeurs de référence sont celles du TD4.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { valeursPropres } from '../js/core/linalg.js';
import {
  facteurEuler,
  ligneSortie,
  matriceObservateur,
  observable,
  pasEulerMax,
  placementObservateur,
} from '../js/core/poles.js';
import { Simulation } from '../js/core/sim.js';
import { indications } from '../js/ui/hints.js';
import { applique, capture } from '../js/core/reglages.js';
import { depuisURL, versURL } from '../js/ui/url.js';
import pharma from '../js/exemples/pharmacocinetique.js';
import pendule from '../js/exemples/pendule-couple.js';

const proche = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const z = (re, im = 0) => ({ re, im });
const A = [[-1, 0], [1, 0]];
const C = ligneSortie(2, 1);

test('TD4 : A − LC avec L = (9, 7) a un pôle double en −4', () => {
  const ALC = matriceObservateur(A, C, [9, 7]);
  assert.deepEqual(ALC, [[-1, -9], [1, -7]]);
  valeursPropres(ALC).forEach((v) => {
    proche(v.re, -4, 1e-9);
    proche(v.im, 0, 1e-9);
  });
});

test('TD4 : le placement de pôles de l’observateur redonne L = (9, 7)', () => {
  const L = placementObservateur(A, C, [z(-4), z(-4)]);
  proche(L[0], 9);
  proche(L[1], 7);
  // Paire complexe : −2 ± 3i → λ² + 4λ + 13 = λ² + (1 + ℓ₂)λ + ℓ₁ + ℓ₂.
  const L2 = placementObservateur(A, C, [z(-2, 3), z(-2, -3)]);
  proche(L2[1], 3);
  proche(L2[0], 10);
});

test('TD4 : observabilité de (A, C) pour y = x₂, pas pour y = x₁', () => {
  assert.equal(observable(A, C), true);
  assert.equal(observable(A, ligneSortie(2, 0)), false);
});

test('TD4 : critère d’Euler, h < 2/λ pour un pôle double en −λ', () => {
  proche(pasEulerMax([z(-4), z(-4)]), 0.5);
  proche(pasEulerMax([z(-10), z(-10)]), 0.2);
  // Valeurs propres complexes −1 ± 2i : h < 2·1 / 5.
  proche(pasEulerMax([z(-1, 2), z(-1, -2)]), 0.4);
  // Aucun pas ne convient si une valeur propre est de partie réelle ≥ 0.
  assert.equal(pasEulerMax([z(-1), z(0)]), 0);
  assert.equal(pasEulerMax([z(-1), z(0.5)]), 0);
  // Le facteur d'amplification passe de < 1 à > 1 en h = h_max.
  assert.ok(facteurEuler([z(-4), z(-4)], 0.49) < 1);
  assert.ok(facteurEuler([z(-4), z(-4)], 0.51) > 1);
});

test('simulation : l’observateur converge pour h < 1/2 et diverge pour h > 1/2 (TD4)', () => {
  const sim = new Simulation(pharma);
  proche(sim.hMax, 0.5, 1e-9);
  proche(sim.rhoEuler, 0.8, 1e-9);
  for (const h of [0.05, 0.4]) {
    sim.fixePasObservateur(h);
    sim.reinitialise(pharma.x0);
    sim.avance(15);
    assert.ok(sim.normeErreur() < 1e-3, `h = ${h}`);
  }
  sim.fixePasObservateur(0.6);
  sim.evenements = [];
  sim.reinitialise(pharma.x0);
  sim.avance(40);
  assert.ok(sim.rhoEuler > 1);
  assert.ok(sim.obsDiverge);
  assert.ok(sim.evenements.some((e) => e.niveau === 'alerte' && e.texte.startsWith('L’observateur diverge')));
});

test('TD4 : avec L = 0, le jumeau numérique dérive, e → (0, e₁(0) + e₂(0))', () => {
  const sim = new Simulation(pharma);
  sim.fixeL([0, 0]);
  sim.reinitialise([1, 0]);
  sim.avance(20);
  const e = sim.erreurEstimation();
  proche(e[0], 0, 1e-3);
  proche(e[1], 1, 1e-2);
  assert.ok(sim.vpObs.some((v) => Math.abs(v.re) < 1e-9));
});

test('l’erreur d’estimation reste petite quelle que soit la commande injectée', () => {
  // En temps continu, e ne dépend pas de u (TD4). Avec Euler explicite, la commande est tenue
  // constante sur chaque pas de l'observateur : un écart d'ordre h subsiste, mais il reste petit.
  const erreurApres = (loi) => {
    const sim = new Simulation(pharma);
    sim.fixeMode('loi');
    sim.fixeLoi(loi);
    sim.reinitialise(pharma.x0);
    sim.avance(8);
    return sim.normeErreur();
  };
  assert.ok(erreurApres('0') < 1e-3);
  assert.ok(erreurApres('0.7*sin(3*t)') < 0.05);
  assert.ok(erreurApres('1.5') < 0.05);
});

test('principe de séparation : retour d’état sur x̂ stabilise x_2 sur x_{e,2}', () => {
  const sim = new Simulation(pharma);
  sim.fixeGains([[-0.5, -0.5]]); // pôles de A + BK en −1, −1
  sim.vpBF.forEach((v) => proche(v.re, -1, 1e-6));
  for (const xe of [1, 2.5]) {
    sim.fixeParametre('xe', xe);
    sim.reinitialise([1, 0]);
    sim.avance(25);
    proche(sim.x[0], 0, 1e-3);
    proche(sim.x[1], xe, 1e-3);
    assert.ok(sim.normeErreur() < 1e-3);
  }
});

test('retour sur x̂ ou sur x mesuré : même cible, mais pas le même transitoire', () => {
  const trajet = (surEstime) => {
    const sim = new Simulation(pharma);
    sim.fixeGains([[-0.5, -0.5]]);
    sim.fixeRetourEstime(surEstime);
    sim.reinitialise([1, 0]);
    sim.avance(0.6);
    return sim.x[1];
  };
  proche(trajet(true), trajet(false), 0.5);
  assert.notEqual(trajet(true), trajet(false));
});

test('bruit de mesure : l’observateur reste proche, avec une erreur bornée', () => {
  const sim = new Simulation(pharma);
  sim.sigma = 0.01;
  sim.reinitialise(pharma.x0);
  sim.avance(20);
  assert.ok(sim.normeErreur() < 0.2);
  assert.ok(!sim.obsDiverge);
});

test('commande échantillonnée : u constante entre deux mises à jour de période Te', () => {
  const sim = new Simulation(pharma);
  sim.fixeGains([[-0.5, -0.5]]);
  sim.fixeTe(0.5);
  sim.reinitialise([1, 0]);
  sim.avance(4);
  const u = sim.historique.u[0];
  const valeurs = new Set(u.map((v) => v.toFixed(9)));
  // 4 s / 0,5 s = 8 mises à jour (plus la valeur initiale) : au plus 9 valeurs distinctes.
  assert.ok(valeurs.size <= 9, `${valeurs.size} valeurs`);
  assert.ok(valeurs.size >= 6);
  // Et la commande continue (Te = 0) en prend beaucoup plus.
  sim.fixeTe(0);
  sim.reinitialise([1, 0]);
  sim.avance(4);
  assert.ok(new Set(sim.historique.u[0].map((v) => v.toFixed(9))).size > 50);
});

test('commande échantillonnée : au-delà d’un Te critique, le pendule bouclé n’est plus stabilisé', () => {
  // Gains par défaut K = (20, 5) : stable jusqu'à Te ≈ 0,4 s, instable à 0,5 s.
  const finale = (Te) => {
    const sim = new Simulation(pendule);
    sim.fixeTe(Te);
    sim.reinitialise([0.2, 0]);
    sim.avance(10);
    return Math.abs(sim.x[0]);
  };
  proche(finale(0.01), 0, 1e-3);
  proche(finale(0.3), 0, 1e-3);
  assert.ok(finale(0.5) > 1);
});

test('événement : observateur convergé, puis erreur qui ressort après un choc non vu', () => {
  const sim = new Simulation(pharma);
  sim.evenements = [];
  sim.reinitialise(pharma.x0);
  sim.avance(6);
  assert.ok(sim.evenements.some((e) => e.texte.startsWith('Observateur convergé')));
  // Le bolus change x sans que l'observateur le sache : l'erreur dépasse 2ε le temps qu'il rattrape.
  sim.choc();
  sim.avance(0.05);
  assert.ok(sim.evenements.some((e) => e.texte.startsWith('L’erreur d’estimation dépasse')));
  sim.avance(6);
  assert.ok(sim.normeErreur() < 1e-2);
});

test('indications : observabilité, convergence, critère d’Euler et séparation', () => {
  const sim = new Simulation(pharma);
  const textes = () => indications(sim).map((i) => `${i.niveau}|${i.texte}`);
  assert.ok(textes().some((t) => t.startsWith('ok|') && t.includes('observable')));
  assert.ok(textes().some((t) => t.startsWith('ok|') && t.includes('Hurwitz') && t.includes('tend vers')));
  assert.ok(textes().some((t) => t.startsWith('ok|') && t.includes('Euler explicite') && t.includes('h_{\\max}')));
  assert.ok(textes().some((t) => t.includes('principe de séparation')));
  sim.fixePasObservateur(0.6);
  assert.ok(textes().some((t) => t.startsWith('alerte|') && t.includes('ne converge pas')));
  sim.fixeL([0, 0]);
  assert.ok(textes().some((t) => t.startsWith('alerte|') && t.includes('n\'est pas Hurwitz') && t.includes('jumeau')));
  sim.fixeTe(0.2);
  assert.ok(textes().some((t) => t.includes('Commande échantillonnée')));
});

test('liens : L, h, x̂₀, Te et le retour sur x̂ traversent l’URL', () => {
  const a = new Simulation(pharma);
  a.fixeL([12, 8]);
  a.fixePasObservateur(0.1);
  a.obs.xh0 = [0.5, 0.2];
  a.Te = 0.25;
  a.fixeRetourEstime(false);
  const q = versURL(a.modele.id, capture(a, [1, 0]), { fantome: false, vitesse: 1 });
  const b = new Simulation(pharma);
  applique(b, depuisURL(new URLSearchParams(q.toString()), b.n, b.m).reglages);
  assert.deepEqual(b.obs.L, [12, 8]);
  assert.equal(b.obs.h, 0.1);
  assert.deepEqual(b.obs.xh0, [0.5, 0.2]);
  assert.equal(b.Te, 0.25);
  assert.equal(b.retourEstime, false);
  // Un exemple sans observateur ne produit aucun paramètre d'observateur.
  const c = new Simulation(pendule);
  assert.ok(!versURL(c.modele.id, capture(c, [0.3, 0]), { fantome: false, vitesse: 1 }).has('L'));
});
