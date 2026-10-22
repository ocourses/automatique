// Portrait de phase (exemples à deux états) : la trajectoire courante, les
// précédentes en gris, le fantôme du linéarisé en tirets. Un clic lance une
// nouvelle trajectoire depuis le point visé.

import { couleurs } from './theme.js';

const TRAJECTOIRES_GARDEES = 8;

export class Portrait {
  // rappels : { lance(x0) }
  constructor(canvas, modele, sim, rappels) {
    this.canvas = canvas;
    this.modele = modele;
    this.sim = sim;
    this.anciennes = [];
    this.avecFantome = false;
    new ResizeObserver(() => this.dessine()).observe(canvas);
    canvas.addEventListener('click', (ev) => {
      const { rect, versEtat } = this.geometrie();
      rappels.lance(versEtat(ev.clientX - rect.left, ev.clientY - rect.top));
    });
  }

  // À appeler avant de démarrer une nouvelle trajectoire.
  archive() {
    const h = this.sim.historique;
    if (h.t.length > 1) this.anciennes.push({ x1: h.x[0].slice(), x2: h.x[1].slice() });
    if (this.anciennes.length > TRAJECTOIRES_GARDEES) this.anciennes.shift();
  }

  efface() {
    this.anciennes = [];
    this.dessine();
  }

  // Cadre : celui de l'exemple, élargi si besoin pour contenir les trajectoires.
  cadre() {
    let [a1, b1] = this.modele.portrait.x1;
    let [a2, b2] = this.modele.portrait.x2;
    const h = this.sim.historique;
    for (const t of [...this.anciennes, { x1: h.x[0], x2: h.x[1] }]) {
      for (let k = 0; k < t.x1.length; k++) {
        const v1 = t.x1[k];
        const v2 = t.x2[k];
        if (!Number.isFinite(v1) || !Number.isFinite(v2)) continue;
        a1 = Math.min(a1, v1);
        b1 = Math.max(b1, v1);
        a2 = Math.min(a2, v2);
        b2 = Math.max(b2, v2);
      }
    }
    return [a1, b1, a2, b2];
  }

  geometrie() {
    const rect = this.canvas.getBoundingClientRect();
    const [a1, b1, a2, b2] = this.cadre();
    const X = (v) => ((v - a1) / (b1 - a1)) * rect.width;
    const Y = (v) => rect.height - ((v - a2) / (b2 - a2)) * rect.height;
    const versEtat = (px, py) => [a1 + (px / rect.width) * (b1 - a1), a2 + ((rect.height - py) / rect.height) * (b2 - a2)];
    return { rect, X, Y, versEtat, a1, b1, a2, b2 };
  }

  dessine() {
    const { rect, X, Y, a1, b1, a2, b2 } = this.geometrie();
    if (rect.width < 2 || rect.height < 2) return; // onglet masqué
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const ctx = this.canvas.getContext('2d');
    const col = couleurs();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Axes passant par l'origine, ou au bord si elle est hors du cadre.
    ctx.strokeStyle = col.grille;
    ctx.lineWidth = 1;
    const x0 = X(Math.min(Math.max(0, a1), b1));
    const y0 = Y(Math.min(Math.max(0, a2), b2));
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(rect.width, y0);
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0, rect.height);
    ctx.stroke();
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = col.discret;
    const [e1, e2] = this.modele.etats.map((e) => e.texte);
    ctx.textAlign = 'right';
    ctx.fillText(e1, rect.width - 4, y0 - 6);
    ctx.textAlign = 'left';
    ctx.fillText(e2, x0 + 6, 12);
    const fmt = (v) => String(Number(v.toPrecision(2))).replace('.', ',').replace('-', '−');
    ctx.fillText(fmt(a1), 4, y0 + 14);
    ctx.textAlign = 'right';
    ctx.fillText(fmt(b1), rect.width - 4, y0 + 14);

    const trace = (xs, ys, couleur, largeur, tirets = []) => {
      ctx.save();
      ctx.strokeStyle = couleur;
      ctx.lineWidth = largeur;
      ctx.setLineDash(tirets);
      ctx.beginPath();
      let leve = true;
      for (let k = 0; k < xs.length; k++) {
        if (xs[k] == null || ys[k] == null) {
          leve = true;
          continue;
        }
        if (leve) ctx.moveTo(X(xs[k]), Y(ys[k]));
        else ctx.lineTo(X(xs[k]), Y(ys[k]));
        leve = false;
      }
      ctx.stroke();
      ctx.restore();
    };
    for (const t of this.anciennes) trace(t.x1, t.x2, col.discret, 1);
    const hist = this.sim.historique;
    if (this.avecFantome) trace(hist.fantome[0], hist.fantome[1], col.accent, 1, [5, 4]);
    if (this.sim.obs) trace(hist.xh[0], hist.xh[1], col.observateur, 1.5, [6, 3]);
    trace(hist.x[0], hist.x[1], col.accent, 2);

    // Équilibre visé et état courant.
    const xe = this.sim.xe;
    ctx.strokeStyle = col.trait;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(xe[0]), Y(xe[1]), 5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = col.accent;
    ctx.beginPath();
    ctx.arc(X(this.sim.x[0]), Y(this.sim.x[1]), 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}
