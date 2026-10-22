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
//
// Trois options, pour les exemples qui le prévoient ou pour tous :
//   - Te > 0 : la commande n'est recalculée que tous les Te secondes et gardée
//              constante entre deux mises à jour (bloqueur d'ordre zéro) ;
//   - observateur (modele.observateur) : x̂' = f(x̂, u) + L (y − C x̂) intégré par
//              Euler explicite de pas h, avec la commande connue et la sortie
//              mesurée (bruit compris), x̂ restant constant entre deux instants ;
//   - retourEstime : la commande est calculée sur x̂ au lieu de l'état mesuré.

import { rk4 } from './ode.js';
import { compile } from './expr.js';
import { Modele } from './modele.js';
import { ackermann, facteurEuler, ligneSortie, matriceObservateur, observable, pasEulerMax } from './poles.js';
import { inverse, jacobienne, linearise, matadd, matmul, valeursPropres } from './linalg.js';

const BORNE_OBSERVATEUR = 1e3;

const PAS_MAX = 1e-3; // s
const PERIODE_ECHANTILLON = 0.02; // s, pour l'historique et les courbes
const PERIODE_BRUIT = 0.01; // s, le bruit de mesure est tenu constant sur cette durée
const DUREE_HISTORIQUE = 60; // s
const SEUIL_DEFAUT = 0.01; // rayon ε de la boule autour de x_e
const DELAI_FIN_SATURATION = 0.5; // s sans saturer avant de signaler la fin

const fr = (v) => String(Number(v.toPrecision(3))).replace('.', ',');

