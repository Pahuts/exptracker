const path = require('path');
const express = require('express');
const db = require('./db');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind a hosting proxy (Render/Railway/Fly), trust X-Forwarded-* so that
// secure cookies and protocol detection work correctly.
app.set('trust proxy', 1);

app.use(express.json());

// Adds the Secure flag to cookies in production so they are only sent over HTTPS.
const secureFlag = auth.isProduction ? ' Secure;' : '';

// --- Authentication --------------------------------------------------------
// Serve the login page and login endpoint without auth; everything else
// (the app, static assets, and the API) requires a valid session cookie.
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  if (!auth.verifyPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  res.setHeader(
    'Set-Cookie',
    `${auth.COOKIE_NAME}=${auth.createToken()}; HttpOnly; SameSite=Strict;${secureFlag} Path=/; Max-Age=${
      auth.SESSION_MS / 1000
    }`
  );
  res.json({ ok: true });
});

app.post('/api/logout', (_req, res) => {
  res.setHeader(
    'Set-Cookie',
    `${auth.COOKIE_NAME}=; HttpOnly; SameSite=Strict;${secureFlag} Path=/; Max-Age=0`
  );
  res.json({ ok: true });
});

app.use((req, res, next) => {
  if (auth.isAuthed(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/login');
});

app.use(express.static(path.join(__dirname, 'public')));

const VALID_STATUS = ['Paid', 'Unpaid', 'Planned'];

function scopeFilter(scope, start = 1) {
  if (scope === 'house') {
    return { clause: `category NOT LIKE $${start}`, params: ['Wedding:%'] };
  }
  if (scope === 'wedding') {
    return { clause: `category LIKE $${start}`, params: ['Wedding:%'] };
  }
  return { clause: '', params: [] };
}

// Validate and normalise an expense payload coming from the client.
function parseExpense(body) {
  const errors = [];
  const category = String(body.category ?? '').trim();
  const payer = String(body.payer ?? 'Both').trim();
  const description = String(body.description ?? '').trim();
  const date = String(body.date ?? '').trim();
  const status = String(body.status ?? 'Unpaid').trim();
  const amount = Number(body.amount);

  if (!category) errors.push('category is required');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('date must be YYYY-MM-DD or empty');
  if (!Number.isFinite(amount) || amount < 0) errors.push('amount must be a non-negative number');
  if (!VALID_STATUS.includes(status)) errors.push(`status must be one of ${VALID_STATUS.join(', ')}`);

  return { value: { category, payer, description, amount, date, status }, errors };
}

// --- READ: list with optional filters --------------------------------------
app.get('/api/expenses', async (req, res) => {
  try {
    const { category, payer, status, year, q, scope } = req.query;
    const where = [];
    const params = [];

    const scoped = scopeFilter(scope, params.length + 1);
    if (scoped.clause) {
      where.push(scoped.clause);
      params.push(...scoped.params);
    }

    if (category) {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (payer) {
      params.push(payer);
      where.push(`payer = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (year) {
      params.push(String(year));
      where.push(`LEFT(date, 4) = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(description ILIKE $${params.length} OR category ILIKE $${params.length})`);
    }

    const sql = `
      SELECT id, category, payer, description, amount::float, date, status, created_at
      FROM expenses
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY CASE WHEN date = '' THEN 1 ELSE 0 END, date ASC, id ASC
    `;

    const rows = (await db.query(sql, params)).rows;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- READ: single ----------------------------------------------------------
app.get('/api/expenses/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, category, payer, description, amount::float, date, status, created_at
       FROM expenses WHERE id = $1`,
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CREATE ----------------------------------------------------------------
app.post('/api/expenses', async (req, res) => {
  const { value, errors } = parseExpense(req.body);
  if (errors.length) return res.status(400).json({ errors });

  try {
    const result = await db.query(
      `INSERT INTO expenses (category, payer, description, amount, date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, category, payer, description, amount::float, date, status, created_at`,
      [value.category, value.payer, value.description, value.amount, value.date, value.status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE ----------------------------------------------------------------
app.put('/api/expenses/:id', async (req, res) => {
  const { value, errors } = parseExpense(req.body);
  if (errors.length) return res.status(400).json({ errors });

  try {
    const result = await db.query(
      `UPDATE expenses
       SET category = $1, payer = $2, description = $3, amount = $4, date = $5, status = $6
       WHERE id = $7
       RETURNING id, category, payer, description, amount::float, date, status, created_at`,
      [value.category, value.payer, value.description, value.amount, value.date, value.status, req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DELETE ----------------------------------------------------------------
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- STATS for dashboards --------------------------------------------------
app.get('/api/stats', async (req, res) => {
  try {
    const { scope } = req.query;
    const scoped = scopeFilter(scope, 1);
    const whereScope = scoped.clause ? `WHERE ${scoped.clause}` : '';
    const monthlyScope = scoped.clause ? `AND ${scoped.clause}` : '';
    const params = scoped.params;

    const totals = (
      await db.query(
        `SELECT
           COUNT(*)::int AS count,
           COALESCE(SUM(amount), 0)::float AS total,
           COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0)::float AS paid,
           COALESCE(SUM(CASE WHEN status = 'Unpaid' THEN amount ELSE 0 END), 0)::float AS unpaid,
           COALESCE(SUM(CASE WHEN status = 'Planned' THEN amount ELSE 0 END), 0)::float AS planned
         FROM expenses ${whereScope}`,
        params
      )
    ).rows[0];

    const byCategory = (
      await db.query(
        `SELECT
            category,
            COALESCE(SUM(amount), 0)::float AS total,
            COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0)::float AS paid,
            COALESCE(SUM(CASE WHEN status = 'Unpaid' THEN amount ELSE 0 END), 0)::float AS unpaid,
            COALESCE(SUM(CASE WHEN status = 'Planned' THEN amount ELSE 0 END), 0)::float AS planned
         FROM expenses ${whereScope}
         GROUP BY category
         ORDER BY total DESC`,
        params
      )
    ).rows;

    const byPayer = (
      await db.query(
        `SELECT payer, COALESCE(SUM(amount), 0)::float AS total, COUNT(*)::int AS count
         FROM expenses ${whereScope}
         GROUP BY payer
         ORDER BY total DESC`,
        params
      )
    ).rows;

    const byStatus = (
      await db.query(
        `SELECT status, COALESCE(SUM(amount), 0)::float AS total, COUNT(*)::int AS count
         FROM expenses ${whereScope}
         GROUP BY status`,
        params
      )
    ).rows;

    const monthly = (
      await db.query(
        `SELECT
            LEFT(date, 7) AS month,
            COALESCE(SUM(amount), 0)::float AS total,
            COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0)::float AS paid
         FROM expenses
         WHERE date <> '' ${monthlyScope}
         GROUP BY LEFT(date, 7)
         ORDER BY month ASC`,
        params
      )
    ).rows;

    res.json({ totals, byCategory, byPayer, byStatus, monthly });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  await db.initDb();
  app.listen(PORT, () => {
    console.log(`Expense Tracker running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
