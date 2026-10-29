// Plan complexe : valeurs propres de A (○), du bouclé (×) et, s'il y a un
// observateur, de A − LC (◇), demi-plan Re < 0 grisé. Les valeurs propres du
// bouclé et de l'observateur se déplacent à la souris lorsque le placement de
// pôles est possible. Pour l'observateur, on dessine aussi le disque
// |λ + 1/h| < 1/h : une valeur propre qui s'y trouve est stable pour Euler
// explicite de pas h (|1 + hλ| < 1).
//
// Les axes Re et Im ont chacun leur échelle, qui suit les valeurs propres : elle
// s'élargit quand l'une d'elles approche du bord, et se resserre quand toutes
// sont proches de l'axe. Cela se fait aussi pendant un déplacement, avant de
// lâcher la souris, et l'échelle reste ensuite telle quelle (pas de saut).

import { deplaceValeurPropre, nettoieSpectre } from '../core/poles.js';
import { cacheInfobulle, infobulleSurPoint } from '../../socle/js/ui/infobulle.js';
import { couleurs } from '../../socle/js/ui/theme.js';

const RAYON_SAISIE = 12; // px
const AIMANTATION = 8; // px
const RAYON_MIN = 1;
// Une valeur propre à plus de 85 % du demi-axe l'élargit ; si toutes sont à moins
// de 35 %, il se resserre. Pendant un déplacement, il change d'au plus 12 % à
// chaque mouvement de souris, pour un zoom progressif.
const TROP_PRES = 0.85;
const TROP_LOIN = 0.35;
const VISE = 0.6;
const PAS_ZOOM = 0.12;

function pasGraduation(R) {
  const brut = R / 3;
  const p = 10 ** Math.floor(Math.log10(brut));
  return [1, 2, 5, 10].map((k) => k * p).find((v) => v >= brut);
}

export class PlanComplexe {
  // rappels : { mode(), explique(), deplace(vp), axeDe(vp), deplaceReel(axe, re),
  //             modifiableObs(), deplaceObs(vp) }
  //   - mode() : comment se déplacent les valeurs propres du bouclé : 'complet'
  //     (n'importe où, avec leur conjuguée), 'reel' (sur l'axe réel seulement,
  //     chacune indépendamment des autres) ou 'aucun' ;
  //   - explique(mode) : le texte de la bulle d'aide pour 'reel' et 'aucun' ;
  //   - axeDe(vp) et deplaceReel(axe, re) : en mode 'reel', l'axe (le gain) qui
  //     porte la valeur propre vp, et son nouveau placement.
  // rayon : demi-largeur fixe du plan, pour un système raide dont un pôle très rapide
  // écraserait les autres ; les valeurs propres hors cadre sont ramenées au bord.
  constructor(canvas, rappels, rayon = null) {
    this.canvas = canvas;
    this.rappels = rappels;
    this.rayonFixe = rayon;
    this.Rx = rayon;
    this.Ry = rayon;
    this.vpA = [];
    this.vpABK = [];
    this.vpObs = null;
    this.h = null;
    this.saisie = null; // { jeu, i, vp0 } pendant un déplacement
    new ResizeObserver(() => this.dessine()).observe(canvas);
    this.ecouteSouris();
  }

  // vpObs et h : valeurs propres de A − LC et pas d'Euler, ou null sans observateur.
  actualise(vpA, vpABK, vpObs = null, h = null) {
    this.vpA = vpA;
    this.vpABK = vpABK;
    this.vpObs = vpObs;
    this.h = h;
    // Pendant un déplacement, l'échelle est réglée par le geste lui-même.
    if (!this.saisie) this.ajuste();
    this.dessine();
  }

  // Met chaque demi-axe à l'échelle des valeurs propres (voir l'en-tête).
  // `limite` borne la variation relative d'un coup. Vrai si l'échelle a changé.
  ajuste(limite = Infinity) {
    if (this.rayonFixe) return false;
    const toutes = [...this.vpA, ...this.vpABK, ...(this.vpObs ?? [])];
    let change = false;
    for (const [cle, coord] of [['Rx', 're'], ['Ry', 'im']]) {
      const m = Math.max(0, ...toutes.map((z) => Math.abs(z[coord])));
      const avant = this[cle];
      let R = avant;
      if (R == null) R = 1.25 * Math.max(RAYON_MIN, m);
      else if (m / R > TROP_PRES) R *= Math.min(m / R / TROP_PRES, 1 + limite);
      else if (m / R < TROP_LOIN) R = Math.max(RAYON_MIN, R * Math.max(m / R / VISE, 1 - limite));
      if (R !== avant) change = true;
      this[cle] = R;
    }
    return change;
  }

