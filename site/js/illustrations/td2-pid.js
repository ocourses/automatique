// TD2 : du retour d'état au PID, pour θ̈ − θ = u (+ d), θ(0) = 1, θ̇(0) = −2.
//
// Quatre étapes, comme dans l'énoncé :
//   1. boucle ouverte u = 3e^{−2t} : la trajectoire nominale tend vers 0, mais
//      une erreur ε sur θ̇(0) ajoute ε sinh t, qui diverge ;
//   2. retour d'état u = k₁θ + k₂θ̇ : stable si et seulement si k₁ < −1 et k₂ < 0 ;
//   3. perturbation en créneau d = ε sur [1, 2] : rejetée ;
//   4. perturbation constante e : le retour d'état converge vers
//      θ∞ = −e/(1 + k₁) ; le PID (k₀, k₁, k₂) = (−6, −12, −6) ramène θ à 0.

import { valeursPropres } from '../core/linalg.js';
import { champ } from '../ui/controls.js';
import { latexComplexeFixe, nombreCourt } from '../ui/format.js';
import { Repere } from '../ui/repere.js';
import { couleurs } from '../ui/theme.js';
import { barreOutils, boutonInfo, carte, choixRadios, glisse, legende, paragraphe, simule, tableau, toile, zoomable } from './commun.js';

const X0 = [1, -2];
const DUREE = 10;

// ---- Mathématiques (testées sous Node) -------------------------------------------

// Étape 1 : θ(t) exact en boucle ouverte, u = 3e^{−2t}, θ̇(0) = −2 + ε.
export function thetaBoucleOuverte(t, eps) {
  return Math.exp(-2 * t) + eps * Math.sinh(t);
}

// Retour d'état u = k₁θ + k₂θ̇ : matrice du bouclé A + BK.
export function matriceBouclee(k1, k2) {
  return [
    [0, 1],
    [1 + k1, k2],
  ];
}

export const hurwitzPD = (k1, k2) => k1 < -1 && k2 < 0;

// Étape 4 : équilibre du retour d'état sous perturbation constante e.
export const thetaInfiniPD = (e, k1) => -e / (1 + k1);

// Étape 4 : système augmenté (x₀ = ∫θ, x₁ = θ, x₂ = θ̇) bouclé par le PID.
export function matricePID(k0, k1, k2) {
  return [
    [0, 1, 0],
    [0, 0, 1],
    [k0, 1 + k1, k2],
  ];
}

// Seconds membres des essais de chaque étape.
export function essaisEtape(etape, r) {
  const creneau = (t) => (t >= 1 && t <= 2 ? r.d : 0);
  switch (etape) {
    case 'ouverte':
      return [
        { nom: 'nominal', x0: X0, F: (t, x) => [x[1], x[0] + 3 * Math.exp(-2 * t)] },
        { nom: 'perturbe', x0: [1, -2 + r.eps], F: (t, x) => [x[1], x[0] + 3 * Math.exp(-2 * t)] },
      ];
    case 'retour':
      return [
        { nom: 'nominal', x0: X0, F: (t, x) => [x[1], x[0] + r.k1 * x[0] + r.k2 * x[1]] },
        { nom: 'perturbe', x0: [1, -2 + r.eps], F: (t, x) => [x[1], x[0] + r.k1 * x[0] + r.k2 * x[1]] },
      ];
    case 'creneau':
      return [
        { nom: 'nominal', x0: X0, F: (t, x) => [x[1], x[0] + r.k1 * x[0] + r.k2 * x[1]] },
        { nom: 'perturbe', x0: X0, F: (t, x) => [x[1], x[0] + r.k1 * x[0] + r.k2 * x[1] + creneau(t)] },
      ];
    default:
      return [
        { nom: 'pd', x0: X0, F: (t, x) => [x[1], x[0] + r.k1 * x[0] + r.k2 * x[1] + r.e] },
        // État (θ, θ̇, ∫θ) ; on garde θ en première composante pour le tracé.
        {
          nom: 'pid',
          x0: [...X0, 0],
          F: (t, x) => [x[1], x[0] + r.p0 * x[2] + r.p1 * x[0] + r.p2 * x[1] + r.e, x[0]],
        },
      ];
  }
}

// ---- Illustration ------------------------------------------------------------------

