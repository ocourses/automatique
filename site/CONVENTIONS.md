# Conventions des pages d'illustration

Ces règles viennent du travail sur le diagramme de bifurcation
(`js/illustrations/bifurcation.js`), qui sert de page de référence. Elles
s'appliquent à toute nouvelle illustration et aux reprises des pages existantes.
Le fonctionnement du gabarit est décrit dans le `README.md`, section « Ajouter
une illustration ».

## 1. Mise en page

- **Gabarit commun.** Le gabarit (`illustration.html`) place une boîte à
  onglets à gauche (« Ce que dit le cours », « À essayer ») et l'illustration à
  droite. L'onglet « À essayer » est masqué s'il n'y a pas d'essai.
- **En-tête sur deux lignes.** La première ligne porte le fil d'Ariane
  « ← Accueil · thème ». La seconde porte le titre, suivi de la source. Le
  titre, le thème et la source viennent du catalogue
  (`js/illustrations/catalogue.js`). Le lien de retour s'écrit « ← Accueil »
  sur toutes les pages, simulateur compris.
- **Tout tient dans la fenêtre sur grand écran.** Au-delà de 900 px de large et
  620 px de haut, la page prend la hauteur de la fenêtre, avec un maximum de
  1000 px. La boîte de gauche a la hauteur de la colonne de droite, et les
  cartes ne défilent pas. Si le contenu ne tient pas, on réduit les figures,
  pas la lisibilité du texte. La référence de contrôle est une fenêtre de
  1504 × 856.
- **Les canevas remplissent leur carte.** Un canevas carré (repère orthonormé)
  garde ses proportions et se centre. Les autres s'étirent. On ne fixe jamais
  de hauteur en pixels à un canevas.
- **Une seule colonne sur écran étroit.** En dessous de 900 px, la page passe
  sur une colonne et défile normalement, sans `100vh` rigide. L'illustration
  passe avant le texte du cours.
- **Dispositions disponibles.** On utilise `.grille-2` (deux cartes côte à
  côte, de même hauteur), `.grille-3` ou `.deux-colonnes` (deux cartes
  empilées à gauche, une carte sur toute la hauteur à droite). Dans ce dernier
  cas, la carte du haut prend 55 % de la hauteur. Un choix qui porte sur toute
  l'illustration (forme, système) va dans une ligne d'outils sans carte
  (`.barre-outils`), avec le bouton « i » à droite. La rangée des figures
  principales porte la classe `principale` : elle prend deux fois plus de
  hauteur que les rangées de réglages ou de courbes.
- **Compléments repliables.** Un contenu annexe (un contre-exemple, par
  exemple) va dans un bloc repliable (`repliable()` de `commun.js`), fermé par
  défaut. Son état est gardé dans les préférences. Ouvert, il prend environ un
  tiers de la hauteur.
- **Seuls les canevas rétrécissent.** Dans une carte, un bloc de texte ou de
  formules garde sa hauteur, et c'est le canevas voisin qui cède. Une carte
  de colonne ne descend pas sous la hauteur de son texte.
- **Repli sur petite fenêtre.** Entre 900 px et 1200 px de large, si le
  contenu ne tient plus, seule la zone de l'illustration défile, jamais la
  page entière. Les formules KaTeX y sont retenues par `position: relative`.
- **Texte de hauteur fixe.** Un texte qui change avec les réglages (verdict,
  formules sous une figure) a une hauteur réservée (`.verdict`, `.bloc-maths`).
  Sans cela, la figure change de taille quand le texte passe à la ligne.
- **Choix qui modifient toute la page : des radios, hors des boîtes.** Le
  système, l'étape, la forme se choisissent par des boutons radio dans une barre
  d'outils au-dessus des cartes (`barreOutils`, `choixRadios` de `commun.js`),
  jamais par de gros boutons, ni dans une carte de texte qu'ils modifient.
- **Rangées inégales.** La rangée des figures principales prend plus de place :
  `principale` (deux fois) ou, pour deux rangées, `plus-haut` et
  `rangee-basse` (60 % et 40 %).