  // Géométrie du plan : chaque axe a sa propre échelle (pixels par unité).
  geometrie() {
    const rect = this.canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const Rx = this.Rx ?? 1;
    const Ry = this.Ry ?? 1;
    const sx = W / (2 * Rx);
    const sy = H / (2 * Ry);
    return { rect, W, H, Rx, Ry, sx, sy, X: (re) => W / 2 + re * sx, Y: (im) => H / 2 - im * sy };
  }

  // Position affichée d'une valeur propre. Avec un rayon fixe, elle est ramenée au
  // bord du cadre si elle en sort (`hors` vaut alors true) ; la direction vers
  // la vraie valeur est conservée. Sinon l'échelle suit les valeurs propres.
  affichee(z, { Rx, Ry }) {
    const k = Math.max(Math.abs(z.re) / (0.94 * Rx), Math.abs(z.im) / (0.94 * Ry));
    return this.rayonFixe && k > 1 ? { re: z.re / k, im: z.im / k, hors: true } : { re: z.re, im: z.im, hors: false };
  }

  versComplexe(ev) {
    const { rect, W, H, sx, sy } = this.geometrie();
    return { re: (ev.clientX - rect.left - W / 2) / sx, im: -(ev.clientY - rect.top - H / 2) / sy };
  }

  // Valeur propre modifiable sous la souris : { jeu: 'bf' | 'obs', i } ou null.
  // Si deux sont confondues, on en prend une, l'autre se déplace ensuite.
  sousLaSouris(ev) {
    const g = this.geometrie();
    const { rect, X, Y } = g;
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    let meilleur = null;
    let d = RAYON_SAISIE;
    const cherche = (jeu, vp) => {
      vp.forEach((v, i) => {
        const z = this.affichee(v, g);
        const dk = Math.hypot(X(z.re) - px, Y(z.im) - py);
        if (dk <= d) {
          d = dk;
          meilleur = { jeu, i };
        }
      });
    };
    if (this.rappels.mode() !== 'aucun') cherche('bf', this.vpABK);
    if (this.vpObs && this.rappels.modifiableObs?.()) cherche('obs', this.vpObs);
    return meilleur;
  }

  // Une valeur propre du bouclé est-elle sous la souris, même si elle est fixe ?
  boucleSousLaSouris(ev) {
    const g = this.geometrie();
    const px = ev.clientX - g.rect.left;
    const py = ev.clientY - g.rect.top;
    return this.vpABK.some((v) => {
      const z = this.affichee(v, g);
      return Math.hypot(g.X(z.re) - px, g.Y(z.im) - py) <= RAYON_SAISIE;
    });
  }

  // Bulle d'aide sur une valeur propre qui ne se déplace pas (ou pas partout).
  aide(ev, mode) {
    infobulleSurPoint(ev.clientX, ev.clientY, this.rappels.explique(mode));
  }

