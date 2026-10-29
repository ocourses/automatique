// chargeKatex : feuille et script insérés une seule fois, avec leur empreinte ;
// la promesse attend les deux. Chaque test importe un module neuf (son état de
// chargement est propre au module) dans un document neuf.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { installeDom, el, evenement } from './aides/faux-dom.js';

let n = 0;
async function prepare() {
  const document = installeDom();
  document.head.append(el('link', { rel: 'stylesheet', href: 'css/theme.css' }));
  const { chargeKatex, KATEX } = await import(`../js/ui/katex.js?${++n}`);
  return { document, chargeKatex, KATEX };
}

const enAttente = async (promesse) => {
  let fini = false;
  promesse.then(() => (fini = true), () => (fini = true));
  await new Promise((r) => setImmediate(r));
  return !fini;
};

// Le faux DOM ne reflète pas les propriétés en attributs : on repère les
// éléments insérés par leur place dans <head>.
const insere = (document) => ({ feuille: document.head.children[0], script: document.head.children.at(-1) });
const balises = (document) => document.head.children.map((e) => e.tagName).join(' ');

const charge = (element) => element.dispatchEvent(evenement('load', { bubbles: false }));

test('chargeKatex : KaTeX déjà là, rien n’est inséré', async () => {
  const { document, chargeKatex } = await prepare();
  window.katex = { deja: true };
  assert.ok((await chargeKatex()) === window.katex);
  assert.equal(balises(document), 'LINK');
});

test('chargeKatex : la feuille passe avant celles du site, le script à la fin de <head>', async () => {
  const { document, chargeKatex, KATEX } = await prepare();
  chargeKatex();
  assert.equal(balises(document), 'LINK LINK SCRIPT');
  const { feuille, script } = insere(document);
  assert.equal(feuille.rel, 'stylesheet');
  assert.equal(feuille.href, KATEX.feuille.href);
  assert.equal(feuille.integrity, KATEX.feuille.integrity);
  assert.equal(script.src, KATEX.script.src);
  assert.equal(script.integrity, KATEX.script.integrity);
  for (const e of [feuille, script]) assert.equal(e.crossOrigin, 'anonymous');
});

test('chargeKatex : la promesse attend la feuille et le script, puis rend window.katex', async () => {
  const { document, chargeKatex } = await prepare();
  const promesse = chargeKatex();
  const { feuille, script } = insere(document);
  window.katex = { render() {} };
  charge(script);
  assert.ok(await enAttente(promesse), 'résolue sans la feuille');
  charge(feuille);
  assert.ok((await promesse) === window.katex);
});

test('chargeKatex : deux appels pendant le chargement, une seule insertion', async () => {
  const { document, chargeKatex } = await prepare();
  const premier = chargeKatex();
  assert.ok(chargeKatex() === premier);
  assert.equal(balises(document), 'LINK LINK SCRIPT');
});

test('chargeKatex : un fichier refusé (empreinte, réseau) rejette en le nommant', async () => {
  const { document, chargeKatex, KATEX } = await prepare();
  const promesse = chargeKatex();
  const { feuille, script } = insere(document);
  charge(feuille);
  script.dispatchEvent(evenement('error', { bubbles: false }));
  await assert.rejects(promesse, (e) => e.message.includes(KATEX.script.src));
});

test('KATEX : figé, une page ne peut pas changer la version ni l’empreinte', async () => {
  const { KATEX } = await prepare();
  assert.throws(() => (KATEX.script.integrity = 'sha384-autre'), TypeError);
  assert.throws(() => (KATEX.feuille = {}), TypeError);
});

test('KATEX : une seule version, des empreintes sha384', async () => {
  const { KATEX } = await prepare();
  const versions = [KATEX.feuille.href, KATEX.script.src].map((url) => url.match(/katex@([\d.]+)\//)?.[1]);
  assert.ok(versions[0]);
  assert.equal(versions[0], versions[1]);
  for (const { integrity } of [KATEX.feuille, KATEX.script]) assert.match(integrity, /^sha384-[A-Za-z0-9+/]{64}$/);
});