## 2. Texte et typographie

- **Une seule taille de texte.** Le cours, les essais, les notes et les
  verdicts sont en 0,9 rem (`--taille-texte`), dans la police du texte. Les
  formules KaTeX ont le même corps partout (1,1 em), dans le simulateur comme
  dans les illustrations.
- **Notations.** Tout opérateur mathématique s'écrit en romain, jamais en
  italique : `\operatorname{tr}`, `\det`, `\log`, `\exp`, `\operatorname{diag}`,
  `\operatorname{rang}`, `\operatorname{Im}`… dans le texte comme sur les axes. Pour les axes du canevas, on passe
  des segments `[['tr ', false], ['A', true]]`. Les notations sont celles du
  poly ou du TD cité. Par exemple, le TD1 écrit le changement de variable
  `x = Py`, alors que le poly écrit `z = P⁻¹x` : on suit la source affichée
  sous le titre.
- **Formules centrées.** Une matrice ou une formule importante va sur sa propre
  ligne, centrée (`.formule`, rendue en mode display).
- **Nombres qui bougent : largeur fixe.** Une matrice ou un nombre qui change
  au glisser ou pendant une animation s'écrit avec un nombre fixe de
  décimales, la place du signe moins réservée (`latexMatriceFixe`,
  `latexNombreFixe` de `format.js`). Sinon la formule « vibre » quand une
  décimale apparaît puis disparaît.
- **Valeurs qui changent : une mise en page qui ne bouge pas.** Un texte qui
  affiche une valeur modifiée au glisser ou à l'animation ne doit ni changer de
  largeur ni sauter de ligne.
  - Tout nombre d'un texte ou d'une légende qui varie s'écrit à virgule fixe
    (`latexNombreFixe`, `latexComplexeFixe`, `latexMatriceFixe`) : même nombre de
    décimales, place du signe réservée. On n'emploie `latexNombre` que pour une
    valeur qui ne change pas pendant le geste.
  - Quand la phrase elle-même change (nom du cas, verdict), les nombres vont
    dans une formule ou un tableau à part, de largeur fixe, et le texte variable
    reste à côté : la mise en page ne dépend que du texte constant.
  - Les tableaux de valeurs ont des colonnes de largeur fixe.
  - La légende des courbes du simulateur affiche ses valeurs en notation
    scientifique de largeur constante, en police à chasse fixe
    (`nombreScientifique`, `+1,23e−02`) : elle ne bouge pas quand on suit une
    courbe.
- **« Ce que dit le cours ».** On énonce le résultat, sans démonstration. Une
  énumération de cas se met en liste à puces (un élément de `rappel` qui est
  lui-même un tableau).
- **Légendes en bulle.** Toute figure qui a plus de deux éléments à expliquer
  a un bouton « i » en haut à droite de sa carte, créé par
  `boutonInfo(carte, elements)` de `commun.js`. Il ouvre une légende avec des
  pastilles de couleur (ligne, tirets, point, cercle, flèche, aplat) : ce que
  représente chaque tracé, et ce qu'on peut faire à la souris. On ne met pas
  de longue phrase de légende sous la figure.
- **Glossaire du poly.** Les termes définis dans le poly sont dans
  `js/illustrations/glossaire.js`, avec la définition reprise au plus près du
  poly et sa source (chapitre).
  - Une page déclare ceux qu'elle emploie dans `termes`. Le gabarit souligne
    leur première occurrence dans le cours et dans les essais, et la
    définition s'affiche en infobulle.
  - Pour un texte construit par l'illustration, on appelle
    `outils.glossaire(element, termes)`.
  - Un terme absent du poly (par exemple « matrice compagnon ») s'explique avec
    `infobulle(racine, terme, explication)`, sans entrer au glossaire.
  - On ajoute au glossaire tout terme du poly employé par une page, plutôt
    que de le redéfinir dans le texte.
- **Typographie française.** Le texte est en français, avec des espaces
  insécables avant « : », « ; », « ! », « ? ». On écrit les guillemets
  « … » et l'apostrophe ’.

