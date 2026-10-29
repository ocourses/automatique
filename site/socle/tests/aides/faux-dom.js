// Faux DOM minimal pour les tests sous Node : juste ce qu'emploient les modules
// du socle (`head` et `body`, éléments, textes, attributs, `dataset`, sélecteurs simples,
// événements qui remontent, `focus`, TreeWalker de textes), et le corps d'une page
// HTML chargé depuis son modèle (`chargeCorps`). Écrit à la main
// plutôt qu'une dépendance npm : les tests du socle tournent aussi dans le
// dépôt étudiant, avec un simple `node --test`.
//
// Sélecteurs reconnus : une liste, séparée par des virgules, de sélecteurs
// simples (balise, .classe, [attr], [attr=valeur], [attr="valeur"]), sans
// combinateur. Un autre sélecteur lève une erreur plutôt que de mentir.
//
// Usage : const document = installeDom();
//         document.body.append(el('p', { class: 'note' }, 'texte'));

export const NodeFilter = { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 };

const SIMPLE = /^([a-z][\w-]*)?((?:\.[\w-]+|\[[\w-]+(?:="?[^\]"]*"?)?\])*)$/i;
const PARTIE = /\.([\w-]+)|\[([\w-]+)(?:="?([^\]"]*)"?)?\]/g;
const kebab = (nom) => nom.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function correspond(element, selecteur) {
  return selecteur.split(',').some((brut) => {
    const s = brut.trim();
    const m = s.match(SIMPLE);
    if (!m) throw new Error(`faux DOM : sélecteur non pris en charge : ${s}`);
    if (m[1] && element.tagName !== m[1].toUpperCase()) return false;
    for (const [, classe, attribut, valeur] of m[2].matchAll(PARTIE)) {
      if (classe && !element.classList.contains(classe)) return false;
      if (attribut && (valeur === undefined ? !element.hasAttribute(attribut) : element.getAttribute(attribut) !== valeur)) return false;
    }
    return true;
  });
}

// Événement à passer à `dispatchEvent` : `evenement('keydown', { key: 'Escape' })`.
export function evenement(type, proprietes = {}) {
  return {
    type,
    bubbles: true,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...proprietes,
  };
}

class Cible {
  ecouteurs = {};

  addEventListener(type, rappel) {
    (this.ecouteurs[type] ??= []).push(rappel);
  }

  removeEventListener(type, rappel) {
    this.ecouteurs[type] = (this.ecouteurs[type] ?? []).filter((r) => r !== rappel);
  }

  dispatchEvent(ev) {
    ev.target ??= this;
    for (const rappel of [...(this.ecouteurs[ev.type] ?? [])]) rappel(ev);
    if (ev.bubbles) this.parentNode?.dispatchEvent(ev);
    return !ev.defaultPrevented;
  }
}

class Noeud extends Cible {
  parentNode = null;

  get parentElement() {
    return this.parentNode instanceof Element ? this.parentNode : null;
  }

  get isConnected() {
    let n = this;
    while (n.parentNode) n = n.parentNode;
    return n instanceof Document;
  }

  before(...noeuds) {
    this.parentNode.insere(this.parentNode.childNodes.indexOf(this), noeuds);
  }

  replaceWith(...noeuds) {
    const parent = this.parentNode;
    const i = parent.childNodes.indexOf(this);
    parent.childNodes.splice(i, 1);
    this.parentNode = null;
    parent.insere(i, noeuds);
  }
}

class Texte extends Noeud {
  constructor(valeur) {
    super();
    this.nodeValue = String(valeur);
  }

  get textContent() {
    return this.nodeValue;
  }

  splitText(i) {
    const suite = new Texte(this.nodeValue.slice(i));
    this.nodeValue = this.nodeValue.slice(0, i);
    this.parentNode?.insere(this.parentNode.childNodes.indexOf(this) + 1, [suite]);
    return suite;
  }
}

class Element extends Noeud {
  constructor(document, balise) {
    super();
    this.ownerDocument = document;
    this.tagName = balise.toUpperCase();
    this.childNodes = [];
    this.attributs = new Map();
    this.style = { setProperty: (nom, v) => (this.style[nom] = v) };
    this.hidden = false;
    this.tabIndex = -1;
    this.dataset = new Proxy(
      {},
      {
        get: (_, cle) => this.getAttribute(`data-${kebab(String(cle))}`) ?? undefined,
        set: (_, cle, v) => {
          this.setAttribute(`data-${kebab(String(cle))}`, v);
          return true;
        },
      },
    );
    this.classList = {
      contains: (c) => this.className.split(/\s+/).includes(c),
      add: (...cs) => cs.forEach((c) => this.classList.toggle(c, true)),
      remove: (...cs) => cs.forEach((c) => this.classList.toggle(c, false)),
      toggle: (c, force = !this.classList.contains(c)) => {
        const autres = this.className.split(/\s+/).filter((x) => x && x !== c);
        this.className = (force ? [...autres, c] : autres).join(' ');
        return force;
      },
    };
  }

  // Comme un champ de saisie : la valeur est toujours du texte.
  get value() {
    return this.valeur ?? '';
  }

  set value(v) {
    this.valeur = String(v);
  }

  get className() {
    return this.getAttribute('class') ?? '';
  }

  set className(v) {
    this.setAttribute('class', v);
  }

  get id() {
    return this.getAttribute('id') ?? '';
  }

  set id(v) {
    this.setAttribute('id', v);
  }

  hasAttribute(nom) {
    return this.attributs.has(nom);
  }

  getAttribute(nom) {
    return this.attributs.get(nom) ?? null;
  }

  setAttribute(nom, v) {
    this.attributs.set(nom, String(v));
  }

  removeAttribute(nom) {
    this.attributs.delete(nom);
  }

  get children() {
    return this.childNodes.filter((n) => n instanceof Element);
  }

  get textContent() {
    return this.childNodes.map((n) => n.textContent).join('');
  }

  set textContent(v) {
    for (const n of this.childNodes) n.parentNode = null;
    this.childNodes = [];
    if (v !== '') this.insere(0, [String(v)]);
  }

  // Insère des nœuds (ou des textes) à la position i, en les retirant de leur parent.
  insere(i, noeuds) {
    const vrais = noeuds.map((n) => (n instanceof Noeud ? n : new Texte(n)));
    for (const n of vrais) {
      if (n.parentNode) {
        const ancien = n.parentNode.childNodes;
        const j = ancien.indexOf(n);
        ancien.splice(j, 1);
        if (n.parentNode === this && j < i) i--;
      }
      n.parentNode = this;
    }
    this.childNodes.splice(i, 0, ...vrais);
  }

  appendChild(n) {
    this.insere(this.childNodes.length, [n]);
    return n;
  }

  append(...noeuds) {
    this.insere(this.childNodes.length, noeuds);
  }

  prepend(...noeuds) {
    this.insere(0, noeuds);
  }

  contains(n) {
    for (let x = n; x; x = x.parentNode) if (x === this) return true;
    return false;
  }

  matches(selecteur) {
    return correspond(this, selecteur);
  }

  closest(selecteur) {
    for (let x = this; x instanceof Element; x = x.parentNode) if (x.matches(selecteur)) return x;
    return null;
  }

  querySelectorAll(selecteur) {
    const trouves = [];
    const parcours = (e) => {
      for (const enfant of e.children) {
        if (enfant.matches(selecteur)) trouves.push(enfant);
        parcours(enfant);
      }
    };
    parcours(this);
    return trouves;
  }

  querySelector(selecteur) {
    return this.querySelectorAll(selecteur)[0] ?? null;
  }

  focus() {
    this.ownerDocument.activeElement = this;
    this.dispatchEvent(evenement('focus', { bubbles: false }));
  }

  // Le document retient l'élément vers lequel la page a défilé.
  scrollIntoView() {
    this.ownerDocument.defile = this;
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
}

class Document extends Cible {
  constructor() {
    super();
    this.documentElement = new Element(this, 'html');
    this.head = this.documentElement.appendChild(new Element(this, 'head'));
    this.body = this.documentElement.appendChild(new Element(this, 'body'));
    this.documentElement.parentNode = this;
    this.activeElement = this.body;
  }

  createElement(balise) {
    return new Element(this, balise);
  }

  createTextNode(valeur) {
    return new Texte(valeur);
  }

  getElementById(id) {
    return this.querySelector(`[id="${id}"]`);
  }

  querySelectorAll(selecteur) {
    return this.documentElement.querySelectorAll(selecteur);
  }

  querySelector(selecteur) {
    return this.documentElement.querySelector(selecteur);
  }

  // Ne parcourt que les textes (SHOW_TEXT), relevés à la création : suffit à
  // un appelant qui s'arrête à la première modification du DOM.
  createTreeWalker(racine, _quoi, filtre = null) {
    const textes = [];
    const parcours = (e) => {
      for (const n of e.childNodes) {
        if (n instanceof Texte) textes.push(n);
        else parcours(n);
      }
    };
    parcours(racine);
    const accepte = (t) => (filtre?.acceptNode?.(t) ?? NodeFilter.FILTER_ACCEPT) === NodeFilter.FILTER_ACCEPT;
    let i = -1;
    return {
      currentNode: racine,
      nextNode() {
        while (++i < textes.length) if (accepte(textes[i])) return (this.currentNode = textes[i]);
        return null;
      },
    };
  }
}

// `new Event('change')`, comme dans un navigateur ; celui de Node a une cible en
// lecture seule, que `dispatchEvent` ne peut pas renseigner.
class FauxEvenement {
  constructor(type, options = {}) {
    Object.assign(this, evenement(type, { bubbles: false, ...options }));
  }
}

// Installe un document neuf (et `NodeFilter`, `Event`, `window`) dans globalThis ; le renvoie.
export function installeDom() {
  const document = new Document();
  Object.assign(globalThis, {
    document,
    NodeFilter,
    Event: FauxEvenement,
    window: { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 },
  });
  return document;
}

// Élément construit en une ligne : el('button', { role: 'tab', hidden: true }, 'texte', enfant).
// `hidden` est la propriété, les autres clés sont des attributs.
export function el(balise, attributs = {}, ...enfants) {
  const e = globalThis.document.createElement(balise);
  for (const [cle, v] of Object.entries(attributs)) {
    if (cle === 'hidden') e.hidden = v;
    else e.setAttribute(cle, v);
  }
  e.append(...enfants);
  return e;
}

// `getComputedStyle` factice : chaque variable CSS vaut `valeur(nom)` (son nom par
// défaut). Pour les modules qui lisent la charte (`couleurs()` de theme.js).
export function installeStyleCalcule(valeur = (nom) => nom) {
  globalThis.getComputedStyle = () => ({ getPropertyValue: valeur });
}

// Remplace le corps du document par celui de la page `html` (un modèle de
// modeles/) : balises, attributs entre guillemets doubles, commentaires ignorés.
// Une entité HTML ou une balise mal fermée lève une erreur plutôt que de mentir.
const VIDES = new Set(['br', 'hr', 'img', 'input', 'link', 'meta']);
const JETON = /<!--[\s\S]*?-->|<(\/?)([a-z][\w-]*)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*\/?>|[^<]+/gi;
const ATTRIBUT = /([\w-]+)(?:="([^"]*)")?/g;

export function chargeCorps(html) {
  const document = globalThis.document;
  const corps = html.match(/<body((?:\s+[\w-]+(?:="[^"]*")?)*)\s*>([\s\S]*)<\/body>/i);
  if (!corps) throw new Error('faux DOM : pas de <body>');
  const body = document.createElement('body');
  const pile = [body];
  const attribue = (e, attributs) => {
    for (const [, nom, valeur = ''] of attributs.matchAll(ATTRIBUT)) {
      if (nom === 'hidden') e.hidden = true;
      else e.setAttribute(nom, valeur);
    }
  };
  attribue(body, corps[1]);
  for (const [jeton, fermante, balise, attributs] of corps[2].matchAll(JETON)) {
    if (jeton.startsWith('<!--')) continue;
    if (!balise) {
      if (jeton.includes('&')) throw new Error(`faux DOM : entité non prise en charge : ${jeton.trim()}`);
      pile.at(-1).append(jeton);
    } else if (fermante) {
      if (pile.length < 2 || pile.at(-1).tagName !== balise.toUpperCase()) throw new Error(`faux DOM : </${balise}> inattendue`);
      pile.pop();
    } else {
      const e = document.createElement(balise);
      attribue(e, attributs);
      pile.at(-1).append(e);
      if (!VIDES.has(balise.toLowerCase())) pile.push(e);
    }
  }
  if (pile.length > 1) throw new Error(`faux DOM : <${pile.at(-1).tagName.toLowerCase()}> non fermée`);
  document.documentElement.childNodes.at(-1).replaceWith(body);
  document.body = body;
  return document;
}
