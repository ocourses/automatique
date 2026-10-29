// Préférences d'affichage d'une illustration, gardées dans le navigateur
// (localStorage) : réglages de confort propres à chaque lecteur, comme la
// longueur des courbes ou les particules. Elles ne font pas partie de l'état
// partagé par le lien de la page.
//
// Les valeurs par défaut fixent les clés et leurs types : une valeur lue qui
// n'a pas le même type (ou un nombre non fini), ou un texte hors de `choix`
// (valeurs permises par clé), est ignorée. Le stockage peut
// être absent, plein ou refusé (navigation privée) : la page marche sans.

export const VERSION = 1;

const stockageDuNavigateur = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export class Preferences {
  constructor(cle, defaut = {}, stockage = stockageDuNavigateur(), choix = {}) {
    this.cle = cle;
    this.defaut = { ...defaut };
    this.choix = choix ?? {};
    this.stockage = stockage;
    this.valeurs = { ...defaut };
    this.applique(this.lit());
  }

  lit() {
    try {
      const brut = JSON.parse(this.stockage?.getItem(this.cle) ?? 'null');
      return brut && brut.version === VERSION && typeof brut.valeurs === 'object' ? brut.valeurs : {};
    } catch {
      return {};
    }
  }

  // Ne garde que les clés connues, de même type que leur valeur par défaut.
  applique(partiel) {
    for (const [cle, v] of Object.entries(partiel ?? {})) {
      if (!(cle in this.defaut) || typeof v !== typeof this.defaut[cle]) continue;
      if (typeof v === 'number' && !Number.isFinite(v)) continue;
      if (this.choix[cle] && !this.choix[cle].includes(v)) continue;
      this.valeurs[cle] = v;
    }
  }

  change(partiel) {
    this.applique(partiel);
    try {
      this.stockage?.setItem(this.cle, JSON.stringify({ version: VERSION, valeurs: this.valeurs }));
    } catch {
      // stockage plein ou refusé : les préférences valent pour cette visite seulement
    }
  }
}
