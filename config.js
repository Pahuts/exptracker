const path = require('path');
const fs = require('fs');

// Directory used only for fallback local files (currently the auth secret
// when SESSION_SECRET is not provided). Defaults to ./data locally.
// In production, prefer SESSION_SECRET from env so no disk is required.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

const isProduction = process.env.NODE_ENV === 'production';

module.exports = { DATA_DIR, isProduction };
