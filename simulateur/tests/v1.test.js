// Tests des exemples et des fonctions du moteur : perturbation, action
// intégrale, saturation, choc, fantôme et liens par URL.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Simulation } from '../js/core/sim.js';
import { applique, capture } from '../js/core/reglages.js';
import { depuisURL, versURL } from '../js/ui/url.js';
import doubleIntegrateur from '../js/exemples/double-integrateur.js';
import pendule from '../js/exemples/pendule-couple.js';
import balai from '../js/exemples/pendule-acceleration.js';
import rail from '../js/exemples/rail-tournant.js';
import { catalogue } from '../js/exemples/catalogue.js';

const proche = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('le catalogue annonce les modules présents', async () => {
  for (const e of catalogue.filter((e) => e.disponible)) {
    const m = (await import(`../js/exemples/${e.id}.js`)).default;
    assert.equal(m.id, e.id);
  }
});

test('chaque exemple disponible se stabilise avec ses réglages par défaut', () => {
  for (const m of [doubleIntegrateur, pendule, rail]) {
    const sim = new Simulation(m);
    sim.avance(20);
    sim.x.forEach((v, i) => proche(v, sim.xe[i], 1e-3));
  }
});

test('double intégrateur : K = (−1, −2) donne la valeur propre double −1 (TD3)', () => {
  const sim = new Simulation(doubleIntegrateur);
  sim.vpBF.forEach((z) => {
    proche(z.re, -1);
    proche(z.im, 0);
  });
});

test('rail tournant : pôles par défaut en −1 (examen 2024-2025), loi libre équivalente', () => {
  const sim = new Simulation(rail);
  sim.vpBF.forEach((z) => proche(z.re, -1, 1e-6));
  sim.fixeMode('loi');
  assert.equal(sim.erreurLoi, null);
  sim.vpBF.forEach((z) => proche(z.re, -1, 1e-5));
});

test('balai : retour de sortie u = ky, V du TD3 conservée', () => {
  const sim = new Simulation(balai);
  const V0 = balai.invariant(sim.x, sim.p, sim.K).valeur;
  sim.avance(10);
  proche(balai.invariant(sim.x, sim.p, sim.K).valeur, V0, 1e-6);
  sim.vpBF.forEach((z) => proche(z.re, 0, 1e-9));
});

test('balai : équilibre penché, u_e = g tan x_{e,1}', () => {
  const sim = new Simulation(balai);
  sim.fixeParametre('ae', 0.3);
  proche(sim.ue[0], 9.81 * Math.tan(0.3));
  sim.fixeGains([[30, 5]]);
  sim.reinitialise([0.4, 0]);
  sim.avance(15);
  proche(sim.x[0], 0.3, 1e-4);
});

test('perturbation constante : erreur statique du TD2, supprimée par l’action intégrale', () => {
  const sim = new Simulation(pendule);
  sim.perturbation = { type: 'constante', e: 2, debut: 0, duree: 0 };
  sim.reinitialise([0.3, 0]);
  sim.avance(20);
  const xinf = sim.equilibrePerturbe();
  // Erreur statique du linéarisé : −(A + BK)⁻¹ B e, ici θ∞ = −e/(k₁ − mgl).
  proche(xinf[0], -2 / (20 - 9.81), 1e-9);
  proche(sim.x[0], xinf[0], 5e-3); // le non linéaire en est proche
  sim.fixeMode('loi');
  assert.equal(sim.fixeLoi('20*x1 + 5*x2 + 10*ix1'), null);
  assert.equal(sim.Jbf.length, 3);
  assert.ok(sim.vpBF.every((z) => z.re < 0));
  sim.reinitialise([0.3, 0]);
  sim.avance(40);
  proche(sim.x[0], 0, 1e-4);
});

test('créneau : rejet d’une perturbation transitoire (TD2)', () => {
  const sim = new Simulation(pendule);
  sim.perturbation = { type: 'creneau', e: 3, debut: 1, duree: 1 };
  sim.reinitialise([0, 0]);
  sim.avance(1.5);
  assert.ok(Math.abs(sim.x[0]) > 1e-2);
  sim.avance(15);
  proche(sim.x[0], 0, 1e-4);
});

test('saturation : la commande appliquée reste bornée', () => {
  const sim = new Simulation(pendule);
  sim.saturation = { active: true, umax: 3 };
  sim.reinitialise([0.5, 0]);
  sim.avance(0.5);
  assert.ok(sim.historique.u[0].every((u) => Math.abs(u) <= 3 + 1e-12));
});

test('loi libre : x_e qui n’est pas un équilibre du bouclé est signalé', () => {
  const sim = new Simulation(balai);
  sim.fixeParametre('ae', 0.3);
  sim.fixeMode('loi');
  sim.fixeLoi('15*(x1 - xe1)'); // oublie u_e
  assert.equal(sim.equilibreBoucle, false);
  sim.fixeLoi('ue + 15*(x1 - xe1)');
  assert.equal(sim.equilibreBoucle, true);
});

