// Modèle d'un exemple : la description fournie par le module de l'exemple
// (js/exemples/<id>.js), vérifiée et complétée de ses propriétés dérivées.
//
// Le moteur et l'interface ne lisent un exemple qu'à travers cette classe :
// c'est elle qui dit si le système est linéaire, s'il a une scène, un
// observateur ou un portrait de phase, et quelle disposition de page il demande.

import { linearise } from './linalg.js';

// Dispositions de la page d'un exemple (voir css/style.css) :
//   - 'colonnes' : réglages, scène, puis courbes et graphiques empilés ;
//   - 'large'    : réglages à gauche ; à droite, la scène en haut sur toute la
//                  largeur, les courbes et les graphiques côte à côte dessous ;
//   - 'empilee'  : les courbes sur toute la hauteur au centre ; à droite, la
//                  scène (60 %) au-dessus des graphiques (40 %) ;
//   - 'courbes'  : sans scène, les courbes prennent la colonne centrale.
// `graphesEmpiles` : valeurs propres et portrait de phase dans deux boîtes l'une
// sur l'autre, au lieu de deux onglets (quand la place le permet).
export const DISPOSITIONS = ['colonnes', 'large', 'empilee', 'courbes'];

const REQUIS = ['id', 'titre', 'etats', 'commandes', 'parametres', 'f', 'equilibre', 'latex', 'gains', 'bornesGains', 'x0'];

// Points de test de la linéarité, fixes pour que le verdict soit reproductible.
const DECALAGES = [0.7, -1.3, 0.4, 2.1, -0.9, 1.6, -2.4, 0.2];

// Le système est-il affine en (x, u) ? On compare f à son linéarisé en
// (x_e, u_e) en quelques points éloignés de l'équilibre.
export function estLineaire(def, p = parametresParDefaut(def)) {
  const { xe, ue } = def.equilibre(p);
  const { A, B } = linearise(def.f, xe, ue, p);
  const f0 = def.f(xe, ue, p);
  for (let k = 0; k < DECALAGES.length; k++) {
    const dx = xe.map((_, i) => DECALAGES[(k + i) % DECALAGES.length]);
    const du = ue.map((_, j) => DECALAGES[(k + j + 3) % DECALAGES.length]);
    const f = def.f(
      xe.map((v, i) => v + dx[i]),
      ue.map((v, j) => v + du[j]),
      p,
    );
    for (let i = 0; i < f.length; i++) {
      const lin = f0[i] + A[i].reduce((s, a, j) => s + a * dx[j], 0) + B[i].reduce((s, b, j) => s + b * du[j], 0);
      if (Math.abs(f[i] - lin) > 1e-6 * (1 + Math.abs(f[i]))) return false;
    }
  }
  return true;
}

export function parametresParDefaut(def) {
  return Object.fromEntries(def.parametres.map((q) => [q.nom, q.valeur]));
}

// Liste des incohérences d'une description d'exemple (vide si elle est correcte).
export function verifie(def) {
  const erreurs = REQUIS.filter((c) => def[c] === undefined).map((c) => `champ « ${c} » manquant`);
  if (erreurs.length) return erreurs;
  const n = def.etats.length;
  const m = def.commandes.length;
  const dimension = (nom, v, k) => {
    if (v !== undefined && (!Array.isArray(v) || v.length !== k)) erreurs.push(`« ${nom} » doit avoir ${k} composantes`);
  };
  dimension('x0', def.x0, n);
  dimension('choc', def.choc, n);
  dimension('gains', def.gains, m);
  dimension('bornesGains', def.bornesGains, m);
  def.gains.forEach((ligne, i) => dimension(`gains[${i}]`, ligne, n));
  def.bornesGains.forEach((ligne, i) => dimension(`bornesGains[${i}]`, ligne, n));
  dimension('polesParDefaut', def.polesParDefaut, n);
  for (const q of def.parametres) {
    if (!(q.min <= q.valeur && q.valeur <= q.max)) erreurs.push(`paramètre ${q.nom} hors de ses bornes`);
  }
  if (def.disposition !== undefined && !DISPOSITIONS.includes(def.disposition)) {
    erreurs.push(`disposition « ${def.disposition} » inconnue`);
  }
  if (def.disposition !== undefined && def.disposition !== 'courbes' && !def.draw) {
    erreurs.push(`la disposition « ${def.disposition} » demande une scène (draw)`);
  }
  if (def.observateur) {
    dimension('observateur.L', def.observateur.L, n);
    dimension('observateur.bornesL', def.observateur.bornesL, n);
  }
  const p = parametresParDefaut(def);
  const { xe, ue } = def.equilibre(p);
  dimension('equilibre().xe', xe, n);
  dimension('equilibre().ue', ue, m);
  const residu = def.f(xe, ue, p);
  if (residu.some((r) => Math.abs(r) > 1e-9)) erreurs.push('f(x_e, u_e) ≠ 0 : le point de fonctionnement n’est pas un équilibre');
  return erreurs;
}

export class Modele {
  constructor(def) {
    const erreurs = verifie(def);
    if (erreurs.length) throw new Error(`Exemple ${def.id ?? '?'} : ${erreurs.join(' ; ')}`);
    Object.assign(this, def);
    this.n = def.etats.length;
    this.m = def.commandes.length;
    this.sortie = def.sortie ?? 0;
    this.choc = def.choc ?? new Array(this.n).fill(0);
    // Pour un système linéaire, le linéarisé coïncide avec le système : pas de fantôme.
    this.lineaire = def.lineaire ?? estLineaire(def);
    this.disposition = def.disposition ?? (def.draw ? 'colonnes' : 'courbes');
  }

  // Accepte une description brute ou un modèle déjà construit.
  static de(def) {
    return def instanceof Modele ? def : new Modele(def);
  }

  get aScene() {
    return typeof this.draw === 'function';
  }

  get aObservateur() {
    return Boolean(this.observateur);
  }

  get aPortrait() {
    return this.n === 2 && Boolean(this.portrait);
  }

  // Placement de pôles à la saisie et loi libre : pour une seule commande.
  get uneCommande() {
    return this.m === 1;
  }

  get parametresParDefaut() {
    return parametresParDefaut(this);
  }
}
