const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DATA_DIR, isProduction } = require('./config');

// The plaintext password is NEVER stored. We keep only a scrypt hash + salt.
// In production, supply these via the PASSWORD_HASH / PASSWORD_SALT env vars
// (see .env.example). The hard-coded values below are only a local-dev
// fallback so the app still runs out of the box.
// Verification re-derives the hash from the submitted password and compares
// using a constant-time comparison to avoid timing attacks.
const SALT = Buffer.from(
  process.env.PASSWORD_SALT || '93a73b58a3a7314b47926abbae822362',
  'hex'
);
const HASH = Buffer.from(
  process.env.PASSWORD_HASH ||
    '5fcc7c2a9f4ebb70a008b937d2ea1c6495feefc7cf2868a299432bf28d02fabe' +
      '8e900984957bb6dbbfa9a3a11f7800654de9b90a34c938a9feafae25818fafd0',
  'hex'
);

const COOKIE_NAME = 'et_session';
const SESSION_MS = 1000 * 60 * 60 * 12; // 12 hours

// A secret used to sign session cookies. Prefer SESSION_SECRET from the
// environment (so cookies stay valid across restarts/instances). Otherwise
// fall back to a per-install secret stored on the persistent disk.
const SECRET_PATH = path.join(DATA_DIR, '.secret');
function loadSecret() {
  if (process.env.SESSION_SECRET) {
    return Buffer.from(process.env.SESSION_SECRET, 'utf8');
  }
  try {
    return fs.readFileSync(SECRET_PATH);
  } catch {
    const secret = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true });
    fs.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
    return secret;
  }
}
const SECRET = loadSecret();

function verifyPassword(input) {
  if (typeof input !== 'string' || input.length === 0) return false;
  let derived;
  try {
    derived = crypto.scryptSync(input, SALT, HASH.length);
  } catch {
    return false;
  }
  return derived.length === HASH.length && crypto.timingSafeEqual(derived, HASH);
}

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

// Token format: "<expiryMs>.<hmac>"
function createToken() {
  const expiry = String(Date.now() + SESSION_MS);
  return `${expiry}.${sign(expiry)}`;
}

function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [expiry, mac] = token.split('.');
  const expected = sign(expiry);
  const macBuf = Buffer.from(mac || '', 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (macBuf.length !== expBuf.length || !crypto.timingSafeEqual(macBuf, expBuf)) return false;
  return Number(expiry) > Date.now();
}

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) acc[k] = decodeURIComponent(v);
    return acc;
  }, {});
}

function isAuthed(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifyToken(cookies[COOKIE_NAME]);
}

module.exports = {
  COOKIE_NAME,
  SESSION_MS,
  isProduction,
  verifyPassword,
  createToken,
  isAuthed,
};
