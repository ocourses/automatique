// Page générique d'un exemple : exemple.html?id=<identifiant>.

import { catalogue } from './exemples/catalogue.js';
import { Simulation } from './core/sim.js';
import { champ, saisieNombre } from './ui/controls.js';
import { dessinePlan } from './ui/eigen.js';
import { latexMatrice } from './ui/format.js';
import { afficheIndications } from './ui/hints.js';
import { rend, rendStatique } from './ui/katex.js';
import { Courbes } from './ui/plots.js';
import { Scene } from './ui/scene.js';
import { surChangementTheme } from './ui/theme.js';

const $ = (id) => document.getElementById(id);
const PERIODE_COURBES = 50; // ms entre deux rafraîchissements des courbes

async function charge() {
  const id = new URLSearchParams(location.search).get('id');
  const entree = catalogue.find((e) => e.id === id && e.disponible);
  if (!entree) {
    $('titre').textContent = 'Exemple introuvable';
    $('page').hidden = true;
    $('introuvable').hidden = false;
    return;
  }
  const modele = (await import(`./exemples/${entree.id}.js`)).default;
  demarre(modele);
}

function demarre(modele) {
  document.title = `${modele.titre} · Simulateur de stabilisation`;
  $('titre').textContent = modele.titre;
  $('source').textContent = modele.source;
  rendStatique($('page'));

  const sim = new Simulation(modele);
  let ci = modele.x0.slice();
  let enLecture = true;
  let saisi = false;

  // ---- Modèle --------------------------------------------------------------
  rend($('modele'), modele.latex.modele);
  rend($('etats'), modele.etats.map((e) => e.latex).join(', \\quad '), false);
  rend($('equilibre'), modele.latex.equilibre);
  rend($('loi'), 'u = u_e + K(x - x_e)');

  // ---- Paramètres ----------------------------------------------------------
  for (const q of modele.parametres) {
    champ($('parametres'), q, (v) => {
      sim.fixeParametre(q.nom, v);
      analyse();
      scene?.dessine();
    });
  }

  // ---- Gains ---------------------------------------------------------------
  const m = modele.commandes.length;
  sim.K.forEach((ligne, i) =>
    ligne.forEach((k, j) => {
      const indice = m === 1 ? `${j + 1}` : `${i + 1}${j + 1}`;
      champ($('gains'), { latex: `k_{${indice}}`, valeur: k, ...modele.bornesGains[i][j] }, (v) => {
        sim.fixeGain(i, j, v);
        analyse();
      });
    }),
  );

  // ---- Condition initiale --------------------------------------------------
  const saisiesCI = modele.etats.map((e, i) => saisieNombre($('ci'), `${e.latex}(0)`, ci[i], e.unite));
  const lance = (x0) => {
    ci = x0.slice();
    saisiesCI.forEach((s, i) => s.fixe(ci[i]));
    sim.reinitialise(ci);
    analyse();
    joue(true);
  };
  $('lancer').addEventListener('click', () => {
    const x0 = saisiesCI.map((s) => s.lit());
    if (x0.every(Number.isFinite)) lance(x0);
  });

  // ---- Lecture -------------------------------------------------------------
  const joue = (oui) => {
    enLecture = oui;
    $('lecture').textContent = oui ? 'Pause' : 'Lecture';
  };
  $('lecture').addEventListener('click', () => joue(!enLecture));
  $('reinitialiser').addEventListener('click', () => lance(ci));
  const vitesse = () => Number($('vitesse').value);

  // ---- Scène et courbes ----------------------------------------------------
  let scene = null;
  if (modele.draw) {
    scene = new Scene($('scene'), modele, sim, {
      saisie: () => {
        saisi = true;
      },
      relache: (x) => {
        saisi = false;
        lance(x);
      },
      vitesseLecture: vitesse,
    });
  } else {
    $('carte-scene').hidden = true;
  }
  const courbes = new Courbes($('courbes'), modele, sim);

  // ---- Analyse : linéarisé, valeurs propres, indications -------------------
  function analyse() {
    rend($('lineaire'), `A = ${latexMatrice(sim.A)}, \\qquad B = ${latexMatrice(sim.B)}`);
    rend($('boucle'), `A + BK = ${latexMatrice(sim.ABK)}`);
    dessinePlan($('plan'), sim.vpA, sim.vpABK);
    afficheIndications($('indications'), sim);
  }
  analyse();
  new ResizeObserver(() => dessinePlan($('plan'), sim.vpA, sim.vpABK)).observe($('plan'));
  surChangementTheme(() => {
    courbes.construit();
    analyse();
    scene?.dessine();
  });

  // ---- Boucle d'animation --------------------------------------------------
  let avant = performance.now();
  let derniereCourbe = 0;
  let divergeait = false;
  function image(maintenant) {
    const dt = Math.min((maintenant - avant) / 1000, 0.05);
    avant = maintenant;
    if (enLecture && !saisi) sim.avance(dt * vitesse());
    if (sim.diverge !== divergeait) {
      divergeait = sim.diverge;
      analyse();
      if (sim.diverge) joue(false);
    }
    scene?.dessine();
    if (maintenant - derniereCourbe > PERIODE_COURBES) {
      courbes.actualise();
      derniereCourbe = maintenant;
    }
    $('temps').textContent = `t = ${sim.t.toFixed(2).replace('.', ',')} s`;
    requestAnimationFrame(image);
  }
  requestAnimationFrame(image);
}

charge();
