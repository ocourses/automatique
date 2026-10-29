<!-- LTeX: language=fr-FR -->

# `ocots-site` : socle commun des sites interactifs des cours

Code, styles et gabarits partagés par les sites d'illustrations interactives des
cours (`automatique`, `calcul-differentiel-edo`, `mesure-integration`). Un cours
déclare ce qui le distingue dans `site.config.js` et étend le socle sans le forker.

Suivi du chantier : [#1](https://github.com/ocourses/ocots-site/issues/1).
Conception : [`docs/conception.md`](docs/conception.md).

## Intégrer le socle dans un cours

Option retenue : **sous-module épinglé sur un tag**, dans `site/socle/`. Une
copie vendorisée a le même effet côté étudiant, mais fait apparaître chaque
fichier changé dans les diffs du dépôt enseignant ; le sous-module n'y laisse
qu'une ligne (le gitlink).

```bash
git submodule add https://github.com/ocourses/ocots-site site/socle
git -C site/socle checkout vX.Y.Z
git add site/socle .gitmodules && git commit -m "feat(site): ajoute le socle ocots-site vX.Y.Z"
```

- **URL en HTTPS**, pas en SSH (le dépôt est public) : une CI ou un clone sans
  clé n'a rien à configurer.
- **Chemins** : les gabarits du cours importent `./socle/js/...` et lient
  `socle/css/...`. `serve.mjs` (du socle) et `node --test` (lancé dans `site/`)
  résolvent donc le socle comme le navigateur. Après un clone :
  `git submodule update --init`.
- **Garde** : dans le `package.json` du cours, `pretest` et `preserve` (que npm
  lance avant `test` et `serve`) disent clairement que le sous-module n'est pas
  initialisé, au lieu d'une erreur de module introuvable (une CI qui clone sans
  `submodules:` tombe sur ce cas, comme un `git checkout` de branche, qui ne met
  pas les sous-modules à jour) :

  ```json
  "socle": "test -f socle/package.json || { echo 'Socle absent : git submodule update --init' >&2; exit 1; }",
  "pretest": "npm run -s socle",
  "preserve": "npm run -s socle",
  "serve": "node socle/serve.mjs"
  ```

  `git config submodule.recurse true` fait suivre les sous-modules aux
  `checkout`, `pull` et `switch`.

- **Publication** : `ocots-publication` ≥ v1.2.0 copie les fichiers du
  sous-module dans le dépôt étudiant (ni `.git` ni `.gitmodules` ne sont
  copiés) ; le workflow du dépôt étudiant n'initialise donc rien. Chaque cours
  épingle son sous-module `publication/` à v1.2.0 ou plus. Les outils et la
  documentation du socle ne servent pas à l'étudiant : les exclure dans
  `publication.toml`, par leur chemin (un motif nu comme `scripts` exclurait
  aussi les dossiers du cours qui portent ce nom). `socle/modeles/` reste publié :
  le test des gabarits (`verifieModeles`) le lit, et il tourne aussi côté étudiant.

  ```toml
  exclure = ["node_modules", ".DS_Store", "socle/scripts/*", "socle/docs/*",
    "socle/examples/*", "socle/.github/*"]
  ```

- **Tests** : `npm test` dans `site/` exécute aussi les tests du socle, qui
  sont publiés avec lui et tournent donc côté étudiant. Un test du socle ne
  doit dépendre d'aucun fichier du cours.
- **Montée de version** : `git -C site/socle checkout vX.Y.Z`, puis commit du
  gitlink, puis publication.

### Vérifier la chaîne

```bash
scripts/essai-integration.sh [chemin/vers/ocots-publication]
```

Le script monte, dans un répertoire temporaire, un socle factice, un dépôt
enseignant, un dépôt étudiant et son origine. Il vérifie, et échoue au premier
écart :

1. qu'un clone enseignant sans sous-module initialisé fait échouer `npm test`
   avec le message de la garde ;
   et que `publier-etudiant` refuse d'en publier (« sous-module non
   initialisé ») : sinon, le miroir viderait `site/socle/` du dépôt étudiant ;
2. que `publier-etudiant` copie les fichiers du sous-module, sans `.git`, sans
   `.gitmodules` ni les dossiers exclus du socle, mais avec les dossiers du
   cours de même nom ;
3. que `npm test` passe dans le dépôt étudiant ;
4. que le site servi s'affiche dans Chrome sans interface (module du cours
   chargé, KaTeX rendu ; étape ignorée sans Chrome, et qui demande le réseau) ;
5. qu'une montée de version du socle ne change que le gitlink du dépôt
   enseignant.

Rien ne touche GitHub. Le script ne couvre pas le déploiement GitHub Pages
lui-même : `site.yml` du dépôt étudiant publie `site/` tel quel
(`upload-pages-artifact`, `path: site`), sans sous-module à initialiser.

## Contenu du socle

Fichiers identiques dans les trois sites, repris tels quels (octet pour octet) :

