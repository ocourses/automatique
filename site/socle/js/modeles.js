// Gabarits d'un cours : `index.html` et `illustration.html` sont des copies des
// modèles du socle (modeles/), sans changement (docs/conception.md, décision 6).
// Un cours l'appelle dans un test, sous Node :
//   test('les gabarits sont ceux du socle', () => verifieModeles(new URL('../', import.meta.url)));
// `pages` restreint la vérification : un cours qui garde un accueil à lui ne
// passe que ['illustration.html'].

import { readFile } from 'node:fs/promises';

export const PAGES = ['index.html', 'illustration.html'];

const lis = (url) => readFile(url, 'utf8').catch(() => null);

// Fautes des gabarits du cours dont `site` est le dossier (URL finissant par /).
export async function fautesModeles(site, pages = PAGES) {
  const fautes = [];
  for (const page of pages) {
    const modele = await lis(new URL(`../modeles/${page}`, import.meta.url));
    if (modele === null) throw new Error(`pas de modèle « ${page} » dans le socle`);
    const copie = await lis(new URL(page, site));
    if (copie === null) {
      fautes.push(`${page} : absente (copier socle/modeles/${page})`);
      continue;
    }
    if (copie === modele) continue;
    // Première ligne qui diffère ; la copie peut aussi avoir des lignes en plus.
    const [a, b] = [modele, copie].map((t) => t.split('\n'));
    const k = a.findIndex((ligne, i) => ligne !== b[i]);
    fautes.push(`${page} : diffère du modèle socle/modeles/${page} à la ligne ${(k >= 0 ? k : a.length) + 1}`);
  }
  return fautes;
}

export async function verifieModeles(site, pages = PAGES) {
  const fautes = await fautesModeles(site, pages);
  if (fautes.length) throw new Error(`gabarits : ${fautes.length} faute(s)\n${fautes.map((f) => `  - ${f}`).join('\n')}`);
}
