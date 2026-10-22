// Page générique d'un exemple : exemple.html?id=<identifiant>.

import { catalogue } from './exemples/catalogue.js';
import { Simulation } from './core/sim.js';
import { ackermann, litPoles, placementObservateur, placementPossible } from './core/poles.js';
import { Console } from './ui/console.js';
import { champ, saisieNombre } from './ui/controls.js';
import { PlanComplexe } from './ui/eigen.js';
import { latexMatrice, latexVecteur, texte, typographie } from './ui/format.js';
import { rend, rendStatique, rendTexte } from './ui/katex.js';
import { initOnglets } from './ui/onglets.js';
import { Portrait } from './ui/phase.js';
import { Courbes } from './ui/plots.js';
import { Scene } from './ui/scene.js';
import { surChangementTheme } from './ui/theme.js';
import { depuisURL, versURL } from './ui/url.js';

const $ = (id) => document.getElementById(id);
const PERIODE_COURBES = 50; // ms entre deux rafraîchissements des courbes
const PERIODE_MESURES = 200; // ms entre deux rafraîchissements des nombres

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

// Pôles au format de la saisie (point décimal), paires conjuguées regroupées.
function formatePoles(vp) {
  const f = (v) => String(Number(v.toPrecision(4)));
  const res = [];
  const restants = vp.slice();
  while (restants.length) {
    const z = restants.shift();
    if (z.im === 0) {
      res.push(f(z.re));
      continue;
    }
    const k = restants.findIndex((w) => Math.abs(w.re - z.re) < 1e-9 && Math.abs(w.im + z.im) < 1e-9);
    if (k >= 0) restants.splice(k, 1);
    res.push(`${f(z.re)}±${f(Math.abs(z.im))}i`);
  }
  return res.join(', ');
}

const vecteur = (v) => `(${v.map((x) => texte(x)).join(' ; ')})`;

