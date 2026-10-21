// Boucle de simulation : système non linéaire bouclé par u = u_e + K(x − x_e).
//
// Le système réel est intégré par RK4 à pas fin fixe, choisi une fois pour
// toutes à partir du spectre du bouclé (il n'est pas réglable dans l'interface).

import { rk4 } from './ode.js';
import { linearise, matadd, matmul, valeursPropres } from './linalg.js';

const PAS_MAX = 1e-3; // s
const PERIODE_ECHANTILLON = 0.02; // s, pour l'historique et les courbes
const DUREE_HISTORIQUE = 60; // s

export class Simulation {
  constructor(modele) {
    this.modele = modele;
    this.p = Object.fromEntries(modele.parametres.map((q) => [q.nom, q.valeur]));
    this.K = modele.gains.map((ligne) => ligne.slice());
    this.metAJour();
    this.reinitialise(modele.x0);
  }

  // Recalcule équilibre, linéarisé et pas d'intégration.
  metAJour() {
    const { xe, ue } = this.modele.equilibre(this.p);
    this.xe = xe;
    this.ue = ue;
    const { A, B } = linearise(this.modele.f, xe, ue, this.p);
    this.A = A;
    this.B = B;
    this.ABK = matadd(A, matmul(B, this.K));
    this.vpA = valeursPropres(A);
    this.vpABK = valeursPropres(this.ABK);
    // Pas fin : au plus 1 ms et assez petit devant le spectre du bouclé
    // pour que RK4 reste stable même pour des gains extrêmes.
    const rayon = Math.max(1, ...this.vpABK.map((z) => Math.hypot(z.re, z.im)));
    this.pas = Math.min(PAS_MAX, 0.5 / rayon);
  }

  fixeParametre(nom, valeur) {
    this.p[nom] = valeur;
    this.metAJour();
  }

  fixeGain(i, j, valeur) {
    this.K[i][j] = valeur;
    this.metAJour();
  }

  commande(x) {
    return this.ue.map((uei, i) =>
      this.K[i].reduce((s, kij, j) => s + kij * (x[j] - this.xe[j]), uei),
    );
  }

  // Démarre une nouvelle trajectoire depuis x0 : l'historique repart de t = 0.
  reinitialise(x0) {
    this.t = 0;
    this.x = x0.slice();
    this.diverge = false;
    this.historique = { t: [], x: this.x.map(() => []), u: this.ue.map(() => []) };
    this.prochainEchantillon = 0;
    this.enregistre();
  }

  enregistre() {
    const h = this.historique;
    const u = this.commande(this.x);
    h.t.push(this.t);
    this.x.forEach((xi, i) => h.x[i].push(xi));
    u.forEach((ui, i) => h.u[i].push(ui));
    const nMax = Math.round(DUREE_HISTORIQUE / PERIODE_ECHANTILLON);
    if (h.t.length > nMax) {
      h.t.shift();
      h.x.forEach((s) => s.shift());
      h.u.forEach((s) => s.shift());
    }
    this.prochainEchantillon += PERIODE_ECHANTILLON;
  }

  // Avance la simulation de `duree` secondes de temps simulé.
  avance(duree) {
    if (this.diverge) return;
    const F = (t, x) => this.modele.f(x, this.commande(x), this.p);
    const tFin = this.t + duree;
    while (this.t < tFin - 1e-12) {
      const h = Math.min(this.pas, tFin - this.t, this.prochainEchantillon - this.t);
      this.x = rk4(F, this.t, this.x, h);
      this.t += h;
      if (!this.x.every((xi) => Number.isFinite(xi) && Math.abs(xi) < 1e6)) {
        this.diverge = true;
        return;
      }
      if (this.t >= this.prochainEchantillon - 1e-12) this.enregistre();
    }
  }
}
