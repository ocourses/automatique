// Page d'accueil : le schéma fonctionnel de la boucle fermée (poly,
// introduction, « Schéma fonctionnel complet ») et la galerie des exemples.
// Un clic sur un bloc du schéma dit où on le règle dans le simulateur et
// estompe les exemples qui ne le font pas intervenir.

import { catalogue } from './exemples/catalogue.js';
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

// ---- Galerie ------------------------------------------------------------------
const racine = document.getElementById('catalogue');
const cartes = [];
for (const e of catalogue) {
  const carte = document.createElement(e.disponible ? 'a' : 'div');
  carte.className = 'carte exemple' + (e.disponible ? '' : ' a-venir');
  if (e.disponible) carte.href = `exemple.html?id=${e.id}`;
  const titre = document.createElement('h2');
  titre.textContent = typographie(e.titre);
  if (!e.disponible) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'à venir';
    titre.appendChild(badge);
  }
  const sousTitre = document.createElement('p');
  sousTitre.className = 'sous-titre';
  sousTitre.textContent = typographie(e.sous_titre);
  const montre = document.createElement('p');
  montre.textContent = typographie(e.montre);
  const source = document.createElement('p');
  source.className = 'source';
  source.textContent = typographie(e.source);
  carte.append(titre, sousTitre, montre, source);
  racine.appendChild(carte);
  cartes.push({ carte, modele: modeles[e.id] ?? null });
}

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