function demarre(modele) {
  document.title = `${modele.titre} · Simulateur de stabilisation`;
  $('titre').textContent = modele.titre;
  $('source').textContent = typographie(modele.source);

  const sim = new Simulation(modele);
  const reglages = depuisURL(new URLSearchParams(location.search), sim);
  let ci = reglages.ci;
  sim.evenements = [];
  sim.reinitialise(ci);
  let enLecture = true;
  let saisi = false;
  let trajectoire = 1;
  const affichage = { fantome: reglages.affichage.fantome, historique: false, vitesse: reglages.affichage.vitesse };

  rendStatique($('page'));

  // ---- Console : mesures, analyse, journal ----------------------------------
  const cons = new Console(modele, sim, { affichage });
  const note = (message, options) => cons.ecrit(message, options);
  const videEvenements = () => {
    for (const e of sim.evenements.splice(0)) cons.ecrit(e.texte, { niveau: e.niveau, t: e.t });
  };
  const descriptionDepart = () => `x₀ = ${vecteur(ci)}${sim.obs ? `, x̂₀ = ${vecteur(sim.obs.xh0)}` : ''}`;
  cons.separateur(`Trajectoire n° 1 : ${descriptionDepart()}`);

  // ---- Lien : les réglages suivent dans l'URL -------------------------------
  let minuterie = null;
  const memorise = () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => history.replaceState(null, '', `?${versURL(sim, ci, affichage)}`), 200);
  };
  $('copier').addEventListener('click', async () => {
    history.replaceState(null, '', `?${versURL(sim, ci, affichage)}`);
    try {
      await navigator.clipboard.writeText(location.href);
      $('copier').textContent = 'Lien copié';
    } catch {
      $('copier').textContent = 'Copie impossible : utilisez la barre d’adresse';
    }
    setTimeout(() => ($('copier').textContent = 'Copier le lien'), 2000);
  });

  // ---- Onglet Système : équations, paramètres, point de fonctionnement ------
  rend($('modele'), modele.latex.modele);
  rend($('etats'), modele.etats.map((e) => e.latex).join(', \\quad '), false);
  if (modele.sansSortie) $('sortie').textContent = 'aucune, tout l’état est mesuré';
  else rend($('sortie'), `y = x_${sim.sortie + 1}`, false);
  rend($('equilibre'), modele.latex.equilibre);

  const libres = modele.parametres.filter((q) => q.famille === 'equilibre');
  for (const q of modele.parametres) {
    const zone = q.famille === 'equilibre' ? $('parametres-eq') : $('parametres');
    champ(zone, { ...q, valeur: sim.p[q.nom] }, (v) => {
      sim.fixeParametre(q.nom, v);
      scene?.ajusteProportions();
      analyse();
      scene?.dessine();
      note(`Paramètre ${q.nom} = ${texte(v)} ${q.unite}`, { cle: `p_${q.nom}` });
      memorise();
    });
  }
  rendTexte(
    $('aide-eq'),
    modele.noteEquilibre
      ? modele.noteEquilibre
      : libres.length
      ? `On règle ici ${libres.length > 1 ? 'les coordonnées libres' : 'la coordonnée libre'} de $x_e$ ; la commande d'équilibre $u_e$ s'en déduit par $f(x_e, u_e) = 0$, on ne la règle pas séparément.`
      : `Ce modèle n'a qu'un point de fonctionnement : $x_e$ et $u_e$ sont imposés, il n'y a rien à régler.`,
  );
  const affichePointDeFonctionnement = () => {
    rend($('equilibre-num'), `x_e = ${latexVecteur(sim.xe)}, \\qquad u_e = ${latexVecteur(sim.ue)}`);
    // Au-delà de deux états, A et B ne tiennent plus sur une ligne.
    const sep = sim.n > 2 ? ', \\\\[0.4em] ' : ', \\qquad ';
    rend($('lineaire'), `\\begin{gathered} A = ${latexMatrice(sim.A)}${sep}B = ${latexMatrice(sim.B)} \\end{gathered}`);
  };

  // ---- Onglet Contrôleur : retour d'état ------------------------------------
  rend($('loi-gains'), modele.latex.loi ?? 'u = u_e + K(x - x_e)');
  const m = modele.commandes.length;
  // Un champ par gain ; avec gainsDiagonaux, seule la diagonale de K se règle.
  const champsGains = [];
  sim.K.forEach((ligne, i) =>
    ligne.forEach((k, j) => {
      if (modele.gainsDiagonaux && i !== j) return;
      const indice = modele.gainsDiagonaux ? `${i + 1}` : m === 1 ? `${j + 1}` : `${i + 1}${j + 1}`;
      const c = champ($('gains'), { latex: `k_{${indice}}`, valeur: k, ...modele.bornesGains[i][j] }, (v) => {
        sim.fixeGain(i, j, v);
        analyse();
        note(`Gain k${indice} = ${texte(v)}`, { cle: `k_${indice}` });
        memorise();
      });
      champsGains.push({ i, j, c });
    }),
  );
  const appliqueGains = (K, message, cle = null) => {
    if (!K[0].every(Number.isFinite)) return;
    sim.fixeGains(K);
    champsGains.forEach(({ i, j, c }) => c.fixe(K[i][j]));
    analyse();
    note(`${message} → K = ${vecteur(K.flat())}`, { cle });
    memorise();
  };
  const placePoles = () => {
    const erreur = $('erreur-poles');
    try {
      if (!placementPossible(sim.A, sim.B)) throw new Error('placement impossible : le linéarisé n’est pas contrôlable');
      appliqueGains(ackermann(sim.A, sim.B, litPoles($('poles').value, sim.n)), `Pôles voulus ${$('poles').value}`);
      erreur.hidden = true;
    } catch (e) {
      erreur.textContent = e.message;
      erreur.hidden = false;
    }
  };
  // Le placement de pôles à la saisie n'a de sens que pour une seule commande.
  if (m !== 1) document.querySelector('.champ-poles').hidden = true;
  $('placer').addEventListener('click', placePoles);
  $('poles').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') placePoles();
  });

  // ---- Onglet Contrôleur : loi libre ----------------------------------------
  if (m !== 1) $('choix-loi').hidden = true;
  const n = sim.n;
  const params = Object.keys(sim.p).join(', ');
  rendTexte(
    $('aide-loi'),
    `Variables : $x_1$ à $x_${n}$ (écrits x1…x${n}), y = $x_${sim.sortie + 1}$, t, ` +
      `ix1…ix${n} (primitives de $x_i - x_{e,i}$), iy, xe1…xe${n}, ue et les paramètres (${params}). ` +
      `Fonctions : sin, cos, tan, exp, log, sqrt, abs, sign, min, max, atan2, sat(v, M). ` +
      `Par exemple, ajouter + 10*ix1 donne une action intégrale (TD2).`,
  );
  $('loi').value = sim.loiTexte;
  let minuterieLoi = null;
  $('loi').addEventListener('input', () => {
    clearTimeout(minuterieLoi);
    minuterieLoi = setTimeout(() => {
      const erreur = sim.fixeLoi($('loi').value);
      $('erreur-loi').textContent = erreur ?? '';
      $('erreur-loi').hidden = !erreur;
      analyse();
      if (erreur) note(`Loi libre refusée : ${erreur}`, { niveau: 'alerte', cle: 'loi' });
      else note(`Loi libre : u = ${sim.loiTexte}`, { cle: 'loi' });
      memorise();
    }, 300);
  });
  const montreMode = () => {
    $('bloc-gains').hidden = sim.mode !== 'gains';
    $('bloc-loi').hidden = sim.mode !== 'loi';
  };
  for (const radio of document.querySelectorAll('input[name=mode]')) {
    radio.checked = radio.value === sim.mode;
    radio.addEventListener('change', () => {
      sim.fixeMode(radio.value);
      montreMode();
      analyse();
      note(radio.value === 'loi' ? 'Contrôleur : loi libre' : 'Contrôleur : retour d’état');
      memorise();
    });
  }
  montreMode();

  // ---- Onglet Contrôleur : saturation ---------------------------------------
  $('saturation').checked = sim.saturation.active;
  $('umax').value = String(sim.saturation.umax).replace('.', ',');
  $('saturation').addEventListener('change', () => {
    sim.saturation.active = $('saturation').checked;
    analyse();
    note(sim.saturation.active ? `Saturation activée : |u| ≤ ${texte(sim.saturation.umax)}` : 'Saturation désactivée');
    memorise();
  });
  $('umax').addEventListener('change', () => {
    const v = Number($('umax').value.replace(',', '.'));
    if (Number.isFinite(v) && v > 0) sim.saturation.umax = v;
    $('umax').value = String(sim.saturation.umax).replace('.', ',');
    analyse();
    if (sim.saturation.active) note(`Saturation : |u| ≤ ${texte(sim.saturation.umax)}`, { cle: 'umax' });
    memorise();
  });

  // ---- Onglet Contrôleur : échantillonnage de la commande ----------------------
  champ($('reglage-te'), { latex: 'T_e', valeur: sim.Te, min: 0, max: 1, pas: 0.01, unite: 's' }, (v) => {
    sim.fixeTe(v);
    courbes?.configure({ echantillonne: v > 0 });
    analyse();
    note(v > 0 ? `Commande échantillonnée : Tₑ = ${texte(v)} s` : 'Commande continue (Tₑ = 0)', { cle: 'Te' });
    memorise();
  });

  // ---- Onglet Observateur ----------------------------------------------------
  let champsL = [];
  const appliqueL = (L, message, cle = null) => {
    if (!L.every(Number.isFinite)) return;
    sim.fixeL(L);
    champsL.forEach((c, i) => c.fixe(L[i]));
    analyse();
    note(`${message} → L = ${vecteur(L)}`, { cle });
    memorise();
  };
  if (sim.obs) {
    const mo = modele.observateur;
    rend($('obs-modele'), mo.latex);
    champsL = sim.obs.L.map((l, i) =>
      champ($('obs-gains'), { latex: `\\ell_{${i + 1}}`, valeur: l, ...mo.bornesL[i] }, (v) => {
        const L = sim.obs.L.slice();
        L[i] = v;
        sim.fixeL(L);
        analyse();
        note(`Gain ℓ${i + 1} = ${texte(v)}`, { cle: `l_${i + 1}` });
        memorise();
      }),
    );
    const placeObs = () => {
      const erreur = $('erreur-obs-poles');
      try {
        if (!sim.observable) throw new Error('placement impossible : le couple (A, C) n’est pas observable');
        appliqueL(
          placementObservateur(sim.A, sim.C, litPoles($('obs-poles').value, sim.n)),
          `Pôles de A − LC voulus ${$('obs-poles').value}`,
        );
        erreur.hidden = true;
      } catch (e) {
        erreur.textContent = e.message;
        erreur.hidden = false;
      }
    };
    $('obs-placer').addEventListener('click', placeObs);
    $('obs-poles').addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') placeObs();
    });
    champ($('obs-pas'), { latex: 'h', valeur: sim.obs.h, ...mo.bornesH, unite: 's' }, (v) => {
      sim.fixePasObservateur(v);
      analyse();
      note(`Observateur : pas h = ${texte(v)} s`, { cle: 'h_obs' });
      memorise();
    });
    modele.etats.forEach((e, i) =>
      saisieNombre($('obs-xh0'), `\\hat x_{${i + 1}}(0)`, sim.obs.xh0[i], e.unite, (v) => {
        sim.obs.xh0[i] = v;
        note(`Estimée initiale x̂${i + 1}(0) = ${texte(v)}`, { cle: `xh0_${i}` });
        memorise();
      }),
    );
    $('retour-estime').checked = sim.retourEstime;
    $('retour-estime').addEventListener('change', () => {
      sim.fixeRetourEstime($('retour-estime').checked);
      analyse();
      note(sim.retourEstime ? 'Retour d’état sur l’état estimé x̂' : 'Retour d’état sur l’état mesuré x');
      memorise();
    });
  } else {
    $('onglet-observateur').hidden = true;
  }

  // ---- Onglet Scénario : perturbation et bruit ------------------------------
  const P = sim.perturbation;
  const unite = modele.commandes[0].unite;
  const zoneP = $('reglages-perturbation');
  saisieNombre(zoneP, 'e', P.e, unite, (v) => {
    P.e = v;
    analyse();
    note(`Perturbation : e = ${texte(v)} ${unite}`, { cle: 'pert_e' });
    memorise();
  });
  saisieNombre(zoneP, 't_1', P.debut, 's', (v) => {
    P.debut = v;
    note(`Perturbation : début t₁ = ${texte(v)} s`, { cle: 'pert_t1' });
    memorise();
  });
  saisieNombre(zoneP, '\\Delta t', P.duree, 's', (v) => {
    P.duree = Math.max(0, v);
    note(`Perturbation : durée Δt = ${texte(P.duree)} s`, { cle: 'pert_dt' });
    memorise();
  });
  const lignes = zoneP.querySelectorAll('.champ');
  const montrePerturbation = () => {
    lignes[0].hidden = P.type === 'aucune';
    lignes[1].hidden = P.type !== 'creneau';
    lignes[2].hidden = P.type !== 'creneau';
    courbes?.configure({ perturbation: P.type !== 'aucune' });
  };
  $('perturbation').value = P.type;
  $('perturbation').addEventListener('change', () => {
    P.type = $('perturbation').value;
    montrePerturbation();
    analyse();
    note(
      P.type === 'aucune'
        ? 'Perturbation supprimée'
        : `Perturbation ${P.type === 'constante' ? 'constante' : 'en créneau'} : e = ${texte(P.e)} ${unite}`,
    );
    memorise();
  });
  saisieNombre($('reglage-bruit'), '\\sigma', sim.sigma, '', (v) => {
    sim.sigma = Math.max(0, v);
    analyse();
    note(`Bruit de mesure : σ = ${texte(sim.sigma)}`, { cle: 'sigma' });
    memorise();
  });

  // ---- Onglet Scénario : condition initiale ---------------------------------
  const saisiesCI = modele.etats.map((e, i) => saisieNombre($('ci'), `${e.latex}(0)`, ci[i], e.unite));
  const lance = (x0) => {
    videEvenements();
    portrait?.archive();
    ci = x0.slice();
    saisiesCI.forEach((s, i) => s.fixe(ci[i]));
    cons.separateur(`Trajectoire n° ${++trajectoire} : ${descriptionDepart()}`);
    sim.reinitialise(ci);
    analyse();
    joue(true);
    memorise();
  };
  $('lancer').addEventListener('click', () => {
    const x0 = saisiesCI.map((s) => s.lit());
    if (x0.every(Number.isFinite)) lance(x0);
  });

  // ---- Lecture --------------------------------------------------------------
  const joue = (oui) => {
    enLecture = oui;
    $('lecture').textContent = oui ? 'Pause' : 'Lecture';
  };
  $('lecture').addEventListener('click', () => {
    joue(!enLecture);
    note(enLecture ? 'Reprise' : 'Pause');
  });
  $('reinitialiser').addEventListener('click', () => lance(ci));
  $('choc').addEventListener('click', () => {
    const signe = sim.signeChoc;
    sim.choc();
    note(`Choc : ${vecteur((modele.choc ?? []).map((v) => signe * v))} ajouté à l’état`, { niveau: 'alerte' });
  });
  $('vitesse').value = String(affichage.vitesse);
  $('vitesse').addEventListener('change', () => {
    affichage.vitesse = Number($('vitesse').value);
    memorise();
  });

  // ---- Scène, courbes, portrait de phase ------------------------------------
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
      vitesseLecture: () => affichage.vitesse,
    });
  } else {
    $('bloc-scene').hidden = true;
    document.querySelector('.zone-scene').classList.add('sans-scene');
    document.querySelector('.app').classList.add('courbes-seules');
  }
  const courbes = new Courbes($('courbes'), modele, sim);
  let portrait = null;
  if (sim.n === 2 && modele.portrait) {
    portrait = new Portrait($('portrait'), modele, sim, { lance });
    $('effacer').addEventListener('click', () => portrait.efface());
  } else {
    $('onglet-portrait').hidden = true;
  }
  montrePerturbation();

  // ---- Affichage ------------------------------------------------------------
  const appliqueAffichage = () => {
    if (scene) scene.avecFantome = affichage.fantome;
    if (portrait) portrait.avecFantome = affichage.fantome;
    courbes.configure({
      fantome: affichage.fantome,
      historique: affichage.historique,
      observateur: Boolean(sim.obs),
      echantillonne: sim.Te > 0,
    });
  };
  $('fantome').checked = affichage.fantome;
  $('fantome').addEventListener('change', () => {
    affichage.fantome = $('fantome').checked;
    appliqueAffichage();
    memorise();
  });
  $('historique').addEventListener('change', () => {
    affichage.historique = $('historique').checked;
    appliqueAffichage();
  });
  appliqueAffichage();

  // ---- Plan complexe : placement des valeurs propres à la souris -------------
  // K est recalculé par la formule d'Ackermann à partir des valeurs propres voulues.
  const glissable = () => sim.mode === 'gains' && placementPossible(sim.A, sim.B);
  const plan = new PlanComplexe($('plan'), {
    modifiable: glissable,
    deplace: (vp) => appliqueGains(ackermann(sim.A, sim.B, vp), 'Valeurs propres déplacées', 'glisse'),
    modifiableObs: () => Boolean(sim.obs) && sim.observable,
    deplaceObs: (vp) =>
      appliqueL(placementObservateur(sim.A, sim.C, vp), 'Valeurs propres de A − LC déplacées', 'glisseObs'),
  });

  // ---- Analyse : linéarisé, valeurs propres, console ------------------------
  function analyse() {
    affichePointDeFonctionnement();
    plan.actualise(sim.vpA, sim.vpBF, sim.obs ? sim.vpObs : null, sim.obs?.h ?? null);
    $('aide-plan').hidden = !glissable() && !(sim.obs && sim.observable);
    $('legende-obs').hidden = !sim.obs;
    $('aide-plan-obs').hidden = !sim.obs;
    if (sim.obs) {
      if (document.activeElement !== $('obs-poles')) $('obs-poles').value = formatePoles(sim.vpObs);
      $('obs-hmax').textContent =
        sim.hMax > 0
          ? `Pas maximal pour Euler explicite : h < ${texte(sim.hMax)} s (ρ = ${texte(sim.rhoEuler)}${sim.rhoEuler < 1 ? ' < 1' : ' ≥ 1 : l’observateur discret diverge'}).`
          : 'Aucun pas ne convient : A − LC a une valeur propre de partie réelle positive ou nulle.';
      $('obs-hmax').style.color = sim.rhoEuler < 1 ? '' : 'var(--alerte)';
    }
    if (document.activeElement !== $('poles') && sim.mode === 'gains') $('poles').value = formatePoles(sim.vpBF);
    cons.analyse();
  }
  analyse();
  surChangementTheme(() => {
    courbes.construit();
    analyse();
    scene?.dessine();
  });

  // ---- Téléphone : réglages et console en tiroirs ----------------------------
  // Les tiroirs ne sont affichés que par la feuille de style (petit écran) ; ici on
  // gère seulement leur ouverture. Un seul à la fois, et la page remonte pour que la
  // scène reste visible au-dessus.
  const tiroirs = [
    ['reglages', $('feuille-reglages'), $('bascule-reglages')],
    ['console', $('console'), $('bascule-console')],
  ];
  let tiroir = null;
  const ouvreTiroir = (cible) => {
    tiroir = cible;
    for (const [nom, el, bouton] of tiroirs) {
      el.classList.toggle('ouverte', nom === cible);
      bouton.setAttribute('aria-expanded', String(nom === cible));
    }
    document.body.classList.toggle('feuille-ouverte', cible !== null);
    if (cible) window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  for (const [nom, , bouton] of tiroirs) bouton.addEventListener('click', () => ouvreTiroir(tiroir === nom ? null : nom));
  for (const [, el] of tiroirs) {
    el.querySelector('.fermer').addEventListener('click', () => ouvreTiroir(null));
    const agrandir = el.querySelector('.agrandir');
    agrandir.addEventListener('click', () => {
      agrandir.setAttribute('aria-pressed', String(el.classList.toggle('grande')));
    });
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && tiroir) ouvreTiroir(null);
  });

  // ---- Onglets (après les masquages ci-dessus) -------------------------------
  initOnglets('reglages', 'controleur');
  initOnglets('graphes', 'valeurs-propres');
  initOnglets('console', 'mesures');

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
