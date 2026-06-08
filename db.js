const path = require('path');
const Database = require('better-sqlite3');
const { DATA_DIR } = require('./config');

const DB_PATH = path.join(DATA_DIR, 'expenses.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category    TEXT    NOT NULL,
    payer       TEXT    NOT NULL DEFAULT 'Both',
    description TEXT    NOT NULL DEFAULT '',
    amount      REAL    NOT NULL DEFAULT 0,
    date        TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'Unpaid',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
