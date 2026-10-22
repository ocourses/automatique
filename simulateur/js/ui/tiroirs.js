// Téléphone : réglages et console en tiroirs. Les tiroirs ne sont affichés
// que par la feuille de style (petit écran) ; ici on gère seulement leur
// ouverture. Un seul à la fois, et la page remonte pour que la scène reste
// visible au-dessus.

const $ = (id) => document.getElementById(id);

export function initTiroirs() {
  const tiroirs = [
    ['reglages', $('feuille-reglages'), $('bascule-reglages')],
    ['console', $('console'), $('bascule-console')],
  ];
  let ouvert = null;
  const ouvre = (cible) => {
    ouvert = cible;
    for (const [nom, el, bouton] of tiroirs) {
      el.classList.toggle('ouverte', nom === cible);
      bouton.setAttribute('aria-expanded', String(nom === cible));
    }
    document.body.classList.toggle('feuille-ouverte', cible !== null);
    if (cible) window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  for (const [nom, , bouton] of tiroirs) bouton.addEventListener('click', () => ouvre(ouvert === nom ? null : nom));
  for (const [, el] of tiroirs) {
    el.querySelector('.fermer').addEventListener('click', () => ouvre(null));
    const agrandir = el.querySelector('.agrandir');
    agrandir.addEventListener('click', () => {
      agrandir.setAttribute('aria-pressed', String(el.classList.toggle('grande')));
    });
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && ouvert) ouvre(null);
  });
}
