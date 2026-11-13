'use strict';
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const cfg = require('./config');
const { db } = require('./db');
const { HttpError } = require('./http');

const COOKIE = 'galope_sid';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const gClient = cfg.googleClientId ? new OAuth2Client(cfg.googleClientId) : null;

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function currentSession(req) {
  const tok = parseCookies(req)[COOKIE];
  if (!tok || tok.length !== 64) return null;
  const row = db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?').get(sha(tok), Date.now());
  return row || null;
}

/** Middleware: protege todo /api/admin. En modo "open" deja pasar (solo para pruebas locales). */
function requireAdmin(req, res, next) {
  if (cfg.authMode === 'open') return next();
  const s = currentSession(req);
  if (!s || !cfg.adminEmails.includes(s.email)) return next(new HttpError(401, 'Inicia sesión como administrador'));
  req.admin = { email: s.email, name: s.name };
  next();
}

function status(req) {
  if (cfg.authMode === 'open') return { mode: 'open', authenticated: true, email: null };
  const s = currentSession(req);
  const ok = !!s && cfg.adminEmails.includes(s.email);
  return {
    mode: 'google',
    authenticated: ok,
    email: ok ? s.email : null,
    name: ok ? s.name : null,
    googleClientId: cfg.googleClientId,
  };
}

async function loginWithGoogle(credential, req, res) {
  if (cfg.authMode !== 'google' || !gClient) throw new HttpError(400, 'Google no está configurado');
  if (typeof credential !== 'string' || credential.length < 100 || credential.length > 4096) {
    throw new HttpError(400, 'Credencial inválida');
  }
  let payload;
  try {
    const ticket = await gClient.verifyIdToken({ idToken: credential, audience: cfg.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new HttpError(401, 'No se pudo verificar la cuenta de Google');
  }
  const email = String(payload.email || '').toLowerCase();
  if (!payload.email_verified || !cfg.adminEmails.includes(email)) {
    throw new HttpError(403, 'Esta cuenta no tiene permiso de administrador');
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,email,name,expires_at) VALUES (?,?,?,?)')
    .run(sha(token), email, String(payload.name || '').slice(0, 100), Date.now() + cfg.sessionTtlMs);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cfg.isProd || req.secure,
    maxAge: cfg.sessionTtlMs,
    path: '/',
  });
  return { ok: true, email };
}

function logout(req, res) {
  const tok = parseCookies(req)[COOKIE];
  if (tok) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(tok));
  res.clearCookie(COOKIE, { path: '/' });
}

// Limpieza de sesiones vencidas
setInterval(() => db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now()), 3600 * 1000).unref();

module.exports = { requireAdmin, status, loginWithGoogle, logout };
