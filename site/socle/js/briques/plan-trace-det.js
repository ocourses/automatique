// Plan (trace, déterminant) du TD1, partagé par le diagramme de bifurcation et
// le flot : quart de plan de stabilité, parabole Δ = 0, les onze points P₁…P₁₁
// et le point choisi, que l'on déplace à la souris avec aimantation.

import { CAS_TD1, nature } from '../core/dim2.js';
import { glisse } from './commun.js';

export const AIMANT = 9; // px : le point se colle aux axes et à la parabole

// Aimantation du point (tr, det) sur det = 0, tr = 0 et la parabole Δ = 0,
// à `seuilTr` et `seuilDet` près (en unités du plan).
export function aimante(tr, det, seuilTr, seuilDet) {
  let [t, d] = [tr, det];
  if (Math.abs(t) < seuilTr) t = 0;
  if (Math.abs(d) < seuilDet) d = 0;
  else if (Math.abs(d - (t * t) / 4) < seuilDet) d = (t * t) / 4;
  return [t, d];
}

// Position des points dans le diagramme et côté de leur étiquette. Quelques
// points sont déplacés par rapport aux valeurs de CAS_TD1 (utilisées par la
// galerie) pour garder le dessin lisible : l'étiquette ne doit pas tomber sur
// la parabole ni sur les axes.
export const PLACEMENT = {
  'P₁': { tr: -4, det: 2, cote: 'bas-droite' },
  'P₂': { tr: 4, det: 2, cote: 'bas-gauche' },
  'P₃': { tr: 0, det: -1.5 },
  'P₁₀': { cote: 'bas-droite' },
};

// Étiquette P_i d'un des onze cas du TD1 : la lettre en italique, l'indice plus
// petit et abaissé (les indices Unicode de CAS_TD1 sont lus comme des chiffres).
// Par défaut, elle est en haut à droite du point.
function etiquetteCas(rep, cas, couleur) {
  const indice = [...cas.cas.slice(1)].map((c) => c.charCodeAt(0) - 0x2080).join('');
  const ctx = rep.ctx;
  ctx.save();
  ctx.fillStyle = couleur;
  ctx.font = "italic 15px 'Latin Modern Roman', 'CMU Serif', Georgia, serif";
  const largeurP = ctx.measureText('P').width;
  ctx.font = "11px 'Latin Modern Roman', 'CMU Serif', Georgia, serif";
  const largeur = largeurP + ctx.measureText(indice).width;
  const bas = cas.cote?.startsWith('bas');
  const gauche = cas.cote?.endsWith('gauche');
  const x = rep.X(cas.tr) + (gauche ? -7 - largeur : 7);
  const y = rep.Y(cas.det) + (bas ? 16 : -7);
  ctx.font = "italic 15px 'Latin Modern Roman', 'CMU Serif', Georgia, serif";
  ctx.fillText('P', x, y);
  ctx.font = "11px 'Latin Modern Roman', 'CMU Serif', Georgia, serif";
  ctx.fillText(indice, x + largeurP, y + 3);
  ctx.restore();
}

// Point (tr, det) choisi à la souris : aimanté, puis arrondi à 10⁻³. Sur la
// parabole, le déterminant se déduit de la trace arrondie : arrondi séparément,
// il laisserait un discriminant de l'ordre de 10⁻³ au lieu de 0.
export function pointDuPlan(x, y, seuilTr, seuilDet) {
  const [t, d] = aimante(x, y, seuilTr, seuilDet);
  const tr = Number(t.toFixed(3));
  const surParabole = d !== 0 && d === (t * t) / 4;
  return { tr, det: surParabole ? (tr * tr) / 4 : Number(d.toFixed(3)) };
}

// Ramène un point (tr, det) dans le rectangle `borne` = { tr: [min, max],
// det: [min, max] }.
export function borneLe({ tr, det }, borne) {
  const dans = (v, [a, b]) => Math.min(b, Math.max(a, v));
  return { tr: dans(tr, borne.tr), det: dans(det, borne.det) };
}

// Dessine le plan dans le repère `rep` (cadre conseillé : x ∈ [−5, 5],
// y ∈ [−2.5, 6]) avec le point (tr, det) choisi, bleu s'il est
// asymptotiquement stable, rouge sinon. Avec `autorise` (un rectangle comme
// pour borneLe), le reste du plan est grisé et les points P_i sont omis : on ne
// peut choisir qu'un point du rectangle.
export function dessinePlan(rep, tr, det, col, { etiquettes = true, autorise = null } = {}) {
  if (!rep.prepare()) return;
  rep.region((t, d) => t < 0 && d > 0, { couleur: col.zone, pas: 4 });
  if (autorise) {
    const dehors = (t, d) => t < autorise.tr[0] || t > autorise.tr[1] || d < autorise.det[0] || d > autorise.det[1];
    rep.region(dehors, { couleur: col.discret, pas: 4, alpha: 0.09 });
  }
  rep.axes({ noms: [[['tr ', false], ['A', true]], [['det ', false], ['A', true]]] });
  // Axes tr = 0 et det = 0 marqués : ils bornent la zone de stabilité.
  rep.trace([[-6, 0], [6, 0]], { couleur: col.trait, largeur: 1.5 });
  rep.trace([[0, -3], [0, 7]], { couleur: col.trait, largeur: 1.5 });
  const parabole = [];
  for (let t = -6; t <= 6; t += 0.05) parabole.push([t, (t * t) / 4]);
  rep.trace(parabole, { couleur: col.accent, largeur: 1.5 });
  rep.texte(4.6, (4.6 * 4.6) / 4, 'Δ = 0', { couleur: col.accent, align: 'right', dx: -6, fond: true });
  for (const cas of autorise ? [] : CAS_TD1) {
    const c = { ...cas, ...PLACEMENT[cas.cas] };
    rep.point(c.tr, c.det, { rayon: 4, couleur: col.discret });
    if (etiquettes) etiquetteCas(rep, c, col.discret);
  }
  const stable = nature(tr, det).stabilite === 'asymptotiquement stable';
  rep.point(tr, det, { rayon: 7, couleur: stable ? col.accent : col.alerte });
}

// Branche le glisser sur le plan : `choisit({ tr, det })` reçoit le point
// aimanté, et ramené dans `borne` s'il y en a une.
export function plan(canvas, rep, choisit, { borne = null } = {}) {
  canvas.classList.add('saisissable');
  glisse(canvas, rep, {
    deplace: (x, y) => {
      const p = pointDuPlan(x, y, AIMANT / rep.sx, AIMANT / rep.sy);
      choisit(borne ? borneLe(p, borne) : p);
    },
  });
}