## 3. Couleurs

Aucune couleur n'est écrite en dur dans `style.css` : tout passe par les
variables de `css/theme.css`, qui ont une valeur claire et une valeur sombre.
Les canevas lisent les mêmes variables par `couleurs()` (`js/ui/theme.js`) et
se redessinent au changement de thème (`outils.surTheme`).

Chaque couleur a un seul rôle, le même sur toutes les pages :

| Rôle | Variable | Usage |
|---|---|---|
| Trajectoires, texte | `--texte` | orbites, particules, courbes principales |
| Accent | `--accent` | directions propres (en tirets), point stable, première courbe |
| Zone de stabilité | `--zone-stable` | région où l'équilibre est asymptotiquement stable |
| Condition initiale | `--perturbation` (orange) | x₀ dans le portrait, rappelé en t = 0 dans les courbes |
| Équilibres | `--equilibre` (violet) | l'équilibre isolé et la droite d'équilibres |
| Alerte | `--alerte` (rouge) | point instable, verdict « instable » ; jamais pour autre chose |
| Discret | `--discret` | champ de vecteurs, graduations, points de repère |

Les boîtes n'ont ni liseré coloré ni fond teinté. Un onglet sélectionné est
marqué par le seul trait bleu dessous, sans fond. Les bulles (infobulles,
légendes « i ») ont un fond gris léger et un bord marqué (`--fond-bulle`,
`--bord-bulle`), pour se distinguer du texte.

Des séries comparées (schémas numériques, méthodes) prennent `--serie-1` à
`--serie-4`, qui n'ont pas d'autre rôle : on n'emprunte pas le rouge d'alerte
ni le vert de l'observateur pour distinguer des courbes. Une courbe étudiée est en `--accent` ; son linéarisé, en tirets `--texte`. Les
bassins d'attraction sont en `--zone-stable`, `--zone-2` et `--zone-3`. Un
équilibre stable est un point plein violet, un équilibre instable un cercle
violet.

## 4. État et sauvegarde

Il y a deux mémoires, et chaque réglage va dans l'une des deux.

- **L'URL : ce qui définit l'expérience.** On y met ce qu'on partage en
  copiant l'adresse de la page : les paramètres mathématiques, la forme du système, la
  condition initiale. C'est `etat` dans le module.
  - L'URL est écrite tout de suite, puis au plus toutes les 200 ms pendant un
    glisser.
  - Les nombres gardent 10 chiffres significatifs. Un aller-retour par l'URL
    ne doit pas changer le résultat, par exemple Δ = 0 sur la parabole.
- **Le navigateur (localStorage) : le confort de chaque lecteur.** On y met le
  mode d'animation, les particules et l'onglet ouvert. C'est `preferences`
  dans le module, sous la clé `simulateur.illustration.<id>`.
  - La page doit marcher sans stockage, par exemple en navigation privée. Les
    accès sont protégés.
  - Le zoom d'une courbe n'est sauvé nulle part : il revient au cadre
    automatique à chaque visite.
- **Valeurs vérifiées.** Une valeur lue (URL ou navigateur) d'un mauvais type,
  non finie ou hors des valeurs permises (`choix` dans le module) est remplacée
  par la valeur par défaut. L'interface est alors toujours cohérente : un
  bouton radio est toujours coché.
