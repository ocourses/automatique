// Infobulles (js/ui/infobulle.js) : mot souligné (première occurrence, mot
// entier, hors formules et termes déjà soulignés), ouverture et fermeture de la
// bulle. Un faux DOM remplace le navigateur ; la bulle étant unique pour la page,
// un seul document sert à tout le fichier.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { attacheInfobulle, souligne } from '../js/ui/infobulle.js';
import { el, evenement, installeDom } from './aides/faux-dom.js';

const document = installeDom();
const paragraphe = (...enfants) => document.body.appendChild(el('p', {}, ...enfants));
const bulle = () => document.querySelector('[role=tooltip]');

test('souligne : la première occurrence, munie d’une infobulle, sans changer le texte', () => {
  const p = paragraphe('Une tribu engendrée est une tribu.');
  const terme = souligne(p, ['tribu'], 'Définition');
  assert.equal(terme.textContent, 'tribu');
  assert.equal(terme.className, 'terme');
  assert.equal(terme.tabIndex, 0);
  assert.equal(p.childNodes[0].nodeValue, 'Une ');
  assert.equal(p.textContent, 'Une tribu engendrée est une tribu.');
  assert.equal(p.querySelectorAll('.terme').length, 1);
});

test('souligne : mot entier seulement, lettres accentuées comprises', () => {
  const p = paragraphe('La démesure, les mesures, mesurée, puis une mesure.');
  souligne(p, ['mesure'], 'd');
  assert.equal(p.childNodes[0].nodeValue, 'La démesure, les mesures, mesurée, puis une ');
  assert.equal(p.querySelector('.terme').textContent, 'mesure');
});

test('souligne : ni dans une formule KaTeX, ni dans un terme déjà souligné', () => {
  const p = paragraphe(el('span', { class: 'katex' }, el('span', {}, 'tribu')), ' puis ', el('span', { class: 'terme' }, 'tribu'), ' enfin la tribu');
  const terme = souligne(p, ['tribu'], 'd');
  assert.equal(terme.parentNode, p);
  assert.equal(p.childNodes[p.childNodes.indexOf(terme) - 1].nodeValue, ' enfin la ');
  assert.equal(p.querySelectorAll('.terme').length, 2);
});

test('souligne : les formes sont essayées dans l’ordre donné', () => {
  const p = paragraphe('Deux tribus.');
  assert.equal(souligne(p, ['tribus', 'tribu'], 'd').textContent, 'tribus');
});

test('souligne : absent, renvoie null et laisse le texte', () => {
  const p = paragraphe('Rien ici.');
  assert.equal(souligne(p, ['tribu'], 'd'), null);
  assert.deepEqual(p.childNodes.map((n) => n.nodeValue), ['Rien ici.']);
});

test('attacheInfobulle : le survol ouvre la bulle, Échap la ferme', () => {
  const bouton = document.body.appendChild(el('button', {}, 'i'));
  attacheInfobulle(bouton, 'Explication');
  bouton.dispatchEvent(evenement('mouseenter'));
  assert.equal(bulle().hidden, false);
  assert.equal(bulle().textContent, 'Explication');
  assert.equal(bouton.getAttribute('aria-describedby'), bulle().id);
  document.dispatchEvent(evenement('keydown', { key: 'Escape' }));
  assert.equal(bulle().hidden, true);
  assert.equal(bouton.getAttribute('aria-describedby'), null);
});

test('attacheInfobulle : un contenu riche est reconstruit à chaque ouverture ; un clic ailleurs ferme', () => {
  let ouvertures = 0;
  const bouton = document.body.appendChild(el('button', {}, 'i'));
  attacheInfobulle(bouton, () => el('strong', {}, `ouverture ${++ouvertures}`));
  bouton.dispatchEvent(evenement('click'));
  assert.equal(bulle().textContent, 'ouverture 1');
  document.body.dispatchEvent(evenement('pointerdown'));
  assert.equal(bulle().hidden, true);
  bouton.dispatchEvent(evenement('click'));
  assert.equal(bulle().textContent, 'ouverture 2');
});

test('attacheInfobulle : la bulle reste ouverte tant que l’élément a le focus', () => {
  const bouton = document.body.appendChild(el('button', {}, 'i'));
  attacheInfobulle(bouton, 'Explication');
  bouton.focus();
  bouton.dispatchEvent(evenement('mouseleave'));
  assert.equal(bulle().hidden, false);
  bouton.dispatchEvent(evenement('blur', { bubbles: false }));
  assert.equal(bulle().hidden, true);
});
