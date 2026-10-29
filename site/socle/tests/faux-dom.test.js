// Le faux DOM lui-même, pour ce que les tests des pages lui demandent : charger le
// corps d'un modèle sans mentir (`chargeCorps`), `before`, `getElementById`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { chargeCorps, el, installeDom } from './aides/faux-dom.js';

const corps = (html) => {
  installeDom();
  return chargeCorps(`<html><head><title>t</title></head><body class="page">${html}</body></html>`).body;
};

test('chargeCorps : balises imbriquées, attributs, `hidden`, éléments vides, commentaires ignorés', () => {
  const body = corps('<!-- note --><div id="a" data-groupe="g"><p hidden>un <b>deux</b></p><br><input type="text" /></div>');
  assert.equal(body.className, 'page');
  const a = body.ownerDocument.getElementById('a');
  assert.equal(a.dataset.groupe, 'g');
  assert.deepEqual(a.children.map((e) => e.tagName), ['P', 'BR', 'INPUT']);
  assert.equal(a.children[0].hidden, true);
  assert.equal(a.textContent, 'un deux');
  assert.ok(body.ownerDocument.body === body && body.parentNode === body.ownerDocument.documentElement);
});

test('chargeCorps : une entité ou une balise mal fermée lève', () => {
  assert.throws(() => corps('<p>a &amp; b</p>'), /entité/);
  assert.throws(() => corps('<div><p></div>'), /<\/div> inattendue/);
  assert.throws(() => corps('<div>'), /<div> non fermée/);
});

test('before et getElementById', () => {
  const document = installeDom();
  const b = document.body.appendChild(el('p', { id: 'b' }));
  b.before(el('p', { id: 'a' }), 'texte');
  assert.deepEqual(document.body.childNodes.map((n) => n.id ?? n.nodeValue), ['a', 'texte', 'b']);
  assert.ok(document.getElementById('b') === b);
  assert.equal(document.getElementById('z'), null);
});
