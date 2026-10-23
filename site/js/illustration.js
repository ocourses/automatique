// Page générique d'une illustration : illustration.html?id=<identifiant>.
//
// Une illustration est un module js/illustrations/<id>.js qui exporte par défaut
//   { rappel, essais, etat, monte(zone, outils) } :
//   - rappel : paragraphes du cours (texte avec formules $…$), ou un seul texte ;
//     un élément qui est lui-même un tableau de textes devient une liste à puces ;
//   - essais : questions guidées, { texte, etat?, preferences? } ; avec `etat`,
//     un bouton « Essayer » applique ce réglage, et `preferences` les
//     préférences d'affichage voulues pour l'essai ;
//   - etat : réglages par défaut (nombres ou textes), gardés dans l'URL ;
//   - preferences : préférences d'affichage par défaut (booléens, nombres,
//     textes), gardées dans le navigateur ; `outils.preferences.valeurs` les
//     lit et `outils.preferences.change(partiel)` les enregistre ;
//   - choix : valeurs permises des réglages et préférences textuelles, par
//     exemple { forme: ['propres', 'compagnon'] } ; une autre valeur, lue dans
//     l'URL ou le navigateur, est remplacée par la valeur par défaut ;
//   - termes : termes du glossaire (js/illustrations/glossaire.js) employés par
//     la page ; leur première occurrence dans le cours et dans les essais est
//     soulignée, avec la définition du poly en infobulle ;
//   - monte(zone, outils) construit l'illustration et renvoie { applique(etat) }.
// Les titres, sources et thèmes viennent de js/illustrations/catalogue.js.

import { trouve } from './illustrations/catalogue.js';
import { appliqueGlossaire } from './illustrations/glossaire.js';
import { installeNavigation } from './parcours.js';
import { typographie } from './ui/format.js';
import { rend, rendTexte } from './ui/katex.js';
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

async function charge() {
  const id = new URLSearchParams(location.search).get('id');
  const trouvee = trouve(id);
  if (!trouvee || !trouvee.illustration.disponible) {
    $('titre').textContent = 'Illustration introuvable';
    $('page').hidden = true;
    $('introuvable').hidden = false;
    return;
  }
  const { theme, illustration } = trouvee;
  const module = (await import(`./illustrations/${id}.js`)).default;
  installeNavigation('illustration', id);
  document.title = `${illustration.titre} · Automatique`;
  $('titre').textContent = typographie(illustration.titre);
  $('source').textContent = typographie(illustration.source);
  const fil = $('fil-theme');
  fil.textContent = typographie(theme.titre);

  // ---- Réglages dans l'URL ------------------------------------------------------
  const etat = lisEtat(module.etat ?? {}, new URLSearchParams(location.search), module.choix);
  // L'URL est écrite tout de suite (un rechargement juste après un clic garde le
  // changement), puis au plus une fois toutes les 200 ms pendant un glisser :
  // les navigateurs limitent le nombre d'appels à history.replaceState.
  let minuterie = null;
  let derniere = 0;
  const ecritURL = () => {
    minuterie = null;
    derniere = performance.now();
    history.replaceState(null, '', `?${versRecherche(id, etat)}`);
  };
  const memorise = () => {
    if (minuterie) return;
    const attente = 200 - (performance.now() - derniere);
    if (attente <= 0) ecritURL();
    else minuterie = setTimeout(ecritURL, attente);
  };
  // Un changement fait juste avant de quitter ou de recharger la page n'est pas perdu.
  window.addEventListener('pagehide', () => {
    clearTimeout(minuterie);
    ecritURL();
  });

  // ---- Rappel du cours -----------------------------------------------------------
  const rappel = $('rappel');
  for (const paragraphe of [].concat(module.rappel ?? [])) {
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

  // ---- Illustration --------------------------------------------------------------
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rappelsTheme = [];
  const outils = {
    etat,
    // Met à jour des réglages (et l'URL) ; l'illustration se redessine d'elle-même.
    change(partiel) {
      Object.assign(etat, partiel);
      memorise();
    },
    // Préférences d'affichage, gardées dans le navigateur (hors du lien).
    preferences: new Preferences(`simulateur.illustration.${id}`, { onglet: 'rappel', ...module.preferences }, undefined, {
      onglet: ['rappel', 'essais'],
      ...module.choix,
    }),
    rend,
    rendTexte,
    // Souligne des termes du glossaire dans un texte de l'illustration.
    glossaire: (element, cles) => appliqueGlossaire(element, cles),
    mouvementReduit,
    surTheme: (f) => rappelsTheme.push(f),
  };
  const instance = module.monte($('zone'), outils);
  surChangementTheme(() => rappelsTheme.forEach((f) => f()));

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
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'essayer';
      bouton.textContent = 'Essayer';
      bouton.addEventListener('click', () => {
        if (essai.preferences) outils.preferences.change(essai.preferences);
        outils.change(essai.etat);
        instance.applique(essai.etat);
      });
      li.append(' ', bouton);
    }
    liste.appendChild(li);
  }
  // Termes du glossaire : définitions du poly en infobulle.
  if (module.termes) {
    appliqueGlossaire(rappel, module.termes);
    appliqueGlossaire(liste, module.termes);
  }

  // L'onglet ouvert (cours ou essais) est gardé dans les préférences.
  initOnglets('illustration-texte', {
    defaut: 'rappel',
    initial: outils.preferences.valeurs.onglet,
    change: (onglet) => outils.preferences.change({ onglet }),
  });
}

if (typeof document !== 'undefined') charge();