- **Préférences des essais.** Un bouton « Essayer » peut fixer des préférences
  (`preferences` de l'essai). Les essais du diagramme remettent ainsi les
  courbes en « tracées ».

## 5. Interactions

- **Glisser et cliquer.** On utilise `glisse()` (`commun.js`), qui gère la
  souris et le tactile. Le curseur indique ce qui se saisit (`.saisissable`)
  ou se clique (`.cliquable`).
- **Aimantation exacte.** Un point se colle aux lieux remarquables : axes,
  parabole Δ = 0. La valeur obtenue doit être exacte, sans arrondis séparés :
  Δ vaut 0, et non 10⁻³. Une fonction pure et testée calcule le point
  (`pointDuPlan`).
- **Plusieurs moyens de régler une valeur.** Un curseur seul est difficile à
  placer. `champ()` en donne trois, toujours ensemble : le curseur (gros
  réglage, et ← → quand il a le focus), les boutons ▲ ▼ dans la boîte de
  nombre (un pas rond, `pasFleche`, par exemple 0,1 ; maintenus, ils répètent),
  et la saisie au clavier. Quand la boîte a le focus, ↑ et ↓ changent la valeur
  d'un pas (PageHaut, PageBas ou Maj : dix pas). Toute grandeur réglable d'une
  illustration passe par `champ()` ; une boîte de nombre seule, même écrite en
  HTML, reçoit les mêmes boutons par `ajoutePas()` (`controls.js`) ; le curseur n'est pas étiré sur toute la
  carte.
- **Calculs coûteux pendant le glisser.** Ce qui se recalcule lentement quand
  un paramètre change (bassins d'attraction) ne s'efface jamais : l'ancien
  résultat reste affiché pendant que le nouveau se calcule en arrière-plan,
  puis le nouveau apparaît en fondu (350 ms, sans fondu si le mouvement est
  réduit). Un calcul relancé avant la fin abandonne le précédent.
- **Zoom des courbes temporelles.** La molette zoome autour du curseur, et le
  glisser déplace la vue. Les boutons +, − et ↺ font la même chose, et le
  temps reste ≥ 0. La courbe est recalculée sur la plage visible.
- **Rappels croisés.** Un même objet a la même couleur partout. Par exemple, x₀
  en orange dans le portrait est rappelé en t = 0 dans la solution.
- **Animation sobre.** On n'anime que ce qui bouge. Une figure immobile n'est
  pas redessinée à chaque image. L'animation respecte
  `prefers-reduced-motion` : rien ne bouge, et les arcs restent fixes.
- **Clavier.** Les onglets se parcourent avec les flèches. Les bulles s'ouvrent
  au focus et se ferment avec Échap. Tout bouton a un `aria-label` s'il ne
  porte qu'un symbole.

## 6. Briques partagées

- **Navigation.** Chaque page a, dans son en-tête, « ← Accueil », « ← Page
  précédente » et « Page suivante → » (`js/parcours.js`, ordre de lecture : illustrations par thème,
  puis exemples). Le retour revient à la carte de la page sur l'accueil, pas en
  haut : chaque carte a un identifiant (`illustration-<id>`, `exemple-<id>`).

- **Plan (trace, déterminant).** `plan-trace-det.js` le dessine
  (`dessinePlan`) et le rend saisissable avec aimantation (`plan`). Le
  diagramme de bifurcation et le flot l'utilisent : une page qui choisit une
  matrice 2 × 2 le reprend, plutôt que des boutons ou des curseurs.
  - Quand seule une partie du plan convient (matrices de Hurwitz du cas
    linéaire de Lyapunov), on passe `autorise` à `dessinePlan` (le reste est
    grisé) et `borne` à `plan` (le point est ramené dans le rectangle).
- **Éléments d'une carte qui apparaissent ou disparaissent.** Un curseur ou une
  note qui n'a de sens que dans un mode (ε de la preuve) reste en place, grisé
  ou vide, avec sa hauteur réservée : sinon les figures voisines changent de
  taille quand on coche l'option.
- **Surface 3D.** Le geste saisit la surface : tirer vers la droite la fait
  tourner vers la droite, et on voit alors sa face gauche ; tirer vers le bas
  fait voir le dessus.
- **Portraits de phase.** Voir la section suivante.

## 7. Portraits de phase

`js/illustrations/portraits.js` est partagé par le diagramme et la galerie.

- **Tracé des trajectoires.** Les départs sont répartis sur le bord du cadre,
  décalés d'un quart d'écart pour que deux côtés opposés s'intercalent. Chaque
  trajectoire est suivie avec le flot exact e^{hA}, jusqu'au bord ou jusqu'à
  0,5 % du cadre de l'équilibre. Une trajectoire n'est jamais coupée parce
  qu'elle approche d'une autre : on préfère des courbes complètes à un
  espacement parfait.
- **Départs supplémentaires.** Des départs intérieurs comblent les vides des
  nœuds et des cols. Des départs le long d'un rayon donnent les ellipses
  intérieures d'un centre. On ne part pas d'un point où le flot longe le bord.
- **Deux modes.** Les courbes sont « tracées » (par défaut) ou « en
  mouvement ». En mouvement, un arc de 0,38 fois la taille du cadre, mesuré le
  long de la courbe, glisse dans le sens du flot.
- **Particules.** Elles sont absentes par défaut, au nombre de 60, et de la
  couleur des courbes. Deux particules trop proches n'en font qu'une, et
  l'autre renaît ailleurs.

## 8. Essais (« À essayer »)

- **Valeurs fixées.** Un essai fixe tous les paramètres dont dépend son texte
  (par exemple a et ω² du pendule), pour que le texte décrive exactement ce
  qu'on voit, même si le lecteur avait déplacé un curseur. Le point de départ
  reste visible dans le cadre de la figure, et le résultat annoncé est vérifié
  par calcul.
- **Partir d'un cas voisin.** Un essai qui demande de se déplacer part d'un cas
  voisin et laisse faire le déplacement : « Depuis le foyer P₇, descendez
  jusqu'à la parabole ». Il ne place pas d'emblée sur le cas visé.
- **Positions du diagramme.** Les positions d'un essai sont celles affichées
  dans la figure. Si des points sont déplacés pour la lisibilité (`PLACEMENT`
  pour P₁, P₂, P₃), l'essai suit ces positions.
- **Affirmations vérifiées.** Une affirmation d'un essai (nature, valeur de
  det A au point d'arrivée, etc.) est vérifiée par calcul avant d'être écrite.
- **Animation des essais.** Sur une page animée, un essai lance l'animation
  (`preferences: { anime: true }`), pour qu'on voie l'effet décrit. Seul un
  essai qui fixe un instant précis (t < 0 dans le flot) l'arrête : sinon elle
  écraserait aussitôt la valeur choisie.
- **Animation en boucle.** Une grandeur qui évolue avec le temps (t dans le
  flot) s'anime en boucle, de 0 à sa borne, avec une courte pause, et
  s'active par une case « animer en boucle ». Toucher au curseur l'arrête.

## 9. Code et tests

- **Tests des fonctions mathématiques.** Elles sont exportées par le module et
  testées sous Node contre le poly ou le TD (`tests/illustrations.test.js`) :
  aimantation, orbites, particules, préférences, lecture de l'URL.
- **Ne pas vider une zone avant de dessiner.** Un texte ou un tableau qui change
  se construit à part, puis remplace l'ancien d'un coup (`replaceChildren`).
  Le vider d'abord change la taille des canevas voisins le temps du dessin, et
  le canevas reste étiré. Les canevas des illustrations ont `contain: size` et
  se redessinent à l'image suivante après un redimensionnement.
- **Calculs coûteux gardés.** Ce qui ne dépend que des paramètres est gardé en
  mémoire (les orbites par matrice et par cadre), car le dessin peut être
  refait à chaque image.
- **Code commenté en français, au niveau du fichier voisin.** Les noms sont en
  français (`dessine`, `trace`, `orbitesDuPortrait`).

## 10. Vérifications avant un commit

1. `npm test` et `git diff --check`.
2. Ouvrir la page à 1504 × 856 : rien ne défile dans les boîtes, la page ne
   dépasse pas la fenêtre, et il n'y a aucune erreur JavaScript.
3. Ouvrir la page à 1200 × 800 (pas de double barre de défilement) et à 800
   de large (une colonne, et la page défile).
4. Recharger après un réglage : le réglage revient. Mettre une valeur absurde
   dans l'URL : la page reste cohérente.
5. Vérifier le thème sombre si l'on a touché aux couleurs.
