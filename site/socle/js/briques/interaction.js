// Interaction à la souris sur un canevas : saisir un objet, zoomer, déplacer la vue.

// Rend un objet saisissable à la souris sur un repère : `prend(x, y)` dit si
// le point visé saisit l'objet, `deplace(x, y)` est appelé pendant le geste.
export function glisse(canvas, repere, { prend = () => true, deplace, relache = () => {} }) {
  let actif = false;
  canvas.addEventListener('pointerdown', (ev) => {
    const [x, y] = repere.versMonde(ev);
    if (!prend(x, y)) return;
    actif = true;
    canvas.setPointerCapture(ev.pointerId);
    deplace(x, y);
    ev.preventDefault();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (actif) deplace(...repere.versMonde(ev));
  });
  const fin = () => {
    if (!actif) return;
    actif = false;
    relache();
  };
  canvas.addEventListener('pointerup', fin);
  canvas.addEventListener('pointercancel', fin);
}

// Bornes de la largeur d'une vue zoomée, par axe : [minimum, maximum].
export const LARGEURS_ZOOM = { x: [0.05, 400], y: [0.02, 400] };

// Intervalle [a, b] dilaté du facteur `f` autour de `c` ; inchangé si sa largeur
// sortait de `bornes`.
export function dilate([a, b], c, f, bornes) {
  const l = (b - a) * f;
  if (l < bornes[0] || l > bornes[1]) return [a, b];
  return [c + (a - c) * f, c + (b - c) * f];
}

// Avec `tempsPositif`, l'abscisse reste ≥ 0 : l'intervalle est ramené à [0, b − a].
export function borneTemps([a, b], tempsPositif) {
  return tempsPositif && a < 0 ? [0, b - a] : [a, b];
}

// Zoom d'une figure : molette autour du curseur, boutons +, − et ↺ ajoutés à
// `barre`, et, si `deplacer`, glisser pour déplacer la vue. Tant qu'on n'a pas
// zoomé, le cadre suit `auto()`. Avec `tempsPositif`, l'abscisse reste ≥ 0.
// Renvoie { cadre(), reinitialise() } : le cadre à donner au repère avant de
// dessiner, et le retour au cadre automatique.
export function zoomable(canvas, rep, { barre, auto, redessine, deplacer = true, tempsPositif = false }) {
  let vue = null;
  const cadre = () => vue ?? auto();
  const borne = (intervalle) => borneTemps(intervalle, tempsPositif);
  function zoome(f, cx, cy) {
    const { x, y } = cadre();
    vue = { x: borne(dilate(x, cx, f, LARGEURS_ZOOM.x)), y: dilate(y, cy, f, LARGEURS_ZOOM.y) };
  }
  const outilsZoom = document.createElement('div');
  outilsZoom.className = 'zoom';
  outilsZoom.innerHTML =
    `<span class="petit">molette : zoom${deplacer ? ', glisser : déplacer' : ''}</span>` +
    '<button type="button" data-zoom="avant" aria-label="Zoomer" title="Zoomer">+</button>' +
    '<button type="button" data-zoom="arriere" aria-label="Dézoomer" title="Dézoomer">−</button>' +
    '<button type="button" data-zoom="reinit" aria-label="Réinitialiser le zoom" title="Réinitialiser le zoom">↺</button>';
  barre.appendChild(outilsZoom);
  outilsZoom.addEventListener('click', (ev) => {
    const bouton = ev.target.closest('button');
    if (!bouton) return;
    const { x, y } = cadre();
    if (bouton.dataset.zoom === 'reinit') vue = null;
    else zoome(bouton.dataset.zoom === 'avant' ? 1 / 1.4 : 1.4, (x[0] + x[1]) / 2, (y[0] + y[1]) / 2);
    redessine();
  });
  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      const [x, y] = rep.versMonde(ev);
      zoome(Math.exp(Math.max(-100, Math.min(100, ev.deltaY)) * 0.0015), x, y);
      redessine();
    },
    { passive: false },
  );
  if (deplacer) {
    // Le point saisi reste sous le pointeur.
    canvas.classList.add('saisissable');
    let prise = null;
    glisse(canvas, rep, {
      prend: (x, y) => {
        prise = [x, y];
        return true;
      },
      deplace: (x, y) => {
        const { x: cx, y: cy } = cadre();
        const [dx, dy] = [prise[0] - x, prise[1] - y];
        vue = { x: borne([cx[0] + dx, cx[1] + dx]), y: [cy[0] + dy, cy[1] + dy] };
        redessine();
      },
    });
  }
  // `reinitialise()` revient au cadre automatique (quand celui-ci change de nature).
  return { cadre, reinitialise: () => (vue = null) };
}
