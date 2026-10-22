// Plan complexe : valeurs propres de A (○), du bouclé (×) et, s'il y a un
// observateur, de A − LC (◇), demi-plan Re < 0 grisé. Les valeurs propres du
// bouclé et de l'observateur se déplacent à la souris lorsque le placement de
// pôles est possible. Pour l'observateur, on dessine aussi le disque
// |λ + 1/h| < 1/h : une valeur propre qui s'y trouve est stable pour Euler
// explicite de pas h (|1 + hλ| < 1).

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
  // rappels : { modifiable(), deplace(vp), modifiableObs(), deplaceObs(vp) }
  // rayon : demi-largeur fixe du plan, pour un système raide dont un pôle très rapide
  // écraserait les autres ; les valeurs propres hors cadre sont ramenées au bord.
  constructor(canvas, rappels, rayon = null) {
    this.canvas = canvas;
    this.rappels = rappels;
    this.rayonFixe = rayon;
    this.vpA = [];
    this.vpABK = [];
    this.vpObs = null;
    this.h = null;
    this.saisie = null; // { jeu, i, vp0, R } pendant un déplacement
    new ResizeObserver(() => this.dessine()).observe(canvas);
    this.ecouteSouris();
  }

  // vpObs et h : valeurs propres de A − LC et pas d'Euler, ou null sans observateur.
  actualise(vpA, vpABK, vpObs = null, h = null) {
    this.vpA = vpA;
    this.vpABK = vpABK;
    this.vpObs = vpObs;
    this.h = h;
    this.dessine();
  }

  // Échelle : figée pendant un déplacement pour que le plan ne bouge pas sous la souris.
  geometrie() {
    const rect = this.canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    let R = this.saisie?.R ?? this.rayonFixe;
    if (!R) {
      const module = Math.max(
        1,
        ...[...this.vpA, ...this.vpABK, ...(this.vpObs ?? [])].map((z) => Math.max(Math.abs(z.re), Math.abs(z.im))),
      );
      R = 1.25 * module;
    }
    const s = Math.min(W, H) / (2 * R);
    return { rect, W, H, R, s, X: (re) => W / 2 + re * s, Y: (im) => H / 2 - im * s };
  }

  // Position affichée d'une valeur propre : ramenée au bord du cadre si elle en sort.
  // `hors` vaut true dans ce cas ; la direction vers la vraie valeur est conservée.
  affichee(z, R) {
    const k = Math.max(Math.abs(z.re), Math.abs(z.im)) / (0.94 * R);
    return k > 1 ? { re: z.re / k, im: z.im / k, hors: true } : { re: z.re, im: z.im, hors: false };
  }

  versComplexe(ev) {
    const { rect, W, H, s } = this.geometrie();
    return { re: (ev.clientX - rect.left - W / 2) / s, im: -(ev.clientY - rect.top - H / 2) / s };
  }

  // Valeur propre modifiable sous la souris : { jeu: 'bf' | 'obs', i } ou null.
  // Si deux sont confondues, on en prend une, l'autre se déplace ensuite.
  sousLaSouris(ev) {
    const { rect, X, Y, R } = this.geometrie();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    let meilleur = null;
    let d = RAYON_SAISIE;
    const cherche = (jeu, vp) => {
      vp.forEach((v, i) => {
        const z = this.affichee(v, R);
        const dk = Math.hypot(X(z.re) - px, Y(z.im) - py);
        if (dk <= d) {
          d = dk;
          meilleur = { jeu, i };
        }
      });
    };
    if (this.rappels.modifiable()) cherche('bf', this.vpABK);
    if (this.vpObs && this.rappels.modifiableObs?.()) cherche('obs', this.vpObs);
    return meilleur;
  }

  ecouteSouris() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (ev) => {
      const prise = this.sousLaSouris(ev);
      if (!prise) return;
      const vp = prise.jeu === 'bf' ? this.vpABK : this.vpObs;
      this.saisie = { ...prise, vp0: nettoieSpectre(vp), R: this.geometrie().R };
      c.setPointerCapture(ev.pointerId);
      c.classList.add('saisi');
      ev.preventDefault();
    });
    c.addEventListener('pointermove', (ev) => {
      if (!this.saisie) {
        c.classList.toggle('survol', this.sousLaSouris(ev) !== null);
        return;
      }
      const { s } = this.geometrie();
      const { jeu, i, vp0 } = this.saisie;
      const vp = deplaceValeurPropre(vp0, i, this.versComplexe(ev), AIMANTATION / s);
      if (jeu === 'bf') this.rappels.deplace(vp);
      else this.rappels.deplaceObs(vp);
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
    // Onglet masqué : rien à dessiner (et la boucle de graduation ne finirait pas).
    if (W < 2 || H < 2) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    const col = couleurs();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col.zone;
    ctx.fillRect(0, 0, W / 2, H);

    // Disque d'Euler explicite de pas h, centré en −1/h, de rayon 1/h.
    if (this.vpObs && this.h > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(X(-1 / this.h), Y(0), s / this.h, 0, 2 * Math.PI);
      ctx.fillStyle = col.observateurZone;
      ctx.fill();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = col.observateur;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

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

    // Valeurs propres de A : cercles creux ; du bouclé : croix pleines.
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = col.discret;
    // Une valeur propre hors cadre est marquée sur le bord, avec sa vraie valeur.
    const etiquette = (z, v, couleur) => {
      if (!z.hors) return;
      ctx.save();
      ctx.fillStyle = couleur;
      ctx.font = '11px system-ui, sans-serif';
      const valeur = String(Number(v.re.toPrecision(4))).replace('.', ',').replace('-', '−');
      ctx.textAlign = z.re < 0 ? 'left' : 'right';
      ctx.fillText(z.re < 0 ? `◂ ${valeur}` : `${valeur} ▸`, X(z.re) + (z.re < 0 ? 9 : -9), Y(z.im) - 9);
      ctx.restore();
    };
    for (const v of this.vpA) {
      const z = this.affichee(v, R);
      ctx.beginPath();
      ctx.arc(X(z.re), Y(z.im), 6, 0, 2 * Math.PI);
      ctx.stroke();
      etiquette(z, v, col.discret);
    }
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = col.accent;
    for (const v of this.vpABK) {
      const z = this.affichee(v, R);
      const x = X(z.re);
      const y = Y(z.im);
      etiquette(z, v, col.accent);
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x - 6, y + 6);
      ctx.lineTo(x + 6, y - 6);
      ctx.stroke();
    }
    // Valeurs propres de A − LC : losanges.
    if (this.vpObs) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = col.observateur;
      for (const v of this.vpObs) {
        const z = this.affichee(v, R);
        const x = X(z.re);
        const y = Y(z.im);
        etiquette(z, v, col.observateur);
        ctx.beginPath();
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x + 7, y);
        ctx.lineTo(x, y + 7);
        ctx.lineTo(x - 7, y);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
}
