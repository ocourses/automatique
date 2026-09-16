# Automatique

Supports du cours d'**Automatique de première année** de l'ENSEEIHT,
département **Sciences du numérique**.

Ce dépôt rassemble les ressources accessibles aux étudiants :

- [supports de cours](cours/README.md) ;
- [travaux dirigés](td/README.md) ;
- [travaux pratiques](tp/README.md) ;
- [examens et corrigés disponibles](examens/README.md).

## Cloner et mettre à jour le dépôt

Il est recommandé de cloner le dépôt plutôt que de télécharger les fichiers
un par un. Cela permet de récupérer facilement les nouvelles ressources avec
`git pull` :

```bash
git clone git@github.com:ocourses/automatique.git
cd automatique
git pull
```

Une fois le dépôt cloné, la commande `git pull` suffit pour récupérer les mises
à jour publiées pendant le semestre.

## Organisation du dépôt

Chaque répertoire possède son propre README avec les informations détaillées
et les liens vers ses ressources. Le dépôt étudiant ne contient que les
supports destinés aux étudiants ; les corrigés de TD et les sources LaTeX sont
conservés dans le dépôt enseignant.

| Répertoire | Contenu |
|---|---|
| [`cours/`](cours/) | Polycopié, slides, introduction à Matlab/Simulink et ressources complémentaires |
| [`td/`](td/) | Sujets PDF des quatre travaux dirigés, avec leurs objectifs |
| [`tp/`](tp/) | Supports et présentation des travaux pratiques |
| [`examens/`](examens/) | Sujets et certains corrigés classés par année universitaire |
