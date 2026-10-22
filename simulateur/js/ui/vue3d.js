// Vue 3D minimale, écrite à la main (sans bibliothèque) : surface z = f(x, y)
// en facettes triées de la plus lointaine à la plus proche (algorithme du
// peintre), courbes et points 3D, rotation à la souris.
//
// Le domaine [x0, x1] × [y0, y1] × [0, zmax] est ramené à un cube de côté 2 ;
// l'azimut tourne autour de l'axe vertical et l'élévation incline la vue.

import { couleurs } from './theme.js';

export class Vue3D {
  constructor(canvas, { x, y, zmax, azimut = -0.7, elevation = 0.5, rappel = () => {} }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.domaine = { x, y, zmax };
    this.azimut = azimut;
    this.elevation = elevation;
    canvas.classList.add('saisissable');
    let prise = null;
    canvas.addEventListener('pointerdown', (ev) => {
      prise = { x: ev.clientX, y: ev.clientY, az: this.azimut, el: this.elevation };
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener('pointermove', (ev) => {
      if (!prise) return;
      this.azimut = prise.az - (ev.clientX - prise.x) * 0.01;
      this.elevation = Math.min(1.5, Math.max(0.05, prise.el + (ev.clientY - prise.y) * 0.01));
      rappel();
    });
    const fin = () => (prise = null);
    canvas.addEventListener('pointerup', fin);
    canvas.addEventListener('pointercancel', fin);
  }

  fixeDomaine(x, y, zmax) {
    this.domaine = { x, y, zmax };
  }

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
    this.rect = rect;
    this.col = couleurs();
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.echelle = Math.min(rect.width, rect.height) / 3.4;
    return true;
  }

  // Coordonnées du cube [−1, 1]² × [0, 1,2] puis projection : { px, py, prof }.
  projette(x, y, z) {
    const { x: [x0, x1], y: [y0, y1], zmax } = this.domaine;
    const u = (2 * (x - x0)) / (x1 - x0) - 1;
    const v = (2 * (y - y0)) / (y1 - y0) - 1;
    const w = 1.2 * Math.min(z, zmax) / zmax - 0.6;
    const ca = Math.cos(this.azimut);
    const sa = Math.sin(this.azimut);
    const X = u * ca - v * sa;
    const Y = u * sa + v * ca;
    const ce = Math.cos(this.elevation);
    const se = Math.sin(this.elevation);
    return {
      px: this.rect.width / 2 + this.echelle * X,
      py: this.rect.height / 2 - this.echelle * (Y * se + w * ce),
      prof: Y * ce - w * se,
    };
  }

  // Surface en facettes colorées selon la hauteur ; `n` facettes par côté.
  surface(f, { n = 34, alpha = 0.85 } = {}) {
    const { x: [x0, x1], y: [y0, y1], zmax } = this.domaine;
    const sommets = [];
    for (let i = 0; i <= n; i++) {
      sommets.push([]);
      for (let j = 0; j <= n; j++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const y = y0 + ((y1 - y0) * j) / n;
        const z = Math.min(f(x, y), zmax);
        sommets[i].push({ ...this.projette(x, y, z), z });
      }
    }
    const facettes = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const q = [sommets[i][j], sommets[i + 1][j], sommets[i + 1][j + 1], sommets[i][j + 1]];
        facettes.push({ q, prof: q.reduce((s, p) => s + p.prof, 0) / 4, z: q.reduce((s, p) => s + p.z, 0) / 4 });
      }
    }
    facettes.sort((a, b) => b.prof - a.prof);
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 0.6;
    for (const { q, z } of facettes) {
      // Teinte : du bleu profond (bas) au clair (haut).
      const t = Math.max(0, Math.min(1, z / zmax));
      const l = 38 + 45 * t;
      ctx.fillStyle = `hsla(215, 55%, ${l}%, ${alpha})`;
      ctx.strokeStyle = `hsla(215, 40%, ${l - 12}%, 0.6)`;
      ctx.beginPath();
      ctx.moveTo(q[0].px, q[0].py);
      for (let k = 1; k < 4; k++) ctx.lineTo(q[k].px, q[k].py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Ligne brisée 3D.
  courbe(points, { couleur = this.col.accent, largeur = 2, tirets = [] } = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = couleur;
    ctx.lineWidth = largeur;
    ctx.setLineDash(tirets);
    ctx.beginPath();
    points.forEach(([x, y, z], k) => {
      const p = this.projette(x, y, z);
      if (k === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    });
    ctx.stroke();
    ctx.restore();
  }

  // Bille : un disque avec un reflet.
  bille(x, y, z, couleur) {
    const p = this.projette(x, y, z);
    const ctx = this.ctx;
    ctx.save();
    const g = ctx.createRadialGradient(p.px - 3, p.py - 3, 1, p.px, p.py, 8);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, couleur);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.px, p.py, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // Cadre du domaine au sol, pour situer la surface.
  socle() {
    const { x: [x0, x1], y: [y0, y1] } = this.domaine;
    this.courbe(
      [
        [x0, y0, 0],
        [x1, y0, 0],
        [x1, y1, 0],
        [x0, y1, 0],
        [x0, y0, 0],
      ],
      { couleur: this.col.discret, largeur: 1 },
    );
  }
}
