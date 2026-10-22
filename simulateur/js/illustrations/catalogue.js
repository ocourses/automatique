// Carte du cours : les thèmes, dans l'ordre du poly, et leurs illustrations.
// `disponible` indique qu'un module js/illustrations/<id>.js existe ; les
// autres sont annoncées sur la page d'accueil. Les exemples du simulateur de
// stabilisation sont dans js/exemples/catalogue.js.

export const themes = [
  {
    id: 'lineaire',
    titre: 'Stabilité des équilibres, cas linéaire',
    source: 'Poly, chapitre « Stabilité » ; TD1',
    illustrations: [
      {
        id: 'bifurcation',
        titre: 'Diagramme de bifurcation',
        resume: 'Un point dans le plan (trace, déterminant) : portrait de phase, valeurs propres et directions propres.',
        source: 'Poly, portraits de phase ; TD1',
        disponible: true,
      },
      {
        id: 'galerie-portraits',
        titre: 'Les onze cas du TD1',
        resume: 'Les portraits de phase des points P₁ à P₁₁, côte à côte : nœuds, col, foyers, centre, nœuds impropres.',
        source: 'TD1',
        disponible: true,
      },
      {
        id: 'flot',
        titre: 'Le flot déforme le plan',
        resume: 'Un disque de conditions initiales emporté par e^{tA} : rotation, contraction, cisaillement.',
        source: 'Poly, exponentielle de matrice',
        disponible: false,
      },
    ],
  },
  {
    id: 'existence',
    titre: 'Existence et unicité des solutions',
    source: 'Poly, chapitre « Stabilité », équations non linéaires',
    illustrations: [
      {
        id: 'bestiaire',
        titre: 'Solutions maximales en dimension 1',
        resume: 'Explosion en temps fini, solutions maximales non globales, non-unicité : les exemples du poly.',
        source: 'Poly, solutions maximales ; Cauchy-Lipschitz',
        disponible: false,
      },
    ],
  },
  {
    id: 'linearisation',
    titre: 'Stabilité par linéarisation',
    source: 'Poly, chapitre « Stabilité »',
    illustrations: [
      {
        id: 'pendule-amorti',
        titre: 'Pendule amorti',
        resume: 'Deux équilibres, un puits et un col ; nœud ou foyer selon l’amortissement ; bassin d’attraction.',
        source: 'Poly, stabilité par linéarisation',
        disponible: false,
      },
      {
        id: 'contre-exemple',
        titre: 'Même linéarisé, comportements opposés',
        resume: 'Le contre-exemple du poly : un centre linéarisé, un équilibre stable et un instable.',
        source: 'Poly, stabilité par linéarisation',
        disponible: false,
      },
    ],
  },
  {
    id: 'lyapunov',
    titre: 'Théorie de Lyapunov',
    source: 'Poly, chapitre « Stabilité »',
    illustrations: [
      {
        id: 'lyapunov',
        titre: 'Fonction de Lyapunov',
        resume: 'La surface z = L(x) en 3D, une bille qui suit la trajectoire, et les lignes de niveau dans le plan.',
        source: 'Poly, théorie de Lyapunov',
        disponible: false,
      },
    ],
  },
  {
    id: 'commande',
    titre: 'Commande',
    source: 'Poly, chapitre « Commande » ; TD2, TD3, TD4',
    simulateur: true,
    illustrations: [
      {
        id: 'td2-pid',
        titre: 'TD2 : du retour d’état au PID',
        resume: 'Boucle ouverte, retour d’état, perturbation en créneau puis constante, action intégrale.',
        source: 'TD2',
        disponible: true,
      },
      {
        id: 'controlabilite',
        titre: 'Contrôlabilité',
        resume: 'Le rang de la matrice de Kalman dans le plan des paramètres.',
        source: 'Poly, chapitre « Commande »',
        disponible: false,
      },
    ],
  },
  {
    id: 'integration',
    titre: 'Intégration numérique',
    source: 'TD4',
    illustrations: [
      {
        id: 'euler',
        titre: 'Euler explicite, implicite et symplectique',
        resume: 'Sur un système conservatif : la quantité conservée, le pas h et l’ordre de convergence.',
        source: 'TD4',
        disponible: false,
      },
    ],
  },
];

export function trouve(id) {
  for (const theme of themes) {
    const illustration = theme.illustrations.find((i) => i.id === id);
    if (illustration) return { theme, illustration };
  }
  return null;
}
