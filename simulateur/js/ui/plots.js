// Courbes en fenêtre glissante (uPlot) : x(t) (avec l'estimée x̂ de l'observateur
// et le fantôme du linéarisé en option), u(t) (avec la perturbation d(t)) et,
// s'il y a un observateur, l'erreur d'estimation e = x − x̂.

import { couleurs } from './theme.js';

const FENETRE = 10; // s
const HAUTEUR = 140; // px

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
    this.conteneur.textContent = '';
    const col = couleurs();
    const o = this.options;
    const largeur = this.conteneur.clientWidth || 400;
    const axe = { stroke: col.discret, grid: { stroke: col.grille, width: 1 }, ticks: { stroke: col.grille } };
    const teintes = [col.accent, col.trait, col.discret, col.perturbation];
    const escalier = window.uPlot.paths.stepped({ align: 1 });
    // Échelle verticale : marge de 10 %, et intervalle minimal pour une courbe constante.
    const plage = (_, bas, haut) => {
      const marge = Math.max((haut - bas) * 0.1, 1e-3);
      return haut - bas < 1e-9 ? [bas - 1, haut + 1] : [bas - marge, haut + marge];
    };
    const options = (series) => ({
      width: largeur,
      height: HAUTEUR,
      scales: { x: { time: false }, y: { range: plage } },
      axes: [{ ...axe, label: 't (s)', labelSize: 20 }, { ...axe, size: 50 }],
      cursor: { drag: { x: false, y: false } },
      series: [{ label: 't', value: (_, v) => (v == null ? '' : v.toFixed(2)) }, ...series],
    });
    const valeur = (_, v) => (v == null ? '' : v.toFixed(3));
    const serie = (desc, i, extra = {}) => ({
      label: `${desc.texte} (${desc.unite})`,
      stroke: teintes[i % teintes.length],
      width: i === 0 ? 2 : 1.5,
      value: valeur,
      ...extra,
    });

    // x(t), x̂(t) en escalier (l'observateur est discret), fantôme en tirets.
    const seriesEtats = this.modele.etats.map((e, i) => serie(e, i));
    this.colonnesEtats = [(h) => h.x];
    if (o.observateur) {
      this.modele.etats.forEach((e, i) =>
        seriesEtats.push({
          label: `${e.texte} estimé`,
          stroke: col.observateur,
          width: 1.5,
          dash: i === 0 ? undefined : [6, 3],
          paths: escalier,
          points: { show: false },
          value: valeur,
        }),
      );
      this.colonnesEtats.push((h) => h.xh);
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
      const g = new window.uPlot(options(series), vide(series.length), this.conteneur);
      this.graphes.push(g);
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
    this.actualise();
  }

  redimensionne() {
    const largeur = this.conteneur.clientWidth;
    if (!largeur) return;
    for (const g of this.graphes) g.setSize({ width: largeur, height: HAUTEUR });
  }

  actualise() {
    const h = this.sim.historique;
    const debut = h.t[0] ?? 0;
    const fin = Math.max(this.options.historique ? 0 : FENETRE, this.sim.t);
    const fenetre = this.options.historique
      ? { min: debut, max: Math.max(fin, debut + 1) }
      : { min: fin - FENETRE, max: fin };
    this.etats.setData([h.t, ...this.colonnesEtats.flatMap((c) => c(h))]);
    this.commandes.setData([h.t, ...this.colonnesCommandes.flatMap((c) => c(h))]);
    if (this.erreur) this.erreur.setData([h.t, ...h.e]);
    for (const g of this.graphes) g.setScale('x', fenetre);
  }
}
