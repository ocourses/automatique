// Page générique d'un exemple : exemple.html?id=<identifiant>.
//
// Ce module assemble la page : il charge le modèle de l'exemple, restaure
// l'état (lien, sinon mémoire du navigateur, sinon valeurs par défaut), crée
// les panneaux de réglage (js/ui/panneaux), la scène, les courbes, les
// graphiques et la console, puis anime la simulation.

import { catalogue } from './exemples/catalogue.js';
import { GenerateurChocs } from './core/chocs.js';
import { Modele } from './core/modele.js';
import { ackermann, placementObservateur, placementPossible } from './core/poles.js';
import { applique, capture } from './core/reglages.js';
import { Simulation } from './core/sim.js';
import { Console } from './ui/console.js';
import { PlanComplexe } from './ui/eigen.js';
import { Memoire, normaliseAffichage } from './ui/etat.js';
import { texte, typographie } from './ui/format.js';
import { rendStatique } from './ui/katex.js';
import { initOnglets } from './ui/onglets.js';
import { panneauControleur } from './ui/panneaux/controleur.js';
import { panneauObservateur } from './ui/panneaux/observateur.js';
import { panneauSysteme } from './ui/panneaux/systeme.js';
import { Portrait } from './ui/phase.js';
import { Courbes } from './ui/plots.js';
import { Scene } from './ui/scene.js';
import { surChangementTheme } from './ui/theme.js';
import { initTiroirs } from './ui/tiroirs.js';
import { depuisURL, porteReglages, versURL } from './ui/url.js';

const $ = (id) => document.getElementById(id);
const PERIODE_COURBES = 50; // ms entre deux rafraîchissements des courbes
const PERIODE_MESURES = 200; // ms entre deux rafraîchissements des nombres
const DELAI_SAUVEGARDE = 300; // ms

const vecteur = (v) => `(${v.map((x) => texte(x)).join(' ; ')})`;

async function charge() {
  const id = new URLSearchParams(location.search).get('id');
  const entree = catalogue.find((e) => e.id === id && e.disponible);
  if (!entree) {
    $('titre').textContent = 'Exemple introuvable';
    $('page').hidden = true;
    $('introuvable').hidden = false;
    return;
  }
  const def = (await import(`./exemples/${entree.id}.js`)).default;
  demarre(new Modele(def));
}

// État de départ : un lien qui porte des réglages l'emporte sur la mémoire du
// navigateur ; il est ensuite retiré de la barre d'adresse, pour qu'un
// rechargement reparte de la mémoire, qui suit les modifications.
function etatInitial(modele, sim, memoire) {
  const q = new URLSearchParams(location.search);
  const memorise = memoire.lit();
  if (porteReglages(q)) {
    const lien = depuisURL(q, sim.n, sim.m);
    history.replaceState(null, '', `?id=${modele.id}`);
    return { ci: applique(sim, lien.reglages), affichage: normaliseAffichage({ ...memorise?.affichage, ...lien.affichage }) };
  }
  return { ci: applique(sim, memorise?.reglages ?? {}), affichage: memorise?.affichage ?? normaliseAffichage() };
}