- `css/theme.css` : la charte, en variables CSS ;
- `js/ui/{onglets,preferences,infobulle,theme}.js` ;
- `serve.mjs` : serveur de développement sans cache, qui sert le dossier courant.
  Dans un cours : `"serve": "node socle/serve.mjs"` (lancé depuis `site/`) ;
- `tests/preferences.test.js`.

Tests ajoutés au socle (les cours n'en avaient pas) :

- `tests/onglets.test.js`, `tests/infobulle.test.js` : onglet initial, clavier,
  mot souligné, ouverture et fermeture de la bulle ;
- `tests/theme.test.js` : contrat entre `theme.js` et `theme.css` (chaque
  variable lue est définie en clair et en sombre) ;
- `tests/aides/faux-dom.js` : faux DOM minimal, partagé par les tests, sans
  dépendance npm (les tests tournent aussi dans le dépôt étudiant).

Tests du socle seul : `npm test` (Node 22 ou plus). Serveur de développement :
`npm run serve`.

**`tests/` ne teste que ce qui est publié** (le code chargé par le navigateur) : il tourne aussi côté
étudiant, où `socle/scripts/*` est exclu de la publication. Les outils de `scripts/` se testent avec
les outils, en Python, à côté d'eux : `npm run test:outils`.

Fichiers fusionnés après divergence (voir `CHANGELOG.md`, par fichier et par cours) :
`js/ui/{katex,repere,format,controls,camera3d,vue3d}.js`,
`js/briques/` (cartes, contenu, canevas, interaction), `js/core/ode.js`.

Vérifier qu'une fusion ne casse aucun cours :

```bash
scripts/verifie-cours.py     # COURS=~/Courses par défaut ; code de sortie 1 en cas de régression
```

Le script pose les fichiers du socle sur une copie de chaque `site/`, remplace son
`commun.js` par une façade (briques du socle + code propre au cours, listé dans
`scripts/propre-aux-cours.json`), et rejoue les tests du cours. Il compare les **noms**
des tests réussis avant et après : un test manquant ou en échec fait échouer le script.

## Configuration d'un cours

Un cours décrit ce qui le distingue dans `site.config.js` (clés et contrat : `docs/conception.md`) :

- `js/config.js` : `valideConfig(config)` vérifie la forme de la configuration, sans rien charger ;
  `verifieCours(config)` charge en plus chaque illustration disponible et vérifie son module (essais,
  préférences, termes du glossaire) et le parcours. Toutes les fautes sont listées dans une seule
  erreur. Dans un cours, un test d'une ligne :

  ```js
  import { verifieCours } from '../socle/js/config.js';
  import config from '../site.config.js';
  test('le cours respecte le contrat du socle', () => verifieCours(config));
  ```

- `js/catalogue.js` : `trouve(themes, id)`, `disponibles(theme)` ;
- `js/parcours.js` : `parcours(config)` (l'ordre de lecture, avec les pages de `pagesDuTheme`),
  `precedente`, `suivante`, `ancre`, `installeNavigation(pages, genre, id)`.

### Pages

Les deux pages d'un cours sont des copies des modèles du socle, sans changement :
`modeles/index.html` et `modeles/illustration.html`. Leur module importe `site.config.js` et appelle
`demarreAccueil(config)` ou `demarreIllustration(config)`, qui chargent KaTeX et remplissent la page.
Un test du cours vérifie les copies :

```js
import { verifieModeles } from '../socle/js/modeles.js';
test('les gabarits sont ceux du socle', () => verifieModeles(new URL('../', import.meta.url)));
```

Le moteur du glossaire est `appliqueGlossaire(glossaire, racine, cles)` (`js/glossaire.js`).

## CSS

Le socle fournit `css/theme.css` (la charte, en variables) et `css/style.css` (les composants).
Un cours lie `socle/css/theme.css`, `socle/css/style.css`, puis `css/cours.css` pour ce qui lui est
propre. Voir `docs/css.md`.

```bash
scripts/residu-css.py STYLE_DU_COURS.css --site DOSSIER_SITE > cours.css   # le reste d'un cours
scripts/residu-css.py STYLE_DU_COURS.css --nouveautes                       # ce que le socle lui apporte
scripts/site-apres.py DOSSIER_SITE SORTIE                                    # le cours avec le CSS du socle
scripts/site-apres.py DOSSIER_SITE SORTIE --pages scripts/configs/COURS.config.js [--modeles illustration.html]   # et ses pages
scripts/captures.py prendre DOSSIER_SITE SORTIE [--tailles 1504x856 390x844]   # captures avant/après
scripts/captures.py comparer REFERENCE REFERENCE_BIS APRES
scripts/styles-calcules.py SITE_AVANT SITE_APRES [PAGE ...] [--tailles 1504x856 390x844 1504x600]   # le critère fiable
```

Les scripts de vérification partagent `scripts/navigateur.py` : Chrome sans interface (variable `CHROME`, sinon
`google-chrome`, `chromium`, puis le chemin de macOS) et `serve.mjs` du socle, sur un port libre et sans cache.

## Briques de systèmes linéaires

`js/core/dim2.js`, `js/briques/plan-trace-det.js` et `js/briques/portraits.js` sont
partagés par `automatique` et `calcul-differentiel-edo`. Leurs tests de caractérisation
(décision 13) figent ce qu'ils rendent avant la migration des cours : nature et stabilité
des onze cas du TD1 et leurs frontières, spectres, exponentielle, directions propres, et
ce que dessinent le plan et les portraits, relevé par un faux repère
(`tests/aides/faux-repere.js`).

La dépendance de migration est explicite :

```text
dim2 + tests
    -> plan-trace-det + portraits dans js/briques/
    -> migration de calcul-differentiel-edo-enseignants#144
    -> migration d'automatique-enseignants#428
```

Les cours en gardent une copie jusqu'à leur migration (ocots-site#20), qui la remplace
par un import du socle. D'ici là, `scripts/verifie-cours.py` remplace ces copies par une
façade vers le socle (`export * from '../briques/…'`) : les tests des cours exécutent
déjà le code du socle.

## CI et déploiement

- **CI du socle** (`.github/workflows/tests.yml`) : `npm test` (Node 22 et 24), `npm run test:outils`,
  le cours minimal (`examples/minimal/`, ci-dessous : ses tests, puis `scripts/fumee.py`, ses pages
  ouvertes dans Chrome sans interface, démarrées et sans erreur de console), l'essai d'intégration
  (`scripts/essai-integration.sh`, avec `ocots-publication` v1.2.0) et le workflow Pages ci-dessous, appelé sur
  l'exemple sans publier.
- **Workflow Pages réutilisable** (`.github/workflows/site.yml`) : les tests du site (`npm test` dans son
  dossier), puis la publication sur GitHub Pages hors pull request. Paramètres : `dossier` (défaut `site`),
  `node-version` (22), `submodules` (faux : le dépôt étudiant n'en a pas), `deployer` (vrai). Un dépôt étudiant
  l'appelle avec `modeles/site.yml`, **épinglé par tag** (`@vX.Y.Z`), en accordant `pages: write` et
  `id-token: write`. Le fichier du dépôt étudiant est publié depuis le dépôt enseignant
  (`etudiant/.github/workflows/site.yml`) : le remplacer par ce modèle fait partie de la migration d'un cours.

### Cours minimal

`examples/minimal/` est un vrai petit cours, disposé comme un cours (`docs/conception.md`, « Disposition
d'un cours ») : `site.config.js`, les deux gabarits copiés des modèles, `css/cours.css`, deux illustrations
et une annoncée, un glossaire, et ses tests (`verifieCours`, `verifieModeles`). `socle/` y est un lien vers
la racine du dépôt, à la place du sous-module. C'est l'exemple à suivre pour un nouveau cours, et la
non-régression du socle en CI.

```bash
cd examples/minimal && npm test         # le contrat du socle et les gabarits
scripts/fumee.py                        # ses pages dans Chrome sans interface
npm run serve                           # puis http://localhost:8000/examples/minimal/
```

## Versions et publication

Versions sémantiques, en **`v0.x`** tant que les trois cours ne sont pas migrés (l'interface bouge
encore), puis **`v1.0.0`**. Un cours **épingle une version** (`git -C site/socle checkout vX.Y.Z`).

L'**interface publique**, donc ce qui fait monter la version :

- **majeure** (en `v0.x` : la mineure) : le format de `site.config.js`, les points d'extension, un export
  documenté d'une brique (`js/briques/commun.js`, `repere.js`, `controls.js`…) qui change ou disparaît ;
- **mineure** : une brique ou une clé de configuration ajoutée ;
- **corrective** : le reste.

Le `CHANGELOG.md` indique, pour chaque version, les changements de comportement visibles cours par
cours (nouveau bouton, nouvelle mise en page).

Publier une version :

1. PR `chore(release): vX.Y.Z` : la section « Non publié » du `CHANGELOG.md` devient
   `## vX.Y.Z — date`, et `package.json` porte `"version": "X.Y.Z"` ;
2. une fois la PR fusionnée, tag annoté sur **son** commit de merge, pas sur un commit plus récent
   de `main` : `git tag -a vX.Y.Z -m vX.Y.Z <merge> && git push origin vX.Y.Z` ;
3. le workflow `release.yml` lance les tests, vérifie que `package.json` annonce bien le tag, et crée
   la release GitHub avec la section du CHANGELOG pour notes ; il échoue si elle manque, ou si
   « Non publié » a encore des entrées (tag posé trop tard) ;
   si le workflow ne démarre pas (workflow invalide au commit du tag), la release se crée à la main
   avec les mêmes notes : `.github/scripts/notes-de-version vX.Y.Z > notes.md && gh release create
   vX.Y.Z --title vX.Y.Z --notes-file notes.md` ;
4. chaque cours monte l'épingle de `site/socle/`, une PR par cours, avec les changements de
   comportement de la section.
