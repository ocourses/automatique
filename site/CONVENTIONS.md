# Conventions des pages d'illustration

Les règles des sites de cours sont celles de
[`site.md`](https://github.com/ocourses/ocots-conventions/blob/main/site.md)
(`WEB1`–`WEB20`, d'`ocots-conventions`), pour le socle épinglé dans `socle/`.
Ce fichier ne garde que ce qui est propre à ce cours : ses arbitrages et les
règles qu'il est seul à appliquer pour l'instant. Le fonctionnement d'un module
d'illustration est décrit dans le `README.md`, section « Ajouter une
illustration ».

**Page de référence** : le diagramme de bifurcation
(`js/illustrations/bifurcation.js`).

## 1. Couleurs ([WEB11](https://github.com/ocourses/ocots-conventions/blob/main/site.md#web11--une-couleur-un-rôle-défini-par-le-cours))

| Rôle | Variable | Usage |
|---|---|---|
| Trajectoires, texte | `--texte` | orbites, particules, courbes principales |
| Accent | `--accent` | directions propres (en tirets), point stable, première courbe |
| Zone de stabilité | `--zone-stable` | région où l'équilibre est asymptotiquement stable |
| Condition initiale | `--perturbation` (orange) | x₀ dans le portrait, rappelé en t = 0 dans les courbes |
| Équilibres | `--equilibre` (violet) | l'équilibre isolé et la droite d'équilibres |
| Alerte | `--alerte` (rouge) | point instable, verdict « instable » ; jamais pour autre chose |
| Discret | `--discret` | champ de vecteurs, graduations, points de repère |

- Une courbe étudiée est en `--accent` ; son linéarisé, en tirets `--texte`.
  Les bassins d'attraction sont en `--zone-stable`, `--zone-2` et `--zone-3`.
  Un équilibre stable est un point plein violet, un équilibre instable un
  cercle violet.
- Le simulateur a ses rôles en plus, avec les mêmes variables : la condition
  initiale en `--perturbation`, les estimées $\hat x$ de l'observateur en
  marqueurs évidés, le fantôme du linéarisé en transparence.

## 2. Notations et nombres

- **On suit la source affichée.** Les notations sont celles du poly ou du TD
  cité. Par exemple, le TD1 écrit le changement de variable $x = Py$, alors
  que le poly écrit $z = P^{-1}x$ : la page garde la notation de sa source.
- **Nombres qui bougent** : largeur fixe (WEB5), avec `latexNombreFixe`,
  `latexComplexeFixe`, `latexMatriceFixe` ; la légende des courbes du
  simulateur affiche ses valeurs en notation scientifique de largeur
  constante, en police à chasse fixe (`nombreScientifique`, `+1,23e−02`) :
  elle ne bouge pas quand on suit une courbe.

## 3. État et sauvegarde ([WEB13](https://github.com/ocourses/ocots-conventions/blob/main/site.md#web13--deux-mémoires--lurl-pour-lexpérience-le-navigateur-pour-le-confort))

- Préférences d'une illustration : clé `automatique.illustration.<id>`.
  Réglages et affichage d'un exemple du simulateur : `simulateur.exemple.<id>`
  (`js/ui/etat.js`), une mémoire plus riche que les préférences, décrite dans
  le `README.md` (« Mémoire », « Liens »).
- Le zoom d'une courbe n'est sauvé nulle part : il revient au cadre
  automatique à chaque visite.

## 4. Interactions

- **Aimantation exacte.** Un point se colle aux lieux remarquables : axes,
  parabole Δ = 0. La valeur obtenue doit être exacte, sans arrondis séparés :
  Δ vaut 0, et non 10⁻³. Une fonction pure et testée calcule le point
  (`pointDuPlan`, brique `plan-trace-det` du socle).
- **Surface 3D.** Le geste saisit la surface : tirer vers la droite la fait
  tourner vers la droite, et on voit alors sa face gauche ; tirer vers le bas
  fait voir le dessus.
- **Calculs coûteux gardés.** Ce qui ne dépend que des paramètres est gardé en
  mémoire (les orbites par matrice et par cadre), car le dessin peut être
  refait à chaque image. Un calcul relancé avant la fin abandonne le
  précédent, et l'ancien résultat reste affiché en attendant (fondu, sans
  fondu si le mouvement est réduit).

## 5. Portraits de phase

La brique `portraits` du socle (`socle/js/briques/portraits.js`) est partagée
par le diagramme et la galerie.

- **Tracé des trajectoires.** Les départs sont répartis sur le bord du cadre,
  décalés d'un quart d'écart pour que deux côtés opposés s'intercalent. Chaque
  trajectoire est suivie avec le flot exact $e^{hA}$, jusqu'au bord ou jusqu'à
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

## 6. Essais (« À essayer »)

- **Positions du diagramme.** Les positions d'un essai sont celles affichées
  dans la figure. Si des points sont déplacés pour la lisibilité (`PLACEMENT`
  pour P₁, P₂, P₃), l'essai suit ces positions.
- **Animation des essais.** Sur une page animée, un essai lance l'animation
  (`preferences: { anime: true }`), pour qu'on voie l'effet décrit. Seul un
  essai qui fixe un instant précis ($t < 0$ dans le flot) l'arrête : sinon elle
  écraserait aussitôt la valeur choisie.
- **Animation en boucle.** Une grandeur qui évolue avec le temps ($t$ dans le
  flot) s'anime en boucle, de 0 à sa borne, avec une courte pause, et
  s'active par une case « animer en boucle ». Toucher au curseur l'arrête.
