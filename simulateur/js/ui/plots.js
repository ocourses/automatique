// Courbes en fenêtre glissante (uPlot) : x(t) (avec l'estimée x̂ de l'observateur
// et le fantôme du linéarisé en option), u(t) (avec la perturbation d(t)) et,
// s'il y a un observateur, l'erreur d'estimation e = x − x̂.
//
// Chaque graphique occupe une case (.courbe) dont la hauteur est fixée par la
// feuille de style : le graphique la remplit, légende comprise.

import { etiquettesAxe, nombreCourt } from './format.js';
import { couleurs } from './theme.js';

const FENETRE = 10; // s
const MARQUES_PAR_FENETRE = 50; // marqueurs de l'estimée x̂ sur la largeur d'un graphique
const HAUTEUR_MIN = 60; // px

// Échelle verticale : marge de 10 %. L'écart minimal est relatif, pour qu'une
// courbe qui tend vers 0 reste lisible (les graduations donnent l'ordre de
// grandeur) ; une courbe identiquement nulle garde l'intervalle [−1, 1].
export function plageVerticale(bas, haut) {
  if (bas == null || haut == null || !Number.isFinite(bas) || !Number.isFinite(haut)) return [-1, 1];
  const ampleur = Math.max(Math.abs(bas), Math.abs(haut));
  if (ampleur === 0) return [-1, 1];
  const ecart = Math.max(haut - bas, 1e-6 * ampleur);
  const milieu = (bas + haut) / 2;
  return [milieu - 0.6 * ecart, milieu + 0.6 * ecart];
}

// Marqueurs de l'estimée : une valeur tous les `pas` secondes, sur une grille
// fixe en temps pour que les marqueurs ne glissent pas avec la fenêtre.
export function marques(t, valeurs, pas) {
  let case_ = -Infinity;
  return t.map((tk, k) => {
    const c = Math.floor(tk / pas + 1e-9);
    if (c === case_) return null;
    case_ = c;
    return valeurs[k];
  });
}

export class Courbes {
  constructor(conteneur, modele, sim) {
    this.conteneur = conteneur;
    this.modele = modele;
    this.sim = sim;
    this.options = { fantome: false, perturbation: false, historique: false, observateur: false, echantillonne: false };
    this.graphes = [];
    this.construit();
    new ResizeObserver(() => this.redimensionne()).observe(conteneur);
  }

  configure(options) {
    const avant = JSON.stringify(this.options);
    Object.assign(this.options, options);
    if (JSON.stringify(this.options) !== avant) this.construit();
    else this.actualise();
  }

