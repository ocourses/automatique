# Simulateur de stabilisation

Application web statique pour observer la stabilisation des exemples du cours.
On règle la condition initiale et le contrôleur, puis on regarde si le système
se stabilise.

En ligne : <https://ocourses.github.io/automatique/>.

État actuel : **jalon V1**, avec quatre exemples :

- le double intégrateur, chariot sur rail droit (poly ; TD3) ;
- le pendule inversé commandé par un couple (poly ; TD2) ;
- le pendule inversé commandé en accélération, ou « balai » (TD3) ;
- le chariot sur rail tournant (examen 2024-2025 ; oral 2019-2020).

## Organisation de la page

- **Réglages**, à gauche, en trois onglets :
  - *Contrôleur* : retour d'état (gains, pôles voulus) ou loi libre, et saturation ;
  - *Scénario* : condition initiale, perturbation et bruit de mesure ;
  - *Système* : équations, paramètres, point de fonctionnement $(x_e, u_e)$ et linéarisé $(A, B)$.
- **Scène**, au centre, avec la barre de lecture (pause, réinitialisation, choc, vitesse, fantôme).
- **Graphiques**, à droite : les courbes, toujours visibles, et deux onglets, valeurs propres (que l'on peut faire glisser) et portrait de phase.
- **Console**, en bas, repliable et toujours visible quand on fait défiler la page. Son en-tête rappelle en permanence le temps, $\lVert x - x_e \rVert$ et l'état de stabilisation. Trois onglets :
  - *Mesures* : les nombres en direct, avec la valeur de chaque grandeur, sa valeur à l'équilibre et son écart. Un « ≈ 0 » apparaît quand l'écart passe sous le seuil $\varepsilon$ (réglable, 0,01 par défaut) ;
  - *Analyse* : la matrice du bouclé, son polynôme caractéristique, son spectre, le critère de Routh–Hurwitz et les indications ;
  - *Journal* : les événements de la simulation (entrée dans la boule $\lVert x - x_e \rVert < \varepsilon$, saturation, divergence) et les réglages modifiés, horodatés par le temps simulé.

Le point de fonctionnement se règle dans l'onglet *Système* quand le modèle admet une famille d'équilibres : l'angle du pendule, la position du chariot ou du rail. La commande d'équilibre $u_e$ s'en déduit par $f(x_e, u_e) = 0$ et s'affiche, mais on ne la règle pas séparément.

## Fonctionnalités

- **Modèle** : les équations, le point de fonctionnement et le linéarisé
  $(A, B)$ en KaTeX, recalculés quand on change un paramètre.
- **Condition initiale** : on peut la saisir au clavier, déplacer l'objet à la
  souris (la vitesse du geste au lâcher donne la vitesse initiale) ou cliquer
  dans le portrait de phase pour les exemples à deux états.
- **Retour d'état** $u = u_e + K(x - x_e)$, réglable de trois façons :
  - par les gains, avec les curseurs ou la saisie ;
  - par les pôles voulus, saisis au clavier (`-1, -2±3i`), $K$ étant calculé
    par la formule d'Ackermann ;
  - en faisant glisser les valeurs propres dans le plan complexe. Une valeur
    propre complexe entraîne sa conjuguée. Près de l'axe réel, la paire se
    colle et devient une racine double, que l'on sépare en faisant glisser
    l'une des deux le long de l'axe. Près de l'axe imaginaire, la valeur
    propre devient imaginaire pure.
- **Loi libre** : une expression lue par un parseur sûr (`js/core/expr.js`),
  sans `eval`. Les indications portent alors sur la jacobienne $J_g(x_e)$ du
  bouclé.
- **Saturation** $|u| \le u_{\max}$, en option.
- **Perturbation** $d(t)$ ajoutée à la commande, constante ou en créneau
  (TD2). L'indication donne l'erreur statique du retour d'état.
- **Choc** : une impulsion de vitesse, de signe alterné.
- **Bruit de mesure** : un bruit gaussien d'écart-type $\sigma$ sur chaque
  composante de l'état mesuré, tenu constant par paliers de 10 ms.
- **Fantôme du linéarisé** : la trajectoire du linéarisé bouclé, en
  transparence dans la scène et en tirets sur les courbes.
- **Courbes** en fenêtre glissante de 10 s, ou sur tout l'historique (60 s
  au plus).
- **Indications** : critère de Kalman, stabilité par linéarisation,
  vitesse $e^{\alpha t}$ et résultats propres à chaque exemple. Pour le
  balai, la fonction $V$ du TD3 est affichée en direct dans les mesures.
- **Liens** : tous les réglages sont encodés dans l'URL. Un lien reproduit
  une expérience, ce qui est pratique pour un énoncé de TD ou pour l'amphi.

### Variables de la loi libre

| Variable | Sens |
|---|---|
| `x1` … `xn` | composantes de l'état mesuré, bruit compris |
| `y` | sortie mesurée $y = x_k$, indiquée sur la page |
| `t` | temps |
| `ix1` … `ixn`, `iy` | primitives $\int_0^t (x_i - x_{e,i})$ et $\int_0^t (y - y_e)$ |
| `xe1` … `xen`, `ue` | équilibre et commande d'équilibre |
| paramètres | ceux du modèle (`m`, `l`, `g`…) |

On dispose des fonctions `sin`, `cos`, `tan`, `asin`, `acos`, `atan`,
`atan2`, `sinh`, `cosh`, `tanh`, `exp`, `log`, `sqrt`, `abs`, `sign`, `min`,
`max`, `pow` et `sat(v, M)`, ainsi que de la constante `pi`. Par exemple,
`20*x1 + 5*x2 + 10*ix1` ajoute une action intégrale au pendule (TD2). Seules
les primitives utilisées par la loi augmentent l'état.

