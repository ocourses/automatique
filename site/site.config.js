// Ce qui distingue ce cours ; le reste vient du socle (socle/docs/conception.md).
// Les exemples du simulateur suivent les illustrations du thème qui porte le
// drapeau `simulateur` du catalogue, « Commande » (`pagesDuTheme`, décision 15) ;
// le drapeau, que le contrat du socle ne connaît pas, est retiré ici.

import { catalogue as exemples } from './js/exemples/catalogue.js';
import { themes } from './js/illustrations/catalogue.js';
import { GLOSSAIRE } from './js/illustrations/glossaire.js';

const themeDuSimulateur = themes.find((t) => t.simulateur)?.id;
const pagesDuSimulateur = exemples
  .filter((e) => e.disponible)
  .map((e) => ({ genre: 'exemple', id: e.id, titre: e.sous_titre ? `${e.titre} (${e.sous_titre})` : e.titre, lien: `exemple.html?id=${e.id}` }));

export default {
  id: 'automatique',
  titre: 'Automatique',
  sousTitre: 'Automatique, première année — ENSEEIHT, Sciences du numérique',
  intro: [
    "Des illustrations interactives du poly et des TD, rangées par thème dans l'ordre du cours. Chacune rappelle le résultat du cours, propose des choses à essayer et garde ses réglages dans son lien. Le simulateur de stabilisation est dans le thème « Commande ».",
  ],
  depotIssues: 'ocourses/automatique',
  themes: themes.map(({ simulateur, ...theme }) => theme),
  glossaire: GLOSSAIRE,
  charge: (id) => import(`./js/illustrations/${id}.js`),
  pagesDuTheme: (theme) => (theme.id === themeDuSimulateur ? pagesDuSimulateur : []),
};
