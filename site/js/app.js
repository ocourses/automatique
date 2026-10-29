// Page générique d'un exemple : exemple.html?id=<identifiant>.
//
// Ce module assemble la page : il charge le modèle de l'exemple, restaure
// l'état (lien, sinon mémoire du navigateur, sinon valeurs par défaut), crée
// les panneaux de réglage (js/ui/panneaux), la scène, les courbes, les
// graphiques et la console, puis anime la simulation.

import { catalogue } from './exemples/catalogue.js';
import { GenerateurChocs } from './core/chocs.js';
import { Modele } from './core/modele.js';
import { ackermann, axeDeValeurPropre, gainPourValeurPropre, placementObservateur, placementPossible } from './core/poles.js';
import { applique, capture } from './core/reglages.js';
import { Simulation } from './core/sim.js';
import { Console } from './ui/console.js';
import { PlanComplexe } from './ui/eigen.js';
import { Memoire, normaliseAffichage } from './ui/etat.js';
import { texte, typographie } from '../socle/js/ui/format.js';
import { chargeKatex, rendStatique } from '../socle/js/ui/katex.js';
import { boutonInfo } from './illustrations/commun.js';
import { ANIMATIONS } from './ui/animations/index.js';
import { installeNavigation, parcours } from '../socle/js/parcours.js';
import config from '../site.config.js';
import { initOnglets } from '../socle/js/ui/onglets.js';
import { panneauControleur } from './ui/panneaux/controleur.js';
import { panneauObservateur } from './ui/panneaux/observateur.js';
import { panneauSysteme } from './ui/panneaux/systeme.js';
import { Portrait } from './ui/phase.js';
import { Courbes } from './ui/plots.js';
import { Scene } from './ui/scene.js';
import { surChangementTheme } from '../socle/js/ui/theme.js';
import { initTiroirs } from './ui/tiroirs.js';
import { depuisURL, porteReglages } from './ui/url.js';

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
    document.body.dataset.ok = '1';
    return;
  }
  const [{ default: def }] = await Promise.all([import(`./exemples/${entree.id}.js`), chargeKatex()]);
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
  installeNavigation(parcours(config), 'exemple', modele.id);
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
    // Une condition initiale absurde (non finie) bloquerait aussi « Réinitialiser » :
    // on garde la précédente.
    if (!x0.every(Number.isFinite)) x0 = ci;
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
      base: () => (sim.etatRaisonnable(ci) ? sim.x : ci),
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
  // Comment se déplacent les valeurs propres du bouclé :
  //   - 'complet' : une seule commande, système contrôlable (Ackermann) ;
  //   - 'reel'    : gains diagonaux (satellite), chaque valeur propre sur l'axe réel ;
  //   - 'aucun'   : sinon (plusieurs commandes, loi libre, non contrôlable).
  const modeValeursPropres = () => {
    if (sim.mode !== 'gains') return 'aucun';
    if (placementPossible(sim.A, sim.B)) return 'complet';
    return modele.gainsDiagonaux ? 'reel' : 'aucun';
  };
  const explique = (mode) => {
    if (mode === 'reel') return modele.aideValeursPropresReelles;
    if (sim.mode !== 'gains') return 'En loi libre, il n’y a pas de gain K à recalculer : les valeurs propres du linéarisé ne se déplacent pas à la souris.';
    if (modele.uneCommande) return 'Le linéarisé n’est pas contrôlable : la formule d’Ackermann ne s’applique pas, les valeurs propres ne se déplacent pas.';
    return 'Avec plusieurs commandes, des valeurs propres données ne déterminent pas K (une infinité de gains conviennent) : elles ne se déplacent pas. Réglez les gains K dans l’onglet Contrôleur, elles suivent.';
  };
  const plan = new PlanComplexe(
    $('plan'),
    {
      mode: modeValeursPropres,
      explique,
      axeDe: (v) => axeDeValeurPropre(sim.A, sim.B, sim.K, v.re),
      deplaceReel: (axe, lambda) => {
        const K = sim.K.map((ligne) => ligne.slice());
        K[axe][axe] = gainPourValeurPropre(sim.A, sim.B, axe, lambda, modele.bornesGains[axe][axe]);
        controleur.appliqueGains(K, 'Valeur propre déplacée', 'glisse');
      },
      deplace: (vp) => controleur.appliqueGains(ackermann(sim.A, sim.B, vp), 'Valeurs propres déplacées', 'glisse'),
      modifiableObs: () => Boolean(sim.obs) && sim.observable,
      deplaceObs: (vp) =>
        observateur.appliqueL(placementObservateur(sim.A, sim.C, vp), 'Valeurs propres de A − LC déplacées', 'glisseObs'),
    },
    modele.planRayon ?? null,
  );

  // Légende des deux graphiques dans une bulle « i », comme sur les illustrations.
  boutonInfo(
    document.querySelector('.zone-graphes'),
    [
      ['cercle', '--discret', 'Valeurs propres de $A$ (le système sans commande).'],
      [
        'point',
        '--accent',
        modele.uneCommande
          ? 'Valeurs propres du bouclé $A + BK$ : faites glisser une croix pour les placer (retour d’état, système contrôlable), le gain $K$ est recalculé par la formule d’Ackermann. Près des axes, la valeur propre s’y colle.'
          : modele.gainsDiagonaux
            ? 'Valeurs propres du bouclé $A + BK$ : $K$ est diagonale, donc chaque valeur propre $k_i/J_i$ est réelle et ne dépend que de son gain. Faites glisser une croix le long de l’axe réel pour régler $k_i$.'
            : 'Valeurs propres du bouclé $A + BK$. Avec plusieurs commandes, les valeurs propres ne déterminent pas $K$ : elles ne se déplacent pas, on règle les gains $K$ dans l’onglet Contrôleur et elles suivent.',
      ],
      ...(sim.obs
        ? [
            ['point', '--observateur', 'Valeurs propres de $A - LC$ (observateur) : les losanges se déplacent de même et recalculent $L$.'],
            ['zone', '--observateur-zone', 'Disque en tirets : Euler explicite de pas $h$ y est stable, $|1 + h\\lambda| < 1$.'],
          ]
        : []),
      ['zone', '--zone-stable', 'Demi-plan $\\operatorname{Re} < 0$ : valeurs propres stables.'],
      ...(modele.aPortrait ? [['ligne', '--texte', 'Portrait de phase : cliquez pour lancer une trajectoire depuis ce point ; les précédentes restent en gris.']] : []),
    ],
    { titre: 'Ce que montrent les graphiques', etiquette: 'Légende des graphiques' },
  );

  // ---- Analyse : linéarisé, valeurs propres, console ------------------------
  function analyse() {
    controleur.actualise();
    observateur?.actualise();
    plan.actualise(sim.vpA, sim.vpBF, sim.obs ? sim.vpObs : null, sim.obs?.h ?? null);
    cons.analyse();
  }
  analyse();
  surChangementTheme(() => {
    courbes.construit();
    analyse();
    scene?.dessine();
  });

  // ---- Animations (satellite) : une boîte à onglets au-dessus des graphiques ---
  const animations = [];
  if (modele.animations?.length) {
    const boite = document.createElement('section');
    boite.className = 'carte zone-animation';
    boite.setAttribute('aria-label', 'Animation');
    const liste = document.createElement('div');
    Object.assign(liste, { className: 'onglets' });
    liste.setAttribute('role', 'tablist');
    liste.dataset.groupe = 'animation';
    boite.appendChild(liste);
    for (const { id, titre } of modele.animations) {
      const onglet = document.createElement('button');
      Object.assign(onglet, { type: 'button', textContent: titre });
      onglet.setAttribute('role', 'tab');
      onglet.dataset.onglet = id;
      liste.appendChild(onglet);
      const panneau = document.createElement('div');
      panneau.setAttribute('role', 'tabpanel');
      panneau.dataset.groupe = 'animation';
      panneau.dataset.panneau = id;
      const canvas = document.createElement('canvas');
      canvas.className = 'animation';
      canvas.setAttribute('aria-label', titre);
      panneau.appendChild(canvas);
      boite.appendChild(panneau);
      animations.push(new ANIMATIONS[id](canvas));
    }
    document.querySelector('.zone-graphes').before(boite);
    app.classList.add('avec-animation');
    boutonInfo(
      boite,
      [
        ['zone', '--accent', 'Satellite : le corps, un pavé dont les proportions donnent les inerties $J_1, J_2, J_3$. Faites glisser pour tourner la vue.'],
        ['ligne', '--serie-1', 'Ses axes principaux 1, 2, 3 (de la plus grande à la plus petite inertie si $J_1 > J_2 > J_3$).'],
        ['fleche', '--texte', 'La vitesse angulaire $\\omega$ dans le repère fixe, et la traînée de son extrémité.'],
        ['point', '--accent', 'Moment cinétique : la direction de $h = J\\omega$ sur la sphère, dans le repère du corps, et sa traînée.'],
        ['ligne', '--discret', 'Les polhodies : sans commande, $h$ y reste (norme et énergie constantes). Elles entourent les axes 1 et 3 ; l’axe 2 est instable.'],
      ],
      { titre: 'Ce que montrent les animations', etiquette: 'Légende des animations' },
    );
  }

  // ---- Graphiques empilés : deux boîtes au lieu de deux onglets ---------------
  if (modele.graphesEmpiles && modele.aPortrait) {
    const zone = document.querySelector('.zone-graphes');
    const titre = (texte) => {
      const h = document.createElement('h2');
      h.textContent = texte;
      return h;
    };
    const panneau = zone.querySelector('[data-panneau="portrait"]');
    delete panneau.dataset.groupe;
    panneau.hidden = false;
    const boite = document.createElement('section');
    boite.className = 'carte zone-portrait';
    boite.setAttribute('aria-label', 'Portrait de phase');
    boite.append(titre('Portrait de phase'), panneau);
    zone.after(boite);
    zone.querySelector('[data-onglet="portrait"]').remove();
    zone.querySelector('.onglets').replaceWith(titre('Valeurs propres'));
    app.classList.add('graphes-empiles');
  }

  // ---- Onglets et tiroirs (après les masquages ci-dessus) --------------------
  for (const [groupe, defaut] of [
    ['reglages', 'controleur'],
    ['graphes', 'valeurs-propres'],
    ['animation', modele.animations?.[0]?.id],
    ['console', 'mesures'],
  ]) {
    if (!document.querySelector(`[role=tablist][data-groupe="${groupe}"]`)) continue;
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
    const dt = Math.max(0, Math.min((maintenant - avant) / 1000, 0.05));
    avant = maintenant;
    if (enLecture && !saisi) sim.avance(dt * affichage.vitesse);
    videEvenements();
    if (sim.diverge !== divergeait) {
      divergeait = sim.diverge;
      analyse();
      if (sim.diverge) joue(false);
    }
    scene?.dessine();
    for (const a of animations) {
      a.pas(sim);
      a.dessine(sim);
    }
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
  document.body.dataset.ok = '1';
}

charge();
