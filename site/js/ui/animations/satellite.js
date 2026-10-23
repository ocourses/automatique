// Le satellite qui tourne sur lui-même. Son corps est un pavé dont les
// proportions donnent les moments d'inertie J₁, J₂, J₃ (pour un pavé homogène
// de demi-côtés a_i, J₁ ∝ a₂² + a₃², etc.). L'orientation R se déduit de ω à
// chaque pas (Ṙ = R[ω]×) ; elle sert au dessin seulement, l'état restant ω.
// La flèche montre ω dans le repère fixe, avec une traînée de son extrémité.

import { applique3, identite3, orthonormalise, pasOrientation } from '../../core/rotation.js';
import { Vue } from './vue.js';

const TRAINEE = 90;

// Demi-côtés du pavé de moments d'inertie J (le plus grand vaut 0,8). Un
// côté nul (J₁ = J₂ + J₃, plaque mince) est épaissi à 30 % du plus grand,
// pour que le corps reste un volume visible ; l'ordre des côtés est gardé.
export function demiCotes([J1, J2, J3]) {
  const a = [J2 + J3 - J1, J1 + J3 - J2, J1 + J2 - J3].map((v) => Math.sqrt(Math.max(v, 0)));
  const m = Math.max(...a, 1e-9);
  return a.map((v) => 0.8 * Math.max(v / m, 0.3));
}

export default class AnimationSatellite extends Vue {
  constructor(canvas) {
    super(canvas, { etendue: 1.45 });
    this.reinitialise();
  }

  reinitialise() {
    this.R = identite3();
    this.trainee = [];
    this.tPrecedent = 0;
    this.nPas = 0;
  }

  pas(sim) {
    if (sim.t < this.tPrecedent) this.reinitialise();
    const dt = sim.t - this.tPrecedent;
    this.tPrecedent = sim.t;
    if (dt <= 0) return;
    this.R = pasOrientation(this.R, sim.x, dt);
    if (++this.nPas % 50 === 0) this.R = orthonormalise(this.R);
    const w = applique3(this.R, sim.x);
    const n = Math.hypot(...w);
    this.trainee.push(n > 1e-9 ? w.map((v) => (v / n) * this.longueur(n)) : [0, 0, 0]);
    if (this.trainee.length > TRAINEE) this.trainee.shift();
  }

  // Longueur de la flèche de ω : croissante, bornée.
  longueur(n) {
    return (1.45 * n) / (n + 0.5);
  }

  dessine(sim) {
    if (!this.prepare()) return;
    const { col } = this;
    const J = [sim.p.J1, sim.p.J2, sim.p.J3];
    const a = demiCotes(J);
    const monde = (v) => applique3(this.R, v);

    // Repère fixe, discret : un cercle horizontal et l'axe vertical.
    const cercle = Array.from({ length: 73 }, (_, k) => [1.5 * Math.cos((k * Math.PI) / 36), 1.5 * Math.sin((k * Math.PI) / 36), 0]);
    this.ligne(cercle, { couleur: col.grille, largeur: 1 });

    // Faces du pavé tournées vers l'observateur, éclairées par une lumière fixe.
    const lumiere = [0.35, -0.45, 0.82];
    const faces = [];
    for (let i = 0; i < 3; i++) {
      for (const signe of [-1, 1]) {
        const n = [0, 0, 0];
        n[i] = signe;
        const nm = monde(n);
        if (this.camera.tourne(...nm).prof > 0) continue;
        const [j, k] = [(i + 1) % 3, (i + 2) % 3];
        const coin = (sj, sk) => {
          const v = [0, 0, 0];
          v[i] = signe * a[i];
          v[j] = sj * a[j];
          v[k] = sk * a[k];
          return this.p(monde(v));
        };
        const eclairage = Math.max(0, nm[0] * lumiere[0] + nm[1] * lumiere[1] + nm[2] * lumiere[2]);
        faces.push({ q: [coin(-1, -1), coin(1, -1), coin(1, 1), coin(-1, 1)], l: 38 + 34 * eclairage });
      }
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = col.trait;
    for (const { q, l } of faces) {
      ctx.fillStyle = `hsla(215, 45%, ${l}%, 0.95)`;
      ctx.beginPath();
      q.forEach((pt, m) => (m ? ctx.lineTo(pt.px, pt.py) : ctx.moveTo(pt.px, pt.py)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // Axes principaux du corps, qui sortent du pavé.
    for (let i = 0; i < 3; i++) {
      const e = [0, 0, 0];
      e[i] = 1;
      const debut = monde(e.map((v) => v * a[i]));
      const fin = monde(e.map((v) => v * (a[i] + 0.35)));
      this.segment(debut, fin, { couleur: col.series[i], largeur: 2 });
      this.etiquette(monde(e.map((v) => v * (a[i] + 0.5))), String(i + 1), { couleur: col.series[i] });
    }

    // ω dans le repère fixe et la traînée de son extrémité.
    this.ligne(this.trainee, { couleur: col.trait, largeur: 1.2, alpha: 0.45 });
    const w = monde(sim.x);
    const n = Math.hypot(...w);
    if (n > 1e-6) this.fleche([0, 0, 0], w.map((v) => (v / n) * this.longueur(n)), { couleur: col.trait });
    this.note(`‖ω‖ = ${n.toFixed(3).replace('.', ',')} rad/s`);
  }
}