  construit() {
    for (const g of this.graphes) g.destroy();
    this.graphes = [];
    this.cases = [];
    this.conteneur.textContent = '';
    const col = couleurs();
    const o = this.options;
    const axe = {
      stroke: col.discret,
      grid: { stroke: col.grille, width: 1 },
      ticks: { stroke: col.grille },
      values: (_, valeurs) => etiquettesAxe(valeurs),
    };
    // Largeur de l'axe vertical ajustée à la plus longue étiquette.
    const axeY = {
      ...axe,
      size: (_, valeurs) => (valeurs ? 14 + 7 * Math.max(3, ...valeurs.map((v) => v.length)) : 50),
    };
    const teintes = [col.accent, col.trait, col.discret, col.perturbation];
    const escalier = window.uPlot.paths.stepped({ align: 1 });
    const options = (series) => ({
      width: 400,
      height: 120,
      scales: { x: { time: false }, y: { range: (_, bas, haut) => plageVerticale(bas, haut) } },
      axes: [{ ...axe, size: 32 }, axeY],
      cursor: { drag: { x: false, y: false } },
      series: [{ label: 't', value: (_, v) => (v == null ? '' : v.toFixed(2)) }, ...series],
    });
    const valeur = (_, v) => (v == null ? '' : nombreCourt(v, 3));
    const serie = (desc, i, extra = {}) => ({
      label: `${desc.texte} (${desc.unite})`,
      stroke: teintes[i % teintes.length],
      width: i === 0 ? 2 : 1.5,
      value: valeur,
      ...extra,
    });

    // x(t) ; l'estimée x̂ en marqueurs seuls (ronds évidés), pour la distinguer
    // de l'état sans masquer sa courbe ; le fantôme en tirets.
    const seriesEtats = this.modele.etats.map((e, i) => serie(e, i));
    this.colonnesEtats = [(h) => h.x];
    if (o.observateur) {
      this.modele.etats.forEach((e, i) =>
        seriesEtats.push({
          label: `${e.texte} estimé`,
          stroke: teintes[i % teintes.length],
          paths: () => null,
          points: { show: true, size: 7, width: 1.5, stroke: col.observateur, fill: col.fond },
          value: valeur,
        }),
      );
      this.colonnesEtats.push((h, pas) => h.xh.map((v) => marques(h.t, v, pas)));
    }
    if (o.fantome) {
      this.modele.etats.forEach((e, i) =>
        seriesEtats.push({
          label: `${e.texte} linéarisé`,
          stroke: teintes[i % teintes.length],
          width: 1,
          dash: [5, 4],
          value: valeur,
        }),
      );
      this.colonnesEtats.push((h) => h.fantome);
    }

    // u(t), en escalier quand la commande est échantillonnée.
    const seriesCommandes = this.modele.commandes.map((c, i) =>
      serie(c, i, o.echantillonne ? { paths: escalier, points: { show: false } } : {}),
    );
    this.colonnesCommandes = [(h) => h.u];
    if (o.perturbation) {
      this.modele.commandes.forEach((c) =>
        seriesCommandes.push({ label: `d (${c.unite})`, stroke: col.perturbation, width: 1.5, value: valeur }),
      );
      this.colonnesCommandes.push((h) => h.d);
    }

    const vide = (k) => Array.from({ length: k + 1 }, () => []);
    const ajoute = (series) => {
      const boite = document.createElement('div');
      boite.className = 'courbe';
      this.conteneur.appendChild(boite);
      const g = new window.uPlot(options(series), vide(series.length), boite);
      this.graphes.push(g);
      this.cases.push({ boite, g, legende: g.root.querySelector('.u-legend'), hauteurLegende: -1 });
      return g;
    };
    this.etats = ajoute(seriesEtats);
    this.commandes = ajoute(seriesCommandes);
    this.erreur = null;
    if (o.observateur) {
      this.erreur = ajoute(
        this.modele.etats.map((e, i) => ({
          label: `e${i + 1} = ${e.texte} − ${e.texte} estimé`,
          stroke: teintes[i % teintes.length],
          width: 1.5,
          value: valeur,
        })),
      );
    }
    this.redimensionne();
    this.actualise();
  }

  // Chaque graphique remplit sa case, moins la hauteur de sa légende.
  redimensionne() {
    for (const c of this.cases) {
      const largeur = c.boite.clientWidth;
      if (!largeur) continue;
      c.hauteurLegende = c.legende?.offsetHeight ?? 0;
      const hauteur = Math.max(HAUTEUR_MIN, c.boite.clientHeight - c.hauteurLegende - 4);
      c.g.setSize({ width: largeur, height: hauteur });
    }
  }

  actualise() {
    const h = this.sim.historique;
    const debut = h.t[0] ?? 0;
    const fin = Math.max(this.options.historique ? 0 : FENETRE, this.sim.t);
    const fenetre = this.options.historique
      ? { min: debut, max: Math.max(fin, debut + 1) }
      : { min: fin - FENETRE, max: fin };
    // Au moins un pas de l'observateur entre deux marqueurs, qui sont des valeurs de x̂.
    const pas = Math.max(this.sim.obs?.h ?? 0, (fenetre.max - fenetre.min) / MARQUES_PAR_FENETRE);
    this.etats.setData([h.t, ...this.colonnesEtats.flatMap((c) => c(h, pas))]);
    this.commandes.setData([h.t, ...this.colonnesCommandes.flatMap((c) => c(h))]);
    if (this.erreur) this.erreur.setData([h.t, ...h.e]);
    for (const g of this.graphes) g.setScale('x', fenetre);
    // Une légende qui change de nombre de lignes change la place du graphique.
    if (this.cases.some((c) => (c.legende?.offsetHeight ?? 0) !== c.hauteurLegende)) this.redimensionne();
  }
}
