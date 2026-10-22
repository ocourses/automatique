// Courbes x(t) et u(t) en fenêtre glissante (uPlot), avec en option le
// fantôme du linéarisé (tirets) et la perturbation d(t).

import { couleurs } from './theme.js';

const FENETRE = 10; // s
const HAUTEUR = 140; // px

export class Courbes {
  constructor(conteneur, modele, sim) {
    this.conteneur = conteneur;
    this.modele = modele;
    this.sim = sim;
    this.options = { fantome: false, perturbation: false, historique: false };
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
    this.etats?.destroy();
    this.commandes?.destroy();
    this.conteneur.textContent = '';
    const col = couleurs();
    const largeur = this.conteneur.clientWidth || 400;
    const axe = { stroke: col.discret, grid: { stroke: col.grille, width: 1 }, ticks: { stroke: col.grille } };
    const teintes = [col.accent, col.trait, col.discret, col.perturbation];
    const options = (series) => ({
      width: largeur,
      height: HAUTEUR,
      scales: { x: { time: false } },
      axes: [{ ...axe, label: 't (s)', labelSize: 20 }, { ...axe, size: 50 }],
      cursor: { drag: { x: false, y: false } },
      series: [{ label: 't', value: (_, v) => (v == null ? '' : v.toFixed(2)) }, ...series],
    });
    const valeur = (_, v) => (v == null ? '' : v.toFixed(3));
    const serie = (desc, i) => ({
      label: `${desc.texte} (${desc.unite})`,
      stroke: teintes[i % teintes.length],
      width: i === 0 ? 2 : 1.5,
      value: valeur,
    });
    const seriesEtats = this.modele.etats.map(serie);
    if (this.options.fantome) {
      this.modele.etats.forEach((desc, i) =>
        seriesEtats.push({
          label: `${desc.texte} linéarisé`,
          stroke: teintes[i % teintes.length],
          width: 1,
          dash: [5, 4],
          value: valeur,
        }),
      );
    }
    const seriesCommandes = this.modele.commandes.map(serie);
    if (this.options.perturbation) {
      this.modele.commandes.forEach((desc) =>
        seriesCommandes.push({ label: `d (${desc.unite})`, stroke: col.perturbation, width: 1.5, value: valeur }),
      );
    }
    const vide = (k) => Array.from({ length: k + 1 }, () => []);
    this.etats = new window.uPlot(options(seriesEtats), vide(seriesEtats.length), this.conteneur);
    this.commandes = new window.uPlot(options(seriesCommandes), vide(seriesCommandes.length), this.conteneur);
    this.actualise();
  }

  redimensionne() {
    const largeur = this.conteneur.clientWidth;
    if (!largeur) return;
    this.etats.setSize({ width: largeur, height: HAUTEUR });
    this.commandes.setSize({ width: largeur, height: HAUTEUR });
  }

  actualise() {
    const h = this.sim.historique;
    const fin = Math.max(this.options.historique ? 0 : FENETRE, this.sim.t);
    const fenetre = this.options.historique
      ? { min: h.t[0] ?? 0, max: Math.max(fin, (h.t[0] ?? 0) + 1) }
      : { min: fin - FENETRE, max: fin };
    this.etats.setData([h.t, ...h.x, ...(this.options.fantome ? h.fantome : [])]);
    this.etats.setScale('x', fenetre);
    this.commandes.setData([h.t, ...h.u, ...(this.options.perturbation ? h.d : [])]);
    this.commandes.setScale('x', fenetre);
  }
}
