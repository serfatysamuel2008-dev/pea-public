'use strict';
/* Mon PEA — serveur : comptes utilisateurs, sessions et opérations validées.
   Aucune dépendance externe : node:http, node:crypto et node:sqlite (Node 22.13+). */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const Engine = require('./public/engine.js');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'monpea.db');
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_DAYS = 30;
const MAX_BODY = 16 * 1024;

/* ---------- database ---------- */
if (DB_PATH !== ':memory:') fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    pass_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS states (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    version INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);
const q = {
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  userById: db.prepare('SELECT id, email, first_name FROM users WHERE id = ?'),
  insertUser: db.prepare('INSERT INTO users (email, first_name, pass_hash, created_at) VALUES (?, ?, ?, ?)'),
  insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
  sessionUser: db.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  purgeSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  getState: db.prepare('SELECT data, version FROM states WHERE user_id = ?'),
  insertState: db.prepare('INSERT INTO states (user_id, data, version, updated_at) VALUES (?, ?, 1, ?)'),
  updateState: db.prepare('UPDATE states SET data = ?, version = version + 1, updated_at = ? WHERE user_id = ?'),
  logOp: db.prepare('INSERT INTO operations (user_id, type, payload, created_at) VALUES (?, ?, ?, ?)')
};

/* ---------- passwords & sessions ---------- */
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function hashPassword(password){
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32, SCRYPT);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
function checkPassword(password, stored){
  const [algo, saltB64, hashB64] = String(stored).split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, SCRYPT);
  return crypto.timingSafeEqual(actual, expected);
}
// Compared against when the e-mail is unknown, so a login takes the same time either way.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

