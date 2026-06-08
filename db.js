const { Pool } = require('pg');

// Load .env for local development; in production, platform env vars still take precedence.
try {
  require('dotenv').config();
} catch (_) {
  // dotenv is optional at runtime.
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. For local dev, point it to your Neon Postgres instance.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const output = await work(client);
    await client.query('COMMIT');
    return output;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          BIGSERIAL PRIMARY KEY,
      category    TEXT NOT NULL,
      payer       TEXT NOT NULL DEFAULT 'Both',
      description TEXT NOT NULL DEFAULT '',
      amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
      date        TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'Unpaid',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
  `);
}

module.exports = {
  pool,
  query,
  withTransaction,
  initDb,
};
