# Simulateur de stabilisation

Application web statique pour observer la stabilisation des exemples du cours.
On règle la condition initiale et le contrôleur, puis on regarde si le système
se stabilise.

En ligne : <https://ocourses.github.io/automatique/>.

État actuel : **jalon V2**, le satellite du jalon V3 et le segway, avec sept exemples :

- le double intégrateur, chariot sur rail droit (poly ; TD3) ;
- le pendule inversé commandé par un couple (poly ; TD2) ;
- le pendule inversé commandé en accélération, ou « balai » (TD3) ;
- le chariot sur rail tournant (examen 2024-2025 ; oral 2019-2020) ;
- la pharmacocinétique avec observateur de Luenberger (TD4), en « courbes seules » ;
- le satellite des équations d'Euler (examen 2017-2018), en « courbes seules » : retour d'état diagonal $u = K\omega$ avec $k_i < 0$, et fonction $V = \sum J_i\omega_i^2$, conservée sans contrôle. Cet exemple est volontairement épuré : seuls les inerties et les trois gains $k_i$ se règlent ;
- le robot Lego segway (poly, introduction ; TP), un pendule inversé sur deux roues à quatre états $(\theta, \psi, \dot\theta, \dot\psi)$ et une tension de moteur. On y retrouve la condition initiale $\psi_0 = \pi/10$ du TP et ses pôles $-136{,}6$ ; $-2{,}66$ ; $-3{,}50$ ; $-5{,}99$. Seuls la masse et la hauteur du corps, et les quatre gains, se règlent.

## Page d'accueil

L'accueil reprend le schéma fonctionnel complet de la boucle fermée du poly (introduction) : consigne, contrôleur, actionneur, système, perturbation, capteurs et prédicteur. Un clic sur un bloc dit où il se règle dans le simulateur (la consigne est le point de fonctionnement, l'actionneur la saturation et l'échantillonnage, le prédicteur l'observateur…) et estompe les exemples qui ne le font pas intervenir. Cette correspondance est calculée à partir des descriptions des exemples (`js/accueil.js`).

## Organisation de la page