function createSession(res, userId){
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_DAYS * 86400000;
  q.insertSession.run(sha256(token), userId, expires);
  setCookie(res, token, SESSION_DAYS * 86400);
}
function setCookie(res, value, maxAge){
  const parts = [`sid=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (COOKIE_SECURE) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
function readCookie(req, name){
  const header = req.headers.cookie || '';
  for (const part of header.split(';')){
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
function currentUser(req){
  const token = readCookie(req, 'sid');
  if (!token) return null;
  const row = q.sessionUser.get(sha256(token), Date.now());
  return row ? q.userById.get(row.user_id) : null;
}

/* ---------- login throttling ---------- */
const FAILS = new Map();
const FAIL_WINDOW = 15 * 60000, FAIL_MAX = 8;
function tooManyFails(key){
  const f = FAILS.get(key);
  if (!f || Date.now() - f.first > FAIL_WINDOW){ FAILS.delete(key); return false; }
  return f.count >= FAIL_MAX;
}
function noteFail(key){
  const f = FAILS.get(key);
  if (!f || Date.now() - f.first > FAIL_WINDOW) FAILS.set(key, { first: Date.now(), count: 1 });
  else f.count++;
}

/* ---------- state ---------- */
/* Loads a user's state brought up to today: prices of the day, monthly payments due since
   the last visit, yearly counters. Anything that changed for good is saved straight away. */
function loadState(userId){
  const row = q.getState.get(userId);
  if (!row) return null;
  const state = JSON.parse(row.data);
  if (Engine.refresh(state)) q.updateState.run(JSON.stringify(state), Date.now(), userId);
  return state;
}
const publicUser = u => ({ email: u.email, firstName: u.first_name });

/* ---------- http helpers ---------- */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};
function send(res, status, data){
  const body = JSON.stringify(data);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, SECURITY_HEADERS));
  res.end(body);
}
class HttpError extends Error { constructor(status, msg){ super(msg); this.status = status; } }
function readJson(req){
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/.test(req.headers['content-type'] || '')) return reject(new HttpError(415, 'Format attendu : JSON.'));
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY){ reject(new HttpError(413, 'Requête trop volumineuse.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e){ reject(new HttpError(400, 'JSON invalide.')); }
    });
    req.on('error', reject);
  });
}
// Rejects cross-site POSTs: the Origin header, when present, must match the Host.
function sameOrigin(req){
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e){ return false; }
}

/* ---------- API ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
async function handleApi(req, res, pathname){
  if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { ok: true });

  if (req.method === 'GET' && pathname === '/api/me'){
    const user = currentUser(req);
    if (!user) return send(res, 401, { error: 'Connecte-toi pour continuer.' });
    return send(res, 200, { user: publicUser(user), state: loadState(user.id) });
  }

  if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
  if (!sameOrigin(req)) throw new HttpError(403, 'Origine refusée.');
  const body = await readJson(req);

  if (pathname === '/api/register'){
    const email = String(body.email || '').trim().toLowerCase();
    const firstName = String(body.firstName || '').trim();
    const password = String(body.password || '');
    if (!EMAIL_RE.test(email) || email.length > 120) throw new HttpError(400, 'Adresse e-mail invalide.');
    if (!firstName || firstName.length > 40) throw new HttpError(400, 'Indique ton prénom (40 caractères au plus).');
    if (password.length < 8 || password.length > 200) throw new HttpError(400, 'Le mot de passe doit faire au moins 8 caractères.');
    if (q.userByEmail.get(email)) throw new HttpError(409, 'Un compte existe déjà avec cette adresse.');
    const now = Date.now();
    const { lastInsertRowid } = q.insertUser.run(email, firstName, hashPassword(password), now);
    const userId = Number(lastInsertRowid);
    const state = Engine.defaults(firstName);
    Engine.refresh(state);
    q.insertState.run(userId, JSON.stringify(state), now);
    createSession(res, userId);
    return send(res, 201, { user: { email, firstName }, state });
  }

  if (pathname === '/api/login'){
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const key = (req.socket.remoteAddress || '') + '|' + email;
    if (tooManyFails(key)) throw new HttpError(429, 'Trop de tentatives. Réessaie dans 15 minutes.');
    const user = q.userByEmail.get(email);
    const ok = checkPassword(password, user ? user.pass_hash : DUMMY_HASH) && !!user;
    if (!ok){ noteFail(key); throw new HttpError(401, 'E-mail ou mot de passe incorrect.'); }
    FAILS.delete(key);
    createSession(res, user.id);
    return send(res, 200, { user: publicUser(user), state: loadState(user.id) });
  }

  if (pathname === '/api/logout'){
    const token = readCookie(req, 'sid');
    if (token) q.deleteSession.run(sha256(token));
    setCookie(res, '', 0);
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/op'){
    const user = currentUser(req);
    if (!user) throw new HttpError(401, 'Session expirée, reconnecte-toi.');
    const state = loadState(user.id);
    let done;
    try { done = Engine.apply(state, body); }
    catch (e){
      if (e instanceof Engine.OpError) throw new HttpError(400, e.message);
      throw e;
    }
    const now = Date.now();
    db.exec('BEGIN');
    try {
      q.updateState.run(JSON.stringify(state), now, user.id);
      q.logOp.run(user.id, String(body.type), JSON.stringify(body), now);
      db.exec('COMMIT');
    } catch (e){ db.exec('ROLLBACK'); throw e; }
    return send(res, 200, { state, done });
  }

  throw new HttpError(404, 'Route inconnue.');
}

/* ---------- static files ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function serveStatic(req, res, pathname){
  if (req.method !== 'GET' && req.method !== 'HEAD'){ res.writeHead(405); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e){ res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)){ res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err){ res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Introuvable'); }
    res.writeHead(200, Object.assign({ 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }, SECURITY_HEADERS));
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);
  try { await handleApi(req, res, pathname); }
  catch (e){
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    console.error(e);
    send(res, 500, { error: 'Erreur interne. Réessaie dans un instant.' });
  }
});
setInterval(() => q.purgeSessions.run(Date.now()), 3600000).unref();

if (require.main === module){
  server.listen(PORT, HOST, () => console.log(`Mon PEA : http://localhost:${PORT}`));
}
module.exports = { server, db };
