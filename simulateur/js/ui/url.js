// Réglages encodés dans l'URL : un lien reproduit une expérience.

function nombre(v) {
  return String(Number(v.toPrecision(6)));
}

function liste(texte) {
  const v = texte.split(',').map(Number);
  return v.every(Number.isFinite) ? v : null;
}

// Paramètres de l'URL décrivant l'état courant de la simulation.
export function versURL(sim, ci, affichage) {
  const q = new URLSearchParams();
  q.set('id', sim.modele.id);
  for (const [nom, v] of Object.entries(sim.p)) q.set(`p_${nom}`, nombre(v));
  q.set('mode', sim.mode);
  q.set('K', sim.K.flat().map(nombre).join(','));
  if (sim.mode === 'loi') q.set('loi', sim.loiTexte);
  q.set('x0', ci.map(nombre).join(','));
  const P = sim.perturbation;
  if (P.type !== 'aucune') {
    q.set('pert', P.type);
    q.set('e', nombre(P.e));
    if (P.type === 'creneau') {
      q.set('t1', nombre(P.debut));
      q.set('dt', nombre(P.duree));
    }
  }
  if (sim.sigma > 0) q.set('sigma', nombre(sim.sigma));
  if (sim.saturation.active) q.set('umax', nombre(sim.saturation.umax));
  if (affichage.fantome) q.set('fantome', '1');
  if (affichage.vitesse !== 1) q.set('vitesse', nombre(affichage.vitesse));
  return q;
}

// Applique les réglages de l'URL à la simulation ; renvoie { ci, affichage }.
// Les valeurs illisibles sont ignorées.
export function depuisURL(q, sim) {
  for (const nom of Object.keys(sim.p)) {
    const v = Number(q.get(`p_${nom}`));
    if (q.has(`p_${nom}`) && Number.isFinite(v)) sim.p[nom] = v;
  }
  sim.metAJour();
  const K = q.has('K') ? liste(q.get('K')) : null;
  if (K && K.length === sim.n * sim.m) sim.K = sim.K.map((ligne, i) => K.slice(i * sim.n, (i + 1) * sim.n));
  if (q.has('loi')) sim.loiTexte = q.get('loi');
  sim.compileLoi();
  sim.mode = q.get('mode') === 'loi' ? 'loi' : 'gains';
  const pert = q.get('pert');
  if (pert === 'constante' || pert === 'creneau') {
    sim.perturbation.type = pert;
    for (const [cle, champ] of [
      ['e', 'e'],
      ['t1', 'debut'],
      ['dt', 'duree'],
    ]) {
      const v = Number(q.get(cle));
      if (q.has(cle) && Number.isFinite(v)) sim.perturbation[champ] = v;
    }
  }
  const sigma = Number(q.get('sigma'));
  if (q.has('sigma') && Number.isFinite(sigma) && sigma >= 0) sim.sigma = sigma;
  const umax = Number(q.get('umax'));
  if (q.has('umax') && Number.isFinite(umax) && umax > 0) sim.saturation = { active: true, umax };
  sim.metAJour();
  const x0 = q.has('x0') ? liste(q.get('x0')) : null;
  const ci = x0 && x0.length === sim.n ? x0 : sim.modele.x0.slice();
  const vitesse = Number(q.get('vitesse'));
  return {
    ci,
    affichage: {
      fantome: q.get('fantome') === '1',
      vitesse: [0.25, 0.5, 1, 2, 4].includes(vitesse) ? vitesse : 1,
    },
  };
}
