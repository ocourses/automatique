// Courbes x(t) et u(t) en fenêtre glissante (uPlot).

import { couleurs } from './theme.js';

const FENETRE = 10; // s
const HAUTEUR = 170; // px

export class Courbes {
  constructor(conteneur, modele, sim) {
    this.conteneur = conteneur;
    this.modele = modele;
    this.sim = sim;
    this.construit();
    new ResizeObserver(() => this.redimensionne()).observe(conteneur);
  }

  construit() {
    this.conteneur.textContent = '';
    const col = couleurs();
    const largeur = this.conteneur.clientWidth || 400;
    const axe = { stroke: col.discret, grid: { stroke: col.grille, width: 1 }, ticks: { stroke: col.grille } };
    const teintes = [col.accent, col.trait, col.discret];
    const options = (series) => ({
      width: largeur,
      height: HAUTEUR,
      scales: { x: { time: false } },
      axes: [{ ...axe, label: 't (s)', labelSize: 20 }, { ...axe, size: 50 }],
      cursor: { drag: { x: false, y: false } },
      series: [{ label: 't', value: (_, v) => (v == null ? '' : v.toFixed(2)) }, ...series],
    });
    const serie = (desc, i) => ({
      label: `${desc.texte} (${desc.unite})`,
      stroke: teintes[i % teintes.length],
      width: i === 0 ? 2 : 1.5,
      value: (_, v) => (v == null ? '' : v.toFixed(3)),
    });
    const vide = (n) => Array.from({ length: n + 1 }, () => []);
    this.etats = new window.uPlot(
      options(this.modele.etats.map(serie)),
      vide(this.modele.etats.length),
      this.conteneur,
    );
    this.commandes = new window.uPlot(
      options(this.modele.commandes.map(serie)),
      vide(this.modele.commandes.length),
      this.conteneur,
    );
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
    const tmax = Math.max(FENETRE, this.sim.t);
    const fenetre = { min: tmax - FENETRE, max: tmax };
    this.etats.setData([h.t, ...h.x]);
    this.etats.setScale('x', fenetre);
    this.commandes.setData([h.t, ...h.u]);
    this.commandes.setScale('x', fenetre);
  }
}
