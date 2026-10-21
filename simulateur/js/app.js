// Page générique d'un exemple : exemple.html?id=<identifiant>.

import { catalogue } from './exemples/catalogue.js';
import { Simulation } from './core/sim.js';
import { ackermann, litPoles, placementPossible } from './core/poles.js';
import { champ, saisieNombre } from './ui/controls.js';
import { PlanComplexe } from './ui/eigen.js';
import { latexMatrice, latexNombre, typographie } from './ui/format.js';
import { afficheIndications, nomBoucle } from './ui/hints.js';
import { rend, rendStatique, rendTexte } from './ui/katex.js';
import { Portrait } from './ui/phase.js';
import { Courbes } from './ui/plots.js';
import { Scene } from './ui/scene.js';
import { surChangementTheme } from './ui/theme.js';
import { depuisURL, versURL } from './ui/url.js';

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

function demarre(modele) {
  document.title = `${modele.titre} · Simulateur de stabilisation`;
  $('titre').textContent = modele.titre;
  $('source').textContent = typographie(modele.source);

  const sim = new Simulation(modele);
  const reglages = depuisURL(new URLSearchParams(location.search), sim);
  let ci = reglages.ci;
  sim.reinitialise(ci);
  let enLecture = true;
  let saisi = false;
  const affichage = { fantome: reglages.affichage.fantome, historique: false, vitesse: reglages.affichage.vitesse };

  rendStatique($('page'));

  // ---- Lien : les réglages suivent dans l'URL -------------------------------
  let minuterie = null;
  const memorise = () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => history.replaceState(null, '', `?${versURL(sim, ci, affichage)}`), 200);
  };

  // ---- Modèle --------------------------------------------------------------
  rend($('modele'), modele.latex.modele);
  rend($('etats'), modele.etats.map((e) => e.latex).join(', \\quad '), false);
  rend($('sortie'), `y = x_${sim.sortie + 1}`, false);
  rend($('equilibre'), modele.latex.equilibre);

  // ---- Paramètres ----------------------------------------------------------
  for (const q of modele.parametres) {
    champ($('parametres'), { ...q, valeur: sim.p[q.nom] }, (v) => {
      sim.fixeParametre(q.nom, v);
      scene?.ajusteProportions();
      analyse();
      scene?.dessine();
      memorise();
    });
  }

  // ---- Contrôleur : retour d'état ------------------------------------------
  rend($('loi-gains'), 'u = u_e + K(x - x_e)');
  const m = modele.commandes.length;
  const champsGains = sim.K.map((ligne, i) =>
    ligne.map((k, j) => {
      const indice = m === 1 ? `${j + 1}` : `${i + 1}${j + 1}`;
      return champ($('gains'), { latex: `k_{${indice}}`, valeur: k, ...modele.bornesGains[i][j] }, (v) => {
        sim.fixeGain(i, j, v);
        analyse();
        memorise();
      });
    }),
  );
  const appliqueGains = (K) => {
    if (!K[0].every(Number.isFinite)) return;
    sim.fixeGains(K);
    champsGains.forEach((ligne, i) => ligne.forEach((c, j) => c.fixe(K[i][j])));
    analyse();
    memorise();
  };
  const placePoles = () => {
    const erreur = $('erreur-poles');
    try {
      if (!placementPossible(sim.A, sim.B)) throw new Error('placement impossible : le linéarisé n’est pas contrôlable');
      appliqueGains(ackermann(sim.A, sim.B, litPoles($('poles').value, sim.n)));
      erreur.hidden = true;
    } catch (e) {
      erreur.textContent = e.message;
      erreur.hidden = false;
    }
  };
  $('placer').addEventListener('click', placePoles);
  $('poles').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') placePoles();
  });

  // ---- Contrôleur : loi libre ----------------------------------------------
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
      memorise();
    });
  }
  montreMode();

  // ---- Saturation ----------------------------------------------------------
  $('saturation').checked = sim.saturation.active;
  $('umax').value = String(sim.saturation.umax).replace('.', ',');
  $('saturation').addEventListener('change', () => {
    sim.saturation.active = $('saturation').checked;
    analyse();
    memorise();
  });
  $('umax').addEventListener('change', () => {
    const v = Number($('umax').value.replace(',', '.'));
    if (Number.isFinite(v) && v > 0) sim.saturation.umax = v;
    $('umax').value = String(sim.saturation.umax).replace('.', ',');
    analyse();
    memorise();
  });

  // ---- Perturbation et bruit -----------------------------------------------
  const P = sim.perturbation;
  const unite = modele.commandes[0].unite;
  const zoneP = $('reglages-perturbation');
  saisieNombre(zoneP, 'e', P.e, unite, (v) => {
    P.e = v;
    analyse();
    memorise();
  });
  saisieNombre(zoneP, 't_1', P.debut, 's', (v) => {
    P.debut = v;
    memorise();
  });
  saisieNombre(zoneP, '\\Delta t', P.duree, 's', (v) => {
    P.duree = Math.max(0, v);
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
    memorise();
  });
  saisieNombre($('reglage-bruit'), '\\sigma', sim.sigma, '', (v) => {
    sim.sigma = Math.max(0, v);
    analyse();
    memorise();
  });

  // ---- Condition initiale --------------------------------------------------
  const saisiesCI = modele.etats.map((e, i) => saisieNombre($('ci'), `${e.latex}(0)`, ci[i], e.unite));
  const lance = (x0) => {
    portrait?.archive();
    ci = x0.slice();
    saisiesCI.forEach((s, i) => s.fixe(ci[i]));
    sim.reinitialise(ci);
    analyse();
    joue(true);
    memorise();
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
  $('choc').addEventListener('click', () => sim.choc());
  $('vitesse').value = String(affichage.vitesse);
  $('vitesse').addEventListener('change', () => {
    affichage.vitesse = Number($('vitesse').value);
    memorise();
  });

  // ---- Scène, courbes, portrait de phase -----------------------------------
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
    $('carte-scene').hidden = true;
  }
  const courbes = new Courbes($('courbes'), modele, sim);
  let portrait = null;
  if (sim.n === 2 && modele.portrait) {
    $('carte-portrait').hidden = false;
    portrait = new Portrait($('portrait'), modele, sim, { lance });
    $('effacer').addEventListener('click', () => portrait.efface());
  }
  montrePerturbation();

  // ---- Affichage -----------------------------------------------------------
  const appliqueAffichage = () => {
    if (scene) scene.avecFantome = affichage.fantome;
    if (portrait) portrait.avecFantome = affichage.fantome;
    courbes.configure({ fantome: affichage.fantome, historique: affichage.historique });
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

  // ---- Plan complexe : placement des valeurs propres à la souris ------------
  // K est recalculé par la formule d'Ackermann à partir des valeurs propres voulues.
  const glissable = () => sim.mode === 'gains' && placementPossible(sim.A, sim.B);
  const plan = new PlanComplexe($('plan'), {
    modifiable: glissable,
    deplace: (vp) => appliqueGains(ackermann(sim.A, sim.B, vp)),
  });

  // ---- Analyse : linéarisé, valeurs propres, indications -------------------
  function analyse() {
    // Au-delà de deux états, A et B ne tiennent plus sur une ligne.
    const sep = sim.n > 2 ? ', \\\\[0.4em] ' : ', \\qquad ';
    rend($('lineaire'), `\\begin{gathered} A = ${latexMatrice(sim.A)}${sep}B = ${latexMatrice(sim.B)} \\end{gathered}`);
    rend($('boucle'), `${nomBoucle(sim)} = ${latexMatrice(sim.Jbf)}`);
    plan.actualise(sim.vpA, sim.vpBF);
    $('aide-plan').hidden = !glissable();
    if (document.activeElement !== $('poles') && sim.mode === 'gains') $('poles').value = formatePoles(sim.vpBF);
    afficheIndications($('indications'), sim);
  }
  analyse();
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
    if (enLecture && !saisi) sim.avance(dt * affichage.vitesse);
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
      const inv = modele.invariant?.(sim.x, sim.p, sim.K);
      $('invariant').hidden = !inv || sim.mode !== 'gains';
      if (inv) rend($('invariant'), `${inv.latex} = ${latexNombre(inv.valeur, 5)}`, false);
    }
    $('temps').textContent = `t = ${sim.t.toFixed(2).replace('.', ',')} s`;
    requestAnimationFrame(image);
  }
  requestAnimationFrame(image);
}

charge();
