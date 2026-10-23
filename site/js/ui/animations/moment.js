// La sphère du moment cinétique, dans le repère du corps : la direction de
// h = Jω sur la sphère unité, avec sa traînée, et les polhodies du solide
// libre (u = 0), où h reste à norme et énergie constantes. Elles entourent
// les axes de plus grande et de plus petite inertie ; l'axe intermédiaire est
// sur la séparatrice, instable.

import { polhodies } from '../../core/rotation.js';
import { Vue } from './vue.js';

const TRAINEE = 240;

export default class AnimationMoment extends Vue {
  constructor(canvas) {
    super(canvas, { azimut: -0.6, elevation: 0.35, etendue: 1.35 });
    this.cle = '';
    this.orbites = [];
    this.reinitialise();
  }

  reinitialise() {
    this.trainee = [];
    this.tPrecedent = 0;
  }

  pas(sim) {
    if (sim.t < this.tPrecedent) this.reinitialise();
    this.tPrecedent = sim.t;
    const h = this.moment(sim);
    const n = Math.hypot(...h);
    if (n < 1e-9) return;
    this.trainee.push(h.map((v) => v / n));
    if (this.trainee.length > TRAINEE) this.trainee.shift();
  }

  moment(sim) {
    return [sim.p.J1 * sim.x[0], sim.p.J2 * sim.x[1], sim.p.J3 * sim.x[2]];
  }

  dessine(sim) {
    if (!this.prepare()) return;
    const { col, ctx } = this;
    const J = [sim.p.J1, sim.p.J2, sim.p.J3];
    const cle = J.join(',');
    if (cle !== this.cle) {
      this.cle = cle;
      // Un point sur dix suffit au tracé.
      this.orbites = polhodies(J).map((o) => o.filter((_, k) => k % 10 === 0 || k === o.length - 1));
    }

    // Contour de la sphère et ses trois grands cercles.
    ctx.save();
    ctx.strokeStyle = col.discret;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.W / 2, this.H / 2, this.s, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
    const cercle = (i) =>
      Array.from({ length: 73 }, (_, k) => {
        const v = [0, 0, 0];
        v[(i + 1) % 3] = Math.cos((k * Math.PI) / 36);
        v[(i + 2) % 3] = Math.sin((k * Math.PI) / 36);
        return v;
      });
    for (let i = 0; i < 3; i++) this.ligne(cercle(i), { couleur: col.grille, largeur: 1, alphaDerriere: 0.5 });

    // Polhodies.
    for (const o of this.orbites) this.ligne(o, { couleur: col.discret, largeur: 1, alpha: 0.8, alphaDerriere: 0.15 });

    // Axes principaux ±e_i.
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) {
        const e = [0, 0, 0];
        e[i] = s;
        this.point(e, { couleur: col.series[i], rayon: 3.5, alpha: this.p(e).prof > 0 ? 0.35 : 1 });
        if (s > 0) this.etiquette(e.map((v) => v * 1.16), String(i + 1), { couleur: col.series[i] });
      }
    }

    // Direction de h et sa traînée.
    this.ligne(this.trainee, { couleur: col.accent, largeur: 2, alphaDerriere: 0.35 });
    const h = this.moment(sim);
    const n = Math.hypot(...h);
    if (n > 1e-9) {
      const u = h.map((v) => v / n);
      this.point(u, { couleur: col.accent, rayon: 6, alpha: this.p(u).prof > 0 ? 0.45 : 1 });
    }
    this.note(`‖h‖ = ${n.toFixed(3).replace('.', ',')} kg·m²/s`);
  }
}