  ecouteSouris() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (ev) => {
      const prise = this.sousLaSouris(ev);
      if (!prise) {
        if (this.rappels.mode() === 'aucun' && this.boucleSousLaSouris(ev)) this.aide(ev, 'aucun');
        return;
      }
      const vp = prise.jeu === 'bf' ? this.vpABK : this.vpObs;
      const axe = prise.jeu === 'bf' && this.rappels.mode() === 'reel' ? this.rappels.axeDe(vp[prise.i]) : null;
      this.saisie = { ...prise, vp0: nettoieSpectre(vp), axe, aideMontree: false };
      c.setPointerCapture(ev.pointerId);
      c.classList.add('saisi');
      ev.preventDefault();
    });
    c.addEventListener('pointermove', (ev) => {
      if (!this.saisie) {
        const mode = this.rappels.mode();
        const sur = this.boucleSousLaSouris(ev);
        c.classList.toggle('survol', mode !== 'aucun' && this.sousLaSouris(ev) !== null);
        c.classList.toggle('interdit', mode === 'aucun' && sur);
        // Survol d'une valeur propre qui ne se déplace pas, ou pas partout : la raison.
        if (sur && mode !== 'complet') this.aide(ev, mode);
        else cacheInfobulle();
        return;
      }
      const { jeu, i, vp0, axe } = this.saisie;
      if (axe !== null && jeu === 'bf') {
        // Axe réel seulement : la partie imaginaire est ignorée ; si la souris
        // s'en écarte nettement, la bulle dit pourquoi.
        const z = this.versComplexe(ev);
        const { sx, sy } = this.geometrie();
        const re = Math.abs(z.re) < AIMANTATION / sx ? 0 : z.re;
        if (Math.abs(z.im) * sy > 14 && !this.saisie.aideMontree) {
          this.saisie.aideMontree = true;
          this.aide(ev, 'reel');
        }
        this.rappels.deplaceReel(axe, re);
        return;
      }
      const nouveau = () => {
        const { sx, sy } = this.geometrie();
        return deplaceValeurPropre(vp0, i, this.versComplexe(ev), { re: AIMANTATION / sx, im: AIMANTATION / sy });
      };
      // L'échelle s'adapte au point d'arrivée, puis le point est recalculé avec la
      // nouvelle échelle : il reste sous la souris.
      let vp = nouveau();
      const sauve = jeu === 'bf' ? this.vpABK : this.vpObs;
      if (jeu === 'bf') this.vpABK = vp;
      else this.vpObs = vp;
      const changee = this.ajuste(PAS_ZOOM);
      if (jeu === 'bf') this.vpABK = sauve;
      else this.vpObs = sauve;
      if (changee) vp = nouveau();
      if (jeu === 'bf') this.rappels.deplace(vp);
      else this.rappels.deplaceObs(vp);
    });
    const fin = () => {
      if (!this.saisie) return;
      this.saisie = null;
      c.classList.remove('saisi');
      cacheInfobulle();
      this.dessine();
    };
    c.addEventListener('pointerup', fin);
    c.addEventListener('pointercancel', fin);
    c.addEventListener('pointerleave', () => {
      cacheInfobulle();
      c.classList.remove('interdit');
    });
  }

  dessine() {
    const canvas = this.canvas;
    const g = this.geometrie();
    const { W, H, Rx, Ry, sx, sy, X, Y } = g;
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
      ctx.ellipse(X(-1 / this.h), Y(0), sx / this.h, sy / this.h, 0, 0, 2 * Math.PI);
      ctx.fillStyle = col.observateurZone;
      ctx.fill();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = col.observateur;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // Grille et axes : chaque axe a son pas de graduation.
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = col.discret;
    ctx.strokeStyle = col.grille;
    ctx.lineWidth = 1;
    const format = (v) => String(Number(v.toPrecision(3))).replace('.', ',').replace('-', '−');
    const pasX = pasGraduation(Rx);
    const pasY = pasGraduation(Ry);
    for (let k = -Math.ceil(Rx / pasX); k <= Math.ceil(Rx / pasX); k++) {
      if (k === 0) continue;
      ctx.beginPath();
      ctx.moveTo(X(k * pasX), 0);
      ctx.lineTo(X(k * pasX), H);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(format(k * pasX), X(k * pasX), H / 2 + 14);
    }
    for (let k = -Math.ceil(Ry / pasY); k <= Math.ceil(Ry / pasY); k++) {
      if (k === 0) continue;
      ctx.beginPath();
      ctx.moveTo(0, Y(k * pasY));
      ctx.lineTo(W, Y(k * pasY));
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillText(format(k * pasY), W / 2 + 4, Y(k * pasY) + 4);
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
      const z = this.affichee(v, g);
      ctx.beginPath();
      ctx.arc(X(z.re), Y(z.im), 6, 0, 2 * Math.PI);
      ctx.stroke();
      etiquette(z, v, col.discret);
    }
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = col.accent;
    for (const v of this.vpABK) {
      const z = this.affichee(v, g);
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
        const z = this.affichee(v, g);
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
