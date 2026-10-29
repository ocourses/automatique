// Repère 2D sur un canevas, pour les illustrations : coordonnées du monde
// (y vers le haut), axes gradués, courbes, flèches, champ de vecteurs, et
// conversion d'un événement souris en coordonnées du monde.
//
// Usage : const r = new Repere(canvas, { x: [a, b], y: [c, d] });
//         r.prepare(); r.axes(); r.trace(points, …);
// prepare() ajuste le canevas à sa taille affichée et efface ; il faut
// l'appeler au début de chaque dessin.

import { ajusteCanevas } from './canevas.js';
import { etiquettesAxe } from './format.js';
import { couleurs } from './theme.js';

// Graduations régulières « rondes » couvrant [a, b], une tous les `espacement` px
// environ ; aucune si l'intervalle est vide ou à l'envers.
export function graduations(a, b, longueurPx, espacement = 55) {
  if (!(b > a)) return [];
  const n = Math.max(2, Math.floor(longueurPx / espacement));
  const brut = (b - a) / n;
  const p = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 5, 10].map((k) => k * p).find((v) => v >= brut - 1e-12);
  const debut = Math.ceil(a / pas - 1e-9) * pas;
  const valeurs = [];
  for (let v = debut; v <= b + pas * 1e-9; v += pas) valeurs.push(Math.abs(v) < pas * 1e-9 ? 0 : v);
  return valeurs;
}

// Écrit le nom d'un axe, en italique comme une variable. Un nom peut aussi être
// une liste de segments [texte, italique] pour mêler romain et italique, comme
// \mathrm{tr}\,A : [['tr ', false], ['A', true]].
const FAMILLE_NOM = "'Latin Modern Roman', 'CMU Serif', Georgia, serif";

function ecritNom(ctx, nom, x, y, align, fond = null) {
  const segments = typeof nom === 'string' ? [[nom, true]] : nom;
  const police = ([, italique]) => `${italique ? 'italic ' : ''}14px ${FAMILLE_NOM}`;
  let largeur = 0;
  for (const segment of segments) {
    ctx.font = police(segment);
    largeur += ctx.measureText(segment[0]).width;
  }
  let debut = align === 'right' ? x - largeur : x;
  if (fond) {
    // Fond sous le nom, pour qu'il se lise par-dessus les courbes.
    const couleur = ctx.fillStyle;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = fond;
    ctx.fillRect(debut - 3, y - 13, largeur + 6, 17);
    ctx.restore();
    ctx.fillStyle = couleur;
  }
  ctx.textAlign = 'left';
  for (const segment of segments) {
    ctx.font = police(segment);
    ctx.fillText(segment[0], debut, y);
    debut += ctx.measureText(segment[0]).width;
  }
}

export class Repere {
  // cadre : { x: [xmin, xmax], y: [ymin, ymax] } ; egal : même échelle sur les
  // deux axes (le cadre est alors élargi pour remplir le canevas).
  constructor(canvas, { x, y, egal = false, marges = { gauche: 34, bas: 22, haut: 8, droite: 8 } } = {}) {
    this.canvas = canvas;
    this.cadreDemande = { x: x.slice(), y: y.slice() };
    this.egal = egal;
    this.marges = marges;
    this.ctx = canvas.getContext('2d');
  }

  fixeCadre(x, y) {
    this.cadreDemande = { x: x.slice(), y: y.slice() };
  }

  // Taille, échelle et cadre effectif ; efface le canevas. Renvoie false si le
  // canevas est masqué (taille nulle).
  prepare() {
    const rect = ajusteCanevas(this.canvas, this.ctx);
    if (!rect) return false;
    this.rect = rect;
    this.col = couleurs();
    const m = this.marges;
    const L = rect.width - m.gauche - m.droite;
    const H = rect.height - m.haut - m.bas;
    let [x0, x1] = this.cadreDemande.x;
    let [y0, y1] = this.cadreDemande.y;
    if (this.egal) {
      const s = Math.min(L / (x1 - x0), H / (y1 - y0));
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      [x0, x1] = [cx - L / s / 2, cx + L / s / 2];
      [y0, y1] = [cy - H / s / 2, cy + H / s / 2];
    }
    this.cadre = { x: [x0, x1], y: [y0, y1] };
    this.sx = L / (x1 - x0);
    this.sy = H / (y1 - y0);
    this.L = L;
    this.H = H;
    return true;
  }

