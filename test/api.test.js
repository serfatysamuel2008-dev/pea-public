'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
// Tests run on the reference day, whatever today's date is.
const Engine = require('../public/engine.js');
Engine.setClock(() => Engine.ANCHOR + 10 * 3600000);
const { server } = require('../server.js');
let base;
const sp = s => s.replace(/[\u00a0\u202f]/g, ' ');

before(() => new Promise(res => server.listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${server.address().port}`; res(); })));
after(() => new Promise(res => server.close(res)));

function client(){
  let cookie = '';
  return async (path, body, headers) => {
    const opts = { headers: Object.assign({}, cookie ? { cookie } : {}, headers) };
    if (body !== undefined){ opts.method = 'POST'; opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(base + path, opts);
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    let data = null; try { data = await res.json(); } catch (e){}
    return { status: res.status, data, set };
  };
}

test('inscription, session et état de départ', async () => {
  const c = client();
  assert.equal((await c('/api/me')).status, 401);
  const r = await c('/api/register', { email: 'Lea@Example.com', password: 'motdepasse1', firstName: 'Léa' });
  assert.equal(r.status, 201);
  assert.match(r.set, /HttpOnly/);
  assert.match(r.set, /SameSite=Lax/);
  assert.equal(r.data.state.firstName, 'Léa');
  const me = await c('/api/me');
  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, 'lea@example.com');
  assert.equal(me.data.state.accounts.pea.cash, 1250);
});

test('refuse un e-mail déjà pris et un mot de passe trop court', async () => {
  const c = client();
  assert.equal((await c('/api/register', { email: 'lea@example.com', password: 'motdepasse1', firstName: 'X' })).status, 409);
  assert.equal((await c('/api/register', { email: 'autre@example.com', password: 'court', firstName: 'X' })).status, 400);
});

test('connexion : mauvais mot de passe puis bon', async () => {
  const c = client();
  const bad = await c('/api/login', { email: 'lea@example.com', password: 'faux-mot-de-passe' });
  assert.equal(bad.status, 401);
  const ok = await c('/api/login', { email: 'lea@example.com', password: 'motdepasse1' });
  assert.equal(ok.status, 200);
  assert.equal((await c('/api/me')).status, 200);
  await c('/api/logout', {});
  assert.equal((await c('/api/me')).status, 401);
});

test('le serveur applique et persiste un achat', async () => {
  const c = client();
  await c('/api/login', { email: 'lea@example.com', password: 'motdepasse1' });
  const r = await c('/api/op', { type: 'order', account: 'pea', mode: 'buy', asset: 'MO', amount: 965 });
  assert.equal(r.status, 200);
  assert.equal(sp(r.data.done.line1), '3 parts d’ETF Monde achetées pour 961,89 €');
  const me = await c('/api/me');
  assert.equal(me.data.state.accounts.pea.cash, 288.11);
  assert.equal(me.data.state.accounts.pea.positions.find(p => p.id === 'MO').parts, 51);
});

test('le serveur refuse les opérations invalides', async () => {
  const c = client();
  await c('/api/login', { email: 'lea@example.com', password: 'motdepasse1' });
  const cases = [
    { type: 'order', account: 'pea', mode: 'buy', asset: 'MO', amount: 100000 },        // plus que les liquidités
    { type: 'order', account: 'pea', mode: 'buy', asset: 'O34', amount: 200 },          // obligation hors PEA
    { type: 'order', account: 'av', mode: 'arb', asset: 'MO', to: 'FE', amount: 10 },   // arbitrage réservé au contrat de capitalisation
    { type: 'order', account: 'pea', mode: 'sell', asset: 'MO', amount: -5 },           // montant négatif
    { type: 'profile', account: 'av', profile: '__proto__' },
    { type: 'order', account: 'xyz', mode: 'buy', asset: 'MO', amount: 10 },
    { type: 'hack' }
  ];
  for (const body of cases){
    const r = await c('/api/op', body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.ok(r.data.error);
  }
  const me = await c('/api/me');
  assert.equal(me.data.state.accounts.pea.cash, 288.11);
});

test('opérations des contrats : versement, retrait, arbitrage, PER', async () => {
  const c = client();
  await c('/api/login', { email: 'lea@example.com', password: 'motdepasse1' });
  let r = await c('/api/op', { type: 'order', account: 'av', mode: 'verse', amount: 300 });
  assert.equal(sp(r.data.done.line2), '180 € sur le fonds euros, 120 € en unités de compte.');
  r = await c('/api/op', { type: 'order', account: 'cc', mode: 'verse', amount: 100 });
  assert.equal(r.status, 400, 'contrat pas encore ouvert');
  r = await c('/api/op', { type: 'openAccount', account: 'cc', amount: 5000 });
  assert.equal(r.status, 200);
  assert.equal(r.data.state.accounts.cc.opened, true);
  assert.equal((await c('/api/op', { type: 'openAccount', account: 'cc' })).status, 400, 'déjà ouvert');
  r = await c('/api/op', { type: 'order', account: 'cc', mode: 'arb', asset: 'MO', to: 'FE', amount: 2000 });
  assert.equal(r.status, 200);
  r = await c('/api/op', { type: 'order', account: 'per', mode: 'verse', amount: 1000 });
  assert.match(sp(r.data.done.line2), /300 € d’impôt en moins/);
  r = await c('/api/op', { type: 'order', account: 'av', mode: 'withdraw', amount: 100 });
  assert.equal(r.status, 200);
});

test('les opérations exigent une session et une requête JSON du même site', async () => {
  const anon = client();
  assert.equal((await anon('/api/op', { type: 'readNotifs' })).status, 401);
  const c = client();
  await c('/api/login', { email: 'lea@example.com', password: 'motdepasse1' });
  assert.equal((await c('/api/op', { type: 'readNotifs' }, { origin: 'https://evil.example' })).status, 403);
  const res = await fetch(base + '/api/op', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
  assert.equal(res.status, 415);
});

test('les données sont séparées entre utilisateurs', async () => {
  const c = client();
  const r = await c('/api/register', { email: 'tom@example.com', password: 'motdepasse2', firstName: 'Tom' });
  assert.equal(r.data.state.accounts.pea.cash, 1250);
  assert.equal(r.data.state.firstName, 'Tom');
});

test('sert l’app et bloque la sortie du dossier public', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /engine\.js/);
  assert.equal((await fetch(base + '/engine.js')).status, 200);
  assert.notEqual((await fetch(base + '/..%2fserver.js')).status, 200);
  assert.notEqual((await fetch(base + '/%2e%2e/package.json')).status, 200);
});

test('montant mensuel libre, validé par le serveur', async () => {
  const c = client();
  await c('/api/login', { email: 'lea@example.com', password: 'motdepasse1' });
  assert.equal((await c('/api/op', { type: 'draft', account: 'av', amount: 350 })).status, 200);
  assert.equal((await c('/api/op', { type: 'draft', account: 'av', amount: 5 })).status, 400);
  assert.equal((await c('/api/op', { type: 'draft', account: 'av', amount: 50000 })).status, 400);
  const me = await c('/api/me');
  assert.equal(me.data.state.accounts.av.draft.amount, 350);
});
