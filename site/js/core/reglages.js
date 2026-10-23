// Réglages d'une simulation sous forme d'objet simple (JSON) : c'est ce qui est
// gardé dans le navigateur et encodé dans les liens. `capture` lit les
// réglages d'une simulation, `applique` les lui redonne en ignorant les
// valeurs illisibles ; un objet partiel ne modifie que ce qu'il contient.

const fini = (v) => typeof v === 'number' && Number.isFinite(v);
const vecteur = (v, k) => Array.isArray(v) && v.length === k && v.every(fini);
const TYPES_PERTURBATION = ['aucune', 'constante', 'creneau'];

export function capture(sim, ci) {
  const r = {
    p: { ...sim.p },
    mode: sim.mode,
    K: sim.K.map((ligne) => ligne.slice()),
    loi: sim.loiTexte,
    x0: ci.slice(),
    perturbation: { ...sim.perturbation },
    sigma: sim.sigma,
    saturation: { ...sim.saturation },
    Te: sim.Te,
    seuil: sim.seuil,
  };
  if (sim.obs) r.obs = { L: sim.obs.L.slice(), h: sim.obs.h, xh0: sim.obs.xh0.slice(), retourEstime: sim.retourEstime };
  return r;
}

// Applique `r` à `sim` et renvoie la condition initiale à utiliser.
export function applique(sim, r = {}) {
  const { n, m } = sim;
  if (r.p) for (const nom of Object.keys(sim.p)) if (fini(r.p[nom])) sim.p[nom] = r.p[nom];
  if (Array.isArray(r.K) && r.K.length === m && r.K.every((ligne) => vecteur(ligne, n))) {
    sim.K = r.K.map((ligne) => ligne.slice());
  }
  if (typeof r.loi === 'string') sim.loiTexte = r.loi;
  sim.compileLoi();
  if (r.mode === 'gains' || r.mode === 'loi') sim.mode = r.mode;
  const P = r.perturbation;
  if (P) {
    if (TYPES_PERTURBATION.includes(P.type)) sim.perturbation.type = P.type;
    if (fini(P.e)) sim.perturbation.e = P.e;
    if (fini(P.debut)) sim.perturbation.debut = P.debut;
    if (fini(P.duree) && P.duree >= 0) sim.perturbation.duree = P.duree;
  }
  if (fini(r.sigma) && r.sigma >= 0) sim.sigma = r.sigma;
  if (r.saturation) {
    if (typeof r.saturation.active === 'boolean') sim.saturation.active = r.saturation.active;
    if (fini(r.saturation.umax) && r.saturation.umax > 0) sim.saturation.umax = r.saturation.umax;
  }
  if (fini(r.Te) && r.Te >= 0) sim.Te = r.Te;
  if (fini(r.seuil) && r.seuil > 0) sim.seuil = r.seuil;
  if (sim.obs && r.obs) {
    if (vecteur(r.obs.L, n)) sim.obs.L = r.obs.L.slice();
    if (fini(r.obs.h) && r.obs.h > 0) sim.obs.h = r.obs.h;
    if (vecteur(r.obs.xh0, n)) sim.obs.xh0 = r.obs.xh0.slice();
    if (typeof r.obs.retourEstime === 'boolean') sim.retourEstime = r.obs.retourEstime;
  }
  sim.metAJour();
  return vecteur(r.x0, n) ? r.x0.slice() : sim.modele.x0.slice();
}