- **Réglages**, à gauche, en deux onglets (un troisième pour les exemples qui ont un observateur). L'onglet *Contrôleur* est ouvert par défaut :
  - *Système* : la dynamique et ses paramètres, puis le scénario de la simulation, c'est-à-dire la condition initiale, la perturbation $d(t)$ et le bruit de mesure ;
  - *Contrôleur* : le point de fonctionnement $(x_e, u_e)$ et le linéarisé $(A, B)$ en ce point, puis la loi de commande (retour d'état $u = u_e + K(x - x_e)$, par les gains ou les pôles voulus, ou loi libre), la saturation et l'échantillonnage de la commande ;
  - *Observateur* : gain $L$ (par ses coefficients ou par les pôles de $A - LC$), pas $h$, estimée initiale et retour d'état sur $\hat x$.
- **Scène**, avec la barre de lecture (pause, réinitialisation, choc, vitesse, fantôme).
- **Courbes** et **graphiques** : valeurs propres (que l'on peut faire glisser) et portrait de phase.
- **Console**, en bas. Son en-tête rappelle en permanence le temps, $\lVert x - x_e \rVert$ et l'état de stabilisation, avec des largeurs fixes pour que rien ne bouge quand les nombres changent. Trois onglets :
  - *Mesures* : les nombres en direct, avec la valeur de chaque grandeur, sa valeur à l'équilibre et son écart. Un « ≈ 0 » apparaît quand l'écart passe sous le seuil $\varepsilon$ (réglable, 0,01 par défaut) ;
  - *Analyse* : la matrice du bouclé, son polynôme caractéristique, son spectre, le critère de Routh–Hurwitz et les indications ;
  - *Journal* : les événements de la simulation (entrée dans la boule $\lVert x - x_e \rVert < \varepsilon$, saturation, divergence) et les réglages modifiés, horodatés par le temps simulé.

### Sur grand écran

Au-delà de 1000 × 600 px, la page tient dans la fenêtre, sans défilement : chaque zone remplit sa case, les réglages défilent à l'intérieur de la leur, et la console reste collée au bas de l'écran. Quand on la replie, elle laisse la place aux graphiques. Chaque exemple choisit sa **disposition** (champ `disposition`) :

- `colonnes`, par défaut avec une scène : réglages, scène sur toute la hauteur, puis courbes et graphiques empilés (pendules, rail tournant) ;
- `large` : réglages à gauche ; à droite, la scène en haut sur toute la largeur, courbes et graphiques côte à côte dessous (double intégrateur, segway) ;
- `courbes`, sans scène : la barre de lecture et les courbes au centre (pharmacocinétique, satellite).

### Sur téléphone

Sous 760 px de large, ou en paysage très bas, la page garde dans le défilement ce qu'on regarde en continu : la scène, la barre de lecture, les courbes et les graphiques. Les réglages et la console passent dans deux **tiroirs** qui montent du bas, ouverts depuis une barre fixe :

- la barre du bas porte les boutons *Réglages* et *Console*, et rappelle entre les deux $\lVert x - x_e \rVert$ et l'état de stabilisation, pour ne jamais le perdre de vue ;
- un seul tiroir est ouvert à la fois. À l'ouverture, la page remonte et la scène se réduit, de sorte que la scène et la barre de lecture restent visibles au-dessus du tiroir : on règle un gain et on voit tout de suite l'effet ;
- le bouton ↕ agrandit le tiroir, ✕ ou la touche Échap le ferme ;
- en paysage, le tiroir devient un panneau à droite ;
- dans les mesures, la colonne « Équilibre » est masquée pour tenir en largeur ; on la lit dans l'onglet *Contrôleur*.

Le point de fonctionnement se règle dans l'onglet *Contrôleur* quand le modèle admet une famille d'équilibres : l'angle du pendule, la position du chariot ou du rail. La commande d'équilibre $u_e$ s'en déduit par $f(x_e, u_e) = 0$ et s'affiche, mais on ne la règle pas séparément.

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
- **Commande échantillonnée** : avec une période $T_e > 0$, la commande n'est recalculée que tous les $T_e$ secondes et tenue constante entre deux mises à jour. Sur le pendule commandé par un couple, avec les gains par défaut, le bouclé reste stable jusqu'à $T_e \approx 0{,}4$ s et ne l'est plus à $0{,}5$ s. Cette option n'est accompagnée d'aucune théorie des systèmes échantillonnés.
- **Perturbation** $d(t)$ ajoutée à la commande, constante ou en créneau
  (TD2). L'indication donne l'erreur statique du retour d'état.
- **Choc** : une impulsion de vitesse, tirée au hasard (`js/core/chocs.js`). Le plus souvent, le choc est voisin du précédent : même sens, intensité proche (écart-type 15 % de l'intensité maximale). Avec une probabilité 1/7, il est complètement nouveau : sens au hasard, intensité uniforme entre 0 et deux fois le choc de l'exemple. Un choc nouveau arrive ainsi en moyenne tous les 7 clics, et avec une probabilité d'environ 2/3 sur 7 clics. Le journal précise chaque fois s'il est nouveau ou voisin.
- **Bruit de mesure** : un bruit gaussien d'écart-type $\sigma$ sur chaque
  composante de l'état mesuré, tenu constant par paliers de 10 ms.
- **Fantôme du linéarisé** : la trajectoire du linéarisé bouclé, en
  transparence dans la scène et en tirets sur les courbes. Il n'est pas proposé
  pour un système linéaire, qui coïncide avec son linéarisé : la linéarité est
  détectée numériquement (`js/core/modele.js`).
- **Courbes** : les graduations gardent l'ordre de grandeur près de 0
  (`3e−7`), et l'échelle verticale suit la courbe quand elle tend vers 0. Les
  estimées $\hat x$ de l'observateur sont tracées en marqueurs (ronds évidés),
  pour les distinguer des états.
- **Courbes** en fenêtre glissante de 10 s, ou sur tout l'historique (60 s
  au plus).
- **Indications** : critère de Kalman, stabilité par linéarisation,
  vitesse $e^{\alpha t}$ et résultats propres à chaque exemple. Pour le
  balai, la fonction $V$ du TD3 est affichée en direct dans les mesures.
- **Mémoire** : les réglages et l'affichage (vitesse, fantôme, historique,
  console repliée, onglets ouverts) sont gardés dans le navigateur, un jeu par
  exemple, et retrouvés au prochain chargement. Le bouton **Valeurs par
  défaut** remet tout à zéro pour l'exemple courant.
- **Liens** : « Copier le lien » encode les réglages dans l'URL. Un lien
  reproduit une expérience, ce qui est pratique pour un énoncé de TD ou pour
  l'amphi : à l'ouverture, il l'emporte sur la mémoire du navigateur, puis la
  barre d'adresse est ramenée à `?id=…` et la mémoire suit les modifications.

### Observateur de Luenberger

Un exemple qui déclare un observateur ajoute à la page :

- l'estimée $\hat x$, qui suit $\dot{\hat x} = f(\hat x, u) + L\,(y - C\hat x)$, avec la commande connue et la seule sortie mesurée $y = Cx$, bruit compris. Pour un modèle linéaire, c'est exactement l'observateur du TD4. L'observateur est intégré par **Euler explicite de pas $h$**, réglable, alors que le système réel l'est par RK4 à pas fin : l'estimée est constante entre deux instants et les courbes la tracent en escalier ;
- l'erreur $e = x - \hat x$ en courbe et en norme, avec l'événement « observateur convergé » dans le journal ;
- les valeurs propres de $A - LC$, dessinées en losanges dans le plan complexe. On peut les faire glisser, $L$ étant recalculé par la formule d'Ackermann appliquée au couple dual $(A^\top, C^\top)$ ;
- le **critère d'Euler** : l'erreur discrète vérifie $e_{k+1} = (I + h(A - LC))\,e_k$ et converge si $|1 + h\lambda| < 1$ pour toutes les valeurs propres. Le plan complexe dessine le disque en tirets $|\lambda + 1/h| < 1/h$, et la page donne le pas maximal $h_{\max} = \min_\lambda \bigl(-2\operatorname{Re}\lambda / |\lambda|^2\bigr)$. Pour le pôle double en $-4$ du TD4, on trouve $h_{\max} = 1/2$ ;
- l'observabilité de $(A, C)$, par le critère de Kalman dual ;
- l'option du **retour d'état sur $\hat x$**, avec le rappel du principe de séparation : le spectre du système complet est celui de $A + BK$ réuni à celui de $A - LC$.

Avec Euler explicite, la commande est tenue constante sur chaque pas de l'observateur : l'erreur $e$ n'est donc plus exactement indépendante de $u$, un écart d'ordre $h$ subsiste, que le gain $L$ garde petit.

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
`dt`, `sigma`, `umax` (active la saturation), `Te` (commande échantillonnée),
`fantome=1` et `vitesse`. Pour un exemple avec observateur : `L`, `h`, `xh0`
(estimée initiale) et `retour=x` (retour d'état sur l'état mesuré plutôt que
sur $\hat x$).

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
index.html            accueil : schéma de la boucle fermée et galerie (js/accueil.js)
exemple.html          page générique (?id=pendule-couple)
css/style.css
js/
  app.js              assemblage de la page d'un exemple
  core/               moteur, sans DOM (testé sous Node)
    modele.js         classe Modele : vérification d'un exemple, linéarité, disposition
    sim.js            boucle de simulation
    reglages.js       réglages sérialisables (mémoire du navigateur et liens)
    chocs.js          tirage des chocs
    ode.js            RK4 et Euler
    linalg.js         valeurs propres, Kalman, linéarisation numérique
    poles.js          placement de pôles (Ackermann), déplacement des valeurs propres
    expr.js           parseur de la loi libre
  ui/                 interface
    panneaux/         onglets Système, Contrôleur et Observateur
    etat.js           affichage et mémoire du navigateur (localStorage)
    url.js            liens
    …                 scène, courbes, plan complexe, portrait de phase, champs,
                      onglets, tiroirs, console, indications, format
  exemples/           descriptions des exemples, sans dépendance au moteur ni à l'interface
    catalogue.js      liste des exemples (disponibles ou à venir)
    <id>.js           un module par exemple
tests/                tests Node du moteur et des exemples
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
- `gainsDiagonaux: true` n'expose que la diagonale de $K$ (le reste vaut 0), ce
  qui allège l'interface d'un exemple à plusieurs commandes ; `latex.loi`
  remplace la formule affichée au-dessus des gains.
- `sansSortie: true` indique que tout l'état est mesuré (pas de sortie $y$) ;
  `noteEquilibre` remplace le commentaire affiché sous le point de
  fonctionnement.
- `planRayon` fixe la demi-largeur du plan des valeurs propres, pour un système
  raide dont un pôle très rapide écraserait les autres ; une valeur propre hors
  cadre est alors marquée sur le bord, avec sa vraie valeur.
- `portrait`, de la forme `{ x1: [a, b], x2: [c, d] }`, est le cadre minimal
  du portrait de phase (exemples à deux états).
- `invariant(x, p, K)` renvoie `{ latex, valeur }` ou `null` : une quantité
  affichée en direct, comme la fonction $V$ du TD3.
- `observateur`, de la forme `{ L, h, xh0, bornesL, bornesH, latex }`, ajoute un
  observateur de Luenberger sur la sortie `sortie` : gain initial `L` (un
  coefficient par état), pas `h`, estimée initiale `xh0`, bornes des curseurs
  de $L$ et de $h$ et équation affichée. Le modèle peut être non linéaire :
  l'observateur recopie alors $f$.

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

- `disposition` (`'colonnes'`, `'large'` ou `'courbes'`) choisit la mise en
  page sur grand écran ; sans elle, c'est `'colonnes'` avec une scène et
  `'courbes'` sans.
- `lineaire` force le verdict de linéarité, détecté sinon numériquement.

Sans `draw`, la page passe en mode « courbes seules ». La description est
vérifiée au chargement par la classe `Modele` (dimensions, bornes, équilibre),
qui refuse un exemple incohérent avec un message lisible ; un test vérifie tous
les exemples du catalogue. Il faut enfin passer `disponible: true` dans
`catalogue.js`.

## Le segway et les fichiers du TP

Le modèle est celui de `fonction.m` du TP, d'après le NXTway-GS de Yamamoto, avec
ses constantes physiques. Deux écarts avec les fichiers archivés sont à connaître :

- **Deux signes corrigés dans $\ddot\theta$.** Dans `fonction.m`, les termes $c_3$ et $c_5$ y sont comptés
  avec le signe inverse de celui de $\ddot\psi$ : les deux lignes ne résolvent pas le même système. Le robot tombe
  quand même sans commande, mais le linéarisé est faux : dans l'équation de $\ddot\psi$, le coefficient de $\psi$
  vaut $-66$ au lieu de $+270$, et la valeur propre instable $+9{,}1$ au lieu de $+7{,}4$. Avec les signes corrigés,
  les termes de gravité du linéarisé retrouvent exactement ceux de `matrices.m` ($-409{,}7$ et $269{,}6$).
- **`matrices.m` n'est pas le linéarisé de ce modèle.** Ses termes d'amortissement et d'entrée diffèrent
  (par exemple $A_{33} = -104{,}6$ contre $-162{,}1$ et $B_3 = 203{,}4$ contre $315{,}2$). La page affiche le
  linéarisé du modèle non linéaire, calculé numériquement.

Le gain de la page, qui place les pôles du TP, vaut donc $K = (0{,}335 ;\ 13{,}70 ;\ 0{,}795 ;\ 1{,}046)$ et non
celui de `place(A, B, poles)` avec la `matrices.m` du TP. Les deux stabilisent le robot depuis $\psi_0 = \pi/10$.
Les tests comparent le linéarisé, le gain et la trajectoire à `fonction.m` corrigé, rejoué sous Octave.
