// Un cours factice et valide, pour les tests de configuration et de parcours :
// deux thèmes, trois illustrations (« a » et « c » disponibles, « b » annoncée),
// un terme de glossaire et des modules en mémoire. Chaque appel rend un cours
// neuf, que le test peut modifier sans toucher aux autres ; `charges` relève les
// modules demandés à `charge`.

export function moduleFactice() {
  return {
    monte: () => ({ applique() {} }),
    etat: { n: 3, forme: 'carre', anime: true },
    choix: { forme: ['carre', 'rond'] },
    preferences: { particules: true },
    rappel: ['Une $\\sigma$-algèbre, ou tribu.'],
    essais: [
      { texte: 'Passer au rond.', etat: { forme: 'rond', n: 5 } },
      { texte: 'Sans particules.', preferences: { particules: false, onglet: 'essais' } },
    ],
    termes: ['tribu'],
  };
}

export function coursFactice() {
  const modules = { a: moduleFactice(), c: moduleFactice() };
  const charges = [];
  return {
    charges,
    modules,
    config: {
      id: 'cours-factice',
      titre: 'Cours factice',
      sousTitre: 'Pour les tests du socle',
      intro: ['Une intro avec une formule $x$.'],
      depotIssues: 'ocourses/cours-factice',
      themes: [
        {
          id: 't1',
          titre: 'Premier thème',
          source: 'Poly, chapitre 1',
          illustrations: [
            { id: 'a', titre: 'Illustration A', resume: 'Résumé A.', source: 'Poly, 1.1', disponible: true },
            { id: 'b', titre: 'Illustration B', resume: 'Résumé B.', source: 'Poly, 1.2', disponible: false },
          ],
        },
        {
          id: 't2',
          titre: 'Second thème',
          source: 'Poly, chapitre 2',
          illustrations: [{ id: 'c', titre: 'Illustration C', resume: 'Résumé C.', source: 'Poly, 2.1', disponible: true }],
        },
      ],
      glossaire: { tribu: { formes: ['tribus', 'tribu'], definition: 'Famille de parties…', source: 'Poly, définition 2.1.1' } },
      charge: async (id) => {
        charges.push(id);
        return { default: modules[id] };
      },
    },
  };
}
