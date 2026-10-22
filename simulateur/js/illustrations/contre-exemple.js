// Contre-exemple du poly (stabilité par linéarisation) : deux champs de même
// linéarisé en 0, un centre de valeurs propres ±i,
//   f(x) = (x₂ − x₁ρ, −x₁ − x₂ρ),  g(x) = (x₂ + x₁ρ, −x₁ + x₂ρ),  ρ = x₁² + x₂².
// Pour f, ρ̇ = −2ρ² : ρ(t) = ρ₀/(1 + 2ρ₀t) → 0, l'origine est asymptotiquement
// stable. Pour g, ρ̇ = 2ρ² : ρ(t) = ρ₀/(1 − 2ρ₀t), qui explose en t = 1/(2ρ₀).

import { nombreCourt } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { carte, legende, paragraphe, simule, tableau, toile } from './commun.js';

export const champF = (x) => {
  const rho = x[0] * x[0] + x[1] * x[1];
  return [x[1] - x[0] * rho, -x[0] - x[1] * rho];
};
export const champG = (x) => {
  const rho = x[0] * x[0] + x[1] * x[1];
  return [x[1] + x[0] * rho, -x[0] + x[1] * rho];
};
export const rhoF = (rho0, t) => rho0 / (1 + 2 * rho0 * t);
export const rhoG = (rho0, t) => (t < 1 / (2 * rho0) ? rho0 / (1 - 2 * rho0 * t) : Infinity);

const DUREE = 12;