function gaussienne() {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

export class Simulation {
  // `modele` : une description d'exemple ou un Modele (core/modele.js).
  constructor(modele) {
    modele = Modele.de(modele);
    this.modele = modele;
    this.n = modele.n;
    this.m = modele.m;
    this.p = Object.fromEntries(modele.parametres.map((q) => [q.nom, q.valeur]));
    this.K = modele.gains.map((ligne) => ligne.slice());
    this.mode = 'gains';
    this.loiTexte = modele.loi ?? '';
    this.loi = null;
    this.erreurLoi = null;
    this.saturation = { active: false, umax: modele.umax ?? 10 };
    this.perturbation = { type: 'aucune', e: modele.perturbation ?? 1, debut: 1, duree: 1 };
    this.sigma = 0;
    // Événements à destination du journal : { t, niveau, texte }, vidés par l'interface.
    this.evenements = [];
    this.seuil = SEUIL_DEFAUT;
    // Commande échantillonnée : période Te en secondes, 0 pour une commande continue.
    this.Te = 0;
    // Observateur : { L, h, xh0 } si le modèle en prévoit un, sinon null.
    const mo = modele.observateur;
    this.obs = mo ? { L: mo.L.slice(), h: mo.h, xh0: (mo.xh0 ?? new Array(this.n).fill(0)).slice() } : null;
    this.retourEstime = Boolean(mo);
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
    return this.modele.sortie;
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

  fixeL(L) {
    this.obs.L = L.slice();
    this.metAJour();
  }

  fixePasObservateur(h) {
    this.obs.h = h;
    this.metAJour();
    if (this.xh) {
      // On repart de l'estimée courante avec le nouveau pas.
      this.xhSuivant = null;
      this.prochainObs = this.t;
      this.tickObservateur();
    }
  }

  fixeRetourEstime(oui) {
    this.retourEstime = oui;
  }

  // Période de la commande ; 0 pour la commande continue.
  fixeTe(Te) {
    this.Te = Te;
    if (Te > 0) {
      this.majCommande();
      this.prochaineCommande = this.t + Te;
    } else {
      this.uBrute = null;
    }
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

    // Observateur : A − LC, observabilité et critère d'Euler pour le pas h.
    if (this.obs) {
      this.C = ligneSortie(this.n, this.sortie);
      this.ALC = matriceObservateur(A, this.C, this.obs.L);
      this.vpObs = valeursPropres(this.ALC);
      this.observable = observable(A, this.C);
      this.hMax = pasEulerMax(this.vpObs);
      this.rhoEuler = facteurEuler(this.vpObs, this.obs.h);
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

  // Commande avant saturation, à partir de l'état xm vu par le contrôleur, des
  // primitives I et de la sortie mesurée ym.
  commandeBrute(t, xm, I, ym = xm[this.sortie]) {
    if (!this.loiActive) {
      return this.ue.map((uei, i) => this.K[i].reduce((s, kij, j) => s + kij * (xm[j] - this.xe[j]), uei));
    }
    const env = { ...this.p, t, y: ym, ue: this.ue[0], iy: I[this.n] };
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

  // État vu par le contrôleur : l'état estimé si le retour se fait sur x̂, sinon
  // l'état mesuré (bruit compris).
  etatControleur(xm) {
    return this.obs && this.retourEstime ? this.xh : xm;
  }

  // Commande avant saturation calculée à l'instant t pour l'état x et les primitives I.
  calculeBrute(t, x, I) {
    const xm = x.map((v, i) => v + this.bruit[i]);
    return this.commandeBrute(t, this.etatControleur(xm), I, xm[this.sortie]);
  }

  // Met à jour la commande tenue (Te > 0) à partir de l'état courant.
  majCommande() {
    this.uBrute = this.calculeBrute(this.t, this.x, this.I);
  }

  // Commande effectivement appliquée (hors perturbation) pour l'état courant.
  commande(x = this.x) {
    return this.sature(this.commandeNonSaturee(x));
  }

  commandeNonSaturee(x = this.x) {
    if (this.Te > 0 && this.uBrute) return this.uBrute;
    return this.calculeBrute(this.t, x, this.I);
  }

  // ---- Observateur ---------------------------------------------------------

  // Instant t_k : l'estimée calculée au pas précédent devient effective, puis on
  // calcule la suivante, x̂_{k+1} = x̂_k + h [ f(x̂_k, u_k) + L (y_k − C x̂_k) ], à
  // partir de la commande connue et de la sortie mesurée à cet instant.
  tickObservateur() {
    const { L, h } = this.obs;
    if (this.xhSuivant) this.xh = this.xhSuivant;
    const u = this.commande();
    const y = this.x[this.sortie] + this.bruit[this.sortie];
    const f = this.modele.f(this.xh, u, this.p);
    const innovation = y - this.xh[this.sortie];
    const suivant = this.xh.map((v, i) => v + h * (f[i] + L[i] * innovation));
    if (!suivant.every((v) => Number.isFinite(v) && Math.abs(v) < BORNE_OBSERVATEUR)) {
      if (!this.obsDiverge) {
        this.obsDiverge = true;
        this.evenements.push({ t: this.t, niveau: 'alerte', texte: `L’observateur diverge (pas h = ${fr(h)} s trop grand ?)` });
      }
      this.xhSuivant = suivant.map((v) => (Number.isFinite(v) ? Math.max(-BORNE_OBSERVATEUR, Math.min(BORNE_OBSERVATEUR, v)) : 0));
    } else {
      this.xhSuivant = suivant;
    }
    this.prochainObs += h;
  }

  // Erreur d'estimation e = x − x̂ et sa norme.
  erreurEstimation() {
    return this.x.map((v, i) => v - this.xh[i]);
  }

  normeErreur() {
    return Math.hypot(...this.erreurEstimation());
  }

  // Distance euclidienne de l'état à l'équilibre.
  normeEcart() {
    return Math.hypot(...this.x.map((v, i) => v - this.xe[i]));
  }

  fixeSeuil(seuil) {
    this.seuil = seuil;
    this.dansBoule = false;
    this.entreeBoule = null;
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
    this.dansBoule = false;
    this.entreeBoule = null;
    this.satEtat = false;
    this.satDerniere = -Infinity;
    this.bruit = new Array(this.n).fill(0);
    this.tireBruit();
    // Observateur : x̂(0) donné, premier calcul à t = 0.
    this.obsDiverge = false;
    this.obsDansBoule = false;
    this.xhSuivant = null;
    if (this.obs) {
      this.xh = this.obs.xh0.slice();
      this.prochainObs = 0;
    }
    // Commande échantillonnée : première mise à jour à t = 0.
    this.uBrute = null;
    if (this.Te > 0) {
      this.majCommande();
      this.prochaineCommande = this.Te;
    }
    if (this.obs) this.tickObservateur();
    this.historique = {
      t: [],
      x: this.x.map(() => []),
      u: this.ue.map(() => []),
      d: this.ue.map(() => []),
      fantome: this.x.map(() => []),
      xh: this.x.map(() => []),
      e: this.x.map(() => []),
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

  // Choc : on ajoute facteur × choc de l'exemple à l'état du système et du
  // fantôme (core/chocs.js tire le facteur). Renvoie l'impulsion ajoutée.
  choc(facteur = 1) {
    const dv = this.modele.choc.map((v) => facteur * v);
    this.x = this.x.map((v, i) => v + dv[i]);
    this.fantome = this.fantome.map((v, i) => (i < this.n ? v + dv[i] : v));
    return dv;
  }

  enregistre() {
    const h = this.historique;
    h.t.push(this.t);
    this.x.forEach((xi, i) => h.x[i].push(xi));
    this.commande().forEach((ui, i) => h.u[i].push(ui));
    this.perturbationEn(this.t).forEach((di, i) => h.d[i].push(di));
    this.xFantome.forEach((xi, i) => h.fantome[i].push(Number.isFinite(xi) ? xi : null));
    if (this.obs) {
      this.xh.forEach((v, i) => h.xh[i].push(v));
      this.erreurEstimation().forEach((v, i) => h.e[i].push(v));
    }
    const nMax = Math.round(DUREE_HISTORIQUE / PERIODE_ECHANTILLON);
    if (h.t.length > nMax) {
      h.t.shift();
      for (const serie of [...h.x, ...h.u, ...h.d, ...h.fantome, ...h.xh, ...h.e]) serie.shift();
    }
    this.prochainEchantillon += PERIODE_ECHANTILLON;
    this.surveille();
  }

  // Détecte, à chaque échantillon, les événements à signaler : entrée et sortie
  // de la boule ‖x − x_e‖ < ε (avec hystérésis pour ne pas bégayer sous bruit),
  // début et fin de saturation.
  surveille() {
    const norme = this.normeEcart();
    if (!this.dansBoule && norme < this.seuil) {
      this.dansBoule = true;
      this.entreeBoule = this.t;
      this.evenements.push({ t: this.t, niveau: 'ok', texte: `Entrée dans la boule ‖x − x_e‖ < ε = ${fr(this.seuil)}` });
    } else if (this.dansBoule && norme > 2 * this.seuil) {
      this.dansBoule = false;
      this.entreeBoule = null;
      this.evenements.push({ t: this.t, niveau: 'info', texte: `Sortie de la boule ‖x − x_e‖ < 2ε = ${fr(2 * this.seuil)}` });
    }
    if (this.obs) {
      const eNorme = this.normeErreur();
      if (!this.obsDansBoule && eNorme < this.seuil) {
        this.obsDansBoule = true;
        this.evenements.push({ t: this.t, niveau: 'ok', texte: `Observateur convergé : ‖x − x̂‖ < ε = ${fr(this.seuil)}` });
      } else if (this.obsDansBoule && eNorme > 2 * this.seuil) {
        this.obsDansBoule = false;
        this.evenements.push({ t: this.t, niveau: 'info', texte: `L’erreur d’estimation dépasse 2ε = ${fr(2 * this.seuil)}` });
      }
    }
    if (!this.saturation.active) {
      this.satEtat = false;
      return;
    }
    const M = this.saturation.umax;
    if (this.commandeNonSaturee().some((v) => Math.abs(v) > M)) {
      if (!this.satEtat) {
        this.satEtat = true;
        this.evenements.push({ t: this.t, niveau: 'alerte', texte: `Saturation atteinte : |u| > ${fr(M)}` });
      }
      this.satDerniere = this.t;
    } else if (this.satEtat && this.t - this.satDerniere > DELAI_FIN_SATURATION) {
      this.satEtat = false;
      this.evenements.push({ t: this.t, niveau: 'info', texte: 'Fin de saturation' });
    }
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
      const u = this.sature(
        this.Te > 0 && this.uBrute ? this.uBrute : this.commandeBrute(t, this.etatControleur(xm), I, xm[this.sortie]),
      );
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
      const h = Math.min(
        this.pas,
        tFin - this.t,
        this.prochainEchantillon - this.t,
        this.prochainBruit - this.t,
        this.obs ? this.prochainObs - this.t : Infinity,
        this.Te > 0 ? this.prochaineCommande - this.t : Infinity,
      );
      const s = rk4(F, this.t, [...this.x, ...this.I], h);
      this.x = s.slice(0, n);
      this.I = s.slice(n);
      this.fantome = rk4(G, this.t, this.fantome, h);
      this.t += h;
      if (!this.x.every((xi) => Number.isFinite(xi) && Math.abs(xi) < 1e6)) {
        this.diverge = true;
        this.evenements.push({ t: this.t, niveau: 'alerte', texte: 'Divergence : |x| dépasse 10⁶, simulation arrêtée' });
        return;
      }
      // Le fantôme peut diverger (bouclé linéaire instable) : on le borne.
      if (!this.fantome.every((v) => Number.isFinite(v) && Math.abs(v) < 1e6)) {
        this.fantome = this.fantome.map(() => NaN);
      }
      if (this.t >= this.prochainBruit - 1e-12) this.tireBruit();
      // Commande puis observateur : à un instant commun, l'observateur voit la nouvelle commande.
      if (this.Te > 0 && this.t >= this.prochaineCommande - 1e-12) {
        this.majCommande();
        this.prochaineCommande += this.Te;
      }
      if (this.obs && this.t >= this.prochainObs - 1e-12) this.tickObservateur();
      if (this.t >= this.prochainEchantillon - 1e-12) this.enregistre();
    }
  }
}
