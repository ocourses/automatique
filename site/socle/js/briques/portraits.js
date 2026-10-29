// Portrait de phase d'un système linéaire plan ẋ = Ax, partagé par le
// diagramme de bifurcation et la galerie des onze cas : champ de vecteurs,
// directions propres, droite d'équilibres, orbites fléchées et particules
// emportées par le flot.

import { applique, directionsPropres, exponentielle, spectre } from '../core/dim2.js';

// Orbites du portrait. Les départs sont régulièrement espacés sur le bord du
// cadre ; chaque orbite est suivie dans les deux sens, avec le flot exact,
// jusqu'à sortir du cadre ou arriver au seuil de l'équilibre (l'origine, ou la
// droite d'équilibres quand det A = 0). Un départ déjà sur une orbite tracée est
// sauté (pour un col, l'orbite qui entre par un point du bord ressort par un
// autre).
//
// Une orbite n'est jamais coupée parce qu'elle s'approche d'une autre : elle va
// du bord jusqu'à l'équilibre, ou d'un bord à l'autre.
//
// Pour un centre, dont les ellipses intérieures ne touchent pas le bord, des
// départs le long d'un rayon s'ajoutent. Pour des valeurs propres réelles (nœud,
// col, droite d'équilibres), où les orbites se rassemblent le long d'une
// direction propre, des départs à l'intérieur du cadre, pris du bord vers le
// centre, comblent les zones restées vides (près des directions propres d'un
// col, par exemple).
//
// Rend des lignes brisées orientées dans le sens du temps.
export function orbitesDuPortrait(A, cadre, { departs = 24 } = {}) {
  const [xa, xb] = cadre.x;
  const [ya, yb] = cadre.y;
  const taille = Math.min(xb - xa, yb - ya);
  const perimetre = 2 * (xb - xa + yb - ya);
  const ecart = perimetre / departs; // distance entre deux départs sur le bord
  const seuil = 0.005 * taille; // arrêt près de l'équilibre
  const pasMax = 0.008 * taille; // longueur d'arc maximale entre deux points
  const dansCadre = (p) => p[0] >= xa - 1e-9 && p[0] <= xb + 1e-9 && p[1] >= ya - 1e-9 && p[1] <= yb + 1e-9;

  // Distance à l'ensemble des équilibres : l'origine, ou la droite noyau de A.
  const tr = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  let noyau = null;
  if (Math.abs(det) < 1e-9) {
    const ligne = Math.hypot(...A[0]) >= Math.hypot(...A[1]) ? A[0] : A[1];
    const n = Math.hypot(...ligne);
    if (n > 1e-9) noyau = [-ligne[1] / n, ligne[0] / n];
  }
  const distanceEquilibre = (p) => (noyau ? Math.abs(p[0] * noyau[1] - p[1] * noyau[0]) : Math.hypot(...p));
  const { reelles, valeurs } = spectre(tr, det);
  const dsep = 0.65 * ecart; // espacement visé entre orbites (valeurs propres réelles)

  // Flot exact sur des durées h₀·2^k, gardées : un pas ne coûte qu'un produit.
  const flots = new Map();
  const flot = (k) => {
    if (!flots.has(k)) flots.set(k, exponentielle(A, 2 ** k / 1024));
    return flots.get(k);
  };

  // Points déjà tracés, par case de côté `ecart` (pour sauter les départs redondants).
  const cases = new Map();
  const clef = (p) => `${Math.floor(p[0] / ecart)},${Math.floor(p[1] / ecart)}`;
  const ajoute = (p) => {
    const c = clef(p);
    if (!cases.has(c)) cases.set(c, []);
    cases.get(c).push(p);
  };
  const dejaTrace = (p, rayon) => {
    const i0 = Math.floor(p[0] / ecart);
    const j0 = Math.floor(p[1] / ecart);
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      for (let j = j0 - 1; j <= j0 + 1; j++) {
        for (const q of cases.get(`${i},${j}`) ?? []) if (Math.hypot(q[0] - p[0], q[1] - p[1]) < rayon) return true;
      }
    }
    return false;
  };

  // Points de l'orbite de `depart` dans le sens `sens` (±1). Le pas en temps
  // est choisi pour une longueur d'arc d'au plus `pasMax`, plus fine près de
  // l'équilibre où l'orbite tourne sur un petit rayon. Une orbite fermée (ou une
  // spirale dont deux tours se touchent) s'arrête en revenant sur elle-même.
  const marche = (depart, sens) => {
    const pts = [];
    let x = depart;
    let arc = 0;
    for (let n = 0; n < 6000; n++) {
      const vitesse = Math.hypot(...applique(A, x));
      if (vitesse < 1e-12) break;
      const longueur = Math.min(pasMax, Math.max(0.15 * distanceEquilibre(x), 0.0005 * taille));
      const k = Math.max(-40, Math.min(40, Math.round(Math.log2(((longueur / vitesse) * 1024)))));
      const E = flot(k);
      const suivant = sens > 0 ? applique(E, x) : resout(E, x);
      arc += Math.hypot(suivant[0] - x[0], suivant[1] - x[1]);
      x = suivant;
      if (!dansCadre(x) || distanceEquilibre(x) < seuil) break;
      // Retour sur le départ : orbite fermée.
      if (arc > 4 * pasMax && Math.hypot(x[0] - depart[0], x[1] - depart[1]) < 1.5 * pasMax) {
        pts.push(depart);
        break;
      }
      pts.push(x);
    }
    return pts;
  };

  const candidats = [];
  for (let k = 0; k < departs; k++) {
    // Décalage d'un quart d'écart : les départs de deux côtés opposés s'intercalent
    // au lieu de se faire face (avec une droite d'équilibres, les orbites de gauche
    // et de droite arrivent ainsi à des endroits différents).
    let d = (k + 0.25) * ecart;
    const [L, H] = [xb - xa, yb - ya];
    // Un départ du bord est sauté s'il est à moins d'un demi-écart d'une orbite tracée.
    let p;
    let normale;
    if (d < L) [p, normale] = [[xa + d, ya], 1];
    else if ((d -= L) < H) [p, normale] = [[xb, ya + d], 0];
    else if ((d -= H) < L) [p, normale] = [[xb - d, yb], 1];
    else [p, normale] = [[xa, yb - (d - L)], 0];
    // Un départ où le flot longe le bord tracerait une orbite collée au cadre.
    const v = applique(A, p);
    if (Math.abs(v[normale]) < 0.1 * Math.hypot(...v)) continue;
    candidats.push({ p, rayon: 0.5 * ecart });
  }
  // Centre : départs le long d'un rayon (hors direction propre), pour les ellipses intérieures.
  if (!reelles && Math.abs(valeurs[0].re) < 1e-9) {
    const u = [Math.cos(0.35), Math.sin(0.35)];
    const portee = 0.5 * taille;
    for (let r = ecart / 2; r < portee; r += ecart / 2) candidats.push({ p: [r * u[0], r * u[1]], rayon: 0.25 * ecart });
  }

  // Valeurs propres réelles : départs intérieurs (grille fine, du bord vers le
  // centre), loin des orbites tracées et des directions propres (en tirets).
  if (reelles) {
    const diag = Math.hypot(xb - xa, yb - ya);
    // Pas la droite d'équilibres (valeur propre nulle) : les orbites vont jusqu'à son seuil.
    const directions = directionsPropres(A).filter(({ lambda }) => Math.abs(lambda) > 1e-9).map(({ v }) => v);
    for (const v of directions) for (let t = -diag; t <= diag; t += pasMax) ajoute([t * v[0], t * v[1]]);
    const maille = dsep / 3;
    const interieurs = [];
    for (let x = xa + maille / 2; x < xb; x += maille) for (let y = ya + maille / 2; y < yb; y += maille) interieurs.push([x, y]);
    interieurs.sort((p, q) => Math.max(Math.abs(q[0]), Math.abs(q[1])) - Math.max(Math.abs(p[0]), Math.abs(p[1])));
    for (const p of interieurs) candidats.push({ p, rayon: dsep });
  }

  const orbites = [];
  for (const { p: c, rayon } of candidats) {
    if (dejaTrace(c, rayon)) continue;
    const pts = [...marche(c, -1).reverse(), c, ...marche(c, 1)];
    if (pts.length < 3) continue;
    pts.forEach(ajoute);
    orbites.push(pts);
  }
  return orbites;
}

