const path = require('path');
const fs = require('fs');

// Where persistent files (SQLite DB + cookie secret) live.
// On Render/Railway/Fly, set DATA_DIR to a mounted disk path (e.g. /data)
// so data survives restarts and redeploys. Defaults to ./data locally.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

const isProduction = process.env.NODE_ENV === 'production';

module.exports = { DATA_DIR, isProduction };
