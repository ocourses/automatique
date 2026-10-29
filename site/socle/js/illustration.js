// Page générique d'une illustration (modeles/illustration.html) :
// illustration.html?id=<identifiant>. `demarreIllustration(config)` trouve
// l'illustration dans le catalogue, charge son module par `config.charge` et le
// monte dans le gabarit : rappel du cours, essais, réglages gardés dans l'URL,
// préférences d'affichage gardées dans le navigateur sous
// `<config.id>.illustration.<id>`.
//
// Une fois la page remplie, `<body>` porte `data-ok="1"` (scripts/fumee.py).
//
// Le contrat du module (monte, etat, choix, preferences, rappel, essais, termes)
// et les `outils` passés à `monte` sont décrits dans docs/conception.md
// (« Contrat d'un module d'illustration ») et vérifiés par `verifieCours`.

import { trouve } from './catalogue.js';
import { CHOIX_DE_LA_PAGE, PREFERENCES_DE_LA_PAGE, valideConfig } from './config.js';
import { appliqueGlossaire } from './glossaire.js';
import { installeNavigation, parcours } from './parcours.js';
import { typographie } from './ui/format.js';
import { chargeKatex, rend, rendTexte } from './ui/katex.js';
import { initOnglets } from './ui/onglets.js';
import { Preferences } from './ui/preferences.js';
import { surChangementTheme } from './ui/theme.js';

const $ = (id) => document.getElementById(id);

// Réglages : valeurs par défaut du module, remplacées par celles de l'URL
// lorsqu'elles sont lisibles, du même type et, pour un texte, permises par `choix`.
export function lisEtat(defaut, q, choix = {}) {
  const etat = { ...defaut };
  for (const [cle, v] of Object.entries(defaut)) {
    if (!q.has(cle)) continue;
    const brut = q.get(cle);
    if (typeof v === 'number') {
      const n = Number(brut);
      if (Number.isFinite(n)) etat[cle] = n;
    } else if (typeof v === 'boolean') {
      etat[cle] = brut === '1';
    } else if (!choix[cle] || choix[cle].includes(brut)) {
      etat[cle] = brut;
    }
  }
  return etat;
}

