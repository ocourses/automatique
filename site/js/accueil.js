// Page d'accueil : la carte du cours, thème par thème, avec ses illustrations
// (js/illustrations/catalogue.js). Le thème « Commande » contient aussi le
// simulateur de stabilisation : le schéma fonctionnel de la boucle fermée
// (poly, introduction) et la galerie des exemples. Un clic sur un bloc du
// schéma dit où on le règle dans le simulateur et estompe les exemples qui ne
// le font pas intervenir.

import { catalogue } from './exemples/catalogue.js';
import { themes } from './illustrations/catalogue.js';
import { ancre } from './parcours.js';
import { typographie } from './ui/format.js';
import { rendTexte } from './ui/katex.js';

// Pour chaque bloc : où le trouver dans le simulateur, et quels exemples
// l'illustrent (tous si `present` est absent).
const BLOCS = {
  consigne: {
    texte:
      'Consigne $w$ : ici, le point de fonctionnement $(x_e, u_e)$ autour duquel on stabilise. Il se règle dans l’onglet Contrôleur quand le modèle admet une famille d’équilibres.',
    present: (m) => m.parametres.some((q) => q.famille === 'equilibre'),
  },
  controleur: {
    texte:
      'Contrôleur : le retour d’état $u = u_e + K(x - x_e)$, réglé par les gains, par les pôles voulus ou en faisant glisser les valeurs propres, ou une loi libre. Onglet Contrôleur.',
  },
  actionneur: {
    texte:
      'Actionneur : la saturation $|u| \\le u_{\\max}$ et l’échantillonnage de la commande (période $T_e$), dans l’onglet Contrôleur.',
  },
  perturbation: {
    texte: 'Perturbation $d(t)$ : constante ou en créneau, dans l’onglet Système, et le bouton « Choc » sous la scène.',
  },
  systeme: {
    texte:
      'Système : $\\dot x = f(x, u)$, ses paramètres et sa condition initiale, dans l’onglet Système. On le voit dans la scène, les courbes et, pour deux états, le portrait de phase.',
  },
  capteurs: {
    texte:
      'Capteurs : la sortie mesurée $y$ et le bruit de mesure d’écart-type $\\sigma$, dans l’onglet Système. Le contrôleur ne voit que la mesure bruitée.',
  },
  predicteur: {
    texte:
      'Prédicteur : l’observateur de Luenberger, qui reconstruit l’état $\\hat x$ à partir de $u$ et de $y$. Onglet Observateur.',
    present: (m) => Boolean(m.observateur),
  },
};

const disponibles = catalogue.filter((e) => e.disponible);
const modeles = Object.fromEntries(
  await Promise.all(disponibles.map(async (e) => [e.id, (await import(`./exemples/${e.id}.js`)).default])),
);

// Carte présentant une illustration ou un exemple ; un lien s'il est disponible.
function carte({ titre, sousTitre, resume, source, lien, genre, ancrage }) {
  const el = document.createElement(lien ? 'a' : 'div');
  if (ancrage) el.id = ancrage;
  el.className = 'carte exemple' + (lien ? '' : ' a-venir');
  if (lien) el.href = lien;
  if (genre) {
    const g = document.createElement('p');
    g.className = 'genre';
    g.textContent = genre;
    el.appendChild(g);
  }
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
    [sousTitre, 'sous-titre'],
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

// ---- Thèmes ---------------------------------------------------------------------
const zoneThemes = document.getElementById('themes');
for (const theme of themes) {
  const section = document.createElement('section');
  section.className = 'theme';
  section.id = `theme-${theme.id}`;
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
  section.append(h, src, grille);
  if (theme.simulateur) section.appendChild(document.getElementById('modele-simulateur').content.cloneNode(true));
  zoneThemes.appendChild(section);
}

// ---- Galerie du simulateur --------------------------------------------------------
const racine = document.getElementById('catalogue');
const cartes = [];
for (const e of catalogue) {
  const el = carte({
    titre: e.titre,
    sousTitre: e.sous_titre,
    resume: e.montre,
    source: e.source,
    lien: e.disponible ? `exemple.html?id=${e.id}` : null,
    genre: 'Simulateur',
    ancrage: ancre('exemple', e.id),
  });
  racine.appendChild(el);
  cartes.push({ carte: el, modele: modeles[e.id] ?? null });
}

// Retour depuis une page : on revient à sa carte (les cartes sont créées par ce
// script, le navigateur ne sait pas faire défiler vers l'ancre tout seul).
if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'center' });

// ---- Schéma -------------------------------------------------------------------
const legende = document.getElementById('legende-schema');
const aideInitiale = legende.textContent;
const blocs = [...document.querySelectorAll('#schema [data-bloc]')];
let choisi = null;

function choisit(nom) {
  choisi = choisi === nom ? null : nom;
  for (const b of blocs) b.setAttribute('aria-pressed', String(b.dataset.bloc === choisi));
  if (!choisi) {
    legende.textContent = aideInitiale;
  } else {
    const { texte, present } = BLOCS[choisi];
    const exemples = cartes.filter(({ modele }) => modele && (!present || present(modele))).length;
    rendTexte(legende, `${texte} ${exemples === disponibles.length ? 'Tous les exemples.' : `Exemples concernés : ${exemples}.`}`);
  }
  for (const { carte, modele } of cartes) {
    const present = choisi ? BLOCS[choisi].present : null;
    carte.classList.toggle('estompe', Boolean(present) && !(modele && present(modele)));
  }
}

for (const b of blocs) {
  b.addEventListener('click', () => choisit(b.dataset.bloc));
  b.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      choisit(b.dataset.bloc);
    }
  });
}
