// Infobulles. Une seule bulle flottante est partagée, placée en position fixe
// pour ne pas être coupée par une carte. Elle s'ouvre au survol et au focus
// clavier, s'ouvre aussi d'un clic (écrans tactiles), et Échap ou un clic
// ailleurs la ferme.
//   - `infobulle(racine, terme, explication)` souligne en pointillés la première
//     occurrence de `terme` dans les textes de `racine` (atteignable par Tab) ;
//   - `attacheInfobulle(element, contenu)` ouvre la bulle sur un élément ;
//     `contenu` est un texte, ou une fonction qui rend un nœud (texte riche).

let bulle = null;
let courant = null;

function cree() {
  bulle = document.createElement('div');
  bulle.id = 'infobulle';
  bulle.className = 'infobulle';
  bulle.setAttribute('role', 'tooltip');
  bulle.hidden = true;
  document.body.appendChild(bulle);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') cache();
  });
  document.addEventListener('pointerdown', (ev) => {
    if (courant && !courant.contains(ev.target)) cache();
    // Une bulle posée sur un point : un clic ailleurs que sur un canevas la ferme.
    else if (!courant && !ev.target.closest?.('canvas')) bulle.hidden = true;
  });
}

// Remplit la bulle et la place au-dessus (ou au-dessous) du rectangle `r`.
function affiche(r, contenu) {
  if (!bulle) cree();
  bulle.textContent = '';
  if (typeof contenu === 'function') bulle.appendChild(contenu());
  else bulle.textContent = contenu;
  bulle.hidden = false;
  const b = bulle.getBoundingClientRect();
  const marge = 8;
  const gauche = Math.min(Math.max(marge, r.left + r.width / 2 - b.width / 2), window.innerWidth - b.width - marge);
  const haut = r.top - b.height - marge >= marge ? r.top - b.height - marge : r.bottom + marge;
  bulle.style.left = `${gauche}px`;
  bulle.style.top = `${haut}px`;
}

function montre(element) {
  courant = element;
  affiche(element.getBoundingClientRect(), element._infobulle);
  element.setAttribute('aria-describedby', bulle.id);
}

// Bulle posée sur un point de l'écran (coordonnées de la fenêtre), pour un
// élément dessiné dans un canevas : pas d'élément DOM où l'attacher. Elle se
// ferme avec `cacheInfobulle()`, Échap ou un clic ailleurs.
export function infobulleSurPoint(x, y, contenu) {
  courant = null;
  affiche({ left: x, right: x, top: y - 6, bottom: y + 14, width: 0, height: 20 }, contenu);
}

export function cacheInfobulle() {
  if (bulle && !bulle.hidden && !courant) bulle.hidden = true;
}

function cache() {
  if (bulle) bulle.hidden = true;
  courant?.removeAttribute('aria-describedby');
  courant = null;
}

export function attacheInfobulle(element, contenu) {
  element._infobulle = contenu;
  element.addEventListener('mouseenter', () => montre(element));
  element.addEventListener('focus', () => montre(element));
  element.addEventListener('mouseleave', () => {
    if (document.activeElement !== element) cache();
  });
  element.addEventListener('blur', cache);
  element.addEventListener('click', () => montre(element));
  return element;
}

// Première occurrence d'une des `formes` (mot entier) dans les textes de
// `racine`, hors formules KaTeX et hors termes déjà soulignés, soulignée et
// munie d'une infobulle. Renvoie l'élément créé, ou null.
const LETTRE = /\p{L}/u;
export function souligne(racine, formes, contenu) {
  const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('.katex, .terme') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  while (marcheur.nextNode()) {
    const noeud = marcheur.currentNode;
    const texte = noeud.nodeValue;
    for (const forme of formes) {
      let i = texte.indexOf(forme);
      while (i >= 0 && (LETTRE.test(texte[i - 1] ?? '') || LETTRE.test(texte[i + forme.length] ?? ''))) i = texte.indexOf(forme, i + 1);
      if (i < 0) continue;
      const milieu = noeud.splitText(i);
      milieu.splitText(forme.length);
      const span = document.createElement('span');
      span.className = 'terme';
      span.tabIndex = 0;
      milieu.replaceWith(span);
      span.appendChild(milieu);
      return attacheInfobulle(span, contenu);
    }
  }
  return null;
}

export function infobulle(racine, terme, explication) {
  return souligne(racine, [terme], explication);
}

// À appeler quand le texte portant le terme est remplacé : la bulle ouverte
// sur l'ancien terme ne recevrait plus jamais son événement de sortie.
export function fermeInfobulle() {
  if (courant && !courant.isConnected) cache();
}
