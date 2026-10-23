// Onglet Système : la dynamique et ses paramètres, puis le scénario de la
// simulation (condition initiale, perturbation, bruit de mesure).
//
// `page` est le contexte commun aux panneaux (voir app.js) : modele, sim,
// note(message, options) pour le journal, modifie() après un réglage, et
// lance(x0) pour démarrer une trajectoire.

import { champ, saisieNombre } from '../controls.js';
import { texte } from '../format.js';
import { rend, rendTexte } from '../katex.js';

const $ = (id) => document.getElementById(id);

export function panneauSysteme(page, ci) {
  const { modele, sim, note } = page;

  // ---- Dynamique et paramètres ------------------------------------------------
  rend($('modele'), modele.latex.modele);
  rend($('etats'), modele.etats.map((e) => e.latex).join(', \\quad '), false);
  if (modele.sansSortie) $('sortie').textContent = 'aucune, tout l’état est mesuré';
  else rend($('sortie'), `y = x_${sim.sortie + 1}`, false);

  // Les paramètres de famille « equilibre » se règlent avec le point de
  // fonctionnement, dans l'onglet Contrôleur.
  const physiques = modele.parametres.filter((q) => q.famille !== 'equilibre');
  $('titre-parametres').hidden = physiques.length === 0;
  for (const q of physiques) {
    champ($('parametres'), { ...q, valeur: sim.p[q.nom] }, (v) => {
      sim.fixeParametre(q.nom, v);
      note(`Paramètre ${q.nom} = ${texte(v)} ${q.unite}`, { cle: `p_${q.nom}` });
      page.modifie();
    });
  }

  // ---- Condition initiale -----------------------------------------------------------
  // Étiquette courte : le nom de l'état, avant le « = » de sa définition (x_1 = θ → x_1).
  const saisiesCI = modele.etats.map((e, i) => saisieNombre($('ci'), `${e.latex.split('=')[0].trim()}(0)`, ci[i], e.unite));
  const aide = modele.aScene
    ? `On peut aussi déplacer l'objet à la souris${modele.aPortrait ? ', ou cliquer dans le portrait de phase' : ''}.`
    : modele.aPortrait
      ? 'On peut aussi cliquer dans le portrait de phase.'
      : '';
  rendTexte($('aide-ci'), aide);
  $('aide-ci').hidden = !aide;
  $('lancer').addEventListener('click', () => {
    const x0 = saisiesCI.map((s) => s.lit());
    if (x0.every(Number.isFinite)) page.lance(x0);
  });

  // ---- Perturbation -----------------------------------------------------------------
  const P = sim.perturbation;
  const unite = modele.commandes[0].unite;
  const zoneP = $('reglages-perturbation');
  const lignes = [
    saisieNombre(zoneP, 'e', P.e, unite, (v) => {
      P.e = v;
      note(`Perturbation : e = ${texte(v)} ${unite}`, { cle: 'pert_e' });
      page.modifie();
    }),
    saisieNombre(zoneP, 't_1', P.debut, 's', (v) => {
      P.debut = v;
      note(`Perturbation : début t₁ = ${texte(v)} s`, { cle: 'pert_t1' });
      page.modifie();
    }),
    saisieNombre(zoneP, '\\Delta t', P.duree, 's', (v) => {
      P.duree = Math.max(0, v);
      note(`Perturbation : durée Δt = ${texte(P.duree)} s`, { cle: 'pert_dt' });
      page.modifie();
    }),
  ];
  const montrePerturbation = () => {
    lignes[0].ligne.hidden = P.type === 'aucune';
    lignes[1].ligne.hidden = P.type !== 'creneau';
    lignes[2].ligne.hidden = P.type !== 'creneau';
  };
  $('perturbation').value = P.type;
  $('perturbation').addEventListener('change', () => {
    P.type = $('perturbation').value;
    montrePerturbation();
    note(
      P.type === 'aucune'
        ? 'Perturbation supprimée'
        : `Perturbation ${P.type === 'constante' ? 'constante' : 'en créneau'} : e = ${texte(P.e)} ${unite}`,
    );
    page.modifie();
  });
  montrePerturbation();

  // ---- Bruit de mesure ---------------------------------------------------------------
  saisieNombre($('reglage-bruit'), '\\sigma', sim.sigma, '', (v) => {
    sim.sigma = Math.max(0, v);
    note(`Bruit de mesure : σ = ${texte(sim.sigma)}`, { cle: 'sigma' });
    page.modifie();
  });

  return {
    // Affiche la condition initiale d'une trajectoire lancée d'ailleurs (souris, portrait).
    afficheCI(x0) {
      saisiesCI.forEach((s, i) => s.fixe(x0[i]));
    },
  };
}
