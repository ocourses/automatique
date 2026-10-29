// Onglets accessibles. Un groupe est une liste [role=tablist] et ses panneaux
// [role=tabpanel], liés par le même attribut data-groupe ; chaque onglet porte
// data-onglet et son panneau data-panneau avec la même valeur.
// L'onglet ouvert au départ est `initial` s'il est visible, sinon `defaut` ;
// `change(id)` est appelé quand on en choisit un autre (pour le mémoriser).

export function initOnglets(groupe, { defaut = null, initial = null, change = () => {} } = {}) {
  const liste = document.querySelector(`[role=tablist][data-groupe="${groupe}"]`);
  const onglets = [...liste.querySelectorAll('[role=tab]')];
  const panneaux = [...document.querySelectorAll(`[role=tabpanel][data-groupe="${groupe}"]`)];
  const visibles = () => onglets.filter((o) => !o.hidden);
  const trouve = (id) => onglets.find((o) => o.dataset.onglet === id && !o.hidden);

  const affiche = (id, { focus = false } = {}) => {
    const cible = trouve(id) ?? visibles()[0];
    if (!cible) return;
    for (const o of onglets) {
      const actif = o === cible;
      o.setAttribute('aria-selected', String(actif));
      o.tabIndex = actif ? 0 : -1;
    }
    for (const p of panneaux) p.hidden = p.dataset.panneau !== cible.dataset.onglet;
    if (focus) cible.focus();
    return cible.dataset.onglet;
  };
  const choisit = (id, options) => change(affiche(id, options));

  for (const o of onglets) o.addEventListener('click', () => choisit(o.dataset.onglet));
  liste.addEventListener('keydown', (ev) => {
    const v = visibles();
    const i = v.indexOf(document.activeElement);
    if (i < 0) return;
    const suivant = { ArrowRight: (i + 1) % v.length, ArrowLeft: (i - 1 + v.length) % v.length, Home: 0, End: v.length - 1 }[ev.key];
    if (suivant === undefined) return;
    ev.preventDefault();
    choisit(v[suivant].dataset.onglet, { focus: true });
  });

  affiche(trouve(initial) ? initial : defaut);
  return { affiche };
}
