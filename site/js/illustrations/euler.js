// Euler explicite, implicite et symplectique sur q̇ = p, ṗ = −q (TD4, d'après
// Hairer, Lubich et Wanner) : la solution exacte reste sur le cercle
// q² + p² = cte ; Euler explicite multiplie ‖x‖² par 1 + h² à chaque pas,
// Euler implicite le divise par 1 + h², et Euler symplectique conserve
// exactement Q(x) = q² + p² − hpq, une ellipse si h < 2. On compare aussi
// l'ordre de convergence des schémas, dans un graphe d'erreur log-log.

import { champ } from '../ui/controls.js';
import { nombreCourt } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { boutonInfo, carte, legende, paragraphe, tableau, toile, zoomable } from './commun.js';

// Un pas de chaque schéma pour x = (q, p).
export const SCHEMAS = {
  explicite: ([q, p], h) => [q + h * p, p - h * q],
  // x₁ = x₀ + h φ(x₁) : système linéaire résolu exactement.
  implicite: ([q, p], h) => [(q + h * p) / (1 + h * h), (p - h * q) / (1 + h * h)],
  // Implicite sur q̇ = p, explicite sur ṗ = −q : p₁ = p₀ − h q₀, puis q₁ = q₀ + h p₁.
  symplectique: ([q, p], h) => {
    const p1 = p - h * q;
    return [q + h * p1, p1];
  },
  // RK4, pour comparer les ordres.
  rk4: ([q, p], h) => {
    const f = ([a, b]) => [b, -a];
    const k1 = f([q, p]);
    const k2 = f([q + (h / 2) * k1[0], p + (h / 2) * k1[1]]);
    const k3 = f([q + (h / 2) * k2[0], p + (h / 2) * k2[1]]);
    const k4 = f([q + h * k3[0], p + h * k3[1]]);
    return [q + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), p + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
  },
};

export function trajectoire(schema, x0, h, n) {
  const xs = [x0.slice()];
  for (let k = 0; k < n; k++) xs.push(SCHEMAS[schema](xs[k], h));
  return xs;
}

export const exacte = ([q0, p0], t) => [q0 * Math.cos(t) + p0 * Math.sin(t), -q0 * Math.sin(t) + p0 * Math.cos(t)];

// Erreur maximale sur [0, T] (n = T/h pas) pour une suite de pas, et pente
// estimée. On prend le maximum sur la trajectoire, et pas l'erreur au seul
// instant T : pour T = 2π, l'erreur d'ordre 1 d'Euler symplectique s'annule
// au point de départ, et la pente mesurée en T serait trompeuse (2 au lieu de 1).
export function erreurs(schema, x0, T, pas) {
  return pas.map((h) => {
    const n = Math.round(T / h);
    const hk = T / n;
    const xs = trajectoire(schema, x0, hk, n);
    let erreur = 0;
    xs.forEach((x, k) => {
      const xe = exacte(x0, k * hk);
      erreur = Math.max(erreur, Math.hypot(x[0] - xe[0], x[1] - xe[1]));
    });
    return { h: hk, erreur };
  });
}

export function pente(points) {
  const [a, b] = [points[0], points[points.length - 1]];
  return Math.log(b.erreur / a.erreur) / Math.log(b.h / a.h);
}

const STYLES = {
  explicite: { texte: 'Euler explicite', couleur: (c) => c.series[0] },
  implicite: { texte: 'Euler implicite', couleur: (c) => c.series[1] },
  symplectique: { texte: 'Euler symplectique', couleur: (c) => c.series[2] },
  rk4: { texte: 'RK4', couleur: (c) => c.series[3] },
};

