<!-- LTeX: language=fr-FR -->

# Journal des versions

Un cours **épingle une version** de ce dépôt (sous-module `site/socle/`).

---

## Non publié


---

## v0.2.0 — 2026-10-27

Aucun changement visible pour un lecteur. Une règle CSS ajoutée au socle
(`.grille-3`, `plus-haut`, `rangee-basse`), un outil corrigé, une garde de plus
pour un clone sans sous-module. Un cours qui monte de v0.1.0 à v0.2.0 ne change
que le gitlink de `site/socle/` ; à sa migration, `automatique` et
`calcul-differentiel-edo` n'ont plus ces règles dans leur `css/cours.css`.

- Garde du sous-module : `npm run serve` dit « Socle absent » comme `npm test`, par un script `socle`
  que `pretest` et `preserve` appellent (README, « Intégrer le socle dans un cours » ; l'essai
  d'intégration vérifie les deux). **Migration** : à ajouter au `package.json` du cours.
- Outils : `styles-calcules.py`, `site-apres.py` et `verifie-cours.py` copient un site sans
  suivre les liens symboliques (`scripts/sites.py`). Sur un cours migré, le lien du cours minimal
  (`socle/examples/minimal/socle`) bouclait et la copie échouait.
- Release (ocots-site#9) : `release.yml` refuse un tag dont le `CHANGELOG.md` a encore des entrées
  « Non publié » (tag posé après le commit de release) ; plus de déclenchement manuel, qui ne
  pouvait pas relancer une release. La CI vérifie les workflows (`actionlint`).
- `.grille-3` (trois colonnes, deux puis une sur petit écran ; en pleine page, colonnes au moins
  240 px et cartes en colonne) et les rangées `plus-haut` / `rangee-basse` (60 % et 40 % de la
  hauteur) passent dans le socle : A et C les avaient chacun dans leur feuille (#28). **A, C** :
  aucun changement visible (styles calculés identiques) ; à la migration, `residu-css.py` ne les met
  plus dans `css/cours.css`. **M** : rien ne change, il ne les emploie pas.
- `residu-css.py` : d'un bloc gardé, les sélecteurs que le socle a à l'identique sont retirés
  (C : `.grille-large, .grille-2, .grille-3 { … }` devient `.grille-large { … }`).

---

## v0.1.0 — 2026-10-27

Première version du socle commun des sites de cours. Rien n'est encore adopté par un cours : chacun
la prend par sa migration, dans cet ordre : mesure-integration-enseignants#464,
calcul-differentiel-edo-enseignants#144, automatique-enseignants#428. Le détail de ce que fait
chaque migration est dans les sections ci-dessous (« Migration »).

### Changements visibles, par cours

| | automatique (A) | calcul-differentiel-edo (C) | mesure-integration (M) |
|---|---|---|---|
| Ponctuation collée à une formule (`.insecable`) | nouveau | déjà | nouveau |
| Bouton « ↺ » (« Réinitialiser ») sur les pages qui ont des réglages | nouveau | nouveau | libellé réduit à « ↺ » |
| Règles CSS venues de M (titre masqué des onglets, formules du rappel resserrées, …) | nouveau | nouveau | déjà |
| Préférences d'affichage remises aux défauts, une fois (clé `<id>.illustration.<page>`) | oui | non (même clé) | oui |
| Nom accessible des étiquettes KaTeX sans la source LaTeX | nouveau | déjà | nouveau |
| Graduation près du bord droit alignée au lieu d'être coupée | nouveau | nouveau | déjà |
| Titre de l'accueil en typographie française | oui | oui | oui |

### Conception et intégration (ocots-site#2, ocots-site#3)

- `docs/conception.md` : forme de `site.config.js` (module JS, clés vérifiées), contrat d'un module
  d'illustration, points d'extension, stratégie de test et décisions (1 à 15). `docs/principes.md` :
  les principes du socle, chacun avec sa règle et ce qui la vérifie.
- Le socle s'intègre en sous-module `site/socle/`, épinglé sur un tag. `npm test` du cours lance aussi
  les tests du socle ; un clone sans sous-module le dit (`pretest`). La publication étudiante demande
  `ocots-publication` ≥ v1.2.0 ; outils, documentation, exemples et workflows du socle en sont exclus
  par leur chemin (README, « Intégrer le socle dans un cours »).

### Fichiers repris (étape 1, ocots-site#4)

`css/theme.css`, `js/ui/{onglets,preferences,infobulle,theme}.js`, `serve.mjs` :
identiques dans les trois cours, aucun changement de comportement.

### Fichiers fusionnés (étape 2, ocots-site#5)

Sens de la fusion : union des améliorations, après lecture des écarts.

| Fichier | Source retenue | Changements de comportement |
|---------|----------------|-----------------------------|
| `js/ui/katex.js` | C | **A, M** : la ponctuation qui suit une formule (`,` `.` `)` ` :`) reste collée à elle dans un `<span class="insecable">`. Demande la règle CSS `.insecable` (seulement dans C aujourd'hui, voir CSS). |
| `js/ui/repere.js` | M (A = C) | **A, C** : `axes()` accepte `ordonnees` et `dans` (défauts : comportement d'avant) ; une graduation trop proche du bord droit est alignée sur le bord au lieu d'être coupée. |
| `js/ui/format.js` | A + C + M | Ajouts seulement : `latexScientifique` (C) ; `chiffresEntiers`, `latexPositifFixe`, `latexNombreFinal`, `separateur`, `latexIntervalle` (M). |
| `js/ui/controls.js` | A + C + M | **A, M** : le nom accessible d'une étiquette KaTeX n'inclut plus la source LaTeX répétée. `ajoutePas` : option `lis` (C), bornes relues à chaque pas par `limites` (C) ou `min`/`max` (M). `champ` : `bornes(min, max)` (C) et `fixeMax(max)` (M). |
| `js/ui/camera3d.js` | A (= C) | Commentaire seul. |
| `js/ui/vue3d.js` | C | **A** : `zmin` (défaut 0, les valeurs sous 0 sont ramenées à 0), `facettes`, `dessineFacettes`, `surfaces` ; `surface(f, options)` s'utilise comme avant. Sans effet pour A : son seul usage, la surface de Lyapunov, trace des fonctions positives (l'ancienne projection supposait déjà [0, zmax]). Un domaine vide (`zmax ≤ zmin`) lève une `RangeError` au lieu de dessiner `NaN`. |
| `js/briques/` (`commun.js` d'avant) | A + C + M, moins le propre à un cours | Rangé dans `js/briques/` et découpé : `cartes.js`, `contenu.js`, `toile.js`, `interaction.js`, réunis par `commun.js` (`export *`). **A, C, M** : `boutonAide` (bulle d'aide d'une carte), `reinitialise()` du zoom, identifiant de `repliable` déterministe (`repliable-1`…). **Migration** : `paragraphe(parent, texte, 'verdict')` devient `verdict(parent, texte)` (zone de deux lignes `.zone-verdict`, seulement dans M aujourd'hui, voir CSS) : 3 appels dans A, 32 dans M, aucun dans C. |
| `js/ui/canevas.js` | nouveau | `ajusteCanevas`, extrait de `Repere.prepare` et `Vue3D.prepare` qui le dupliquaient. `graduations` renvoie `[]` pour un intervalle vide ou à l'envers (elle bouclait sur `NaN`). |
| `js/core/ode.js` | A (= C) | Aucun. |

### CSS (ocots-site#6)

`css/style.css` : la feuille de `mesure-integration` sans sa section propre, en neuf composants
(`base`, `entete`, `onglets`, `champs`, `petit-ecran`, `catalogue`, `illustration`, `accueil`,
`infobulle`) importés dans l'ordre d'origine. Chaque cours ajoute son `css/cours.css`
(`scripts/residu-css.py`). Détail : `docs/css.md`.

**A, C** : règles venues de M, absentes jusqu'ici : titre masqué dans les panneaux d'onglets,
formules centrées du rappel resserrées, `.zone-verdict` et `.hauteur-fixe`, `button.bouton-lien`,
espacement sous un canevas, `.entete-barre > div:first-child`. Les six règles qui divergeaient
(`.entete-actions`, `a.bouton-lien`, `.verdict`, `.legende-courbes`, `.barre-legende`,
`.texte-fixe`) gardent leur forme actuelle dans le `cours.css` d'A et C.

### Briques de systèmes linéaires (ocots-site#17)

- `js/core/dim2.js` est repris dans le socle (identique dans A et C) avec des tests
  de caractérisation : nature et stabilité des onze cas du TD1 et leurs frontières,
  spectres réels et complexes, matrices doubles et compagnons, exponentielle,
  directions propres.
- `js/briques/plan-trace-det.js` et `js/briques/portraits.js` sont extraits
  dans le socle (identiques dans A et C), avec des tests de ce qu'ils dessinent
  (faux repère) et des particules. Les cours gardent temporairement leurs copies :
  leur migration, avec suppression des copies, est suivie par ocots-site#20.
  `scripts/verifie-cours.py` remplace ces copies par une façade vers le socle.

### Configuration et parcours (ocots-site#7)

Ajouts : `js/config.js` (`valideConfig`, `verifieCours`), `js/catalogue.js` (`trouve`, `disponibles`),
`js/parcours.js`. **Migration de chaque cours** :

- `trouve` et le parcours prennent leurs données en argument : `trouve(config.themes, id)`,
  `installeNavigation(parcours(config), genre, id)` (le `parcours.js` du cours disparaît) ;
- le test « catalogue : identifiants uniques, modules présents… » du cours est remplacé par
  `verifieCours(config)`, plus strict : une clé inconnue, ou un essai dont un réglage ou une préférence
  n'a pas le type de sa valeur par défaut, est une faute. Les trois cours passent tels quels ;
- **A** : le drapeau `simulateur: true` sort du catalogue (clé inconnue) ; ses pages d'exemples passent
  par `pagesDuTheme` dans `site.config.js`, et `app.js` appelle
  `installeNavigation(parcours(config), 'exemple', id)`.

### Chargement de KaTeX (ocots-site#7)

`chargeKatex()` dans `js/ui/katex.js` : KaTeX 0.16.11 (version inchangée) depuis jsDelivr, avec
empreintes SRI ; `KATEX` (version et empreintes) est figé. Les pages du socle l'attendent avant tout
rendu. **Migration** : les pages du cours retirent leurs deux balises KaTeX (`<link>` et `<script>`) ;
une page à soi (`exemple.html` d'A) appelle `await chargeKatex()`.

### Pages (ocots-site#7)

Ajouts : `modeles/index.html`, `modeles/illustration.html` (gabarits complets, liens `socle/css/…`
puis `css/cours.css`, `<noscript>`, sans balise KaTeX) ; `js/accueil.js` (`demarreAccueil`),
`js/illustration.js` (`demarreIllustration`, `lisEtat`, `versRecherche`), `js/glossaire.js`
(`appliqueGlossaire(glossaire, racine, cles)`), `js/modeles.js` (`verifieModeles`).
Changements de comportement :

- **A, C** : bouton « ↺ » sur toute page qui a des réglages (décision 4, comme M) ;
- **A, C, M** : ce bouton n'affiche que « ↺ » (nom accessible « Réinitialiser », info-bulle
  « Réinitialiser : … ») : avec le libellé, trois actions faisaient passer des titres sur deux
  lignes (ocots-site#26) ;
- **A, C, M** : préférences sous `<id>.illustration.<page>` (`automatique.`, `calcul-differentiel-edo.`,
  `mesure-integration.`) : les préférences d'affichage d'A et M repartent des défauts, une fois
  (décision 5) ;
- **A, C, M** : le titre de l'accueil suit la typographie française (espace insécable avant « : ») ;
  le premier changement de réglage est écrit dans l'URL tout de suite, même dans les 200 premières
  millisecondes de la page.

**Migration de chaque cours** :

- copier les deux modèles à la racine de `site/` ; ajouter le test
  `verifieModeles(new URL('../', import.meta.url))` ; **ne plus exclure `socle/modeles/*`** de la
  publication (`publication.toml`) : ce test le lit, côté étudiant aussi ;
- supprimer `js/accueil.js`, `js/illustration.js`, `js/parcours.js`, `trouve` et `appliqueGlossaire`
  (le glossaire du cours ne garde que ses données) ; les tests de `lisEtat` et `versRecherche` (M)
  passent dans le socle ;
- **A** : garde son `index.html` (le modèle, plus le `<template>` du schéma et un module qui greffe le
  schéma et la galerie sur `#theme-commande` après `await demarreAccueil(config)`) et vérifie
  seulement `['illustration.html']` ;
- **A, C** : retirer de `css/cours.css` les deux règles `.entete-actions` gardées à l'étape CSS
  (`flex-wrap: wrap`, `flex: revert`) et adopter celle du socle (`flex: none; flex-wrap: nowrap`),
  qui garde les actions sur une ligne ; sans cela, `jacobienne` (C) passe encore sur deux lignes en
  1504 × 856.

### Cours minimal et outils de non-régression (ocots-site#7)

- `examples/minimal/` devient un vrai petit cours (configuration, modèles, deux illustrations, glossaire,
  tests `verifieCours` et `verifieModeles`), `socle/` étant un lien vers la racine du dépôt.
- `scripts/fumee.py` : `--racine` ; une page passe si elle a démarré (`data-ok="1"`, posé par les pages
  du socle une fois KaTeX chargé) sans erreur de console. Par défaut : les pages du cours minimal.
- `scripts/site-apres.py --pages CONFIG [--modeles …]` : le site « après » avec les pages du socle ;
  `scripts/configs/` : les `site.config.js` des trois cours, vérifiés par `verifieCours`.
- `scripts/styles-calcules.py` : `<noscript>` (et les scripts) ne comptent plus dans le rang d'un élément.

### CI, workflow Pages et versions (ocots-site#8, ocots-site#9)

- CI du socle (`.github/workflows/tests.yml`) : tests (Node 22 et 24), outils (Python), cours minimal
  dans Chrome sans interface, essai d'intégration de bout en bout, workflow Pages sans publier.
- Workflow Pages réutilisable (`.github/workflows/site.yml`) : tests du site, puis publication sur
  GitHub Pages ; le dépôt étudiant l'appelle par `modeles/site.yml`, épinglé par tag.
- Versions SemVer, en `v0.x` jusqu'à la migration des trois cours (décision 14) ; un tag `vX.Y.Z`
  crée la release, avec pour notes sa section de ce journal (`release.yml`).

### Restent dans le cours (un seul usage)

Ils vivent dans le `js/illustrations/commun.js` **du cours**, devenu une façade (`export * from '../briques/commun.js'` suivi du code propre) : les modules d'illustration gardent `import … from './commun.js'`. `scripts/propre-aux-cours.json` liste ce code, et `scripts/verifie-cours.py` génère cette façade.

- `automatique` : `simule` (RK4 sur une trajectoire, importe `core/ode.js`). `calcul-differentiel-edo` en a une copie sans appelant : à supprimer.
- `calcul-differentiel-edo` : `champsPoint` (deux champs pour un point glissé).
- `mesure-integration` : `choisitIndice`, `echelleLog`, `axesLog`, `choixEchelle`.
