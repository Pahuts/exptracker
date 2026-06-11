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

  await query(`
    CREATE TABLE IF NOT EXISTS wedding_suppliers (
      id               BIGSERIAL PRIMARY KEY,
      category         TEXT NOT NULL,
      supplier_name    TEXT NOT NULL,
      estimated_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      actual_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_paid       NUMERIC(14,2) NOT NULL DEFAULT 0,
      gaile_paid       NUMERIC(14,2) NOT NULL DEFAULT 0,
      nald_paid        NUMERIC(14,2) NOT NULL DEFAULT 0,
      balance          NUMERIC(14,2) NOT NULL DEFAULT 0,
      first_payment    TEXT NOT NULL DEFAULT '',
      next_payment     TEXT NOT NULL DEFAULT '',
      payment_notes    TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL DEFAULT 'Deciding',
      contract_sent    TEXT NOT NULL DEFAULT '',
      remarks          TEXT NOT NULL DEFAULT '',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Idempotent column additions (safe on re-deploy)
  await query(`ALTER TABLE wedding_suppliers ADD COLUMN IF NOT EXISTS first_payment_done  BOOLEAN NOT NULL DEFAULT FALSE`);
  await query(`ALTER TABLE wedding_suppliers ADD COLUMN IF NOT EXISTS next_payment_done   BOOLEAN NOT NULL DEFAULT FALSE`);
  await query(`ALTER TABLE wedding_suppliers ADD COLUMN IF NOT EXISTS third_payment       TEXT    NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE wedding_suppliers ADD COLUMN IF NOT EXISTS third_payment_done  BOOLEAN NOT NULL DEFAULT FALSE`);
}

module.exports = {
  pool,
  query,
  withTransaction,
  initDb,
};