test('choc et fantôme : le fantôme suit le linéarisé bouclé', () => {
  const sim = new Simulation(pendule);
  sim.reinitialise([0.01, 0]);
  sim.choc();
  proche(sim.x[1], 1.5);
  proche(sim.fantome[1], 1.5);
  sim.avance(3);
  // Petits écarts : non linéaire et linéarisé restent proches.
  sim.x.forEach((v, i) => proche(v, sim.xFantome[i], 1e-2));
});

test('liens : un réglage traverse l’URL sans perte', () => {
  const a = new Simulation(pendule);
  a.fixeParametre('m', 1.5);
  a.fixeGains([[30, 6]]);
  a.fixeLoi('20*x1 + 5*x2 + 10*ix1');
  a.fixeMode('loi');
  a.perturbation = { type: 'creneau', e: 1.5, debut: 2, duree: 0.5 };
  a.sigma = 0.01;
  a.saturation = { active: true, umax: 7 };
  const q = versURL(a.modele.id, capture(a, [0.2, -1]), { fantome: true, vitesse: 0.5 });
  const b = new Simulation(pendule);
  const { reglages, affichage } = depuisURL(new URLSearchParams(q.toString()), b.n, b.m);
  const ci = applique(b, reglages);
  assert.deepEqual(ci, [0.2, -1]);
  assert.deepEqual(affichage, { fantome: true, vitesse: 0.5 });
  assert.equal(b.p.m, 1.5);
  assert.deepEqual(b.K, [[30, 6]]);
  assert.equal(b.mode, 'loi');
  assert.equal(b.loiTexte, '20*x1 + 5*x2 + 10*ix1');
  assert.deepEqual(b.perturbation, { type: 'creneau', e: 1.5, debut: 2, duree: 0.5 });
  assert.equal(b.sigma, 0.01);
  assert.deepEqual(b.saturation, { active: true, umax: 7 });
});

test('événements du journal : entrée dans la boule ε, puis sortie sous perturbation', () => {
  const sim = new Simulation(pendule);
  sim.evenements = [];
  sim.reinitialise([0.3, 0]);
  sim.avance(10);
  const entree = sim.evenements.find((e) => e.texte.startsWith('Entrée'));
  assert.ok(entree && entree.t > 0.5 && entree.t < 5, 'entrée dans la boule');
  assert.equal(sim.dansBoule, true);
  proche(sim.entreeBoule, entree.t, 1e-9);
  // Un choc violent fait sortir l'état de la boule 2ε.
  sim.choc();
  sim.avance(0.2);
  assert.ok(sim.evenements.some((e) => e.texte.startsWith('Sortie')));
  assert.equal(sim.dansBoule, false);
});

test('un seuil ε plus grand est franchi plus tôt', () => {
  const instant = (seuil) => {
    const sim = new Simulation(pendule);
    sim.fixeSeuil(seuil);
    sim.evenements = [];
    sim.reinitialise([0.3, 0]);
    sim.avance(10);
    return sim.evenements.find((e) => e.texte.startsWith('Entrée')).t;
  };
  assert.ok(instant(0.1) < instant(0.001));
});

test('événements du journal : saturation signalée une fois, puis fin de saturation', () => {
  const sim = new Simulation(pendule);
  // Départ à u = 6 > 5, puis retour sous la borne ; la tenue de l'angle exige moins de 5 N·m.
  sim.saturation = { active: true, umax: 5 };
  sim.evenements = [];
  sim.reinitialise([0.3, 0]);
  sim.avance(10);
  const textes = sim.evenements.map((e) => e.texte);
  assert.equal(textes.filter((t) => t.startsWith('Saturation atteinte')).length, 1);
  assert.ok(textes.includes('Fin de saturation'));
});

test('événements du journal : divergence', () => {
  const sim = new Simulation(pendule);
  sim.evenements = [];
  sim.reinitialise([1e7, 0]);
  sim.avance(0.1);
  assert.equal(sim.diverge, true);
  assert.ok(sim.evenements.some((e) => e.niveau === 'alerte' && e.texte.startsWith('Divergence')));
});

test('pendule : le point de fonctionnement est réglable, u_e = mgl sin x_e,1', () => {
  const sim = new Simulation(pendule);
  sim.fixeParametre('xe', 0.8);
  proche(sim.xe[0], 0.8);
  proche(sim.ue[0], 9.81 * Math.sin(0.8));
  // A = [[0, 1], [(g/l) cos x_e, 0]] ; la condition du poly devient k₁ > mgl cos x_e.
  proche(sim.A[1][0], 9.81 * Math.cos(0.8), 1e-5);
  sim.fixeGains([[9.81 * Math.cos(0.8) + 10, 4]]);
  sim.reinitialise([1, 0]);
  sim.avance(15);
  proche(sim.x[0], 0.8, 1e-4);
  sim.fixeGains([[9.81 * Math.cos(0.8) - 1, 3]]);
  assert.ok(sim.vpBF.some((z) => z.re > 0));
});

test('chaque paramètre de famille d’équilibre est déclaré par les exemples concernés', () => {
  for (const m of [doubleIntegrateur, pendule, balai, rail]) {
    const libres = m.parametres.filter((q) => q.famille === 'equilibre');
    assert.equal(libres.length, 1, m.id);
  }
});
