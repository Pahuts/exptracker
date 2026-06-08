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
app.get('/api/expenses', (req, res) => {
  const { category, payer, status, year, q, scope } = req.query;
  const where = [];
  const params = {};

  if (scope === 'house') where.push("category NOT LIKE 'Wedding:%'");
  if (scope === 'wedding') where.push("category LIKE 'Wedding:%'");
  if (category) { where.push('category = @category'); params.category = category; }
  if (payer) { where.push('payer = @payer'); params.payer = payer; }
  if (status) { where.push('status = @status'); params.status = status; }
  if (year) { where.push("strftime('%Y', date) = @year"); params.year = String(year); }
  if (q) { where.push('(description LIKE @q OR category LIKE @q)'); params.q = `%${q}%`; }

  const sql =
    `SELECT * FROM expenses ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date ASC, id ASC`;
  res.json(db.prepare(sql).all(params));
});

// --- READ: single ----------------------------------------------------------
app.get('/api/expenses/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// --- CREATE ----------------------------------------------------------------
app.post('/api/expenses', (req, res) => {
  const { value, errors } = parseExpense(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const info = db
    .prepare(
      `INSERT INTO expenses (category, payer, description, amount, date, status)
       VALUES (@category, @payer, @description, @amount, @date, @status)`
    )
    .run(value);
  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid));
});

// --- UPDATE ----------------------------------------------------------------
app.put('/api/expenses/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { value, errors } = parseExpense(req.body);
  if (errors.length) return res.status(400).json({ errors });

  db.prepare(
    `UPDATE expenses
     SET category = @category, payer = @payer, description = @description,
         amount = @amount, date = @date, status = @status
     WHERE id = @id`
  ).run({ ...value, id: req.params.id });
  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id));
});

// --- DELETE ----------------------------------------------------------------
app.delete('/api/expenses/:id', (req, res) => {
  const info = db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// --- STATS for dashboards --------------------------------------------------
app.get('/api/stats', (req, res) => {
  const { scope } = req.query;
  // Build a scope filter applied to every aggregate so cards + charts match.
  let scopeClause = '';
  if (scope === 'house') scopeClause = "category NOT LIKE 'Wedding:%'";
  if (scope === 'wedding') scopeClause = "category LIKE 'Wedding:%'";
  const whereScope = scopeClause ? `WHERE ${scopeClause}` : '';
  const andScope = scopeClause ? `AND ${scopeClause}` : '';

  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS count,
         COALESCE(SUM(amount), 0) AS total,
         COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) AS paid,
         COALESCE(SUM(CASE WHEN status = 'Unpaid' THEN amount ELSE 0 END), 0) AS unpaid,
         COALESCE(SUM(CASE WHEN status = 'Planned' THEN amount ELSE 0 END), 0) AS planned
       FROM expenses ${whereScope}`
    )
    .get();

  const byCategory = db
    .prepare(
      `SELECT category,
              COALESCE(SUM(amount), 0) AS total,
              COALESCE(SUM(CASE WHEN status='Paid' THEN amount ELSE 0 END),0) AS paid,
              COALESCE(SUM(CASE WHEN status='Unpaid' THEN amount ELSE 0 END),0) AS unpaid,
              COALESCE(SUM(CASE WHEN status='Planned' THEN amount ELSE 0 END),0) AS planned
       FROM expenses ${whereScope} GROUP BY category ORDER BY total DESC`
    )
    .all();

  const byPayer = db
    .prepare(
      `SELECT payer, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
       FROM expenses ${whereScope} GROUP BY payer ORDER BY total DESC`
    )
    .all();

  const byStatus = db
    .prepare(
      `SELECT status, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
       FROM expenses ${whereScope} GROUP BY status`
    )
    .all();

  const monthly = db
    .prepare(
      `SELECT strftime('%Y-%m', date) AS month,
              COALESCE(SUM(amount),0) AS total,
              COALESCE(SUM(CASE WHEN status='Paid' THEN amount ELSE 0 END),0) AS paid
       FROM expenses WHERE date <> '' ${andScope} GROUP BY month ORDER BY month ASC`
    )
    .all();

  res.json({ totals, byCategory, byPayer, byStatus, monthly });
});

app.listen(PORT, () => {
  console.log(`Expense Tracker running at http://localhost:${PORT}`);
});
