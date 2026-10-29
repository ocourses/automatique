// Catalogue d'un cours (`themes` de site.config.js) : ses thèmes, dans l'ordre du
// poly, et leurs illustrations. Forme :
//   [{ id, titre, source, illustrations: [{ id, titre, resume, source, disponible }] }]
// `disponible` dit que le module js/illustrations/<id>.js existe ; les autres
// illustrations sont annoncées sur l'accueil.

// Le thème et l'illustration d'identifiant `id`, ou null.
export function trouve(themes, id) {
  for (const theme of themes) {
    const illustration = theme.illustrations.find((i) => i.id === id);
    if (illustration) return { theme, illustration };
  }
  return null;
}

// Les illustrations disponibles d'un thème, dans leur ordre.
export const disponibles = (theme) => theme.illustrations.filter((i) => i.disponible);
