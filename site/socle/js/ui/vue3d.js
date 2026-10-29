// Vue 3D minimale, écrite à la main (sans bibliothèque) : surface z = f(x, y)
// en facettes triées de la plus lointaine à la plus proche (algorithme du
// peintre), courbes et points 3D, rotation à la souris.
//
// Le domaine [x0, x1] × [y0, y1] × [zmin, zmax] est ramené à un cube de côté 2 ;
// l'azimut tourne autour de l'axe vertical et l'élévation incline la vue.
// Plusieurs surfaces se dessinent ensemble (`surfaces`) : leurs facettes sont
// triées toutes ensemble, pour qu'une surface passe devant l'autre là où il faut.

import { Camera } from './camera3d.js';
import { ajusteCanevas } from './canevas.js';
import { couleurs } from './theme.js';

function verifieDomaine(zmax, zmin) {
  if (!(zmax > zmin)) throw new RangeError(`Vue3D : zmax (${zmax}) doit dépasser zmin (${zmin})`);
}

export class Vue3D {
  constructor(canvas, { x, y, zmax, zmin = 0, azimut = -0.7, elevation = 0.5, rappel = () => {} }) {
    verifieDomaine(zmax, zmin);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.domaine = { x, y, zmax, zmin };
    this.camera = new Camera({ azimut, elevation, elevations: [0.05, 1.5] }).attache(canvas, rappel);
  }

  fixeDomaine(x, y, zmax, zmin = 0) {
    verifieDomaine(zmax, zmin);
    this.domaine = { x, y, zmax, zmin };
  }

  prepare() {
    const rect = ajusteCanevas(this.canvas, this.ctx);
    if (!rect) return false;
    this.rect = rect;
    this.col = couleurs();
    this.echelle = Math.min(rect.width, rect.height) / 3.4;
    return true;
  }

  // Coordonnées du cube [−1, 1]² × [−0,6 ; 0,6] puis projection : { px, py, prof }.
  projette(x, y, z) {
    const { x: [x0, x1], y: [y0, y1], zmax, zmin } = this.domaine;
    const u = (2 * (x - x0)) / (x1 - x0) - 1;
    const v = (2 * (y - y0)) / (y1 - y0) - 1;
    const w = (1.2 * (Math.max(zmin, Math.min(z, zmax)) - zmin)) / (zmax - zmin) - 0.6;
    const { X, H, prof } = this.camera.tourne(u, v, w);
    return { px: this.rect.width / 2 + this.echelle * X, py: this.rect.height / 2 - this.echelle * H, prof };
  }

  // Facettes de la surface z = f(x, y) sur le domaine, ou sur `pave`
  // ([x0, x1], [y0, y1]) ; `n` facettes par côté.
  facettes(f, { n = 34, pave = null, teinte = 215, alpha = 0.85 } = {}) {
    const { zmax, zmin } = this.domaine;
    const [x0, x1] = pave ? pave[0] : this.domaine.x;
    const [y0, y1] = pave ? pave[1] : this.domaine.y;
    const sommets = [];
    for (let i = 0; i <= n; i++) {
      sommets.push([]);
      for (let j = 0; j <= n; j++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const y = y0 + ((y1 - y0) * j) / n;
        const z = Math.max(zmin, Math.min(f(x, y), zmax));
        sommets[i].push({ ...this.projette(x, y, z), z });
      }
    }
    const facettes = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const q = [sommets[i][j], sommets[i + 1][j], sommets[i + 1][j + 1], sommets[i][j + 1]];
        facettes.push({ q, prof: q.reduce((s, p) => s + p.prof, 0) / 4, z: q.reduce((s, p) => s + p.z, 0) / 4, teinte, alpha });
      }
    }
    return facettes;
  }

  // Dessine des facettes, de la plus lointaine à la plus proche (le tableau reçu
  // n'est pas modifié) ; teinte selon la hauteur, du foncé (bas) au clair (haut).
  dessineFacettes(facettes) {
    const { zmax, zmin } = this.domaine;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 0.6;
    for (const { q, z, teinte, alpha } of facettes.toSorted((a, b) => b.prof - a.prof)) {
      const t = Math.max(0, Math.min(1, (z - zmin) / (zmax - zmin)));
      const l = 38 + 45 * t;
      ctx.fillStyle = `hsla(${teinte}, 55%, ${l}%, ${alpha})`;
      ctx.strokeStyle = `hsla(${teinte}, 40%, ${l - 12}%, 0.6)`;
      ctx.beginPath();
      ctx.moveTo(q[0].px, q[0].py);
      for (let k = 1; k < 4; k++) ctx.lineTo(q[k].px, q[k].py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Surface en facettes colorées selon la hauteur ; `n` facettes par côté.
  surface(f, options = {}) {
    this.dessineFacettes(this.facettes(f, options));
  }

  // Plusieurs surfaces, triées ensemble : [{ f, n, pave, teinte, alpha }].
  surfaces(liste) {
    this.dessineFacettes(liste.flatMap(({ f, ...options }) => this.facettes(f, options)));
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
    const { x: [x0, x1], y: [y0, y1], zmin } = this.domaine;
    this.courbe(
      [
        [x0, y0, zmin],
        [x1, y0, zmin],
        [x1, y1, zmin],
        [x0, y1, zmin],
        [x0, y0, zmin],
      ],
      { couleur: this.col.discret, largeur: 1 },
    );
  }
}
