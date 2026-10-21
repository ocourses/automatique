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