  X(x) {
    return this.marges.gauche + (x - this.cadre.x[0]) * this.sx;
  }

  Y(y) {
    return this.marges.haut + (this.cadre.y[1] - y) * this.sy;
  }

  // Coordonnées du monde d'un événement souris ou tactile.
  versMonde(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    return [this.cadre.x[0] + (px - this.marges.gauche) / this.sx, this.cadre.y[1] - (py - this.marges.haut) / this.sy];
  }

  // Le point (x, y) est-il dans le cadre ?
  contient(x, y) {
    const { x: [a, b], y: [c, d] } = this.cadre;
    return x >= a && x <= b && y >= c && y <= d;
  }

  // Limite le dessin à la zone du cadre (à encadrer par ctx.save/restore).
  decoupe() {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.rect(this.marges.gauche, this.marges.haut, this.L, this.H);
    ctx.clip();
  }

  // Grille, axes passant par 0 (ou au bord) et graduations ; noms des axes.
  // `nomsAuBord` : les noms des axes vont aux bords du cadre (en bas à droite,
  // en haut à gauche) sur un fond, au lieu de suivre les axes : utile quand un
  // axe est au bord du cadre, où son nom tomberait sur les courbes.
  // `ordonnees: false` : seul l'axe des abscisses est tracé et gradué (une
  // figure dont la hauteur ne porte pas de valeur, comme une droite réelle).
  // `dans` : { x: [a, b], y: [c, d] }, les axes et graduations restent dans ce
  // rectangle, plus petit que le cadre (un cadre élargi par `egal`) ; les
  // graduations de x vont alors juste sous l'axe, et non au bas du canevas.
  axes({ noms = ['', ''], grille = true, nomsAuBord = false, ordonnees = true, dans = null } = {}) {
    const ctx = this.ctx;
    const col = this.col;
    const { x: [a, b], y: [c, d] } = dans ?? this.cadre;
    const gx = graduations(a, b, dans ? this.sx * (b - a) : this.L);
    const gy = ordonnees ? graduations(c, d, dans ? this.sy * (d - c) : this.H, 40) : [];
    const [gauche, droite] = dans ? [this.X(a), this.X(b)] : [this.marges.gauche, this.marges.gauche + this.L];
    const [haut, bas] = dans ? [this.Y(d), this.Y(c)] : [this.marges.haut, this.marges.haut + this.H];
    ctx.save();
    ctx.lineWidth = 1;
    if (grille) {
      ctx.strokeStyle = col.grille;
      ctx.beginPath();
      for (const v of gx) {
        ctx.moveTo(this.X(v), haut);
        ctx.lineTo(this.X(v), bas);
      }
      for (const v of gy) {
        ctx.moveTo(gauche, this.Y(v));
        ctx.lineTo(droite, this.Y(v));
      }
      ctx.stroke();
    }
    const x0 = Math.min(Math.max(0, a), b);
    const y0 = Math.min(Math.max(0, c), d);
    ctx.strokeStyle = col.discret;
    ctx.beginPath();
    ctx.moveTo(gauche, this.Y(y0));
    ctx.lineTo(droite, this.Y(y0));
    if (ordonnees) {
      ctx.moveTo(this.X(x0), haut);
      ctx.lineTo(this.X(x0), bas);
    }
    ctx.stroke();
    ctx.fillStyle = col.discret;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    // Une graduation trop proche du bord droit serait coupée : on l'aligne sur le bord.
    const total = this.marges.gauche + this.L + this.marges.droite;
    etiquettesAxe(gx).forEach((t, i) => {
      const x = this.X(gx[i]);
      const coupee = x + ctx.measureText(t).width / 2 > total - 1;
      ctx.textAlign = coupee ? 'right' : 'center';
      ctx.fillText(t, coupee ? total - 1 : x, (dans ? this.Y(y0) : this.marges.haut + this.H) + 14);
    });
    ctx.textAlign = 'right';
    etiquettesAxe(gy).forEach((t, i) => ctx.fillText(t, this.marges.gauche - 4, this.Y(gy[i]) + 4));
    if (nomsAuBord) {
      if (noms[0]) ecritNom(ctx, noms[0], this.marges.gauche + this.L - 4, this.marges.haut + this.H - 6, 'right', col.fond);
      if (noms[1]) ecritNom(ctx, noms[1], this.marges.gauche + 6, this.marges.haut + 14, 'left', col.fond);
    } else {
      if (noms[0]) ecritNom(ctx, noms[0], droite - 2, this.Y(y0) - 5, 'right');
      if (noms[1]) ecritNom(ctx, noms[1], this.X(x0) + 5, haut + 12, 'left');
    }
    ctx.restore();
  }

