// Réglages encodés dans l'URL : un lien reproduit une expérience. On passe
// par l'objet de réglages de core/reglages.js, le même que celui gardé dans
// le navigateur.

import { VITESSES } from './etat.js';

function nombre(v) {
  return String(Number(v.toPrecision(6)));
}

function liste(texte) {
  const v = texte.split(',').map(Number);
  return v.every(Number.isFinite) ? v : null;
}

function lit(q, cle) {
  if (!q.has(cle)) return undefined;
  const v = Number(q.get(cle));
  return Number.isFinite(v) ? v : undefined;
}

// Paramètres de l'URL pour l'exemple `id`, les réglages `r` et l'affichage.
export function versURL(id, r, affichage) {
  const q = new URLSearchParams();
  q.set('id', id);
  for (const [nom, v] of Object.entries(r.p)) q.set(`p_${nom}`, nombre(v));
  q.set('mode', r.mode);
  q.set('K', r.K.flat().map(nombre).join(','));
  if (r.mode === 'loi') q.set('loi', r.loi);
  q.set('x0', r.x0.map(nombre).join(','));
  const P = r.perturbation;
  if (P.type !== 'aucune') {
    q.set('pert', P.type);
    q.set('e', nombre(P.e));
    if (P.type === 'creneau') {
      q.set('t1', nombre(P.debut));
      q.set('dt', nombre(P.duree));
    }
  }
  if (r.sigma > 0) q.set('sigma', nombre(r.sigma));
  if (r.saturation.active) q.set('umax', nombre(r.saturation.umax));
  if (r.Te > 0) q.set('Te', nombre(r.Te));
  if (r.obs) {
    q.set('L', r.obs.L.map(nombre).join(','));
    q.set('h', nombre(r.obs.h));
    q.set('xh0', r.obs.xh0.map(nombre).join(','));
    if (!r.obs.retourEstime) q.set('retour', 'x');
  }
  if (affichage.fantome) q.set('fantome', '1');
  if (affichage.vitesse !== 1) q.set('vitesse', nombre(affichage.vitesse));
  return q;
}

// Le lien porte-t-il des réglages, en plus de l'identifiant de l'exemple ?
export function porteReglages(q) {
  return [...q.keys()].some((cle) => cle !== 'id');
}

// Réglages (partiels) et affichage décrits par l'URL, pour un modèle à n états
// et m commandes. Les valeurs illisibles sont laissées de côté : `applique`
// garde alors la valeur courante.
export function depuisURL(q, n, m) {
  const r = { p: {} };
  for (const [cle, v] of q) if (cle.startsWith('p_') && Number.isFinite(Number(v))) r.p[cle.slice(2)] = Number(v);
  const K = q.has('K') ? liste(q.get('K')) : null;
  if (K && K.length === n * m) r.K = Array.from({ length: m }, (_, i) => K.slice(i * n, (i + 1) * n));
  if (q.has('loi')) r.loi = q.get('loi');
  r.mode = q.get('mode') === 'loi' ? 'loi' : 'gains';
  if (q.has('x0')) r.x0 = liste(q.get('x0')) ?? undefined;
  const type = q.get('pert');
  r.perturbation = { type: type === 'constante' || type === 'creneau' ? type : 'aucune', e: lit(q, 'e'), debut: lit(q, 't1'), duree: lit(q, 'dt') };
  r.sigma = lit(q, 'sigma') ?? 0;
  const umax = lit(q, 'umax');
  r.saturation = umax > 0 ? { active: true, umax } : { active: false };
  r.Te = lit(q, 'Te') ?? 0;
  if (q.has('L') || q.has('h') || q.has('xh0') || q.has('retour')) {
    r.obs = {
      L: q.has('L') ? liste(q.get('L')) : undefined,
      h: lit(q, 'h'),
      xh0: q.has('xh0') ? liste(q.get('xh0')) : undefined,
      retourEstime: q.get('retour') !== 'x',
    };
  }
  const vitesse = lit(q, 'vitesse');
  return {
    reglages: r,
    affichage: { fantome: q.get('fantome') === '1', vitesse: VITESSES.includes(vitesse) ? vitesse : 1 },
  };
}