// Inverse d'une matrice (2, 2) appliquée à x : un pas du flot en arrière.
function resout(E, x) {
  const d = E[0][0] * E[1][1] - E[0][1] * E[1][0];
  return [(E[1][1] * x[0] - E[0][1] * x[1]) / d, (-E[1][0] * x[0] + E[0][0] * x[1]) / d];
}

// Les orbites ne dépendent que de A et du cadre : on garde les dernières, car
// le dessin est refait à chaque image de l'animation.
const memoire = new Map();
function orbitesDe(A, cadre, departs) {
  const clef = JSON.stringify([A, cadre, departs]);
  if (!memoire.has(clef)) {
    if (memoire.size > 40) memoire.clear();
    memoire.set(clef, orbitesDuPortrait(A, cadre, { departs }));
  }
  return memoire.get(clef);
}

// Les orbites vont de leur début (par où elles entrent dans le cadre, ou près
// de l'équilibre si elles en sortent) à leur fin. Elles sont tracées entières,
// ou, si `arc` est donné, un arc de longueur `arc` × taille du cadre (mesurée
// le long de la courbe) glisse le long de chacune à la vitesse de 0,5 taille de
// cadre par seconde (`temps` en secondes), chaque orbite avec sa propre phase ;
// les arcs entrent par le début de l'orbite et sortent par sa fin.
const VITESSE_ARC = 0.5;

