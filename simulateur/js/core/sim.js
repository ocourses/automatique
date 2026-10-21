// Boucle de simulation : système non linéaire, commande, perturbation, bruit
// de mesure et « fantôme » du linéarisé bouclé.
//
// Le système réel est intégré par RK4 à pas fin fixe, choisi une fois pour
// toutes à partir du spectre du bouclé (il n'est pas réglable dans l'interface).
//
// Deux modes de contrôleur :
//   - 'gains' : u = u_e + K(x − x_e) ;
//   - 'loi'   : u donné par une expression (core/expr.js) en x1…xn, y, t, les
//               primitives ix1…ixn de x_i − x_{e,i} et iy de y − y_e, les
//               composantes de x_e, u_e et les paramètres du modèle.
// La commande appliquée au système est sat(u) + d(t).

import { rk4 } from './ode.js';
import { compile } from './expr.js';
import { ackermann } from './poles.js';
import { inverse, jacobienne, linearise, matadd, matmul, valeursPropres } from './linalg.js';

const PAS_MAX = 1e-3; // s
const PERIODE_ECHANTILLON = 0.02; // s, pour l'historique et les courbes
const PERIODE_BRUIT = 0.01; // s, le bruit de mesure est tenu constant sur cette durée
const DUREE_HISTORIQUE = 60; // s