const ETAPES = [
  { id: 'ouverte', titre: '1. Boucle ouverte' },
  { id: 'retour', titre: '2. Retour d’état' },
  { id: 'creneau', titre: '3. Perturbation en créneau' },
  { id: 'constante', titre: '4. Perturbation constante et PID' },
];

const TEXTES = {
  ouverte:
    'Commande calculée à l’avance, $u(t) = 3e^{-2t}$ : la trajectoire nominale est $\\theta(t) = e^{-2t}$, qui tend vers 0. ' +
    'Avec une erreur $\\varepsilon$ sur $\\dot\\theta(0)$, la solution devient $e^{-2t} + \\varepsilon\\sinh t$ et diverge dès que $\\varepsilon \\neq 0$ : $A$ a la valeur propre $+1$.',
  retour:
    'Retour d’état $u = k_1\\theta + k_2\\dot\\theta$ : le bouclé a pour matrice $A + BK = \\begin{pmatrix} 0 & 1 \\\\ 1 + k_1 & k_2 \\end{pmatrix}$, ' +
    'de trace $k_2$ et de déterminant $-(1 + k_1)$. L’origine est asymptotiquement stable si et seulement si $k_1 < -1$ et $k_2 < 0$. La même erreur $\\varepsilon$ ne fait plus diverger.',
  creneau:
    'Perturbation $d(t) = \\varepsilon$ sur $[1, 2]$, nulle ailleurs. Après $t = 2$, le bouclé repart de $x(2)$ avec $\\dot x = (A + BK)x$ : il revient à 0, quelle que soit la condition initiale.',
  constante:
    'Perturbation constante $e$. Le retour d’état converge vers $\\theta_\\infty = -e/(1 + k_1) \\neq 0$ : c’est l’erreur statique. ' +
    'En ajoutant la primitive $x_0 = \\int_0^t \\theta$ (action intégrale), le PID $u = k_1\\theta + k_0\\int_0^t\\theta + k_2\\dot\\theta$ ramène $\\theta$ à 0, et $x_0 \\to -e/k_0$.',
};

