// Plan complexe : valeurs propres de A et de A + BK, demi-plan Re < 0 grisé.
// Les valeurs propres de A + BK se déplacent à la souris lorsque le placement
// de pôles est possible.

import { deplaceValeurPropre, nettoieSpectre } from '../core/poles.js';
import { couleurs } from './theme.js';

const RAYON_SAISIE = 12; // px
const AIMANTATION = 8; // px

function pasGraduation(R) {
  const brut = R / 3;
  const p = 10 ** Math.floor(Math.log10(brut));
  return [1, 2, 5, 10].map((k) => k * p).find((v) => v >= brut);
}

export class PlanComplexe {
  // rappels : { modifiable(), deplace(vp) }
  constructor(canvas, rappels) {
    this.canvas = canvas;
    this.rappels = rappels;
    this.vpA = [];
    this.vpABK = [];
    this.saisie = null; // { i, vp0, R } pendant un déplacement
    new ResizeObserver(() => this.dessine()).observe(canvas);
    this.ecouteSouris();
  }

  actualise(vpA, vpABK) {
    this.vpA = vpA;
    this.vpABK = vpABK;
    this.dessine();
  }

  // Échelle : figée pendant un déplacement pour que le plan ne bouge pas sous la souris.
  geometrie() {
    const rect = this.canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    let R = this.saisie?.R;
    if (!R) {
      const module = Math.max(
        1,
        ...[...this.vpA, ...this.vpABK].map((z) => Math.max(Math.abs(z.re), Math.abs(z.im))),
      );
      R = 1.25 * module;
    }
    const s = Math.min(W, H) / (2 * R);
    return { rect, W, H, R, s, X: (re) => W / 2 + re * s, Y: (im) => H / 2 - im * s };
  }

  versComplexe(ev) {
    const { rect, W, H, s } = this.geometrie();
    return { re: (ev.clientX - rect.left - W / 2) / s, im: -(ev.clientY - rect.top - H / 2) / s };
  }

  // Indice de la valeur propre de A + BK sous la souris (−1 si aucune) ; si
  // deux sont confondues, on en prend une, l'autre se déplace ensuite.
  sousLaSouris(ev) {
    if (!this.rappels.modifiable()) return -1;
    const { rect, X, Y } = this.geometrie();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    let i = -1;
    let d = RAYON_SAISIE;
    this.vpABK.forEach((z, k) => {
      const dk = Math.hypot(X(z.re) - px, Y(z.im) - py);
      if (dk <= d) {
        d = dk;
        i = k;
      }
    });
    return i;
  }

  ecouteSouris() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (ev) => {
      const i = this.sousLaSouris(ev);
      if (i < 0) return;
      this.saisie = { i, vp0: nettoieSpectre(this.vpABK), R: this.geometrie().R };
      c.setPointerCapture(ev.pointerId);
      c.classList.add('saisi');
      ev.preventDefault();
    });
    c.addEventListener('pointermove', (ev) => {
      if (!this.saisie) {
        c.classList.toggle('survol', this.sousLaSouris(ev) >= 0);
        return;
      }
      const { s } = this.geometrie();
      const { i, vp0 } = this.saisie;
      this.rappels.deplace(deplaceValeurPropre(vp0, i, this.versComplexe(ev), AIMANTATION / s));
    });
    const fin = () => {
      if (!this.saisie) return;
      this.saisie = null;
      c.classList.remove('saisi');
      this.dessine();
    };
    c.addEventListener('pointerup', fin);
    c.addEventListener('pointercancel', fin);
  }

  dessine() {
    const canvas = this.canvas;
    const { W, H, R, s, X, Y } = this.geometrie();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    const col = couleurs();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col.zone;
    ctx.fillRect(0, 0, W / 2, H);

    // Grille et axes.
    const pas = pasGraduation(R);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = col.discret;
    ctx.strokeStyle = col.grille;
    ctx.lineWidth = 1;
    const nMax = Math.ceil(Math.max(W, H) / (2 * s * pas));
    for (let k = -nMax; k <= nMax; k++) {
      if (k === 0) continue;
      const v = k * pas;
      ctx.beginPath();
      ctx.moveTo(X(v), 0);
      ctx.lineTo(X(v), H);
      ctx.moveTo(0, Y(v));
      ctx.lineTo(W, Y(v));
      ctx.stroke();
      const t = String(Number(v.toPrecision(3))).replace('.', ',').replace('-', '−');
      ctx.textAlign = 'center';
      ctx.fillText(t, X(v), H / 2 + 14);
      ctx.textAlign = 'left';
      ctx.fillText(t, W / 2 + 4, Y(v) + 4);
    }
    // Pendant un déplacement, les axes aimantés sont mis en évidence.
    ctx.strokeStyle = this.saisie ? col.accent : col.discret;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.fillStyle = col.discret;
    ctx.textAlign = 'right';
    ctx.fillText('Re', W - 4, H / 2 - 6);
    ctx.textAlign = 'left';
    ctx.fillText('Im', W / 2 + 6, 12);

    // Valeurs propres de A : cercles creux ; de A + BK : croix pleines.
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = col.discret;
    for (const z of this.vpA) {
      ctx.beginPath();
      ctx.arc(X(z.re), Y(z.im), 6, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = col.accent;
    for (const z of this.vpABK) {
      const x = X(z.re);
      const y = Y(z.im);
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x - 6, y + 6);
      ctx.lineTo(x + 6, y - 6);
      ctx.stroke();
    }
  }
}