function gaussienne() {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

export class Simulation {
  constructor(modele) {
    this.modele = modele;
    this.n = modele.etats.length;
    this.m = modele.commandes.length;
    this.p = Object.fromEntries(modele.parametres.map((q) => [q.nom, q.valeur]));
    this.K = modele.gains.map((ligne) => ligne.slice());
    this.mode = 'gains';
    this.loiTexte = modele.loi ?? '';
    this.loi = null;
    this.erreurLoi = null;
    this.saturation = { active: false, umax: modele.umax ?? 10 };
    this.perturbation = { type: 'aucune', e: modele.perturbation ?? 1, debut: 1, duree: 1 };
    this.sigma = 0;
    this.signeChoc = 1;
    this.compileLoi();
    this.metAJour();
    if (modele.polesParDefaut) {
      this.K = ackermann(this.A, this.B, modele.polesParDefaut.map((re) => ({ re, im: 0 })));
      this.metAJour();
    }
    this.reinitialise(modele.x0);
  }

  // ---- Réglages -------------------------------------------------------------

  // Indice de la sortie mesurée y = x_i.
  get sortie() {
    return this.modele.sortie ?? 0;
  }

  variablesLoi() {
    const n = this.n;
    const idx = Array.from({ length: n }, (_, i) => i + 1);
    return [
      ...idx.map((i) => `x${i}`),
      'y',
      't',
      ...idx.map((i) => `ix${i}`),
      'iy',
      ...idx.map((i) => `xe${i}`),
      'ue',
      ...Object.keys(this.p),
    ];
  }

  // Compile la loi libre ; en cas d'erreur, la dernière loi valide est gardée.
  compileLoi() {
    try {
      this.loi = compile(this.loiTexte, this.variablesLoi());
      this.erreurLoi = null;
    } catch (e) {
      this.erreurLoi = e.message;
    }
  }

  fixeLoi(texte) {
    this.loiTexte = texte;
    this.compileLoi();
    this.metAJour();
    return this.erreurLoi;
  }

  fixeMode(mode) {
    this.mode = mode;
    this.metAJour();
  }

  fixeParametre(nom, valeur) {
    this.p[nom] = valeur;
    this.metAJour();
  }

  fixeGain(i, j, valeur) {
    this.K[i][j] = valeur;
    this.metAJour();
  }

  fixeGains(K) {
    this.K = K.map((ligne) => ligne.slice());
    this.metAJour();
  }

  // Le mode loi libre ne s'applique qu'aux systèmes à une commande.
  get loiActive() {
    return this.mode === 'loi' && this.loi !== null && this.m === 1;
  }

  // Indices des primitives utilisées par la loi : 0…n−1 pour ix1…ixn, n pour iy.
  integralesUtilisees() {
    if (!this.loiActive) return [];
    const noms = [...Array.from({ length: this.n }, (_, i) => `ix${i + 1}`), 'iy'];
    return noms.map((nom, k) => (this.loi.variables.has(nom) ? k : -1)).filter((k) => k >= 0);
  }

  // ---- Analyse --------------------------------------------------------------

  // Recalcule équilibre, linéarisé, jacobienne du bouclé et pas d'intégration.
  metAJour() {
    const { xe, ue } = this.modele.equilibre(this.p);
    this.xe = xe;
    this.ue = ue;
    const { A, B } = linearise(this.modele.f, xe, ue, this.p);
    this.A = A;
    this.B = B;
    this.vpA = valeursPropres(A);
    this.ABK = matadd(A, matmul(B, this.K));

    // Jacobienne du bouclé en (x_e, primitives nulles), sans saturation ni
    // bruit ni perturbation. En mode loi libre, l'état est augmenté des
    // primitives utilisées par la loi.
    this.integrales = this.integralesUtilisees();
    if (this.loiActive) {
      const n = this.n;
      const F = (w) => {
        const x = w.slice(0, n);
        const I = new Array(n + 1).fill(0);
        this.integrales.forEach((k, r) => (I[k] = w[n + r]));
        const u = this.commandeBrute(0, x, I);
        return [...this.modele.f(x, u, this.p), ...this.integrales.map((k) => this.ecart(x, k))];
      };
      const w0 = [...xe, ...this.integrales.map(() => 0)];
      this.Jbf = jacobienne(F, w0);
      // x_e est-il un équilibre du bouclé ? (résidu de f en x_e)
      const residu = this.modele.f(xe, this.commandeBrute(0, xe, new Array(n + 1).fill(0)), this.p);
      this.equilibreBoucle = residu.every((r) => Math.abs(r) < 1e-6);
    } else {
      this.Jbf = this.ABK;
      this.equilibreBoucle = true;
    }
    this.vpBF = valeursPropres(this.Jbf);
    this.Bfantome = [...B, ...this.integrales.map(() => new Array(this.m).fill(0))];
    // Changement de dimension (primitives ajoutées ou retirées) : le fantôme
    // repart de l'état courant.
    if (this.fantome && this.fantome.length !== this.Jbf.length) {
      this.fantome = [...this.x.map((v, i) => v - xe[i]), ...this.integrales.map(() => 0)];
    }

    // Pas fin : au plus 1 ms et assez petit devant le spectre du bouclé
    // pour que RK4 reste stable même pour des gains extrêmes.
    const rayon = Math.max(1, ...this.vpBF.map((z) => Math.hypot(z.re, z.im)));
    this.pas = Math.min(PAS_MAX, 0.5 / rayon);
  }

  // Équilibre décalé par une perturbation constante e, pour le retour d'état
  // linéarisé : (A + BK)(x∞ − x_e) + B e = 0 (TD2). null si A + BK est singulière.
  equilibrePerturbe() {
    if (this.mode !== 'gains' || this.perturbation.type !== 'constante') return null;
    const inv = inverse(this.ABK);
    if (!inv) return null;
    const Be = this.B.map((ligne) => ligne.reduce((s, b) => s + b * this.perturbation.e, 0));
    return this.xe.map((xei, i) => xei - inv[i].reduce((s, v, j) => s + v * Be[j], 0));
  }

  // ---- Commande -------------------------------------------------------------

  // Écart intégré par la primitive k : x_k − x_{e,k} (k < n) ou y − y_e (k = n).
  ecart(x, k) {
    const i = k < this.n ? k : this.sortie;
    return x[i] - this.xe[i];
  }

  // Commande avant saturation, à partir de la mesure xm et des primitives I.
  commandeBrute(t, xm, I) {
    if (!this.loiActive) {
      return this.ue.map((uei, i) => this.K[i].reduce((s, kij, j) => s + kij * (xm[j] - this.xe[j]), uei));
    }
    const env = { ...this.p, t, y: xm[this.sortie], ue: this.ue[0], iy: I[this.n] };
    xm.forEach((v, i) => {
      env[`x${i + 1}`] = v;
      env[`ix${i + 1}`] = I[i];
      env[`xe${i + 1}`] = this.xe[i];
    });
    return [this.loi.evalue(env)];
  }

  sature(u) {
    if (!this.saturation.active) return u;
    const M = this.saturation.umax;
    return u.map((v) => Math.min(Math.max(v, -M), M));
  }

  // Commande effectivement appliquée (hors perturbation) pour l'état courant.
  commande(x = this.x) {
    const xm = x.map((v, i) => v + this.bruit[i]);
    return this.sature(this.commandeBrute(this.t, xm, this.I));
  }

  perturbationEn(t) {
    const P = this.perturbation;
    const actif = P.type === 'constante' || (P.type === 'creneau' && t >= P.debut && t < P.debut + P.duree);
    return new Array(this.m).fill(actif ? P.e : 0);
  }

  // ---- Trajectoire ----------------------------------------------------------

  // Démarre une nouvelle trajectoire depuis x0 : l'historique repart de t = 0.
  reinitialise(x0) {
    this.t = 0;
    this.x = x0.slice();
    this.I = new Array(this.n + 1).fill(0);
    this.fantome = [...x0.map((v, i) => v - this.xe[i]), ...this.integrales.map(() => 0)];
    this.diverge = false;
    this.bruit = new Array(this.n).fill(0);
    this.tireBruit();
    this.historique = {
      t: [],
      x: this.x.map(() => []),
      u: this.ue.map(() => []),
      d: this.ue.map(() => []),
      fantome: this.x.map(() => []),
    };
    this.prochainEchantillon = 0;
    this.enregistre();
  }

  tireBruit() {
    this.bruit = this.bruit.map(() => this.sigma * gaussienne());
    this.prochainBruit = this.t + PERIODE_BRUIT;
  }

  // État du fantôme, dans les coordonnées de x.
  get xFantome() {
    return this.xe.map((xei, i) => xei + this.fantome[i]);
  }

  // Choc : impulsion de vitesse, de signe alterné, sur le système et le fantôme.
  choc() {
    const dv = this.modele.choc ?? new Array(this.n).fill(0);
    this.x = this.x.map((v, i) => v + this.signeChoc * dv[i]);
    this.fantome = this.fantome.map((v, i) => (i < this.n ? v + this.signeChoc * dv[i] : v));
    this.signeChoc = -this.signeChoc;
  }

  enregistre() {
    const h = this.historique;
    h.t.push(this.t);
    this.x.forEach((xi, i) => h.x[i].push(xi));
    this.commande().forEach((ui, i) => h.u[i].push(ui));
    this.perturbationEn(this.t).forEach((di, i) => h.d[i].push(di));
    this.xFantome.forEach((xi, i) => h.fantome[i].push(Number.isFinite(xi) ? xi : null));
    const nMax = Math.round(DUREE_HISTORIQUE / PERIODE_ECHANTILLON);
    if (h.t.length > nMax) {
      h.t.shift();
      for (const serie of [...h.x, ...h.u, ...h.d, ...h.fantome]) serie.shift();
    }
    this.prochainEchantillon += PERIODE_ECHANTILLON;
  }

  // Avance la simulation de `duree` secondes de temps simulé.
  avance(duree) {
    if (this.diverge) return;
    const n = this.n;
    const nI = this.I.length;
    // État intégré : (x, I). La mesure bruitée est tenue constante sur le pas.
    const F = (t, s) => {
      const x = s.slice(0, n);
      const I = s.slice(n);
      const xm = x.map((v, i) => v + this.bruit[i]);
      const u = this.sature(this.commandeBrute(t, xm, I));
      const d = this.perturbationEn(t);
      const dx = this.modele.f(x, u.map((ui, i) => ui + d[i]), this.p);
      const dI = Array.from({ length: nI }, (_, k) => this.ecart(xm, k));
      return [...dx, ...dI];
    };
    // Fantôme : δẇ = J δw + B_f d(t).
    const G = (t, w) => {
      const d = this.perturbationEn(t);
      return this.Jbf.map((ligne, i) =>
        ligne.reduce((s, jij, j) => s + jij * w[j], 0) + this.Bfantome[i].reduce((s, b, j) => s + b * d[j], 0),
      );
    };
    const tFin = this.t + duree;
    while (this.t < tFin - 1e-12) {
      const h = Math.min(this.pas, tFin - this.t, this.prochainEchantillon - this.t, this.prochainBruit - this.t);
      const s = rk4(F, this.t, [...this.x, ...this.I], h);
      this.x = s.slice(0, n);
      this.I = s.slice(n);
      this.fantome = rk4(G, this.t, this.fantome, h);
      this.t += h;
      if (!this.x.every((xi) => Number.isFinite(xi) && Math.abs(xi) < 1e6)) {
        this.diverge = true;
        return;
      }
      // Le fantôme peut diverger (bouclé linéaire instable) : on le borne.
      if (!this.fantome.every((v) => Number.isFinite(v) && Math.abs(v) < 1e6)) {
        this.fantome = this.fantome.map(() => NaN);
      }
      if (this.t >= this.prochainBruit - 1e-12) this.tireBruit();
      if (this.t >= this.prochainEchantillon - 1e-12) this.enregistre();
    }
  }
}