export default {
  etat: { h: 0.2, T: 30, q0: 1, p0: 0 },

  rappel: [
    'Pour $\\dot q = p$, $\\dot p = -q$, l’énergie $V(x) = q^2 + p^2$ est constante : les trajectoires sont des cercles.',
    'Euler explicite : $\\|x_{n+1}\\|^2 = (1 + h^2)\\|x_n\\|^2$, le rayon croît, comme $e^{hT}$ à $h$ fixé. Euler implicite : $\\|x_{n+1}\\|^2 = \\|x_n\\|^2/(1 + h^2)$, le rayon décroît. Tous deux convergent sur un horizon fini, mais aucun ne respecte la conservation en temps long.',
    'Euler symplectique conserve exactement $Q(x) = q^2 + p^2 - hpq$ : pour $h < 2$, la trajectoire numérique reste sur une ellipse proche du cercle, sans dérive.',
  ],

  essais: [
    { texte: 'Avec $h = 0{,}2$, vérifiez dans le tableau que $V(x_n) = (1 + h^2)^n$ pour Euler explicite.', etat: { h: 0.2, T: 30 } },
    { texte: 'Allongez la durée $T$ à $h$ fixé : explicite et implicite s’écartent sans fin du cercle, le symplectique non.', etat: { h: 0.1, T: 150 } },
    { texte: 'Faites tendre $h$ vers 2 : l’ellipse du schéma symplectique s’aplatit. Au-delà de $h = 2$, la conservation de $Q$ n’empêche plus la divergence.', etat: { h: 1.9, T: 30 } },
    { texte: 'Ordre de convergence : les trois schémas d’Euler ont une pente 1 dans le graphe log-log, RK4 une pente 4. Divisez $h$ par 10 : par combien l’erreur est-elle divisée ?' },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    // h et T côte à côte, sur une ligne.
    const cReglages = carte(zone);
    const reglages = document.createElement('div');
    reglages.className = 'reglages-2';
    cReglages.appendChild(reglages);
    const champs = {
      h: champ(reglages, { latex: 'h', min: 0.01, max: 2.5, pas: 0.01, pasFleche: 0.1, valeur: r.h }, (v) => {
        outils.change({ h: v });
        dessine();
      }),
      T: champ(reglages, { latex: 'T', min: 1, max: 200, pas: 1, valeur: r.T }, (v) => {
        outils.change({ T: v });
        dessine();
      }),
    };

    const grille = document.createElement('div');
    grille.className = 'grille-2';
    zone.appendChild(grille);
    const cPhase = carte(grille, 'Plan $(q, p)$');
    const canvasPhase = toile(cPhase, '1 / 1', () => dessine());
    const repPhase = new Repere(canvasPhase, { x: [-2, 2], y: [-2, 2], egal: true });
    boutonInfo(cPhase, [
      ['tirets', '--texte', 'La solution exacte : le cercle de rayon $\\|x_0\\|$.'],
      ['ligne', '--serie-1', 'Euler explicite : la spirale s’ouvre, $\\|x_{n+1}\\|^2 = (1 + h^2)\\|x_n\\|^2$.'],
      ['ligne', '--serie-2', 'Euler implicite : la spirale se referme, $\\|x_{n+1}\\|^2 = \\|x_n\\|^2/(1 + h^2)$.'],
      ['ligne', '--serie-3', 'Euler symplectique : il reste sur l’ellipse $Q(x) = Q(x_0)$ (en tirets de la même couleur).'],
      ['point', '--perturbation', 'La condition initiale $x_0 = (1, 0)$.'],
    ]);
    const barrePhase = document.createElement('div');
    barrePhase.className = 'barre-legende';
    cPhase.appendChild(barrePhase);
    const legendePhase = document.createElement('div');
    barrePhase.appendChild(legendePhase);
    let Rauto = 2;
    const zoomPhase = zoomable(canvasPhase, repPhase, { barre: barrePhase, auto: () => ({ x: [-Rauto, Rauto], y: [-Rauto, Rauto] }), redessine: () => dessine() });

    // À droite, l'énergie et l'ordre de convergence l'un sous l'autre : le plan
    // de phase a toute la hauteur.
    const colonneDroite = document.createElement('div');
    colonneDroite.className = 'colonne-cartes';
    grille.appendChild(colonneDroite);
    const cEnergie = carte(colonneDroite, 'Énergie $V(x_n) = q_n^2 + p_n^2$');
    const canvasE = toile(cEnergie, '4 / 3', () => dessine());
    const repE = new Repere(canvasE, { x: [0, 30], y: [0, 2] });
    const zoneTableau = document.createElement('div');
    cEnergie.appendChild(zoneTableau);

    const cOrdre = carte(colonneDroite, 'Ordre de convergence');
    boutonInfo(cOrdre, [
      ['ligne', '--serie-1', 'Erreur maximale sur $[0, 2\\pi]$ en fonction de $h$, en échelle log-log, pour chaque schéma. La pente est l’ordre : l’erreur se comporte comme $h^p$.'],
      ['tirets', '--perturbation', 'Le pas $h$ choisi.'],
    ]);
    const canvasO = toile(cOrdre, '5 / 2', () => dessine());
    const repO = new Repere(canvasO, { x: [-3.1, 0], y: [-15, 1] });
    const zoneOrdre = document.createElement('div');
    cOrdre.appendChild(zoneOrdre);

    // Graphe log-log, calculé une fois : il ne dépend pas des réglages.
    const x0 = [r.q0, r.p0];
    const pasOrdre = [0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001];
    const ordres = Object.fromEntries(Object.keys(SCHEMAS).map((s) => [s, erreurs(s, x0, 2 * Math.PI, pasOrdre)]));

    function dessine() {
      const col = couleurs();
      const n = Math.max(1, Math.round(r.T / r.h));
      const trajets = Object.fromEntries(['explicite', 'implicite', 'symplectique'].map((s) => [s, trajectoire(s, [r.q0, r.p0], r.h, n)]));

      // Plan de phase : cercle exact, ellipse Q = Q₀ du schéma symplectique.
      const R = Math.max(2, ...Object.values(trajets).flatMap((xs) => xs.map(([q, p]) => Math.hypot(q, p)).filter(Number.isFinite)).map((v) => Math.min(v, 6)));
      Rauto = R * 1.05;
      const cadrePhase = zoomPhase.cadre();
      repPhase.fixeCadre(cadrePhase.x, cadrePhase.y);
      if (repPhase.prepare()) {
        repPhase.axes({ noms: ['q', 'p'] });
        const Q0 = r.q0 ** 2 + r.p0 ** 2 - r.h * r.p0 * r.q0;
        repPhase.isoligne((q, p) => q * q + p * p - r.h * p * q, Q0, { couleur: STYLES.symplectique.couleur(col), largeur: 1, tirets: [5, 4], n: 120 });
        const cercle = Array.from({ length: 201 }, (_, k) => exacte([r.q0, r.p0], (2 * Math.PI * k) / 200));
        repPhase.trace(cercle, { couleur: col.trait, largeur: 1.5, tirets: [2, 3] });
        for (const [s, xs] of Object.entries(trajets)) {
          const c = STYLES[s].couleur(col);
          repPhase.trace(xs, { couleur: c, largeur: 1.3, alpha: 0.85 });
          if (n <= 400) for (const [q, p] of xs) if (repPhase.contient(q, p)) repPhase.point(q, p, { rayon: 1.8, couleur: c });
        }
        repPhase.point(r.q0, r.p0, { rayon: 5, couleur: col.perturbation });
      }
      legendePhase.textContent = '';
      legende(legendePhase, [
        { texte: 'solution exacte', couleur: col.trait, tirets: true },
        ...['explicite', 'implicite', 'symplectique'].map((s) => ({ texte: STYLES[s].texte, couleur: STYLES[s].couleur(col) })),
        { texte: `$Q(x) = Q(x_0)$ ${r.h < 2 ? '(ellipse)' : '(non bornée, $h \\ge 2$)'}`, couleur: STYLES.symplectique.couleur(col), tirets: true },
      ]);

      // Énergie en fonction du temps.
      const V = (xs) => xs.map(([q, p], k) => [k * r.h, q * q + p * p]);
      const Vmax = Math.min(4, Math.max(1.2, ...V(trajets.explicite).map(([, v]) => v)));
      repE.fixeCadre([0, n * r.h], [0, Vmax * 1.05]);
      if (repE.prepare()) {
        repE.axes({ noms: ['t', 'V'] });
        repE.trace([[0, 1], [n * r.h, 1]], { couleur: col.trait, largeur: 1.5, tirets: [2, 3] });
        for (const [s, xs] of Object.entries(trajets)) repE.trace(V(xs), { couleur: STYLES[s].couleur(col), largeur: 1.8 });
      }
      // Tableau construit à part, puis remplacé d'un coup (voir CONVENTIONS.md).
      const nouveau = document.createElement('div');
      const V0 = r.q0 ** 2 + r.p0 ** 2;
      const fin = (xs) => xs[xs.length - 1][0] ** 2 + xs[xs.length - 1][1] ** 2;
      tableau(
        nouveau,
        [`n = ${n}`, 'V(xₙ) prédit', 'V(xₙ) calculé'],
        [
          ['explicite', nombreCourt((1 + r.h * r.h) ** n * V0), nombreCourt(fin(trajets.explicite))],
          ['implicite', nombreCourt((1 + r.h * r.h) ** -n * V0), nombreCourt(fin(trajets.implicite))],
          ['exacte', nombreCourt(V0), nombreCourt(V0)],
        ],
      );
      const xs = trajets.symplectique;
      const Q = ([q, p]) => q * q + p * p - r.h * p * q;
      const ecartQ = Math.max(...xs.map((x) => Math.abs(Q(x) - Q(xs[0]))));
      paragraphe(nouveau, `Symplectique : $Q(x_n)$ varie au plus de ${nombreCourt(ecartQ, 2)} sur les $n$ pas, aux erreurs d’arrondi près.`, 'note');
      zoneTableau.replaceChildren(...nouveau.childNodes);

      // Ordre de convergence.
      // Cadre ajusté aux erreurs calculées, pour que les pentes se voient.
      const ys = Object.values(ordres).flatMap((pts) => pts.map((p) => Math.log10(p.erreur))).filter(Number.isFinite);
      repO.fixeCadre([-3.1, -0.2], [Math.floor(Math.min(...ys)) - 0.5, Math.ceil(Math.max(...ys)) + 0.5]);
      if (repO.prepare()) {
        repO.axes({
          noms: [
            [['log₁₀ ', false], ['h', true]],
            [['log₁₀ erreur', false]],
          ],
          nomsAuBord: true,
        });
        for (const [s, pts] of Object.entries(ordres)) {
          const c = STYLES[s].couleur(col);
          const xy = pts.map((p) => [Math.log10(p.h), Math.log10(p.erreur)]);
          repO.trace(xy, { couleur: c, largeur: 2 });
          for (const [a, b] of xy) repO.point(a, b, { rayon: 3, couleur: c });
        }
        const lh = Math.log10(r.h);
        if (lh >= -3 && lh <= 0) repO.trace([[lh, -20], [lh, 5]], { couleur: col.perturbation, largeur: 1, tirets: [4, 4] });
      }
      const legendeOrdre = document.createElement('div');
      legende(legendeOrdre, Object.keys(ordres).map((s) => ({ texte: `${STYLES[s].texte} : pente ${nombreCourt(pente(ordres[s].slice(2)), 3)}`, couleur: STYLES[s].couleur(col) })));
      zoneOrdre.replaceChildren(...legendeOrdre.childNodes);
    }

    outils.surTheme(dessine);
    dessine();
    return {
      applique() {
        champs.h.fixe(r.h);
        champs.T.fixe(r.T);
        dessine();
      },
    };
  },
};