export default {
  etat: { etape: 'ouverte', eps: 0.01, k1: -3, k2: -2, d: 2, e: 1, p0: -6, p1: -12, p2: -6 },

  choix: { etape: ETAPES.map((e) => e.id) },

  termes: ['matrice de Hurwitz', 'stabilisable'],

  rappel: [
    'Une commande en boucle ouverte ne stabilise pas : la moindre erreur sur l’état initial ou sur le modèle se propage si le système est instable.',
    'Un retour d’état $u = Kx$ stabilise l’origine si $A + BK$ est une matrice de Hurwitz. Pour une matrice $(2, 2)$, c’est équivalent à $\\operatorname{tr} < 0$ et $\\det > 0$ (TD1).',
    'Sous une perturbation constante, un retour d’état stabilise un autre point que l’origine. L’action intégrale supprime cette erreur statique : c’est le principe du PID.',
  ],

  // Chaque essai fixe tous les paramètres qu'il utilise : la figure montre
  // alors ce que le texte décrit, quels que soient les réglages précédents.
  essais: [
    { texte: 'Boucle ouverte : avec $\\varepsilon = 0{,}01$, à quel instant $\\theta$ dépasse-t-il 1 ? Comparez au tableau.', etat: { etape: 'ouverte', eps: 0.01 } },
    { texte: 'Retour d’état, $k_1 = -0{,}5$ et $k_2 = -2$ : le point est hors du quart de plan $k_1 < -1$, $k_2 < 0$. Que fait $\\theta$ ? Puis passez dans le quart de plan.', etat: { etape: 'retour', eps: 0.01, k1: -0.5, k2: -2 } },
    { texte: 'Retour d’état : depuis $(k_1, k_2) = (-1{,}5\\ ;\\ -2)$, diminuez $k_1$ jusqu’à franchir la parabole en tirets. Qu’est-ce qui change dans la forme de $\\theta(t)$, et dans les valeurs propres ?', etat: { etape: 'retour', eps: 0.01, k1: -1.5, k2: -2 } },
    { texte: 'Créneau : augmentez $\\varepsilon$ (ici 5). La trajectoire revient-elle toujours à 0 ? Le système est linéaire : l’écart est proportionnel à $\\varepsilon$.', etat: { etape: 'creneau', k1: -3, k2: -2, d: 5 } },
    { texte: 'Perturbation constante $e = 1$ : vérifiez sur le tableau que $\\theta_\\infty = -e/(1 + k_1)$, puis que le PID ramène $\\theta$ à 0.', etat: { etape: 'constante', e: 1, k1: -3, k2: -2, p0: -6, p1: -12, p2: -6 } },
    { texte: 'PID : prenez $k_0 = 0$. On retrouve le retour d’état : que devient l’erreur statique ?', etat: { etape: 'constante', e: 1, k1: -3, k2: -2, p0: 0, p1: -12, p2: -6 } },
  ],

  monte(zone, outils) {
    const r = outils.etat;

    // ---- Étapes ---------------------------------------------------------------
    const etapes = choixRadios(barreOutils(zone), {
      nom: 'etape',
      options: ETAPES.map(({ id, titre }) => ({ valeur: id, texte: titre })),
      change: (valeur) => {
        outils.change({ etape: valeur });
        miseAJour();
      },
    });
    const cEtapes = carte(zone);
    // Hauteur réservée : les figures ne bougent pas d'une étape à l'autre.
    const texteEtape = document.createElement('div');
    texteEtape.className = 'texte-fixe';
    cEtapes.appendChild(texteEtape);
    const explication = paragraphe(texteEtape, '', '');

    // ---- Courbe θ(t) et panneau de droite ----------------------------------------
    const grille = document.createElement('div');
    grille.className = 'grille-2 principale';
    zone.appendChild(grille);
    const cCourbe = carte(grille, '$\\theta(t)$');
    boutonInfo(cCourbe, [
      ['tirets', '--discret', 'Trajectoire nominale : celle que l’on vise, sans erreur ni perturbation.'],
      ['ligne', '--accent', 'Trajectoire avec l’erreur $\\varepsilon$, le créneau $d$ ou le retour d’état $k_1\\theta + k_2\\dot\\theta$, selon l’étape.'],
      ['ligne', '--texte', 'Étape 4 : le PID, qui ajoute l’action intégrale.'],
      ['tirets', '--accent', 'Étape 4 : l’erreur statique $\\theta_\\infty = -e/(1 + k_1)$ du retour d’état.'],
      ['zone', '--zone-stable', 'Étape 3 : l’intervalle $[1, 2]$ où agit le créneau.'],
      ['point', '--perturbation', 'La condition initiale $\\theta(0) = 1$.'],
    ]);
    const canvasT = toile(cCourbe, '4 / 3', () => dessine());
    const repT = new Repere(canvasT, { x: [0, DUREE], y: [-1, 2] });
    const barreT = document.createElement('div');
    barreT.className = 'barre-legende';
    cCourbe.appendChild(barreT);
    const zoneLegende = document.createElement('div');
    barreT.appendChild(zoneLegende);
    let cadreAuto = { x: [0, DUREE], y: [-1, 2] };
    const zoomT = zoomable(canvasT, repT, { barre: barreT, auto: () => cadreAuto, redessine: () => dessine(), tempsPositif: true });

    const cDroite = carte(grille);
    const titreDroite = document.createElement('h2');
    cDroite.appendChild(titreDroite);
    const canvasK = toile(cDroite, '4 / 3', () => dessine());
    const repK = new Repere(canvasK, { x: [-6, 2], y: [-5, 2] });
    canvasK.classList.add('saisissable');
    const verdict = paragraphe(cDroite, '', 'verdict');
    const reglages = document.createElement('div');
    cDroite.appendChild(reglages);
    const zoneTableau = document.createElement('div');
    cDroite.appendChild(zoneTableau);

    // Curseurs : on les reconstruit à chaque changement d'étape.
    let champs = {};
    const curseur = (cle, latex, min, max, pas) => {
      champs[cle] = champ(reglages, { latex, min, max, pas, pasFleche: max - min >= 1 ? Math.max(pas, 0.1) : pas * 10, valeur: r[cle] }, (v) => {
        outils.change({ [cle]: v });
        dessine();
      });
    };
    const construitReglages = () => {
      reglages.textContent = '';
      champs = {};
      // Six curseurs à l'étape 4 : sur deux colonnes, pour laisser la place au plan.
      reglages.className = r.etape === 'constante' ? 'reglages-2' : '';
      if (r.etape === 'ouverte' || r.etape === 'retour') curseur('eps', '\\varepsilon', -0.05, 0.05, 0.001);
      if (r.etape !== 'ouverte') {
        curseur('k1', 'k_1', -6, 2, 0.05);
        curseur('k2', 'k_2', -5, 2, 0.05);
      }
      if (r.etape === 'creneau') curseur('d', '\\varepsilon', 0, 6, 0.1);
      if (r.etape === 'constante') {
        curseur('e', 'e', -2, 2, 0.05);
        curseur('p0', 'k_0^{\\mathrm{PID}}', -12, 2, 0.1);
        curseur('p1', 'k_1^{\\mathrm{PID}}', -20, 2, 0.1);
        curseur('p2', 'k_2^{\\mathrm{PID}}', -12, 2, 0.1);
      }
    };

    // Le point (k₁, k₂) se déplace à la souris.
    glisse(canvasK, repK, {
      prend: () => r.etape !== 'ouverte',
      deplace: (x, y) => {
        const k1 = Math.round(x * 20) / 20;
        const k2 = Math.round(y * 20) / 20;
        outils.change({ k1, k2 });
        champs.k1?.fixe(k1);
        champs.k2?.fixe(k2);
        dessine();
      },
    });

    // ---- Dessin -----------------------------------------------------------------
    function dessine() {
      const c = couleurs();
      const essais = essaisEtape(r.etape, r);
      const duree = Math.max(DUREE, zoomT.cadre().x[1]);
      const trajets = essais.map((e) => simule(e.F, e.x0, duree, 0.01, 1e3));
      const styles = {
        nominal: { couleur: c.discret, tirets: [6, 4], largeur: 1.5, texte: 'trajectoire nominale' },
        perturbe: {
          couleur: c.accent,
          largeur: 2.2,
          texte: r.etape === 'creneau' ? 'avec le créneau $d$' : 'avec l’erreur $\\varepsilon$ sur $\\dot\\theta(0)$',
        },
        pd: { couleur: c.accent, largeur: 2.2, texte: 'retour d’état $k_1\\theta + k_2\\dot\\theta$' },
        pid: { couleur: c.trait, largeur: 2.2, texte: 'PID' },
      };

      // θ(t)
      const yFixe = r.etape === 'ouverte' ? [-1.5, 3] : null;
      let [ymin, ymax] = yFixe ?? [-1, 1.2];
      if (!yFixe) {
        for (const tr of trajets) for (const x of tr.x) if (Math.abs(x[0]) < 4) [ymin, ymax] = [Math.min(ymin, x[0]), Math.max(ymax, x[0])];
        const m = 0.1 * (ymax - ymin);
        [ymin, ymax] = [ymin - m, ymax + m];
      }
      cadreAuto = { x: [0, DUREE], y: [ymin, ymax] };
      const cadre = zoomT.cadre();
      repT.fixeCadre(cadre.x, cadre.y);
      if (repT.prepare()) {
        if (r.etape === 'creneau') repT.region((t) => t >= 1 && t <= 2, { couleur: c.zone, pas: 3 });
        repT.axes({ noms: ['t', 'θ'] });
        if (r.etape === 'constante') {
          const th = thetaInfiniPD(r.e, r.k1);
          repT.trace([[cadre.x[0], th], [cadre.x[1], th]], { couleur: c.accent, largeur: 1, tirets: [3, 4] });
          repT.texte(cadre.x[1], th, 'θ∞ = −e/(1 + k₁)', { couleur: c.accent, align: 'right', dy: -5, fond: true });
        }
        essais.forEach((e, i) => {
          const s = styles[e.nom];
          repT.trace(trajets[i].t.map((t, k) => [t, trajets[i].x[k][0]]), { couleur: s.couleur, largeur: s.largeur, tirets: s.tirets ?? [] });
        });
        const theta0 = trajets[0].x[0][0];
        if (repT.contient(0, theta0)) repT.point(0, theta0, { rayon: 5, couleur: c.perturbation });
      }
      zoneLegende.textContent = '';
      legende(
        zoneLegende,
        essais.map((e) => ({ texte: styles[e.nom].texte, couleur: styles[e.nom].couleur, tirets: Boolean(styles[e.nom].tirets) })),
      );

      // Panneau de droite. Le tableau est construit à part et remplacé d'un coup :
      // vider la zone avant de dessiner agrandirait le canevas le temps de la
      // mesure, et le dessin resterait étiré.
      const nouveau = document.createElement('div');
      canvasK.hidden = r.etape === 'ouverte';
      if (r.etape === 'ouverte') {
        titreDroite.textContent = 'Valeurs prédites et simulées';
        verdict.className = 'verdict alerte';
        outils.rendTexte(verdict, `$A$ a les valeurs propres $-1$ et $+1$ : l’erreur $\\varepsilon\\sinh t$ croît comme $\\tfrac{\\varepsilon}{2}e^{t}$.`);
        const tr = trajets[1];
        tableau(
          nouveau,
          ['t', 'θ nominal', 'θ exact (ε)', 'θ simulé (ε)'],
          [2, 4, 6, 8].map((t) => {
            const k = Math.round(t / 0.01);
            return [String(t), nombreCourt(thetaBoucleOuverte(t, 0)), nombreCourt(thetaBoucleOuverte(t, r.eps)), nombreCourt(tr.x[k]?.[0] ?? NaN)];
          }),
        );
        zoneTableau.replaceChildren(...nouveau.childNodes);
        return;
      }
      titreDroite.textContent = 'Gains (k₁, k₂)';
      if (repK.prepare()) {
        repK.region((k1, k2) => hurwitzPD(k1, k2), { couleur: c.zone, pas: 4 });
        repK.axes({ noms: ['k₁', 'k₂'] });
        repK.trace([[-1, -50], [-1, 50]], { couleur: c.discret, largeur: 1 });
        // Parabole Δ = k₂² + 4(1 + k₁) = 0 : au-dessus des valeurs propres réelles, dessous complexes.
        const parabole = [];
        for (let k2 = -6; k2 <= 3; k2 += 0.05) parabole.push([-1 - (k2 * k2) / 4, k2]);
        repK.trace(parabole, { couleur: c.discret, largeur: 1, tirets: [5, 4] });
        repK.texte(-5.8, -1, 'Hurwitz : k₁ < −1, k₂ < 0', { couleur: c.accent });
        repK.point(r.k1, r.k2, { rayon: 6, couleur: hurwitzPD(r.k1, r.k2) ? c.accent : c.alerte });
      }
      const vp = valeursPropres(matriceBouclee(r.k1, r.k2));
      const stable = hurwitzPD(r.k1, r.k2);
      verdict.className = `verdict ${stable ? 'ok' : 'alerte'}`;
      const complexes = vp.some((z) => Math.abs(z.im) > 1e-9);
      outils.rendTexte(
        verdict,
        `Valeurs propres de $A + BK$ : $${vp.map((z) => latexComplexeFixe(z)).join(',\\ ')}$. ` +
          (stable
            ? `Matrice de Hurwitz : l’origine est asymptotiquement stable${complexes ? ', avec des oscillations amorties (sous la parabole)' : ', sans oscillation (au-dessus de la parabole)'}.`
            : 'Ce n’est pas une matrice de Hurwitz : l’origine n’est pas asymptotiquement stable.'),
      );
      if (r.etape === 'constante') {
        const [pd, pid] = trajets;
        const fin = (tr, i) => nombreCourt(tr.x[tr.x.length - 1][i]);
        const vpPID = valeursPropres(matricePID(r.p0, r.p1, r.p2));
        tableau(
          nouveau,
          ['', 'prédit', `simulé à t = ${DUREE}`],
          [
            ['θ∞ retour d’état', nombreCourt(thetaInfiniPD(r.e, r.k1)), fin(pd, 0)],
            ['θ∞ PID', '0', fin(pid, 0)],
            ['x₀∞ = ∫θ, PID', r.p0 !== 0 ? nombreCourt(-r.e / r.p0) : '—', fin(pid, 2)],
          ],
        );
        paragraphe(
          nouveau,
          `Valeurs propres du PID : $${vpPID.map((z) => latexComplexeFixe(z)).join(',\\ ')}$. ` +
            (vpPID.every((z) => z.re < 0) ? 'Matrice de Hurwitz.' : 'Ce n’est pas une matrice de Hurwitz.'),
        );
      }
      zoneTableau.replaceChildren(...nouveau.childNodes);
    }

    function miseAJour() {
      etapes.fixe(r.etape);
      outils.rendTexte(explication, TEXTES[r.etape]);
      construitReglages();
      dessine();
    }

    outils.surTheme(dessine);
    miseAJour();
    return {
      applique() {
        miseAJour();
      },
    };
  },
};
