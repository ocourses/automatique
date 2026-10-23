// Parseur sûr de la loi libre : une expression arithmétique en variables
// nommées, analysée en arbre puis évaluée sans `eval` ni `Function`.
//
// Grammaire : nombres (point décimal), variables, + − * / ^, parenthèses,
// appels de fonctions de la liste FONCTIONS, constante pi.

const FONCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  log: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  // Saturation symétrique : sat(v, M) = min(max(v, −M), M).
  sat: (v, M) => Math.min(Math.max(v, -M), M),
};

const CONSTANTES = { pi: Math.PI };

export class ErreurExpression extends Error {}

function lexemes(texte) {
  const res = [];
  let i = 0;
  while (i < texte.length) {
    const c = texte[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(texte.slice(i));
      if (!m) throw new ErreurExpression(`nombre mal formé à la position ${i + 1}`);
      res.push({ type: 'nombre', valeur: Number(m[0]), pos: i });
      i += m[0].length;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z_0-9]*/.exec(texte.slice(i));
      res.push({ type: 'nom', valeur: m[0], pos: i });
      i += m[0].length;
    } else if ('+-*/^(),'.includes(c)) {
      res.push({ type: c, pos: i });
      i++;
    } else if (c === '−') {
      res.push({ type: '-', pos: i });
      i++;
    } else {
      throw new ErreurExpression(`caractère inattendu « ${c} » à la position ${i + 1}`);
    }
  }
  res.push({ type: 'fin', pos: texte.length });
  return res;
}

// Analyse descendante : somme > produit > unaire > puissance > atome.
export function analyse(texte) {
  const toks = lexemes(texte);
  let k = 0;
  const voit = (type) => toks[k].type === type;
  const attend = (type) => {
    if (!voit(type)) {
      const t = toks[k];
      const vu = t.type === 'fin' ? 'la fin de l’expression' : `« ${t.valeur ?? t.type} »`;
      throw new ErreurExpression(`« ${type} » attendu à la place de ${vu} (position ${t.pos + 1})`);
    }
    return toks[k++];
  };

  function somme() {
    let g = produit();
    while (voit('+') || voit('-')) {
      const op = toks[k++].type;
      g = { op, g, d: produit() };
    }
    return g;
  }
  function produit() {
    let g = unaire();
    while (voit('*') || voit('/')) {
      const op = toks[k++].type;
      g = { op, g, d: unaire() };
    }
    return g;
  }
  function unaire() {
    if (voit('-')) {
      k++;
      return { op: 'neg', a: unaire() };
    }
    if (voit('+')) {
      k++;
      return unaire();
    }
    return puissance();
  }
  function puissance() {
    const base = atome();
    if (voit('^')) {
      k++;
      // Associativité à droite, et −x^2 = −(x^2).
      return { op: '^', g: base, d: unaire() };
    }
    return base;
  }
  function atome() {
    const t = toks[k];
    if (t.type === 'nombre') {
      k++;
      return { op: 'nombre', valeur: t.valeur };
    }
    if (t.type === 'nom') {
      k++;
      if (voit('(')) {
        k++;
        if (!Object.hasOwn(FONCTIONS, t.valeur)) throw new ErreurExpression(`fonction inconnue « ${t.valeur} »`);
        const args = [];
        if (!voit(')')) {
          args.push(somme());
          while (voit(',')) {
            k++;
            args.push(somme());
          }
        }
        attend(')');
        return { op: 'appel', nom: t.valeur, args };
      }
      return { op: 'variable', nom: t.valeur };
    }
    if (t.type === '(') {
      k++;
      const e = somme();
      attend(')');
      return e;
    }
    attend('expression');
  }

  if (voit('fin')) throw new ErreurExpression('expression vide');
  const arbre = somme();
  attend('fin');
  return arbre;
}

// Noms de variables utilisés dans l'arbre (hors constantes).
export function variables(arbre, acc = new Set()) {
  if (arbre.op === 'variable' && !Object.hasOwn(CONSTANTES, arbre.nom)) acc.add(arbre.nom);
  for (const fils of [arbre.g, arbre.d, arbre.a, ...(arbre.args ?? [])]) if (fils) variables(fils, acc);
  return acc;
}

export function evalue(arbre, env) {
  switch (arbre.op) {
    case 'nombre':
      return arbre.valeur;
    case 'variable':
      if (Object.hasOwn(CONSTANTES, arbre.nom)) return CONSTANTES[arbre.nom];
      return env[arbre.nom];
    case 'neg':
      return -evalue(arbre.a, env);
    case '+':
      return evalue(arbre.g, env) + evalue(arbre.d, env);
    case '-':
      return evalue(arbre.g, env) - evalue(arbre.d, env);
    case '*':
      return evalue(arbre.g, env) * evalue(arbre.d, env);
    case '/':
      return evalue(arbre.g, env) / evalue(arbre.d, env);
    case '^':
      return evalue(arbre.g, env) ** evalue(arbre.d, env);
    case 'appel':
      return FONCTIONS[arbre.nom](...arbre.args.map((a) => evalue(a, env)));
  }
  throw new ErreurExpression(`nœud inconnu ${arbre.op}`);
}

// Compile `texte` pour un ensemble de variables autorisées : renvoie
// { evalue(env), variables } ou lève ErreurExpression.
export function compile(texte, autorisees) {
  const arbre = analyse(texte);
  const vars = variables(arbre);
  for (const v of vars) {
    if (!autorisees.includes(v)) throw new ErreurExpression(`variable inconnue « ${v} »`);
  }
  return { evalue: (env) => evalue(arbre, env), variables: vars };
}