export default {
  etat: { x1: 0.8, x2: 0 },

  rappel: [
    'Si $x_e$ est stable, toutes les valeurs propres de $f\'(x_e)$ sont de partie réelle négative ou nulle. La réciproque est fausse.',
    '$$f(x) = \\begin{pmatrix} x_2 - x_1(x_1^2 + x_2^2) \\\\ -x_1 - x_2(x_1^2 + x_2^2) \\end{pmatrix}$$',
    '$$g(x) = \\begin{pmatrix} x_2 + x_1(x_1^2 + x_2^2) \\\\ -x_1 + x_2(x_1^2 + x_2^2) \\end{pmatrix}$$',
    'Les deux ont le même linéarisé en $0$, $\\begin{pmatrix} 0 & 1 \\\\ -1 & 0 \\end{pmatrix}$, de valeurs propres $\\pm i$. Avec $\\rho = x_1^2 + x_2^2$, on trouve $\\dot\\rho = -2\\rho^2$ pour $f$ et $\\dot\\rho = 2\\rho^2$ pour $g$ : l’origine est asymptotiquement stable pour $f$, instable pour $g$.',
  ],

  essais: [
    { texte: 'Partez tout près de l’origine : les deux systèmes ressemblent longtemps au linéarisé (un cercle), puis s’en écartent.', etat: { x1: 0.2, x2: 0 } },
    { texte: 'Vérifiez sur le tableau que $\\rho(t) = \\rho_0/(1 + 2\\rho_0 t)$ pour $f$ : la convergence est lente, en $1/t$, pas exponentielle.', etat: { x1: 1, x2: 0 } },
    { texte: 'Pour $g$, à quel instant la solution explose-t-elle ? Comparez à $1/(2\\rho_0)$.', etat: { x1: 0.5, x2: 0.5 } },
  ],

  monte(zone, outils) {
    const r = outils.etat;
    const grille = document.createElement('div');
    grille.className = 'grille-2';
    zone.appendChild(grille);
    const panneaux = [
      { titre: '$\\dot x = f(x)$ : asymptotiquement stable', F: champF },
      { titre: '$\\dot x = g(x)$ : instable', F: champG },
    ].map(({ titre, F }) => {
      const c = carte(grille, titre);
      const canvas = toile(c, '1 / 1', () => dessine());
      canvas.classList.add('cliquable');
      const rep = new Repere(canvas, { x: [-1.6, 1.6], y: [-1.6, 1.6], egal: true });
      canvas.addEventListener('pointerdown', (ev) => {
        const [x1, x2] = rep.versMonde(ev);
        outils.change({ x1: Number(x1.toFixed(3)), x2: Number(x2.toFixed(3)) });
        dessine();
      });
      return { F, rep };
    });

    const cRho = carte(zone, '$\\rho(t) = \\|x(t)\\|^2$');
    const canvasR = toile(cRho, '3 / 1', () => dessine());
    const repR = new Repere(canvasR, { x: [0, DUREE], y: [0, 2] });
    const legendeR = document.createElement('div');
    cRho.appendChild(legendeR);
    const zoneTableau = document.createElement('div');
    cRho.appendChild(zoneTableau);

    function dessine() {
      const col = couleurs();
      const rho0 = r.x1 * r.x1 + r.x2 * r.x2;
      const trajets = panneaux.map(({ F }) => simule((t, x) => F(x), [r.x1, r.x2], DUREE, 0.002, 50));
      panneaux.forEach(({ F, rep }, i) => {
        if (!rep.prepare()) return;
        rep.champ((a, b) => F([a, b]), { n: 15, couleur: col.discret });
        rep.axes({ noms: ['x₁', 'x₂'], grille: false });
        // Linéarisé : un centre, le cercle de rayon √ρ₀.
        const cercle = [];
        for (let k = 0; k <= 100; k++) cercle.push([Math.sqrt(rho0) * Math.cos((2 * Math.PI * k) / 100), Math.sqrt(rho0) * Math.sin((2 * Math.PI * k) / 100)]);
        rep.trace(cercle, { couleur: col.trait, largeur: 1.2, tirets: [6, 4] });
        rep.trace(trajets[i].x, { couleur: i === 0 ? col.accent : col.alerte, largeur: 2 });
        rep.point(r.x1, r.x2, { rayon: 5, couleur: col.perturbation });
        rep.point(0, 0, { rayon: 3, couleur: col.trait });
      });

      const tExplosion = rho0 > 0 ? 1 / (2 * rho0) : Infinity;
      const ymax = Math.min(4, Math.max(1.2 * rho0, 0.5) * 2);
      repR.fixeCadre([0, DUREE], [0, ymax]);
      if (repR.prepare()) {
        repR.axes({ noms: ['t', 'ρ'] });
        repR.trace([[0, rho0], [DUREE, rho0]], { couleur: col.trait, largeur: 1.2, tirets: [6, 4] });
        if (Number.isFinite(tExplosion) && tExplosion < DUREE) repR.trace([[tExplosion, 0], [tExplosion, 100]], { couleur: col.alerte, largeur: 1, tirets: [3, 4] });
        trajets.forEach((tr, i) => repR.trace(tr.t.map((t, k) => [t, tr.x[k][0] ** 2 + tr.x[k][1] ** 2]), { couleur: i === 0 ? col.accent : col.alerte, largeur: 2 }));
      }
      legendeR.textContent = '';
      legende(legendeR, [
        { texte: '$f$ : $\\rho_0/(1 + 2\\rho_0 t)$', couleur: col.accent },
        { texte: `$g$ : $\\rho_0/(1 - 2\\rho_0 t)$, explose en $t = 1/(2\\rho_0)$`, couleur: col.alerte },
        { texte: 'linéarisé : $\\rho$ constant', couleur: col.trait, tirets: true },
      ]);
      zoneTableau.textContent = '';
      const [tf, tg] = trajets;
      const lit = (tr, t) => {
        const k = Math.round(t / 0.002);
        return k < tr.x.length ? nombreCourt(tr.x[k][0] ** 2 + tr.x[k][1] ** 2) : 'explosé';
      };
      tableau(
        zoneTableau,
        ['t', 'ρ exact (f)', 'ρ simulé (f)', 'ρ exact (g)', 'ρ simulé (g)'],
        [0.25, 0.5, 1, 2, 5, 10].map((t) => [String(t).replace('.', ','), nombreCourt(rhoF(rho0, t)), lit(tf, t), Number.isFinite(rhoG(rho0, t)) ? nombreCourt(rhoG(rho0, t)) : '+∞', lit(tg, t)]),
      );
      paragraphe(zoneTableau, `$\\rho_0 = ${nombreCourt(rho0).replace(',', '{,}')}$ : pour $g$, explosion en $t = 1/(2\\rho_0) \\approx ${nombreCourt(tExplosion).replace(',', '{,}')}$.`);
    }

    outils.surTheme(dessine);
    dessine();
    return { applique: dessine };
  },
};
