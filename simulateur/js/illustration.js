// Page générique d'une illustration : illustration.html?id=<identifiant>.
//
// Une illustration est un module js/illustrations/<id>.js qui exporte par défaut
//   { rappel, essais, etat, monte(zone, outils) } :
//   - rappel : paragraphes du cours (texte avec formules $…$), ou un seul texte ;
//   - essais : questions guidées, { texte, etat? } ; avec `etat`, un bouton
//     « Essayer » applique ce réglage ;
//   - etat : réglages par défaut (nombres ou textes), gardés dans l'URL ;
//   - monte(zone, outils) construit l'illustration et renvoie { applique(etat) }.
// Les titres, sources et thèmes viennent de js/illustrations/catalogue.js.

import { trouve } from './illustrations/catalogue.js';
import { typographie } from './ui/format.js';
import { rend, rendTexte } from './ui/katex.js';
import { surChangementTheme } from './ui/theme.js';

const $ = (id) => document.getElementById(id);

// Réglages : valeurs par défaut du module, remplacées par celles de l'URL
// lorsqu'elles sont lisibles et du même type.
export function lisEtat(defaut, q) {
  const etat = { ...defaut };
  for (const [cle, v] of Object.entries(defaut)) {
    if (!q.has(cle)) continue;
    const brut = q.get(cle);
    if (typeof v === 'number') {
      const n = Number(brut);
      if (Number.isFinite(n)) etat[cle] = n;
    } else if (typeof v === 'boolean') {
      etat[cle] = brut === '1';
    } else {
      etat[cle] = brut;
    }
  }
  return etat;
}

export function versRecherche(id, etat) {
  const q = new URLSearchParams({ id });
  for (const [cle, v] of Object.entries(etat)) {
    q.set(cle, typeof v === 'number' ? String(Number(v.toPrecision(6))) : typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
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
  document.title = `${illustration.titre} · Automatique`;
  $('titre').textContent = typographie(illustration.titre);
  $('source').textContent = typographie(illustration.source);
  const fil = $('fil-theme');
  fil.textContent = typographie(theme.titre);

  // ---- Réglages dans l'URL ------------------------------------------------------
  const etat = lisEtat(module.etat ?? {}, new URLSearchParams(location.search));
  let minuterie = null;
  const memorise = () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => history.replaceState(null, '', `?${versRecherche(id, etat)}`), 200);
  };
  $('copier').addEventListener('click', async () => {
    history.replaceState(null, '', `?${versRecherche(id, etat)}`);
    try {
      await navigator.clipboard.writeText(location.href);
      $('copier').textContent = 'Lien copié';
    } catch {
      $('copier').textContent = 'Copie impossible : utilisez la barre d’adresse';
    }
    setTimeout(() => ($('copier').textContent = 'Copier le lien'), 2000);
  });

  // ---- Rappel du cours -----------------------------------------------------------
  const rappel = $('rappel');
  for (const paragraphe of [].concat(module.rappel ?? [])) {
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
    rend,
    rendTexte,
    mouvementReduit,
    surTheme: (f) => rappelsTheme.push(f),
  };
  const instance = module.monte($('zone'), outils);
  surChangementTheme(() => rappelsTheme.forEach((f) => f()));

  // ---- À essayer -----------------------------------------------------------------
  const liste = $('essais');
  const essais = module.essais ?? [];
  $('bloc-essais').hidden = essais.length === 0;
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
        outils.change(essai.etat);
        instance.applique(essai.etat);
      });
      li.append(' ', bouton);
    }
    liste.appendChild(li);
  }
}

if (typeof document !== 'undefined') charge();
