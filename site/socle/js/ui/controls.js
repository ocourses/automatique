// Champs de réglage : curseur couplé à une saisie au clavier.

import { rend } from './katex.js';

function nombre(saisie) {
  return Number(String(saisie).replace(',', '.').replace('−', '-'));
}

// Valeur écrite dans une boîte : `chiffres` chiffres significatifs, virgule.
const affiche = (v, chiffres = 6) => String(Number(Number(v).toPrecision(chiffres))).replace('.', ',');

// Nom accessible d'une étiquette rendue par KaTeX : le texte MathML, sans
// l'annotation qui répète la source LaTeX (sinon « t0t_0t0 »).
function nomLisible(etiquette) {
  const mathml = etiquette.querySelector('.katex-mathml');
  if (!mathml) return etiquette.textContent;
  const annotation = mathml.querySelector('annotation')?.textContent ?? '';
  return mathml.textContent.replace(annotation, '').trim();
}

// Étiquette, boîte de saisie et unité, communes aux deux sortes de champs.
function elements(latex, unite) {
  const etiquette = document.createElement('label');
  rend(etiquette, latex, false);
  const saisie = document.createElement('input');
  Object.assign(saisie, { type: 'text', inputMode: 'decimal' });
  saisie.setAttribute('aria-label', nomLisible(etiquette));
  const u = document.createElement('span');
  u.className = 'unite';
  u.textContent = unite;
  return { etiquette, saisie, u };
}

// Les deux petits boutons ▲ ▼ d'une boîte de saisie. `decale(sens)` est appelé
// au clic, puis répété tant que le bouton est maintenu.
function boutonsPas(nom, decale) {
  const boutons = document.createElement('div');
  boutons.className = 'pas-boutons';
  for (const [symbole, sens, verbe] of [['▲', 1, 'Augmenter'], ['▼', -1, 'Diminuer']]) {
    const b = document.createElement('button');
    Object.assign(b, { type: 'button', textContent: symbole, tabIndex: -1 });
    b.setAttribute('aria-label', `${verbe} ${nom}`);
    let minuteur = null;
    const repete = (delai) => {
      minuteur = setTimeout(() => {
        decale(sens);
        repete(80);
      }, delai);
    };
    b.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      decale(sens);
      repete(450);
    });
    for (const e of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(e, () => clearTimeout(minuteur));
    boutons.appendChild(b);
  }
  return boutons;
}

// Ajoute à une boîte de saisie numérique `saisie` les boutons ▲ ▼ et les touches
// ↑ ↓ (PageHaut, PageBas ou Maj : dix pas), qui la déplacent de `pas` dans
// [min, max]. La boîte est enveloppée (elle garde sa place dans la page) et la
// valeur est validée comme une saisie au clavier : un événement « change » est
// émis, que le module écoute déjà. Renvoie l'enveloppe.
export function ajoutePas(saisie, options = {}) {
  // Les bornes sont relues à chaque pas : `options.limites` (un objet { min, max }
  // que l'appelant modifie après coup) ou, à défaut, `options.min` et `options.max`.
  // `lis` lit la valeur écrite (par exemple une fraction).
  const { pas = 0.1, nom = saisie.getAttribute('aria-label') ?? '', lis = nombre } = options;
  // Un pas de plus ou de moins, borné ; on arrondit les erreurs de flottant.
  const decale = (sens, facteur = 1) => {
    const { min = -Infinity, max = Infinity } = options.limites ?? options;
    const courant = lis(saisie.value);
    const v = Math.min(max, Math.max(min, Number(((Number.isFinite(courant) ? courant : 0) + sens * facteur * pas).toFixed(6))));
    saisie.value = affiche(v);
    saisie.dispatchEvent(new Event('change'));
  };
  saisie.addEventListener('keydown', (ev) => {
    const sens = { ArrowUp: 1, ArrowDown: -1, PageUp: 1, PageDown: -1 }[ev.key];
    if (!sens) return;
    ev.preventDefault();
    decale(sens, ev.key.startsWith('Page') || ev.shiftKey ? 10 : 1);
  });
  const boite = document.createElement('div');
  boite.className = 'saisie-pas';
  saisie.replaceWith(boite);
  boite.append(saisie, boutonsPas(nom, decale));
  return boite;
}

// Ajoute une ligne « étiquette, curseur, saisie, unité » à `parent` et appelle
// `change(valeur)` à chaque modification valide. Trois moyens de régler la
// valeur : le curseur (et ← → quand il a le focus), les boutons ▲ ▼ de la boîte
// de saisie et les touches ↑ ↓ (PageHaut, PageBas ou Maj : dix pas) quand elle a
// le focus, enfin la saisie au clavier. Les boutons et les touches déplacent la
// valeur de `pasFleche` (par défaut `pas`).
export function champ(parent, { latex, min, max, pas, valeur, unite = '', pasFleche = pas }, change) {
  const { etiquette, saisie, u } = elements(latex, unite);
  const curseur = document.createElement('input');
  Object.assign(curseur, { type: 'range', min, max, step: pas });
  curseur.setAttribute('aria-label', nomLisible(etiquette));
  const fixe = (v, chiffres = 6) => {
    curseur.value = v;
    saisie.value = affiche(v, chiffres);
  };
  fixe(valeur);

  curseur.addEventListener('input', () => {
    saisie.value = curseur.value.replace('.', ',');
    change(Number(curseur.value));
  });
  saisie.addEventListener('change', () => {
    const v = nombre(saisie.value);
    if (!Number.isFinite(v)) {
      saisie.value = curseur.value.replace('.', ',');
      return;
    }
    // La saisie au clavier peut sortir des bornes du curseur.
    curseur.value = v;
    change(v);
  });

  const ligne = document.createElement('div');
  ligne.className = 'champ';
  ligne.append(etiquette, curseur, saisie, u);
  parent.appendChild(ligne);
  const limites = { min, max };
  ajoutePas(saisie, { pas: pasFleche, limites, nom: nomLisible(etiquette) });
  // `bornes(min, max)` change l'étendue du curseur et des flèches (le cadre
  // d'une figure qui dépend d'un choix) ; la saisie au clavier peut en sortir.
  // `fixeMax(m)` ne change que le maximum (la valeur maximale d'un indice
  // dépend du cas choisi).
  const bornes = (a, b) => {
    Object.assign(curseur, { min: a, max: b });
    Object.assign(limites, { min: a, max: b });
  };
  return { fixe: (v) => fixe(v, 4), bornes, fixeMax: (m) => bornes(limites.min, m) };
}

// Saisie numérique seule ; `change(valeur)` est appelé à chaque saisie valide.
export function saisieNombre(parent, latex, valeur, unite = '', change = null, { pas = 0.1, min, max } = {}) {
  const { etiquette, saisie, u } = elements(latex, unite);
  const ligne = document.createElement('div');
  ligne.className = 'champ champ-court';
  ligne.append(etiquette, saisie, u);
  parent.appendChild(ligne);
  ajoutePas(saisie, { pas, min, max, nom: nomLisible(etiquette) });
  const api = {
    ligne,
    lit: () => nombre(saisie.value),
    fixe: (v) => {
      saisie.value = affiche(v, 4);
    },
  };
  api.fixe(valeur);
  if (change) {
    saisie.addEventListener('change', () => {
      const v = api.lit();
      if (Number.isFinite(v)) change(v);
    });
  }
  return api;
}