// Abscisses curvilignes cumulées d'une orbite (gardées avec elle) et indice du
// dernier point d'abscisse au plus `v`.
const abscissesGardees = new WeakMap();
function abscisses(pts) {
  if (!abscissesGardees.has(pts)) {
    const s = [0];
    for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    abscissesGardees.set(pts, s);
  }
  return abscissesGardees.get(pts);
}
function indiceA(s, v) {
  let [g, d] = [0, s.length - 1];
  while (g < d) {
    const m = (g + d + 1) >> 1;
    if (s[m] <= v) g = m;
    else d = m - 1;
  }
  return g;
}

export function dessinePortrait(rep, A, { couleurs: col, champ = true, finesse = 1, arc = null, temps = 0 } = {}) {
  const taille = Math.min(rep.cadre.x[1] - rep.cadre.x[0], rep.cadre.y[1] - rep.cadre.y[0]);
  const R = 0.5 * taille;
  if (champ) rep.champ((x, y) => applique(A, [x, y]), { n: Math.round(15 * finesse), couleur: col.discret });

  // Droite d'équilibres (det A = 0, A ≠ 0) : noyau de A.
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  if (Math.abs(det) < 1e-9) {
    const ligne = Math.hypot(...A[0]) >= Math.hypot(...A[1]) ? A[0] : A[1];
    if (Math.hypot(...ligne) > 1e-9) rep.droite(0, 0, -ligne[1], ligne[0], { couleur: col.equilibre, largeur: 2.5 });
  }

  // Directions propres.
  for (const { v } of directionsPropres(A)) rep.droite(0, 0, v[0], v[1], { couleur: col.accent, largeur: 1, tirets: [6, 4] });

  // Orbites fléchées, moins nombreuses sur les petites vignettes.
  const largeur = 1.2 * finesse + 0.2;
  const phi = (Math.sqrt(5) - 1) / 2; // phases réparties de façon régulière
  orbitesDe(A, rep.cadre, Math.round(24 * finesse)).forEach((pts, k) => {
    if (pts.length < 2) return;
    if (arc === null) {
      rep.trace(pts, { couleur: col.trait, largeur, alpha: 0.8 });
      // Flèche au milieu de la partie visible, dans le sens du temps.
      const visibles = pts.map((p, i) => (rep.contient(p[0], p[1]) && Math.hypot(...p) > 0.04 * R ? i : -1)).filter((i) => i >= 0);
      if (visibles.length > 2) {
        const p = pts[visibles[Math.floor(visibles.length / 2)]];
        const v = applique(A, p);
        rep.pointe(p[0], p[1], v[0], v[1], { couleur: col.trait, taille: 7 * finesse + 1 });
      }
      return;
    }
    // Arc glissant de longueur `arc` × taille du cadre, mesurée le long de la
    // courbe (les points sont plus serrés près de l'équilibre), plus pâle vers
    // sa queue.
    const s = abscisses(pts);
    const total = s.at(-1);
    const longueur = arc * taille;
    const cycle = total + longueur;
    const u = (temps * VITESSE_ARC * taille + ((k * phi) % 1) * cycle) % cycle;
    const tete = indiceA(s, Math.min(u, total));
    const queue = indiceA(s, Math.max(0, u - longueur));
    if (tete - queue < 1) return;
    const morceaux = 4;
    for (let m = 0; m < morceaux; m++) {
      const i0 = indiceA(s, s[queue] + ((s[tete] - s[queue]) * m) / morceaux);
      const i1 = indiceA(s, s[queue] + ((s[tete] - s[queue]) * (m + 1)) / morceaux);
      rep.trace(pts.slice(i0, i1 + 1), { couleur: col.trait, largeur, alpha: 0.2 + (0.7 * (m + 1)) / morceaux });
    }
    if (u < total) {
      const p = pts[tete];
      const v = applique(A, p);
      rep.pointe(p[0], p[1], v[0], v[1], { couleur: col.trait, taille: 7 * finesse + 1 });
    }
  });
  // L'équilibre : l'origine (sur la droite d'équilibres quand det A = 0).
  rep.point(0, 0, { rayon: 4.5, couleur: col.equilibre });
}

