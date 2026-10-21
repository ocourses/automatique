# Simulateur de stabilisation

Application web statique pour observer la stabilisation des exemples du cours.
On règle la condition initiale et le contrôleur, puis on regarde si le système
se stabilise.

État actuel : **prototype V0**, avec un seul exemple, le pendule inversé
commandé par un couple (poly, chapitre « Commande » ; TD2).

Dans le plan complexe, on peut faire glisser les valeurs propres de $A + BK$.
Le gain $K$ est alors recalculé par la formule d'Ackermann, pour une seule
commande et un linéarisé contrôlable. Le déplacement suit trois règles :

- une valeur propre complexe entraîne sa conjuguée ;
- près de l'axe réel, la paire s'y colle et devient une racine double. Il
  suffit ensuite de faire glisser l'une des deux le long de l'axe pour les
  séparer ;
- près de l'axe imaginaire, la valeur propre devient imaginaire pure.

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

Les tests portent sur `js/core/` et vérifient les résultats du poly et des TD
(valeurs propres, critère de Kalman, condition sur les gains du pendule). Il
faut Node 18 ou plus récent :

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
  ui/                 scène, courbes, plan complexe, indications, champs
  exemples/
    catalogue.js      liste des exemples (disponibles ou à venir)
    <id>.js           un module par exemple
tests/                tests Node de core/
```

Le système réel est intégré par RK4 avec un pas fin fixe d'au plus 1 ms. Ce pas
est réduit automatiquement lorsque le spectre du bouclé l'exige, et il n'est
pas réglable dans l'interface.

## Ajouter un exemple

Un exemple est un module déclaratif `js/exemples/<id>.js`, qui exporte par
défaut un objet. Le reste de la page est générique. Les champs obligatoires
sont les suivants :

| Champ | Rôle |
|---|---|
| `id`, `titre`, `source` | identification et référence au poly, au TD ou à l'examen |
| `etats`, `commandes` | `{ latex, texte, unite }` pour chaque composante |
| `parametres` | `{ nom, latex, valeur, min, max, pas, unite }` |
| `f(x, u, p)` | second membre de $\dot x = f(x, u)$ |
| `equilibre(p)` | `{ xe, ue }` |
| `latex.modele`, `latex.equilibre` | équations affichées |
| `gains`, `bornesGains` | gain $K$ par défaut (matrice $m \times n$) et bornes des curseurs |
| `x0` | condition initiale par défaut |

Deux champs sont facultatifs :

- `indications(p, K)` renvoie des indications propres à l'exemple, sous la
  forme `{ niveau: 'ok' | 'alerte' | 'info', texte }`, où le texte peut
  contenir des formules `$…$`.
- `vue(p)`, `draw(ctx, x, u, p, outils)` et `souris` décrivent la scène
  physique. `draw` dessine en coordonnées du monde, avec l'axe $y$ vers le
  haut. `outils.px` vaut la taille d'un pixel, `outils.couleurs` donne les
  couleurs du thème et `outils.arcCouple(valeur, echelle, rayon)` trace un
  couple. `souris.deplace(pt, x, p)` renvoie l'état correspondant à la
  position de la souris. `souris.vitesses`, une liste de paires `[i, j]`,
  indique que $x_j$ est la dérivée de $x_i$ : la vitesse du geste au lâcher
  donne alors $x_j$.

Sans `draw`, la page passe en mode « courbes seules ». Il faut enfin passer
`disponible: true` dans `catalogue.js`.
