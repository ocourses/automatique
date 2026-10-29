// Configuration d'un cours (site.config.js) et contrat de ses modules
// d'illustration (docs/conception.md, « Clés » et « Contrat d'un module
// d'illustration »).
//   - `valideConfig(config)` vérifie la forme de la configuration, sans rien charger ;
//   - `verifieCours(config)` la vérifie, puis charge chaque illustration disponible
//     et vérifie son module, puis le parcours. Un cours l'appelle dans un test :
//       test('le cours respecte le contrat du socle', () => verifieCours(config));
// L'une et l'autre relèvent toutes les fautes avant de lever une seule erreur qui
// les liste : un cours mal configuré se corrige en une fois. `fautesConfig` et
// `fautesCours` rendent la liste, sans lever.

import { disponibles } from './catalogue.js';
import { parcours } from './parcours.js';

const IDENTIFIANT = /^[a-z0-9-]+$/;
const DEPOT = /^[\w.-]+\/[\w.-]+$/;
const CLES = {
  config: ['id', 'titre', 'sousTitre', 'intro', 'depotIssues', 'themes', 'glossaire', 'charge', 'pagesDuTheme'],
  theme: ['id', 'titre', 'source', 'illustrations'],
  illustration: ['id', 'titre', 'resume', 'source', 'disponible'],
  terme: ['formes', 'definition', 'source'],
  module: ['monte', 'etat', 'choix', 'preferences', 'rappel', 'essais', 'termes'],
  essai: ['texte', 'etat', 'preferences'],
  page: ['genre', 'id', 'titre', 'lien'],
};
// Préférence que la page d'illustration ajoute à celles du module (l'onglet ouvert).
export const PREFERENCES_DE_LA_PAGE = { onglet: 'rappel' };
export const CHOIX_DE_LA_PAGE = { onglet: ['rappel', 'essais'] };

const texte = (v) => typeof v === 'string' && v.trim() !== '';
const objet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const inconnues = (valeur, cles, ou) => Object.keys(valeur).filter((k) => !cles.includes(k)).map((k) => `${ou} : clé inconnue « ${k} »`);
const textes = (valeur, cles, ou) => cles.filter((k) => !texte(valeur[k])).map((k) => `${ou}.${k} : texte non vide attendu`);

// Fautes de forme d'une configuration ; [] si elle est valide.
export function fautesConfig(config) {
  if (!objet(config)) return ['la configuration doit être un objet (export par défaut de site.config.js)'];
  const fautes = [...inconnues(config, CLES.config, 'configuration'), ...textes(config, ['titre', 'sousTitre'], 'configuration')];
  if (!(typeof config.id === 'string' && IDENTIFIANT.test(config.id))) fautes.push('configuration.id : identifiant attendu, en minuscules, chiffres et tirets (« mesure-integration »)');
  if (!(Array.isArray(config.intro) && config.intro.length > 0 && config.intro.every(texte))) fautes.push('configuration.intro : au moins un paragraphe non vide attendu');
  if (!(typeof config.depotIssues === 'string' && DEPOT.test(config.depotIssues))) fautes.push('configuration.depotIssues : « organisation/dépôt » attendu');
  if (typeof config.charge !== 'function') fautes.push('configuration.charge : fonction (id) => import(…) attendue');
  if (config.pagesDuTheme !== undefined && typeof config.pagesDuTheme !== 'function') fautes.push('configuration.pagesDuTheme : fonction (theme) => pages attendue');
  return [...fautes, ...fautesThemes(config.themes), ...fautesGlossaire(config.glossaire)];
}

function fautesThemes(themes) {
  if (!(Array.isArray(themes) && themes.length > 0)) return ['configuration.themes : au moins un thème attendu'];
  const fautes = [];
  const vus = { theme: new Set(), illustration: new Set() };
  const unique = (genre, id, ou) => {
    if (vus[genre].has(id)) fautes.push(`${ou} : identifiant « ${id} » en double`);
    vus[genre].add(id);
  };
  themes.forEach((theme, k) => {
    const ou = `themes[${k}]`;
    if (!objet(theme)) return fautes.push(`${ou} : objet attendu`);
    fautes.push(...inconnues(theme, CLES.theme, ou), ...textes(theme, ['id', 'titre', 'source'], ou));
    unique('theme', theme.id, ou);
    if (!Array.isArray(theme.illustrations)) return fautes.push(`${ou}.illustrations : tableau attendu`);
    theme.illustrations.forEach((illustration, j) => {
      const ici = `${ou}.illustrations[${j}]`;
      if (!objet(illustration)) return fautes.push(`${ici} : objet attendu`);
      fautes.push(...inconnues(illustration, CLES.illustration, ici), ...textes(illustration, ['titre', 'resume', 'source'], ici));
      if (!(typeof illustration.id === 'string' && IDENTIFIANT.test(illustration.id))) fautes.push(`${ici}.id : identifiant attendu, en minuscules, chiffres et tirets`);
      if (typeof illustration.disponible !== 'boolean') fautes.push(`${ici}.disponible : true ou false attendu`);
      unique('illustration', illustration.id, ici);
    });
  });
  return fautes;
}