  // Ligne brisée ; les points non finis interrompent la courbe.
  trace(points, { couleur = this.col.accent, largeur = 2, tirets = [], alpha = 1 } = {}) {
    const ctx = this.ctx;
    ctx.save();
    this.decoupe();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = couleur;
    ctx.lineWidth = largeur;
    ctx.lineJoin = 'round';
    ctx.setLineDash(tirets);
    ctx.beginPath();
    let leve = true;
    for (const [x, y] of points) {
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(y) > 1e6) {
        leve = true;
        continue;
      }
      if (leve) ctx.moveTo(this.X(x), this.Y(y));
      else ctx.lineTo(this.X(x), this.Y(y));
      leve = false;
    }
    ctx.stroke();
    ctx.restore();
  }

  // Segment infini d'équation passant par (x, y) dans la direction (dx, dy).
  droite(x, y, dx, dy, options = {}) {
    const R = 1e3 * Math.max(...this.cadre.x.map(Math.abs), ...this.cadre.y.map(Math.abs), 1);
    const n = Math.hypot(dx, dy) || 1;
    this.trace(
      [
        [x - (R * dx) / n, y - (R * dy) / n],
        [x + (R * dx) / n, y + (R * dy) / n],
      ],
      options,
    );
  }

  point(x, y, { rayon = 4, couleur = this.col.accent, plein = true } = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.X(x), this.Y(y), rayon, 0, 2 * Math.PI);
    if (plein) {
      ctx.fillStyle = couleur;
      ctx.fill();
    } else {
      ctx.fillStyle = this.col.fond;
      ctx.fill();
      ctx.strokeStyle = couleur;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Flèche en pixels : pointe en (x, y) du monde, direction (dx, dy) du monde.
  pointe(x, y, dx, dy, { couleur = this.col.accent, taille = 8 } = {}) {
    const ux = dx * this.sx;
    const uy = -dy * this.sy;
    const n = Math.hypot(ux, uy);
    if (n < 1e-12) return;
    const [tx, ty] = [ux / n, uy / n];
    const px = this.X(x);
    const py = this.Y(y);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = couleur;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - taille * tx - 0.5 * taille * ty, py - taille * ty + 0.5 * taille * tx);
    ctx.lineTo(px - taille * tx + 0.5 * taille * ty, py - taille * ty - 0.5 * taille * tx);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Champ de vecteurs normalisé : de petites flèches de longueur fixe sur une grille.
  champ(f, { n = 17, couleur = this.col.discret, longueur = 0.6 } = {}) {
    const ctx = this.ctx;
    const { x: [a, b], y: [c, d] } = this.cadre;
    const pasPx = this.L / n;
    const ny = Math.max(2, Math.round(this.H / pasPx));
    ctx.save();
    this.decoupe();
    ctx.strokeStyle = couleur;
    ctx.fillStyle = couleur;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < ny; j++) {
        const x = a + ((i + 0.5) / n) * (b - a);
        const y = c + ((j + 0.5) / ny) * (d - c);
        const [vx, vy] = f(x, y);
        const ux = vx * this.sx;
        const uy = -vy * this.sy;
        const nn = Math.hypot(ux, uy);
        if (!(nn > 1e-12)) continue;
        const l = (longueur * pasPx) / 2;
        const [tx, ty] = [(ux / nn) * l, (uy / nn) * l];
        const px = this.X(x);
        const py = this.Y(y);
        ctx.beginPath();
        ctx.moveTo(px - tx, py - ty);
        ctx.lineTo(px + tx, py + ty);
        ctx.stroke();
        const t = 4;
        const [ex, ey] = [tx / l, ty / l];
        ctx.beginPath();
        ctx.moveTo(px + tx, py + ty);
        ctx.lineTo(px + tx - t * ex - 0.5 * t * ey, py + ty - t * ey + 0.5 * t * ex);
        ctx.lineTo(px + tx - t * ex + 0.5 * t * ey, py + ty - t * ey - 0.5 * t * ex);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Texte au point (x, y) décalé de (dx, dy) px ; avec `fond`, sur un aplat de
  // la couleur du fond, pour rester lisible par-dessus les courbes.
  texte(x, y, chaine, { couleur = this.col.trait, align = 'left', dx = 0, dy = 0, police = '12px system-ui, sans-serif', fond = false } = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = police;
    ctx.textAlign = align;
    const [px, py] = [this.X(x) + dx, this.Y(y) + dy];
    if (fond) {
      const l = ctx.measureText(chaine).width;
      const gauche = align === 'center' ? px - l / 2 : align === 'right' ? px - l : px;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = this.col.fond;
      ctx.fillRect(gauche - 3, py - 12, l + 6, 16);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = couleur;
    ctx.fillText(chaine, px, py);
    ctx.restore();
  }

  // Ligne de niveau { f = c } par carrés marchants sur une grille n × n.
  isoligne(f, c, { n = 90, couleur = this.col.accent, largeur = 1.5, tirets = [] } = {}) {
    const { x: [a, b], y: [y0, y1] } = this.cadre;
    const dx = (b - a) / n;
    const dy = (y1 - y0) / n;
    const v = [];
    for (let i = 0; i <= n; i++) {
      v.push([]);
      for (let j = 0; j <= n; j++) v[i].push(f(a + i * dx, y0 + j * dy) - c);
    }
    const ctx = this.ctx;
    ctx.save();
    this.decoupe();
    ctx.strokeStyle = couleur;
    ctx.lineWidth = largeur;
    ctx.setLineDash(tirets);
    ctx.beginPath();
    // Point de passage sur l'arête entre deux sommets de valeurs de signes opposés.
    const coupe = (xa, ya, va, xb, yb, vb) => {
      const s = va / (va - vb);
      return [this.X(xa + s * (xb - xa)), this.Y(ya + s * (yb - ya))];
    };
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const [xa, xb, ya, yb] = [a + i * dx, a + (i + 1) * dx, y0 + j * dy, y0 + (j + 1) * dy];
        const s = [v[i][j], v[i + 1][j], v[i + 1][j + 1], v[i][j + 1]];
        const coins = [
          [xa, ya],
          [xb, ya],
          [xb, yb],
          [xa, yb],
        ];
        const pts = [];
        for (let k = 0; k < 4; k++) {
          const l = (k + 1) % 4;
          if (s[k] < 0 !== s[l] < 0) pts.push(coupe(...coins[k], s[k], ...coins[l], s[l]));
        }
        for (let k = 0; k + 1 < pts.length; k += 2) {
          ctx.moveTo(...pts[k]);
          ctx.lineTo(...pts[k + 1]);
        }
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // Remplit la région { (x, y) : test(x, y) } échantillonnée sur une grille.
  region(test, { couleur, pas = 4, alpha = 1 } = {}) {
    const ctx = this.ctx;
    ctx.save();
    this.decoupe();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = couleur;
    for (let px = 0; px < this.L; px += pas) {
      for (let py = 0; py < this.H; py += pas) {
        const x = this.cadre.x[0] + (px + pas / 2) / this.sx;
        const y = this.cadre.y[1] - (py + pas / 2) / this.sy;
        if (test(x, y)) ctx.fillRect(this.marges.gauche + px, this.marges.haut + py, pas, pas);
      }
    }
    ctx.restore();
  }
}
