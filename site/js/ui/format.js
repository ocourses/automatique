// Mise en forme des nombres, en français et en LaTeX.

// Nombre à `chiffres` chiffres significatifs, sans zéros superflus.
function arrondi(v, chiffres) {
  if (v === 0 || !Number.isFinite(v)) return v;
  return Number(v.toPrecision(chiffres));
}

export function texte(v, chiffres = 3) {
  const a = arrondi(v, chiffres);
  if (Object.is(a, -0) || Math.abs(a) < 1e-12) return '0';
  return String(a).replace('.', ',').replace('-', '−');
}

export function latexNombre(v, chiffres = 3) {
  const a = arrondi(v, chiffres);
  if (Object.is(a, -0) || Math.abs(a) < 1e-12) return '0';
  return String(a).replace('.', '{,}');
}

export function latexComplexe(z, chiffres = 3) {
  if (Math.abs(z.im) < 1e-9) return latexNombre(z.re, chiffres);
  const re = Math.abs(z.re) < 1e-9 ? '' : latexNombre(z.re, chiffres);
  const signe = z.im < 0 ? '-' : re ? '+' : '';
  return `${re} ${signe} ${latexNombre(Math.abs(z.im), chiffres)}\\,i`;
}

// Nombre à virgule fixe, de largeur constante : `decimales` décimales, la place
// du signe moins toujours réservée et la partie entière complétée à `entiers`
// chiffres. Un nombre qui change (au glisser, pendant une animation) ne fait
// ainsi plus « vibrer » la formule.
export function latexNombreFixe(v, decimales = 2, entiers = 1) {
  let s = Math.abs(v).toFixed(decimales);
  if (Number(s) === 0) v = 0;
  const manque = Math.max(0, entiers - s.split('.')[0].length);
  s = s.replace('.', '{,}');
  return `${v < 0 ? '-' : '\\phantom{-}'}${'\\phantom{0}'.repeat(manque)}${s}`;
}

// Nombre complexe à virgule fixe : partie réelle et partie imaginaire ont
// chacune `decimales` décimales, le signe de la partie imaginaire garde sa
// place (voir latexNombreFixe).
export function latexComplexeFixe(z, decimales = 2) {
  const re = latexNombreFixe(Math.abs(z.re) < 1e-9 ? 0 : z.re, decimales);
  if (Math.abs(z.im) < 1e-9) return re;
  const signe = z.im < 0 ? '-' : '+';
  return `${re} ${signe} ${latexNombreFixe(Math.abs(z.im), decimales).replace('\\phantom{-}', '')}\\,i`;
}

// Matrice à coefficients de largeur constante (voir latexNombreFixe).
export function latexMatriceFixe(M, decimales = 2) {
  const entiers = Math.max(1, ...M.flat().map((v) => Math.abs(v).toFixed(decimales).split('.')[0].length));
  const lignes = M.map((ligne) => ligne.map((v) => latexNombreFixe(v, decimales, entiers)).join(' & '));
  return `\\begin{pmatrix} ${lignes.join(' \\\\ ')} \\end{pmatrix}`;
}

export function latexMatrice(M, chiffres = 3) {
  const lignes = M.map((ligne) => ligne.map((v) => latexNombre(v, chiffres)).join(' & '));
  return `\\begin{pmatrix} ${lignes.join(' \\\\ ')} \\end{pmatrix}`;
}

// Espaces insécables de la typographie française : avant « : », « ; », « ! »,
// « ? » et à l'intérieur des guillemets.
export function typographie(t) {
  return t
    .replace(/ ([:;!?»])/g, '\u00a0$1')
    .replace(/« /g, '«\u00a0');
}

// Nombre pour la console : 4 chiffres significatifs, notation scientifique
// pour les très petites ou très grandes valeurs (2,3e-5).
export function nombreCourt(v, chiffres = 4) {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  const s = a < 1e-3 || a >= 1e5 ? Number(v.toPrecision(chiffres)).toExponential().replace('e+', 'e') : String(Number(v.toPrecision(chiffres)));
  return s.replace('.', ',').replace(/^-/, '−');
}

// Nombre en notation scientifique de largeur constante : signe toujours écrit,
// `decimales` décimales, exposant à deux chiffres (+1,23e−02). Pour une valeur
// affichée en direct (légende des courbes) : le texte ne bouge pas quand la
// valeur change. Les chiffres, le signe et l'exposant ont tous la même largeur
// en police à chasse fixe.
export function nombreScientifique(v, decimales = 2) {
  if (!Number.isFinite(v)) return '—'.padEnd(decimales + 7, '\u00a0');
  const [mantisse, exposant] = Math.abs(v).toExponential(decimales).split('e');
  const nul = Number(mantisse) === 0;
  const signe = v < 0 && !nul ? '−' : '+';
  const e = nul ? 0 : Number(exposant);
  return `${signe}${mantisse.replace('.', ',')}e${e < 0 ? '−' : '+'}${String(Math.abs(e)).padStart(2, '0')}`;
}

// Étiquettes d'un axe de graduations régulières : même nombre de décimales
// pour toutes, et l'ordre de grandeur en notation scientifique (5e-3) quand les
// valeurs sont très petites ou très grandes, pour ne jamais lire « 0 » partout.
export function etiquettesAxe(valeurs) {
  const finies = valeurs.filter(Number.isFinite);
  const max = Math.max(0, ...finies.map(Math.abs));
  if (max === 0) return valeurs.map((v) => (Number.isFinite(v) ? '0' : ''));
  const ecarts = finies.slice(1).map((v, i) => Math.abs(v - finies[i])).filter((d) => d > 0);
  const pas = ecarts.length ? Math.min(...ecarts) : max;
  const e = Math.floor(Math.log10(max) + 1e-9);
  const scientifique = e <= -3 || e >= 5;
  const echelle = scientifique ? 10 ** e : 1;
  const decimales = Math.min(12, Math.max(0, Math.ceil(-Math.log10(pas / echelle) - 1e-9)));
  return valeurs.map((v) => {
    if (!Number.isFinite(v)) return '';
    if (Math.abs(v) < pas * 1e-6) return '0';
    const s = (v / echelle).toFixed(decimales).replace('.', ',').replace('-', '−');
    return scientifique ? `${s}e${e}`.replace('e-', 'e−') : s;
  });
}

export function latexVecteur(v, chiffres = 3) {
  return v.length === 1 ? latexNombre(v[0], chiffres) : `\\left(${v.map((x) => latexNombre(x, chiffres)).join('\\ ;\\ ')}\\right)`;
}

// Polynôme unitaire de coefficients c (degré décroissant), en LaTeX, en λ.
export function polynomeLatex(c) {
  const n = c.length - 1;
  let s = '';
  c.forEach((ck, k) => {
    const p = n - k;
    if (Math.abs(ck) < 1e-12) return;
    const a = Math.abs(ck);
    const signe = ck < 0 ? '-' : s ? '+' : '';
    const coef = p > 0 && Math.abs(a - 1) < 1e-12 ? '' : latexNombre(a);
    const puissance = p === 0 ? '' : p === 1 ? '\\lambda' : `\\lambda^{${p}}`;
    s += ` ${signe} ${coef}${puissance}`;
  });
  return s.trim() || '0';
}