### Paramètres de l'URL

`id`, `p_<nom>` (paramètres), `mode` (`gains` ou `loi`), `K` (gains séparés
par des virgules), `loi`, `x0`, `pert` (`constante` ou `creneau`), `e`, `t1`,
`dt`, `sigma`, `umax` (active la saturation), `fantome=1` et `vitesse`.

## Lancer en local

Les modules JavaScript ne se chargent pas depuis `file://`. Il faut servir le
dossier :

```bash
cd simulateur
python3 -m http.server 8000
```

puis ouvrir <http://localhost:8000>. KaTeX et uPlot sont chargés depuis
jsDelivr, à des versions épinglées : une connexion est nécessaire.

## Tests

Les tests vérifient les résultats du poly, des TD et de l'examen : valeurs
propres, critère de Kalman, conditions sur les gains, erreur statique et
action intégrale du TD2, fonction $V$ du TD3, pôles du rail tournant. Ils
couvrent aussi le parseur de la loi libre et l'aller-retour des réglages par
l'URL. Il faut Node 18 ou plus récent :

```bash
cd simulateur
npm test
```

## Organisation

```
index.html            catalogue
exemple.html          page générique (?id=pendule-couple)
css/style.css
js/
  app.js              assemblage de la page d'un exemple
  core/ode.js         RK4 et Euler
  core/linalg.js      valeurs propres, Kalman, linéarisation numérique
  core/sim.js         boucle de simulation
  core/poles.js       placement de pôles (Ackermann), déplacement des valeurs propres
  core/expr.js        parseur de la loi libre
  ui/                 scène, courbes, plan complexe, portrait de phase, champs,
                      onglets, console, indications, format, URL
  exemples/
    catalogue.js      liste des exemples (disponibles ou à venir)
    <id>.js           un module par exemple
tests/                tests Node de core/
```

Le système réel est intégré par RK4 avec un pas fin fixe d'au plus 1 ms. Ce pas
est réduit automatiquement lorsque le spectre du bouclé l'exige, et il n'est
pas réglable dans l'interface.

## Publication

Le workflow `.github/workflows/simulateur.yml` lance les tests à chaque pull
request qui touche `simulateur/`. À chaque push sur `main`, il publie en plus
le dossier sur GitHub Pages. Il faut avoir choisi une fois, dans les
réglages du dépôt, **Settings → Pages → Source : GitHub Actions**.

## Ajouter un exemple

Un exemple est un module déclaratif `js/exemples/<id>.js`, qui exporte par
défaut un objet. Le reste de la page est générique. Les champs obligatoires
sont les suivants :

| Champ | Rôle |
|---|---|
| `id`, `titre`, `source` | identification et référence au poly, au TD ou à l'examen |
| `etats`, `commandes` | `{ latex, texte, unite }` pour chaque composante |
| `parametres` | `{ nom, latex, valeur, min, max, pas, unite }` ; ajouter `famille: 'equilibre'` pour un paramètre qui fixe le point de fonctionnement, réglé alors dans l'encadré dédié |
| `f(x, u, p)` | second membre de $\dot x = f(x, u)$ |
| `equilibre(p)` | `{ xe, ue }` |
| `latex.modele`, `latex.equilibre` | équations affichées |
| `gains`, `bornesGains` | gain $K$ par défaut (matrice $m \times n$) et bornes des curseurs |
| `x0` | condition initiale par défaut |

Plusieurs champs sont facultatifs :

- `sortie` est l'indice de la composante mesurée, $y = x_{\text{sortie}+1}$ ;
  il vaut 0 par défaut.
- `polesParDefaut` remplace `gains` par le gain d'Ackermann qui place ces pôles.
- `loi` est la loi libre proposée par défaut ; `choc` est l'impulsion ajoutée
  à l'état ; `perturbation` et `umax` sont les valeurs proposées pour $e$ et
  $u_{\max}$.
- `portrait`, de la forme `{ x1: [a, b], x2: [c, d] }`, est le cadre minimal
  du portrait de phase (exemples à deux états).
- `invariant(x, p, K)` renvoie `{ latex, valeur }` ou `null` : une quantité
  affichée en direct, comme la fonction $V$ du TD3.

- `indications(p, K)` renvoie des indications propres à l'exemple, sous la
  forme `{ niveau: 'ok' | 'alerte' | 'info', texte }`, où le texte peut
  contenir des formules `$…$`.
- `vue(p)`, `draw(ctx, x, u, p, outils)` et `souris` décrivent la scène
  physique. `draw` dessine en coordonnées du monde, avec l'axe $y$ vers le
  haut. Les outils sont les suivants :
  - `outils.px` vaut la taille d'un pixel et `outils.couleurs` donne les
    couleurs du thème ;
  - `outils.d` est la perturbation courante ;
  - `outils.fantome` vaut `true` quand on dessine le fantôme, qu'il vaut
    mieux réduire à l'objet mobile ;
  - `outils.fleche(x, y, dx, dy, couleur)`, `outils.arcCouple(valeur,
    echelle, rayon, couleur)` et `outils.pointilles(x0, y0, x1, y1)` tracent
    forces, couples et repères.

  Côté souris, `souris.saisit(pt, x, p)`, facultatif, indique ce qui est
  saisi ; `souris.deplace(pt, x, p, prise)` renvoie l'état correspondant à
  la position de la souris ; `souris.vitesses`, une liste de paires `[i, j]`,
  indique que $x_j$ est la dérivée de $x_i$ : la vitesse du geste au lâcher
  donne alors $x_j$.

Sans `draw`, la page passe en mode « courbes seules ». Il faut enfin passer
`disponible: true` dans `catalogue.js`.