export function versRecherche(id, etat) {
  const q = new URLSearchParams({ id });
  for (const [cle, v] of Object.entries(etat)) {
    q.set(cle, typeof v === 'number' ? String(Number(v.toPrecision(10))) : typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  return q;
}

// L'URL est écrite tout de suite (un rechargement juste après un clic garde le
// changement), puis au plus une fois toutes les 200 ms pendant un glisser : les
// navigateurs limitent le nombre d'appels à history.replaceState. Un changement
// fait juste avant de quitter ou de recharger la page n'est pas perdu.
function memoireURL(id, etat) {
  let minuterie = null;
  let derniere = -Infinity;
  const ecrit = () => {
    minuterie = null;
    derniere = performance.now();
    history.replaceState(null, '', `?${versRecherche(id, etat)}`);
  };
  window.addEventListener('pagehide', () => {
    clearTimeout(minuterie);
    ecrit();
  });
  return () => {
    if (minuterie) return;
    const attente = 200 - (performance.now() - derniere);
    if (attente <= 0) ecrit();
    else minuterie = setTimeout(ecrit, attente);
  };
}

// Paragraphes du cours : un texte avec formules $…$, une formule seule $$…$$, ou
// un tableau de textes (liste à puces).
function rendRappel(rappel, paragraphes) {
  for (const paragraphe of [].concat(paragraphes ?? [])) {
    if (Array.isArray(paragraphe)) {
      const ul = document.createElement('ul');
      for (const item of paragraphe) {
        const li = document.createElement('li');
        rendTexte(li, item);
        ul.appendChild(li);
      }
      rappel.appendChild(ul);
      continue;
    }
    const p = document.createElement('p');
    if (paragraphe.startsWith('$$') && paragraphe.endsWith('$$')) rend(p, paragraphe.slice(2, -2));
    else rendTexte(p, paragraphe);
    rappel.appendChild(p);
  }
}

function bouton(classe, texte, clic) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = classe;
  b.textContent = texte;
  b.addEventListener('click', clic);
  return b;
}

export async function demarreIllustration(config) {
  valideConfig(config);
  const id = new URLSearchParams(location.search).get('id');
  const trouvee = trouve(config.themes, id);
  if (!trouvee || !trouvee.illustration.disponible) {
    $('titre').textContent = 'Illustration introuvable';
    $('page').hidden = true;
    $('introuvable').hidden = false;
    document.body.dataset.ok = '1';
    return;
  }
  const { theme, illustration } = trouvee;
  const [{ default: module }] = await Promise.all([config.charge(id), chargeKatex()]);
  installeNavigation(parcours(config), 'illustration', id);
  document.title = `${illustration.titre} · ${config.titre}`;
  $('titre').textContent = typographie(illustration.titre);
  $('source').textContent = typographie(illustration.source);
  $('fil-theme').textContent = typographie(theme.titre);

  const etat = lisEtat(module.etat ?? {}, new URLSearchParams(location.search), module.choix);
  const memorise = memoireURL(id, etat);
  const rappel = $('rappel');
  rendRappel(rappel, module.rappel);

  // ---- Illustration --------------------------------------------------------------
  const rappelsTheme = [];
  const outils = {
    etat,
    // Met à jour des réglages (et l'URL) ; l'illustration se redessine d'elle-même.
    change(partiel) {
      Object.assign(etat, partiel);
      memorise();
    },
    // Préférences d'affichage, gardées dans le navigateur (hors du lien).
    preferences: new Preferences(`${config.id}.illustration.${id}`, { ...PREFERENCES_DE_LA_PAGE, ...module.preferences }, undefined, {
      ...CHOIX_DE_LA_PAGE,
      ...module.choix,
    }),
    rend,
    rendTexte,
    // Souligne des termes du glossaire dans un texte de l'illustration.
    glossaire: (element, cles) => appliqueGlossaire(config.glossaire, element, cles),
    mouvementReduit: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    surTheme: (f) => rappelsTheme.push(f),
  };
  const instance = module.monte($('zone'), outils);
  surChangementTheme(() => rappelsTheme.forEach((f) => f()));
  const applique = (partiel) => {
    outils.change(partiel);
    instance.applique(partiel);
  };

  // ---- Réinitialiser -------------------------------------------------------------
  // Remet les réglages du module à leurs valeurs par défaut (les préférences
  // d'affichage restent), comme le fait un essai. Le bouton n'affiche que « ↺ » :
  // avec le libellé, trois actions faisaient passer les titres longs sur deux
  // lignes (#26) ; son nom accessible reste « Réinitialiser ».
  const defaut = { ...module.etat };
  if (Object.keys(defaut).length > 0) {
    const reinit = bouton('bouton-lien', '↺', () => applique(defaut));
    reinit.setAttribute('aria-label', 'Réinitialiser');
    reinit.title = 'Réinitialiser : remet les réglages de la page à leurs valeurs de départ';
    document.querySelector('.entete-actions')?.prepend(reinit);
  }

  // ---- À essayer -----------------------------------------------------------------
  const liste = $('essais');
  const essais = module.essais ?? [];
  $('onglet-essais').hidden = essais.length === 0;
  for (const essai of essais) {
    const li = document.createElement('li');
    const texte = document.createElement('span');
    rendTexte(texte, essai.texte);
    li.appendChild(texte);
    if (essai.etat) {
      li.append(
        ' ',
        bouton('essayer', 'Essayer', () => {
          if (essai.preferences) outils.preferences.change(essai.preferences);
          applique(essai.etat);
        }),
      );
    }
    liste.appendChild(li);
  }
  // Termes du glossaire : définitions du poly en infobulle.
  if (module.termes) {
    appliqueGlossaire(config.glossaire, rappel, module.termes);
    appliqueGlossaire(config.glossaire, liste, module.termes);
  }

  // L'onglet ouvert (cours ou essais) est gardé dans les préférences.
  initOnglets('illustration-texte', {
    defaut: PREFERENCES_DE_LA_PAGE.onglet,
    initial: outils.preferences.valeurs.onglet,
    change: (onglet) => outils.preferences.change({ onglet }),
  });
  document.body.dataset.ok = '1';
}
