// Glossaire des illustrations : les définitions du poly, reprises au plus près
// de leur énoncé (chapitre et définition indiqués dans `source`). Une page
// déclare les termes qu'elle emploie (`termes` dans son module) ; le socle
// (`appliqueGlossaire`) souligne leur première occurrence dans « Ce que dit le
// cours » et dans « À essayer », et la définition s'affiche en infobulle.
//
// Chaque entrée donne les formes du terme telles qu'elles apparaissent dans les
// textes (casse, accord, apostrophe typographique), de la plus longue à la plus
// courte.

const STABILITE = 'Poly, chapitre « Stabilité »';
const COMMANDE = 'Poly, chapitre « Commande »';

export const GLOSSAIRE = {
  'point d’équilibre': {
    formes: ['point d’équilibre', 'points d’équilibre', 'équilibre'],
    definition: 'Point $x_e$ tel que $f(x_e) = 0$ : la solution qui part de $x_e$ y reste pour tout temps.',
    source: STABILITE,
  },
  stable: {
    formes: ['stable'],
    definition:
      'L’équilibre $x_e$ est stable si, pour tout $\\varepsilon > 0$, il existe $\\delta > 0$ tel que $\\|x_0 - x_e\\| < \\delta$ et $t > 0$ entraînent $\\|\\varphi(t, x_0) - x_e\\| < \\varepsilon$ : une solution qui part assez près de $x_e$ en reste proche.',
    source: STABILITE,
  },
  'asymptotiquement stable': {
    formes: ['asymptotiquement stables', 'asymptotiquement stable'],
    definition:
      'L’équilibre $x_e$ est asymptotiquement stable s’il est stable et si, pour tout $x_0$ dans un voisinage de $x_e$, $\\varphi(t, x_0) \\to x_e$ quand $t \\to +\\infty$.',
    source: STABILITE,
  },
  'matrice de Hurwitz': {
    formes: ['matrice de Hurwitz'],
    definition:
      'Matrice dont toutes les valeurs propres sont de partie réelle strictement négative. Pour $\\dot x = Ax$, c’est exactement la condition pour que l’origine soit asymptotiquement stable.',
    source: STABILITE,
  },
  exponentielle: {
    formes: ['exponentielle de matrice', 'exponentielle'],
    definition: '$e^A = \\sum_{k \\ge 0} A^k / k!$. La solution de $\\dot x = Ax$, $x(0) = x_0$, est $x(t) = e^{tA}x_0$.',
    source: STABILITE,
  },
  flot: {
    formes: ['flot'],
    definition:
      'Le flot $\\varphi(t, t_0, x_0)$ est la valeur au temps $t$ de la solution maximale de $\\dot x = f(t, x)$ telle que $x(t_0) = x_0$. Pour $\\dot x = Ax$, c’est $e^{(t - t_0)A}x_0$.',
    source: STABILITE,
  },
  'portrait de phase': {
    formes: ['portrait de phase', 'portraits de phase'],
    definition:
      'En dimension 2, les orbites des solutions de $\\dot x = Ax$ dessinées dans le plan $(x_1, x_2)$. Sa forme ne dépend que des valeurs propres de $A$.',
    source: STABILITE,
  },
  'nœud impropre': {
    formes: ['nœud impropre', 'Nœud impropre', 'nœuds impropres'],
    definition:
      'Valeur propre double $\\lambda$, $A$ non diagonalisable : $e^{tA} = e^{\\lambda t}(I + tN)$ avec $N$ nilpotente, et le facteur $t$ déforme le nœud. Puits si $\\lambda < 0$, source si $\\lambda > 0$.',
    source: STABILITE,
  },
  nœud: {
    formes: ['nœud', 'Nœud', 'nœuds'],
    definition:
      'Valeurs propres réelles de même signe : toutes les orbites convergent vers l’origine (puits, $\\lambda_1, \\lambda_2 < 0$) ou s’en éloignent (source, $\\lambda_1, \\lambda_2 > 0$).',
    source: STABILITE,
  },
  col: {
    formes: ['col', 'Col', 'point selle'],
    definition:
      'Valeurs propres réelles de signes opposés ($\\lambda_1\\lambda_2 < 0$) : les orbites suivent la direction propre stable, puis s’éloignent le long de l’instable.',
    source: STABILITE,
  },
  foyer: {
    formes: ['foyer', 'Foyer', 'foyers'],
    definition:
      'Valeurs propres complexes $\\alpha \\pm i\\beta$ avec $\\alpha \\neq 0$ : les orbites spiralent vers l’origine (puits, $\\alpha < 0$) ou s’en éloignent (source, $\\alpha > 0$).',
    source: STABILITE,
  },
  centre: {
    formes: ['centre'],
    definition: 'Valeurs propres imaginaires pures $\\pm i\\beta$ : les orbites sont des ellipses concentriques.',
    source: STABILITE,
  },
  diagonalisable: {
    formes: ['diagonalisable'],
    definition:
      'Pour chaque valeur propre $\\lambda$, la dimension du sous-espace propre égale la multiplicité de $\\lambda$ comme racine du polynôme caractéristique.',
    source: STABILITE,
  },
  'solution maximale': {
    formes: ['solution maximale', 'solutions maximales', 'maximale'],
    definition: 'Solution qui n’admet aucun prolongement strict : on ne peut pas la prolonger à un intervalle de temps plus grand.',
    source: STABILITE,
  },
  'solution globale': {
    formes: ['solution globale', 'globale'],
    definition: 'Solution définie sur tout l’intervalle de temps de l’équation. Toute solution globale est maximale ; la réciproque est fausse.',
    source: STABILITE,
  },
  lipschitzienne: {
    formes: ['localement lipschitzienne', 'lipschitzienne'],
    definition:
      '$f$ est localement lipschitzienne en $x$ si, près de chaque $(t_0, x_0)$, il existe $k \\ge 0$ tel que $\\|f(t, x_1) - f(t, x_2)\\| \\le k\\,\\|x_1 - x_2\\|$. C’est le cas si $f$ est de classe $C^1$.',
    source: STABILITE,
  },
  hyperbolique: {
    formes: ['hyperbolique'],
    definition: 'Équilibre $x_e$ dont toutes les valeurs propres de $f’(x_e)$ sont de partie réelle non nulle.',
    source: STABILITE,
  },
  'fonction de Lyapunov': {
    formes: ['fonction de Lyapunov', 'fonctions de Lyapunov'],
    definition:
      'Pour l’équilibre $x_e$ : une fonction continue $L$ telle que $L(x) > L(x_e)$ près de $x_e$, $x \\neq x_e$, et que $t \\mapsto L(\\varphi(t, x_0))$ soit décroissante. Elle est stricte si cette fonction est strictement décroissante pour $x_0 \\neq x_e$.',
    source: STABILITE,
  },
  'bassin d’attraction': {
    formes: ['bassins d’attraction', 'bassin d’attraction'],
    definition: 'Pour un équilibre asymptotiquement stable $x_e$ : l’ensemble des $x_0$ tels que $\\varphi(t, x_0) \\to x_e$ quand $t \\to +\\infty$.',
    source: STABILITE,
  },
  contrôlable: {
    formes: ['contrôlable'],
    definition:
      'Le système $\\dot x = Ax + Bu$ est contrôlable en temps $\\tau$ si tout état est atteignable en temps $\\tau$ : l’ensemble atteignable est $\\mathbb R^n$.',
    source: COMMANDE,
  },
  'matrice de Kalman': {
    formes: ['matrice de Kalman', 'matrice de contrôlabilité'],
    definition:
      'La matrice de contrôlabilité $\\mathcal C(A, B) = (B\\ AB\\ \\cdots\\ A^{n-1}B)$, de taille $n \\times nm$. Le système est contrôlable si et seulement si elle est de rang $n$.',
    source: COMMANDE,
  },
  atteignable: {
    formes: ['ensemble atteignable', 'atteignable'],
    definition:
      'L’état $x_f$ est atteignable en temps $\\tau$ depuis $x_0$ s’il existe une commande $u$ qui amène la solution de $x_0$ en $x_f$ au temps $\\tau$.',
    source: COMMANDE,
  },
  stabilisable: {
    formes: ['stabilisable par retour d’état', 'stabilisable'],
    definition:
      'Le système $\\dot x = Ax + Bu$ est stabilisable par retour d’état s’il existe un contrôle $u = K(x)$ qui rend l’origine asymptotiquement stable pour le système bouclé.',
    source: COMMANDE,
  },
};