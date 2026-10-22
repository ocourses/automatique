// Onglets accessibles. Un groupe est une liste [role=tablist] et ses panneaux
// [role=tabpanel], liés par le même attribut data-groupe ; chaque onglet porte
// data-onglet et son panneau data-panneau avec la même valeur.
// Le dernier onglet choisi est mémorisé dans le navigateur, quand c'est possible.

const cle = (groupe) => `simulateur.onglet.${groupe}`;

export function initOnglets(groupe, defaut = null) {
  const liste = document.querySelector(`[role=tablist][data-groupe="${groupe}"]`);
  const onglets = [...liste.querySelectorAll('[role=tab]')];
  const panneaux = [...document.querySelectorAll(`[role=tabpanel][data-groupe="${groupe}"]`)];
  const visibles = () => onglets.filter((o) => !o.hidden);

  const affiche = (id, { memorise = true, focus = false } = {}) => {
    const cible = onglets.find((o) => o.dataset.onglet === id && !o.hidden) ?? visibles()[0];
    if (!cible) return;
    for (const o of onglets) {
      const actif = o === cible;
      o.setAttribute('aria-selected', String(actif));
      o.tabIndex = actif ? 0 : -1;
    }
    for (const p of panneaux) p.hidden = p.dataset.panneau !== cible.dataset.onglet;
    if (focus) cible.focus();
    if (memorise) {
      try {
        localStorage.setItem(cle(groupe), cible.dataset.onglet);
      } catch {
        // Stockage indisponible : l'onglet n'est simplement pas mémorisé.
      }
    }
  };

  for (const o of onglets) o.addEventListener('click', () => affiche(o.dataset.onglet));
  liste.addEventListener('keydown', (ev) => {
    const v = visibles();
    const i = v.indexOf(document.activeElement);
    if (i < 0) return;
    const suivant = { ArrowRight: (i + 1) % v.length, ArrowLeft: (i - 1 + v.length) % v.length, Home: 0, End: v.length - 1 }[ev.key];
    if (suivant === undefined) return;
    ev.preventDefault();
    affiche(v[suivant].dataset.onglet, { focus: true });
  });

  let initial = defaut ?? visibles()[0]?.dataset.onglet;
  try {
    initial = localStorage.getItem(cle(groupe)) ?? initial;
  } catch {
    // Stockage indisponible : onglet par défaut.
  }
  affiche(initial, { memorise: false });
  return { affiche };
}