function demarre(modele) {
  document.title = `${modele.titre} · Simulateur de stabilisation`;
  $('titre').textContent = modele.titre;
  $('source').textContent = typographie(modele.source);

  const sim = new Simulation(modele);
  const memoire = new Memoire(modele.id);
  let { ci, affichage } = etatInitial(modele, sim, memoire);
  // Système linéaire : le linéarisé coïncide avec lui, le fantôme n'apporte rien.
  if (modele.lineaire) affichage.fantome = false;
  sim.evenements = [];
  sim.reinitialise(ci);
  let enLecture = true;
  let saisi = false;
  let trajectoire = 1;

  const app = document.querySelector('.app');
  app.classList.add(`disposition-${modele.disposition}`);
  rendStatique($('page'));

  // ---- Mémoire : les réglages et l'affichage sont gardés dans le navigateur ----
  let minuterie = null;
  let enRemiseADefaut = false;
  const ecrit = () => {
    clearTimeout(minuterie);
    if (!enRemiseADefaut) memoire.ecrit(capture(sim, ci), affichage);
  };
  const sauve = () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(ecrit, DELAI_SAUVEGARDE);
  };
  window.addEventListener('pagehide', ecrit);
  $('defaut').addEventListener('click', () => {
    if (!confirm('Remettre tous les réglages et l’affichage de cet exemple à leurs valeurs par défaut ?')) return;
    enRemiseADefaut = true;
    clearTimeout(minuterie);
    memoire.efface();
    location.replace(`?id=${modele.id}`);
  });
  $('copier').addEventListener('click', async () => {
    const lien = new URL(location.href);
    lien.search = `?${versURL(modele.id, capture(sim, ci), affichage)}`;
    try {
      await navigator.clipboard.writeText(lien.href);
      $('copier').textContent = 'Lien copié';
    } catch {
      history.replaceState(null, '', lien.search);
      $('copier').textContent = 'Copie impossible : utilisez la barre d’adresse';
    }
    setTimeout(() => ($('copier').textContent = 'Copier le lien'), 2000);
  });

  // ---- Console : mesures, analyse, journal ----------------------------------
  const cons = new Console(modele, sim, { affichage, change: sauve });
  const note = (message, options) => cons.ecrit(message, options);
  const videEvenements = () => {
    for (const e of sim.evenements.splice(0)) cons.ecrit(e.texte, { niveau: e.niveau, t: e.t });
  };
  const descriptionDepart = () => `x₀ = ${vecteur(ci)}${sim.obs ? `, x̂₀ = ${vecteur(sim.obs.xh0)}` : ''}`;
  cons.separateur(`Trajectoire n° 1 : ${descriptionDepart()}`);

  // ---- Panneaux de réglage ----------------------------------------------------
  let scene = null;
  let courbes = null;
  let portrait = null;
  const lance = (x0) => {
    videEvenements();
    portrait?.archive();
    ci = x0.slice();
    systeme.afficheCI(ci);
    cons.separateur(`Trajectoire n° ${++trajectoire} : ${descriptionDepart()}`);
    sim.reinitialise(ci);
    analyse();
    joue(true);
    sauve();
  };
  // Contexte commun aux panneaux ; modifie() suit chaque réglage.
  const page = {
    modele,
    sim,
    note,
    lance,
    modifie() {
      scene?.ajusteProportions();
      appliqueAffichage();
      analyse();
      scene?.dessine();
      sauve();
    },
  };
  const systeme = panneauSysteme(page, ci);
  const controleur = panneauControleur(page);
  const observateur = modele.aObservateur ? panneauObservateur(page) : null;
  $('onglet-observateur').hidden = !observateur;

  // ---- Lecture ------------------------------------------------------------------
  const joue = (oui) => {
    enLecture = oui;
    $('lecture').textContent = oui ? 'Pause' : 'Lecture';
  };
  $('lecture').addEventListener('click', () => {
    joue(!enLecture);
    note(enLecture ? 'Reprise' : 'Pause');
  });
  $('reinitialiser').addEventListener('click', () => lance(ci));
  const chocs = new GenerateurChocs();
  $('choc').addEventListener('click', () => {
    const c = chocs.suivant();
    const dv = sim.choc(c.facteur);
    note(`Choc ${c.nouveau ? 'nouveau' : 'voisin du précédent'} : ${vecteur(dv)} ajouté à l’état`, { niveau: 'alerte' });
  });
  $('vitesse').value = String(affichage.vitesse);
  $('vitesse').addEventListener('change', () => {
    affichage.vitesse = Number($('vitesse').value);
    sauve();
  });

  // ---- Scène, courbes, portrait de phase ------------------------------------
  if (modele.aScene) {
    scene = new Scene($('scene'), modele, sim, {
      saisie: () => {
        saisi = true;
      },
      relache: (x) => {
        saisi = false;
        lance(x);
      },
      vitesseLecture: () => affichage.vitesse,
    });
  } else {
    $('bloc-scene').hidden = true;
    document.querySelector('.zone-scene').classList.add('sans-scene');
  }
  courbes = new Courbes($('courbes'), modele, sim);
  if (modele.aPortrait) {
    portrait = new Portrait($('portrait'), modele, sim, { lance });
    $('effacer').addEventListener('click', () => portrait.efface());
  } else {
    $('onglet-portrait').hidden = true;
  }

  // ---- Affichage ------------------------------------------------------------
  // Options d'affichage qui découlent des réglages et des cases à cocher.
  function appliqueAffichage() {
    if (scene) scene.avecFantome = affichage.fantome;
    if (portrait) portrait.avecFantome = affichage.fantome;
    courbes.configure({
      fantome: affichage.fantome,
      historique: affichage.historique,
      observateur: Boolean(sim.obs),
      echantillonne: sim.Te > 0,
      perturbation: sim.perturbation.type !== 'aucune',
    });
  }
  $('choix-fantome').hidden = modele.lineaire;
  $('fantome').checked = affichage.fantome;
  $('fantome').addEventListener('change', () => {
    affichage.fantome = $('fantome').checked;
    appliqueAffichage();
    sauve();
  });
  $('historique').checked = affichage.historique;
  $('historique').addEventListener('change', () => {
    affichage.historique = $('historique').checked;
    appliqueAffichage();
    sauve();
  });
  appliqueAffichage();

  // ---- Plan complexe : placement des valeurs propres à la souris -------------
  // K est recalculé par la formule d'Ackermann à partir des valeurs propres voulues.
  const glissable = () => sim.mode === 'gains' && placementPossible(sim.A, sim.B);
  const plan = new PlanComplexe(
    $('plan'),
    {
      modifiable: glissable,
      deplace: (vp) => controleur.appliqueGains(ackermann(sim.A, sim.B, vp), 'Valeurs propres déplacées', 'glisse'),
      modifiableObs: () => Boolean(sim.obs) && sim.observable,
      deplaceObs: (vp) =>
        observateur.appliqueL(placementObservateur(sim.A, sim.C, vp), 'Valeurs propres de A − LC déplacées', 'glisseObs'),
    },
    modele.planRayon ?? null,
  );

  // ---- Analyse : linéarisé, valeurs propres, console ------------------------
  function analyse() {
    controleur.actualise();
    observateur?.actualise();
    plan.actualise(sim.vpA, sim.vpBF, sim.obs ? sim.vpObs : null, sim.obs?.h ?? null);
    $('aide-plan').hidden = !glissable() && !(sim.obs && sim.observable);
    $('legende-obs').hidden = !sim.obs;
    $('aide-plan-obs').hidden = !sim.obs;
    cons.analyse();
  }
  analyse();
  surChangementTheme(() => {
    courbes.construit();
    analyse();
    scene?.dessine();
  });

  // ---- Onglets et tiroirs (après les masquages ci-dessus) --------------------
  for (const [groupe, defaut] of [
    ['reglages', 'controleur'],
    ['graphes', 'valeurs-propres'],
    ['console', 'mesures'],
  ]) {
    initOnglets(groupe, {
      defaut,
      initial: affichage.onglets[groupe],
      change: (id) => {
        affichage.onglets[groupe] = id;
        sauve();
      },
    });
  }
  initTiroirs();

  // ---- Boucle d'animation ---------------------------------------------------
  let avant = performance.now();
  let derniereCourbe = 0;
  let dernieresMesures = 0;
  let divergeait = false;
  function image(maintenant) {
    const dt = Math.min((maintenant - avant) / 1000, 0.05);
    avant = maintenant;
    if (enLecture && !saisi) sim.avance(dt * affichage.vitesse);
    videEvenements();
    if (sim.diverge !== divergeait) {
      divergeait = sim.diverge;
      analyse();
      if (sim.diverge) joue(false);
    }
    scene?.dessine();
    if (maintenant - derniereCourbe > PERIODE_COURBES) {
      courbes.actualise();
      portrait?.dessine();
      derniereCourbe = maintenant;
    }
    if (maintenant - dernieresMesures > PERIODE_MESURES) {
      cons.actualiseMesures(enLecture);
      dernieresMesures = maintenant;
    }
    requestAnimationFrame(image);
  }
  requestAnimationFrame(image);
}

charge();
