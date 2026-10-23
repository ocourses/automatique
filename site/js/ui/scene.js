// Scène physique : dessin de l'exemple en coordonnées du monde (y vers le haut)
// et réglage de la condition initiale à la souris.

import { couleurs } from './theme.js';

const FENETRE_LANCER = 0.08; // s, durée du geste prise en compte au lâcher
const OPACITE_FANTOME = 0.28;

export class Scene {
  // rappels : { base(), saisie(), relache(x), vitesseLecture() } ; base() donne
  // l'état dont on part quand on saisit l'objet.
  constructor(canvas, modele, sim, rappels) {
    this.canvas = canvas;
    this.modele = modele;
    this.sim = sim;
    this.rappels = rappels;
    this.ctx = canvas.getContext('2d');
    this.saisi = false;
    this.prise = null;
    this.geste = [];
    this.avecFantome = false;
    this.ajusteProportions();
    new ResizeObserver(() => this.dessine()).observe(canvas);
    if (modele.souris) this.ecouteSouris();
  }

  // Proportions de la vue de l'exemple, lues par la feuille de style quand la
  // scène suit le flux de la page ; sur grand écran, elle remplit sa case et
  // le dessin est centré.
  ajusteProportions() {
    const v = this.modele.vue(this.sim.p);
    this.canvas.style.setProperty('--proportions', `${v.xmax - v.xmin} / ${v.ymax - v.ymin}`);
  }

  geometrie() {
    const rect = this.canvas.getBoundingClientRect();
    const v = this.modele.vue(this.sim.p);
    const s = Math.min(rect.width / (v.xmax - v.xmin), rect.height / (v.ymax - v.ymin));
    return { rect, s, cx: (v.xmin + v.xmax) / 2, cy: (v.ymin + v.ymax) / 2 };
  }

  versMonde(ev) {
    const { rect, s, cx, cy } = this.geometrie();
    return {
      x: (ev.clientX - rect.left - rect.width / 2) / s + cx,
      y: -(ev.clientY - rect.top - rect.height / 2) / s + cy,
    };
  }

  ecouteSouris() {
    const c = this.canvas;
    const souris = this.modele.souris;
    c.classList.add('saisissable');
    c.addEventListener('pointerdown', (ev) => {
      this.saisi = true;
      // On part de l'état courant, ou de la condition initiale si la simulation
      // s'est emballée : les composantes que la souris ne règle pas (position,
      // vitesses) seraient sinon absurdes.
      this.sim.x = this.rappels.base().slice();
      this.prise = souris.saisit ? souris.saisit(this.versMonde(ev), this.sim.x, this.sim.p) : null;
      c.setPointerCapture(ev.pointerId);
      c.classList.add('saisi');
      this.rappels.saisie();
      this.suit(ev);
    });
    c.addEventListener('pointermove', (ev) => {
      if (this.saisi) this.suit(ev);
    });
    const fin = (ev) => {
      if (!this.saisi) return;
      this.saisi = false;
      c.classList.remove('saisi');
      this.rappels.relache(this.etatLance(ev.timeStamp));
    };
    c.addEventListener('pointerup', fin);
    c.addEventListener('pointercancel', fin);
  }

  suit(ev) {
    const x = this.modele.souris.deplace(this.versMonde(ev), this.sim.x, this.sim.p, this.prise);
    this.sim.x = x;
    this.geste.push({ t: ev.timeStamp / 1000, x });
    while (this.geste.length > 2 && this.geste[0].t < ev.timeStamp / 1000 - 0.5) this.geste.shift();
    this.dessine();
  }