function fautesGlossaire(glossaire) {
  if (!objet(glossaire)) return ['configuration.glossaire : objet attendu'];
  return Object.entries(glossaire).flatMap(([cle, entree]) => {
    const ou = `glossaire.${cle}`;
    if (!objet(entree)) return [`${ou} : objet attendu`];
    const fautes = [...inconnues(entree, CLES.terme, ou), ...textes(entree, ['definition', 'source'], ou)];
    if (!(Array.isArray(entree.formes) && entree.formes.length > 0 && entree.formes.every(texte))) fautes.push(`${ou}.formes : au moins une forme attendue`);
    return fautes;
  });
}

// Fautes d'une valeur réglée par un essai (réglage ou préférence) : clé connue,
// même type que sa valeur par défaut, et texte permis par `choix`.
function fautesValeurs(valeurs, defaut, choix, ou) {
  return Object.entries(valeurs ?? {}).flatMap(([cle, v]) => {
    if (!(cle in defaut)) return [`${ou} : « ${cle} » inconnu`];
    if (typeof v !== typeof defaut[cle]) return [`${ou} : « ${cle} » de type ${typeof v}, ${typeof defaut[cle]} attendu`];
    if (typeof v === 'string' && choix[cle] && !choix[cle].includes(v)) return [`${ou} : « ${cle} = ${v} » hors de ses choix`];
    return [];
  });
}

// Fautes du module (export par défaut) de l'illustration `id`.
function fautesModule(id, module, glossaire) {
  const ou = `illustration ${id}`;
  if (!objet(module)) return [`${ou} : le module doit exporter par défaut un objet`];
  const fautes = inconnues(module, CLES.module, ou);
  if (typeof module.monte !== 'function') fautes.push(`${ou} : monte(zone, outils) attendue`);
  for (const cle of ['etat', 'choix', 'preferences']) if (module[cle] !== undefined && !objet(module[cle])) fautes.push(`${ou}.${cle} : objet attendu`);
  for (const cle of ['essais', 'termes']) if (module[cle] !== undefined && !Array.isArray(module[cle])) fautes.push(`${ou}.${cle} : tableau attendu`);
  if (fautes.length) return fautes;
  const etat = module.etat ?? {};
  const preferences = { ...PREFERENCES_DE_LA_PAGE, ...module.preferences };
  const choix = { ...CHOIX_DE_LA_PAGE, ...module.choix };
  (module.essais ?? []).forEach((essai, k) => {
    const ici = `${ou}, essai ${k + 1}`;
    if (!objet(essai)) return fautes.push(`${ici} : objet attendu`);
    fautes.push(...inconnues(essai, CLES.essai, ici), ...textes(essai, ['texte'], ici));
    fautes.push(...fautesValeurs(essai.etat, etat, choix, `${ici}, réglage`), ...fautesValeurs(essai.preferences, preferences, choix, `${ici}, préférence`));
  });
  for (const terme of module.termes ?? []) if (!(terme in glossaire)) fautes.push(`${ou} : terme « ${terme} » absent du glossaire`);
  return fautes;
}

function fautesParcours(pages) {
  const fautes = [];
  const vues = new Set();
  pages.forEach((page, k) => {
    const ou = `parcours[${k}]`;
    if (!objet(page)) return fautes.push(`${ou} : page { genre, id, titre, lien } attendue`);
    fautes.push(...inconnues(page, CLES.page, ou), ...textes(page, CLES.page, ou));
    const cle = `${page.genre}-${page.id}`;
    if (vues.has(cle)) fautes.push(`${ou} : page « ${cle} » en double`);
    vues.add(cle);
  });
  return fautes;
}

// Fautes de la configuration, de chaque module d'illustration disponible et du
// parcours ; les modules ne sont chargés que si la configuration est valide.
export async function fautesCours(config) {
  const fautes = fautesConfig(config);
  if (fautes.length) return fautes;
  for (const illustration of config.themes.flatMap(disponibles)) {
    try {
      fautes.push(...fautesModule(illustration.id, (await config.charge(illustration.id))?.default, config.glossaire));
    } catch (erreur) {
      fautes.push(`illustration ${illustration.id} : le module ne se charge pas (${erreur.message})`);
    }
  }
  try {
    fautes.push(...fautesParcours(parcours(config)));
  } catch (erreur) {
    fautes.push(`parcours : pagesDuTheme a échoué (${erreur.message})`);
  }
  return fautes;
}

const leve = (fautes) => {
  if (fautes.length) throw new Error(`site.config.js : ${fautes.length} faute(s)\n${fautes.map((f) => `  - ${f}`).join('\n')}`);
};

export function valideConfig(config) {
  leve(fautesConfig(config));
  return config;
}

export async function verifieCours(config) {
  leve(await fautesCours(config));
  return config;
}
