// Catalogue des exemples. `disponible` indique qu'un module existe dans ce dossier
// sous le nom `<id>.js` ; les autres sont annoncés sur la page d'accueil.

export const catalogue = [
  {
    id: 'double-integrateur',
    titre: 'Double intégrateur',
    sous_titre: 'Chariot sur rail droit',
    source: 'Poly, chapitre « Commande » ; TD3',
    montre: 'Placement de pôles, retour de sortie u = ky.',
    disponible: true,
  },
  {
    id: 'pendule-couple',
    titre: 'Pendule inversé',
    sous_titre: 'Commandé par un couple',
    source: 'Poly, chapitre « Commande » ; TD2',
    montre: 'Non linéaire contre linéarisé, bassin d’attraction, choix des gains.',
    disponible: true,
  },
  {
    id: 'pendule-acceleration',
    titre: 'Pendule inversé',
    sous_titre: 'Commandé en accélération (« balai »)',
    source: 'TD3',
    montre: 'Retour de sortie : V conservée, pas de convergence.',
    disponible: true,
  },
  {
    id: 'rail-tournant',
    titre: 'Chariot sur rail tournant',
    sous_titre: 'Quatre états',
    source: 'Examen 2024-2025 ; oral 2019-2020',
    montre: 'Système plus riche, stabilisation locale.',
    disponible: true,
  },
  {
    id: 'pharmacocinetique',
    titre: 'Pharmacocinétique',
    sous_titre: 'Avec observateur',
    source: 'TD4',
    montre: 'Estimation de l’état, réglage de L, effet du pas h.',
    disponible: false,
  },
  {
    id: 'satellite',
    titre: 'Satellite',
    sous_titre: 'Équations d’Euler',
    source: 'Examen 2017-2018',
    montre: 'Stabilisation d’un système à trois états, en courbes.',
    disponible: false,
  },
];
