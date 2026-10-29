// Page d'accueil (modeles/index.html) : la carte du cours, thème par thème dans
// l'ordre du catalogue, avec ses illustrations. `demarreAccueil(config)` remplit le
// gabarit à partir de site.config.js.
//
// Une fois la page remplie (KaTeX chargé), `<body>` porte `data-ok="1"` : le
// test de fumée (scripts/fumee.py) l'attend.
//
// Chaque thème est une section `#theme-<id>` : un cours peut y greffer un bloc à
// lui, après `await demarreAccueil(config)` (docs/conception.md, « Points
// d'extension »).

import { valideConfig } from './config.js';
import { ancre } from './parcours.js';
import { typographie } from './ui/format.js';
import { chargeKatex, rendTexte } from './ui/katex.js';

const $ = (id) => document.getElementById(id);

// Carte présentant une illustration ; un lien si elle est disponible.
function carte({ titre, resume, source, lien, ancrage }) {
  const el = document.createElement(lien ? 'a' : 'div');
  if (ancrage) el.id = ancrage;
  el.className = 'carte exemple' + (lien ? '' : ' a-venir');
  if (lien) el.href = lien;
  const h = document.createElement('h2');
  h.textContent = typographie(titre);
  if (!lien) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'à venir';
    h.appendChild(badge);
  }
  el.appendChild(h);
  for (const [texte, classe] of [
    [resume, ''],
    [source, 'source'],
  ]) {
    if (!texte) continue;
    const p = document.createElement('p');
    if (classe) p.className = classe;
    p.textContent = typographie(texte);
    el.appendChild(p);
  }
  return el;
}

function section(theme) {
  const s = document.createElement('section');
  s.className = 'theme';
  s.id = `theme-${theme.id}`;
  const h = document.createElement('h2');
  h.textContent = typographie(theme.titre);
  const src = document.createElement('p');
  src.className = 'source';
  src.textContent = typographie(theme.source);
  const grille = document.createElement('div');
  grille.className = 'catalogue';
  for (const i of theme.illustrations) {
    grille.appendChild(
      carte({ titre: i.titre, resume: i.resume, source: i.source, lien: i.disponible ? `illustration.html?id=${i.id}` : null, ancrage: ancre('illustration', i.id) }),
    );
  }
  s.append(h, src, grille);
  return s;
}

export async function demarreAccueil(config) {
  valideConfig(config);
  const titre = `${config.titre} : explorer le cours`;
  document.title = titre;
  $('titre').textContent = typographie(titre);
  $('sous-titre').textContent = typographie(config.sousTitre);
  $('issues').href = `https://github.com/${config.depotIssues}/issues`;
  $('themes').append(...config.themes.map(section));

  await chargeKatex();
  const signalement = $('signalement');
  for (const texte of config.intro) {
    const p = document.createElement('p');
    p.className = 'intro';
    rendTexte(p, texte);
    signalement.before(p);
  }

  // Retour depuis une page : on revient à sa carte (les cartes sont créées par ce
  // script, le navigateur ne sait pas faire défiler vers l'ancre tout seul).
  if (location.hash) $(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'center' });
  document.body.dataset.ok = '1';
}
