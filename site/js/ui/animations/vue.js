// Base des animations 3D du simulateur : un canevas, une caméra tournée à la
// souris, la projection orthographique et quelques tracés (segment, flèche,
// texte). Chaque animation suit la simulation par `pas(sim)` (appelé à chaque
// image, même onglet masqué) et se dessine par `dessine(sim)`.

import { Camera } from '../../../socle/js/ui/camera3d.js';
import { couleurs } from '../../../socle/js/ui/theme.js';

export class Vue {
  constructor(canvas, { azimut = -0.9, elevation = 0.45, etendue = 1.8 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.etendue = etendue; // demi-largeur visible, en unités du monde
    this.camera = new Camera({ azimut, elevation }).attache(canvas, () => this.redessine?.());
  }

  // Prépare le canevas ; false s'il est masqué.
  prepare() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.W = rect.width;
    this.H = rect.height;
    this.s = Math.min(rect.width, rect.height) / (2 * this.etendue);
    this.col = couleurs();
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    return true;
  }

  // Point du monde (z vertical) → { px, py, prof }.
  p([x, y, z]) {
    const { X, H, prof } = this.camera.tourne(x, y, z);
    return { px: this.W / 2 + this.s * X, py: this.H / 2 - this.s * H, prof };
  }

  segment(a, b, { couleur, largeur = 1.5, alpha = 1, tirets = [] }) {
    const ctx = this.ctx;
    const [pa, pb] = [this.p(a), this.p(b)];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = couleur;
    ctx.lineWidth = largeur;
    ctx.setLineDash(tirets);
    ctx.beginPath();
    ctx.moveTo(pa.px, pa.py);
    ctx.lineTo(pb.px, pb.py);
    ctx.stroke();
    ctx.restore();
  }

  // Ligne brisée ; les points derrière le plan de l'écran passant par l'origine
  // (profondeur > 0) sont plus pâles.
  ligne(points, { couleur, largeur = 1.2, alpha = 1, alphaDerriere = alpha }) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = couleur;
    ctx.lineWidth = largeur;
    ctx.lineJoin = 'round';
    // Les segments consécutifs de même opacité forment un seul tracé.
    const q = points.map((pt) => this.p(pt));
    let k = 1;
    while (k < q.length) {
      const derriere = q[k - 1].prof + q[k].prof > 0;
      ctx.globalAlpha = derriere ? alphaDerriere : alpha;
      ctx.beginPath();
      ctx.moveTo(q[k - 1].px, q[k - 1].py);
      while (k < q.length && q[k - 1].prof + q[k].prof > 0 === derriere) {
        ctx.lineTo(q[k].px, q[k].py);
        k++;
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  fleche(a, b, { couleur, largeur = 2.5 }) {
    this.segment(a, b, { couleur, largeur });
    const [pa, pb] = [this.p(a), this.p(b)];
    const L = Math.hypot(pb.px - pa.px, pb.py - pa.py);
    if (L < 4) return;
    const [tx, ty] = [(pb.px - pa.px) / L, (pb.py - pa.py) / L];
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = couleur;
    ctx.beginPath();
    ctx.moveTo(pb.px + tx * 4, pb.py + ty * 4);
    ctx.lineTo(pb.px - tx * 8 - ty * 5, pb.py - ty * 8 + tx * 5);
    ctx.lineTo(pb.px - tx * 8 + ty * 5, pb.py - ty * 8 - tx * 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  point(a, { couleur, rayon = 4, alpha = 1 }) {
    const q = this.p(a);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = couleur;
    ctx.beginPath();
    ctx.arc(q.px, q.py, rayon, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  etiquette(a, texte, { couleur, police = '600 13px system-ui, sans-serif' }) {
    const q = this.p(a);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = couleur;
    ctx.font = police;
    ctx.textAlign = 'center';
    ctx.fillText(texte, q.px, q.py + 4);
    ctx.restore();
  }

  // Texte fixe dans un coin de l'écran (en haut à gauche), police à chasse fixe.
  note(texte) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.col.discret;
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(texte, 8, this.H - 10);
    ctx.restore();
  }
}
