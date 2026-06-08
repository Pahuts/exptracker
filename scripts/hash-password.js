// Generates PASSWORD_SALT and PASSWORD_HASH for the login password.
// Usage:
//   node scripts/hash-password.js "your-password-here"
// or set it via the PASSWORD env var:
//   $env:PASSWORD='your-password'; node scripts/hash-password.js   (PowerShell)
//
// Copy the printed values into your host's environment variables
// (e.g. Render dashboard). The plaintext password is never stored.

const crypto = require('crypto');

const pw = process.argv[2] || process.env.PASSWORD;
if (!pw) {
  console.error('Provide a password: node scripts/hash-password.js "your-password"');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(pw, salt, 64);

console.log('PASSWORD_SALT=' + salt.toString('hex'));
console.log('PASSWORD_HASH=' + hash.toString('hex'));
