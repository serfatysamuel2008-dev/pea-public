'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../public/engine.js');
const DAY = E.DAY, noon = d => E.ANCHOR + d*DAY + 10*3600000;

test('le jour de référence, les montants sont ceux des maquettes', () => {
  const G = E.defaults('Léa'); E.refresh(G, noon(0));
  assert.equal(E.totOf(G.accounts.pea), 24860.42);
  assert.equal(E.totOf(G.accounts.av), 18420.75);
  assert.equal(E.mk('MO').price, 320.63);
  assert.equal(E.mk('MO').day, 0.8);
});

test('les cours changent chaque jour, de façon identique partout', () => {
  const a = E.defaults('A'), b = E.defaults('B');
  E.refresh(a, noon(3)); const pa = E.totOf(a.accounts.pea), mo = E.mk('MO').price;
  E.refresh(b, noon(3));
  assert.equal(E.totOf(b.accounts.pea), pa);
  E.refresh(b, noon(4));
  assert.notEqual(E.mk('MO').price, mo);
});

test('le fonds euros rapporte 2,6 % par an', () => {
  const r = E.navAt('FE', 365) / E.navAt('FE', 0) - 1;
  assert.ok(Math.abs(r - 0.026) < 1e-9);
});

test('l’argent versé reste et suit la valeur des supports', () => {
  const G = E.defaults('L'); E.refresh(G, noon(0));
  E.apply(G, { type: 'order', account: 'av', mode: 'verse', amount: 100 });
  const fe = G.accounts.av.positions.find(p => p.id === 'FE'), before = fe.value;
  E.refresh(G, noon(365));
  assert.ok(fe.value > before, 'le fonds euros a progressé');
});

test('une vente ne change pas la valeur du compte : les parts deviennent des liquidités', () => {
  const G = E.defaults('L'); E.refresh(G, noon(0));
  const before = E.totOf(G.accounts.pea), cash = G.accounts.pea.cash;
  const done = E.apply(G, { type: 'order', account: 'pea', mode: 'sell', asset: 'MO', amount: 1000 });
  assert.equal(E.totOf(G.accounts.pea), before);
  assert.ok(G.accounts.pea.cash > cash);
  assert.match(done.line2, /vaut toujours/);
});

test('les versements programmés passent le 5 de chaque mois, arrondis compris', () => {
  const G = E.defaults('L'); E.refresh(G, noon(0));
  G.accounts.av.plan = { amount: 350, roundups: true, since: noon(0) };
  G.accounts.pea.plan = { amount: 100, asset: 'MO', roundups: false, since: noon(0) };
  const dep = G.accounts.av.deposits;
  E.refresh(G, noon(95));
  const runs = G.accounts.av.history.filter(h => h.kind === 'auto' && h.t > noon(0));
  assert.equal(runs.length, 3);
  assert.ok(runs.every(h => h.amount > 350 && h.amount < 367));
  assert.ok(G.accounts.av.deposits > dep + 1050);
  const pea = G.accounts.pea.history.filter(h => h.kind === 'auto' && h.t > noon(0));
  assert.ok(pea.some(h => /achetée/.test(h.detail)), 'les mois s’additionnent jusqu’à une part');
  E.refresh(G, noon(96));
  assert.equal(G.accounts.av.history.filter(h => h.kind === 'auto' && h.t > noon(0)).length, 3, 'pas de double passage');
});