  // État au lâcher : la vitesse du geste, mesurée sur les dernières
  // millisecondes, donne les composantes de vitesse. Elle est rapportée au
  // temps simulé pour que le mouvement continue à la même allure à l'écran.
  etatLance(tempsMs) {
    const x = this.sim.x.slice();
    const t1 = tempsMs / 1000;
    const recents = this.geste.filter((g) => g.t >= t1 - FENETRE_LANCER);
    this.geste = [];
    if (recents.length < 2) return x;
    const a = recents[0];
    const b = recents[recents.length - 1];
    const dt = b.t - a.t;
    // Un geste arrêté avant le lâcher ne lance pas l'objet.
    if (dt < 1e-3 || t1 - b.t > FENETRE_LANCER) return x;
    const vitesse = this.rappels.vitesseLecture();
    for (const [i, j] of this.modele.souris.vitesses) x[j] = (b.x[i] - a.x[i]) / dt / vitesse;
    return x;
  }

  outils(px, col, fantome) {
    const ctx = this.ctx;
    const d = this.sim.perturbationEn(this.sim.t);
    // Pointe de flèche en (ex, ey), dans la direction unitaire (tx, ty).
    const pointe = (ex, ey, tx, ty) => {
      const L = 10 * px;
      ctx.beginPath();
      ctx.moveTo(ex + tx * L, ey + ty * L);
      ctx.lineTo(ex - ty * L * 0.6, ey + tx * L * 0.6);
      ctx.lineTo(ex + ty * L * 0.6, ey - tx * L * 0.6);
      ctx.closePath();
      ctx.fill();
    };
    return {
      px,
      couleurs: col,
      fantome,
      d,
      pointilles(x0, y0, x1, y1) {
        ctx.save();
        ctx.setLineDash([6 * px, 6 * px]);
        ctx.strokeStyle = col.discret;
        ctx.lineWidth = 1 * px;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.restore();
      },
      // Flèche de (x, y) à (x + dx, y + dy) ; rien pour le fantôme.
      fleche(x, y, dx, dy, couleur = col.accent) {
        const L = Math.hypot(dx, dy);
        if (fantome || L < 4 * px) return;
        ctx.save();
        ctx.strokeStyle = couleur;
        ctx.fillStyle = couleur;
        ctx.lineWidth = 3 * px;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        pointe(x + dx, y + dy, dx / L, dy / L);
        ctx.restore();
      },
      // Arc fléché centré à l'origine : un quart de tour pour |valeur| = echelle,
      // borné à 1,6 π ; valeur > 0 : sens horaire à l'écran. Rien pour le fantôme.
      arcCouple(valeur, echelle, rayon, couleur = col.accent) {
        const ouverture = Math.min((Math.abs(valeur) / echelle) * (Math.PI / 2), 1.6 * Math.PI);
        if (fantome || ouverture < 0.05) return;
        const sens = Math.sign(valeur);
        const debut = Math.PI / 2;
        const fin = debut - sens * ouverture;
        ctx.save();
        ctx.strokeStyle = couleur;
        ctx.fillStyle = couleur;
        ctx.lineWidth = 3 * px;
        ctx.beginPath();
        ctx.arc(0, 0, rayon, debut, fin, sens > 0);
        ctx.stroke();
        // Pointe tangente à l'arc.
        pointe(rayon * Math.cos(fin), rayon * Math.sin(fin), sens * Math.sin(fin), -sens * Math.cos(fin));
        ctx.restore();
      },
    };
  }

  dessine() {
    const { rect, s, cx, cy } = this.geometrie();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const ctx = this.ctx;
    const col = couleurs();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(dpr * s, 0, 0, -dpr * s, dpr * (rect.width / 2 - s * cx), dpr * (rect.height / 2 + s * cy));
    const px = 1 / s;
    const sim = this.sim;
    // Fantôme du linéarisé bouclé, en transparence et sans flèches.
    const xf = sim.xFantome;
    if (this.avecFantome && !this.saisi && xf.every(Number.isFinite)) {
      ctx.save();
      ctx.globalAlpha = OPACITE_FANTOME;
      this.modele.draw(ctx, xf, sim.commande(), sim.p, this.outils(px, col, true));
      ctx.restore();
    }
    this.modele.draw(ctx, sim.x, sim.commande(), sim.p, this.outils(px, col, false));
  }
}
