// État de la page d'un exemple, gardé dans le navigateur (localStorage) :
//   - les réglages de la simulation (objet de core/reglages.js) ;
//   - l'affichage : fantôme, historique complet, vitesse de lecture, console
//     repliée et onglets ouverts.
// Une clé par exemple. Le bouton « Valeurs par défaut » efface la clé.

export const VITESSES = [0.25, 0.5, 1, 2, 4];
export const VERSION = 1;

export const AFFICHAGE_DEFAUT = Object.freeze({
  fantome: false,
  historique: false,
  vitesse: 1,
  consoleRepliee: false,
  onglets: Object.freeze({}),
});

// Affichage complet et valide à partir d'un objet quelconque.
export function normaliseAffichage(a = {}) {
  const d = AFFICHAGE_DEFAUT;
  const booleen = (v, defaut) => (typeof v === 'boolean' ? v : defaut);
  const onglets = {};
  if (a.onglets && typeof a.onglets === 'object') {
    for (const [groupe, id] of Object.entries(a.onglets)) if (typeof id === 'string') onglets[groupe] = id;
  }
  return {
    fantome: booleen(a.fantome, d.fantome),
    historique: booleen(a.historique, d.historique),
    vitesse: VITESSES.includes(a.vitesse) ? a.vitesse : d.vitesse,
    consoleRepliee: booleen(a.consoleRepliee, d.consoleRepliee),
    onglets,
  };
}

// Le stockage du navigateur peut être absent ou refuser l'accès (navigation
// privée, cookies bloqués) : on travaille alors sans mémoire.
function stockageNavigateur() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class Memoire {
  constructor(id, stockage = stockageNavigateur()) {
    this.cle = `simulateur.exemple.${id}`;
    this.stockage = stockage;
  }

  // { reglages, affichage } ou null s'il n'y a rien de lisible.
  lit() {
    try {
      const brut = this.stockage?.getItem(this.cle);
      if (!brut) return null;
      const objet = JSON.parse(brut);
      if (objet?.version !== VERSION) return null;
      return { reglages: objet.reglages ?? {}, affichage: normaliseAffichage(objet.affichage) };
    } catch {
      return null;
    }
  }

  ecrit(reglages, affichage) {
    try {
      this.stockage?.setItem(this.cle, JSON.stringify({ version: VERSION, reglages, affichage }));
    } catch {
      // Stockage plein ou refusé : les réglages ne sont simplement pas gardés.
    }
  }

  efface() {
    try {
      this.stockage?.removeItem(this.cle);
    } catch {
      // Rien à faire.
    }
  }
}
