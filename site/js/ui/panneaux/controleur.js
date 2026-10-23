// Onglet Contrôleur : le point de fonctionnement (x_e, u_e) et le linéarisé
// en ce point, puis la loi de commande (retour d'état ou loi libre), la
// saturation et l'échantillonnage de la commande.

import { ackermann, litPoles, placementPossible } from '../../core/poles.js';
import { ajoutePas, champ } from '../controls.js';
import { latexMatrice, latexVecteur, texte } from '../format.js';
import { rend, rendTexte } from '../katex.js';

const $ = (id) => document.getElementById(id);
const vecteur = (v) => `(${v.map((x) => texte(x)).join(' ; ')})`;

// Pôles au format de la saisie (point décimal), paires conjuguées regroupées.
export function formatePoles(vp) {
  const f = (v) => (Math.abs(v) < 1e-9 ? '0' : String(Number(v.toPrecision(4))));
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

export function panneauControleur(page) {
  const { modele, sim, note } = page;

  // ---- Point de fonctionnement ------------------------------------------------------
  rend($('equilibre'), modele.latex.equilibre);
  const libres = modele.parametres.filter((q) => q.famille === 'equilibre');
  for (const q of libres) {
    champ($('parametres-eq'), { ...q, valeur: sim.p[q.nom] }, (v) => {
      sim.fixeParametre(q.nom, v);
      note(`Point de fonctionnement : ${q.nom} = ${texte(v)} ${q.unite}`, { cle: `p_${q.nom}` });
      page.modifie();
    });
  }
  rendTexte(
    $('aide-eq'),
    modele.noteEquilibre ??
      (libres.length
        ? `On règle ici ${libres.length > 1 ? 'les coordonnées libres' : 'la coordonnée libre'} de $x_e$ ; la commande d'équilibre $u_e$ s'en déduit par $f(x_e, u_e) = 0$, on ne la règle pas séparément.`
        : `Ce modèle n'a qu'un point de fonctionnement : $x_e$ et $u_e$ sont imposés, il n'y a rien à régler.`),
  );
  $('note-lineaire').hidden = !modele.lineaire;
  // Sans coordonnée libre, la formule de x_e et u_e donne déjà leurs valeurs.
  $('equilibre-num').hidden = libres.length === 0;

  // ---- Retour d'état ------------------------------------------------------------------
  rend($('loi-gains'), modele.latex.loi ?? 'u = u_e + K(x - x_e)');
  // Un champ par gain ; avec gainsDiagonaux, seule la diagonale de K se règle.
  const champsGains = [];
  sim.K.forEach((ligne, i) =>
    ligne.forEach((k, j) => {
      if (modele.gainsDiagonaux && i !== j) return;
      const indice = modele.gainsDiagonaux ? `${i + 1}` : modele.uneCommande ? `${j + 1}` : `${i + 1}${j + 1}`;
      const c = champ($('gains'), { latex: `k_{${indice}}`, valeur: k, ...modele.bornesGains[i][j] }, (v) => {
        sim.fixeGain(i, j, v);
        note(`Gain k${indice} = ${texte(v)}`, { cle: `k_${indice}` });
        page.modifie();
      });
      champsGains.push({ i, j, c });
    }),
  );
  const appliqueGains = (K, message, cle = null) => {
    if (!K[0].every(Number.isFinite)) return;
    sim.fixeGains(K);
    champsGains.forEach(({ i, j, c }) => c.fixe(K[i][j]));
    note(`${message} → K = ${vecteur(K.flat())}`, { cle });
    page.modifie();
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
  document.querySelector('.champ-poles').hidden = !modele.uneCommande;
  $('placer').addEventListener('click', placePoles);
  $('poles').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') placePoles();
  });

  // ---- Loi libre ------------------------------------------------------------------------
  $('choix-loi').hidden = !modele.uneCommande;
  const n = sim.n;
  rendTexte(
    $('aide-loi'),
    `Variables : $x_1$ à $x_${n}$ (écrits x1…x${n}), y = $x_${sim.sortie + 1}$, t, ` +
      `ix1…ix${n} (primitives de $x_i - x_{e,i}$), iy, xe1…xe${n}, ue et les paramètres (${Object.keys(sim.p).join(', ')}). ` +
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
      if (erreur) note(`Loi libre refusée : ${erreur}`, { niveau: 'alerte', cle: 'loi' });
      else note(`Loi libre : u = ${sim.loiTexte}`, { cle: 'loi' });
      page.modifie();
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
      note(radio.value === 'loi' ? 'Contrôleur : loi libre' : 'Contrôleur : retour d’état');
      page.modifie();
    });
  }
  montreMode();

  // ---- Saturation --------------------------------------------------------------------------
  const fr = (v) => String(v).replace('.', ',');
  $('saturation').checked = sim.saturation.active;
  $('umax').value = fr(sim.saturation.umax);
  $('saturation').addEventListener('change', () => {
    sim.saturation.active = $('saturation').checked;
    note(sim.saturation.active ? `Saturation activée : |u| ≤ ${texte(sim.saturation.umax)}` : 'Saturation désactivée');
    page.modifie();
  });
  ajoutePas($('umax'), { pas: 0.5, min: 0.5, nom: 'u max' });
  $('umax').addEventListener('change', () => {
    const v = Number($('umax').value.replace(',', '.'));
    if (Number.isFinite(v) && v > 0) sim.saturation.umax = v;
    $('umax').value = fr(sim.saturation.umax);
    if (sim.saturation.active) note(`Saturation : |u| ≤ ${texte(sim.saturation.umax)}`, { cle: 'umax' });
    page.modifie();
  });

  // ---- Échantillonnage de la commande ----------------------------------------------------------
  champ($('reglage-te'), { latex: 'T_e', valeur: sim.Te, min: 0, max: 1, pas: 0.01, unite: 's' }, (v) => {
    sim.fixeTe(v);
    note(v > 0 ? `Commande échantillonnée : Tₑ = ${texte(v)} s` : 'Commande continue (Tₑ = 0)', { cle: 'Te' });
    page.modifie();
  });

  // A et B sur une ligne ; si elle déborde (beaucoup d'états), l'une sous l'autre.
  // L'onglet est parfois masqué (largeur nulle) : on refait le choix dès qu'il
  // a une largeur.
  const zoneLineaire = $('lineaire');
  let largeurVue = 0;
  function ecritLineaire() {
    // Du plus aéré au plus serré, puis l'une sous l'autre : on garde la première
    // mise en page qui tient sur une ligne.
    const essais = [
      ['', ', \\qquad '],
      ['', ',\\; '],
      ['', ',\\, '],
      ['\\small ', ',\\; '],
      ['\\footnotesize ', ',\\, '],
      ['', ', \\\\[0.4em] '],
    ];
    largeurVue = zoneLineaire.clientWidth;
    for (const [taille, sep] of essais) {
      rend(zoneLineaire, `\\begin{gathered} ${taille}A = ${latexMatrice(sim.A)}${sep}B = ${latexMatrice(sim.B)} \\end{gathered}`);
      if (largeurVue === 0 || zoneLineaire.querySelector('.base').getBoundingClientRect().width <= largeurVue) return;
    }
  }
  // Les mesures dépendent des polices de KaTeX : on refait le choix une fois chargées.
  document.fonts.addEventListener('loadingdone', () => ecritLineaire());
  new ResizeObserver(() => {
    if (zoneLineaire.clientWidth !== largeurVue && zoneLineaire.clientWidth > 0) ecritLineaire();
  }).observe(zoneLineaire);

  return {
    appliqueGains,
    // Après chaque analyse : point de fonctionnement, linéarisé et pôles affichés.
    actualise() {
      rend($('equilibre-num'), `x_e = ${latexVecteur(sim.xe)}, \\qquad u_e = ${latexVecteur(sim.ue)}`);
      ecritLineaire();
      if (document.activeElement !== $('poles') && sim.mode === 'gains') $('poles').value = formatePoles(sim.vpBF);
    },
  };
}
