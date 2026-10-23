// Onglet Observateur (exemples qui en déclarent un) : gain L, par ses
// coefficients ou par les pôles de A − LC, pas d'Euler h, estimée initiale et
// retour d'état sur x̂.

import { litPoles, placementObservateur } from '../../core/poles.js';
import { champ, saisieNombre } from '../controls.js';
import { texte } from '../format.js';
import { rend } from '../katex.js';
import { formatePoles } from './controleur.js';

const $ = (id) => document.getElementById(id);
const vecteur = (v) => `(${v.map((x) => texte(x)).join(' ; ')})`;

export function panneauObservateur(page) {
  const { modele, sim, note } = page;
  const mo = modele.observateur;
  rend($('obs-modele'), mo.latex);

  const champsL = sim.obs.L.map((l, i) =>
    champ($('obs-gains'), { latex: `\\ell_{${i + 1}}`, valeur: l, ...mo.bornesL[i] }, (v) => {
      const L = sim.obs.L.slice();
      L[i] = v;
      sim.fixeL(L);
      note(`Gain ℓ${i + 1} = ${texte(v)}`, { cle: `l_${i + 1}` });
      page.modifie();
    }),
  );
  const appliqueL = (L, message, cle = null) => {
    if (!L.every(Number.isFinite)) return;
    sim.fixeL(L);
    champsL.forEach((c, i) => c.fixe(L[i]));
    note(`${message} → L = ${vecteur(L)}`, { cle });
    page.modifie();
  };
  const placeObs = () => {
    const erreur = $('erreur-obs-poles');
    try {
      if (!sim.observable) throw new Error('placement impossible : le couple (A, C) n’est pas observable');
      appliqueL(placementObservateur(sim.A, sim.C, litPoles($('obs-poles').value, sim.n)), `Pôles de A − LC voulus ${$('obs-poles').value}`);
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
    note(`Observateur : pas h = ${texte(v)} s`, { cle: 'h_obs' });
    page.modifie();
  });
  modele.etats.forEach((e, i) =>
    saisieNombre($('obs-xh0'), `\\hat x_{${i + 1}}(0)`, sim.obs.xh0[i], e.unite, (v) => {
      sim.obs.xh0[i] = v;
      note(`Estimée initiale x̂${i + 1}(0) = ${texte(v)}`, { cle: `xh0_${i}` });
      page.modifie();
    }),
  );
  $('retour-estime').checked = sim.retourEstime;
  $('retour-estime').addEventListener('change', () => {
    sim.fixeRetourEstime($('retour-estime').checked);
    note(sim.retourEstime ? 'Retour d’état sur l’état estimé x̂' : 'Retour d’état sur l’état mesuré x');
    page.modifie();
  });

  return {
    appliqueL,
    actualise() {
      if (document.activeElement !== $('obs-poles')) $('obs-poles').value = formatePoles(sim.vpObs);
      $('obs-hmax').textContent =
        sim.hMax > 0
          ? `Pas maximal pour Euler explicite : h < ${texte(sim.hMax)} s (ρ = ${texte(sim.rhoEuler)}${sim.rhoEuler < 1 ? ' < 1' : ' ≥ 1 : l’observateur discret diverge'}).`
          : 'Aucun pas ne convient : A − LC a une valeur propre de partie réelle positive ou nulle.';
      $('obs-hmax').style.color = sim.rhoEuler < 1 ? '' : 'var(--alerte)';
    },
  };
}