// Particules emportées par le flot, pour voir le mouvement (pas de dessin si
// l'utilisateur préfère réduire les animations). Deux particules qui se
// rapprochent à moins de `fusion` × la taille du cadre n'en font plus qu'une :
// l'autre renaît ailleurs dans le cadre. Près d'un puits, où le flot les
// rassemble, il en arrive ainsi sans cesse de nouvelles.
export class Particules {
  constructor(n = 60, { fusion = 0.025 } = {}) {
    this.n = n;
    this.fusion = fusion;
    this.pts = [];
  }

  avance(A, rep, dt) {
    const { x: [a, b], y: [c, d] } = rep.cadre;
    const tire = () => [a + Math.random() * (b - a), c + Math.random() * (d - c)];
    while (this.pts.length < this.n) this.pts.push({ x: tire(), age: Math.random() * 4 });
    this.pts.length = Math.min(this.pts.length, this.n);
    const E = exponentielle(A, dt);
    const echelle = Math.min(b - a, d - c);
    const rayon = this.fusion * echelle;
    const cases = new Map();
    for (const p of this.pts) {
      p.x = applique(E, p.x);
      p.age += dt;
      // Sortie du cadre, arrivée à l'équilibre ou trop vieille : elle renaît ailleurs.
      if (!rep.contient(...p.x) || Math.hypot(...p.x) < 0.01 * echelle || p.age > 8) {
        p.x = tire();
        p.age = 0;
        continue;
      }
      // Fusion avec une voisine déjà placée dans la grille.
      const i0 = Math.floor(p.x[0] / rayon);
      const j0 = Math.floor(p.x[1] / rayon);
      let voisine = false;
      for (let i = i0 - 1; i <= i0 + 1 && !voisine; i++) {
        for (let j = j0 - 1; j <= j0 + 1 && !voisine; j++) {
          for (const q of cases.get(`${i},${j}`) ?? []) {
            if (Math.hypot(q[0] - p.x[0], q[1] - p.x[1]) < rayon) voisine = true;
          }
        }
      }
      if (voisine) {
        p.x = tire();
        p.age = 0;
        continue;
      }
      const clef = `${i0},${j0}`;
      if (!cases.has(clef)) cases.set(clef, []);
      cases.get(clef).push(p.x);
    }
  }

  dessine(rep, couleur) {
    for (const p of this.pts) rep.point(p.x[0], p.x[1], { rayon: 2.6, couleur });
  }
}
