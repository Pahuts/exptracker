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

// --- WEDDING SUPPLIERS ----------------------------------------------------
const WS_RETURNING = `
  RETURNING id, category, supplier_name,
    estimated_amount::float, actual_amount::float,
    total_paid::float, gaile_paid::float, nald_paid::float, balance::float,
    first_payment, next_payment, third_payment, payment_notes, status, contract_sent, remarks,
    first_payment_done, next_payment_done, third_payment_done`;

function computeWS(merged) {
  const gaile  = parseFloat(merged.gaile_paid)  || 0;
  const nald   = parseFloat(merged.nald_paid)   || 0;
  merged.total_paid = gaile + nald;
  const actual = parseFloat(merged.actual_amount) || 0;
  merged.balance    = Math.max(0, actual - merged.total_paid);
  return merged;
}

app.get('/api/wedding-suppliers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, category, supplier_name,
              estimated_amount::float, actual_amount::float,
              total_paid::float, gaile_paid::float, nald_paid::float,
              balance::float, first_payment, next_payment, third_payment,
              payment_notes, status, contract_sent, remarks,
              first_payment_done, next_payment_done, third_payment_done
       FROM wedding_suppliers
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/wedding-suppliers/:id', async (req, res) => {
  try {
    const current = (await db.query(
      'SELECT * FROM wedding_suppliers WHERE id = $1', [req.params.id]
    )).rows[0];
    if (!current) return res.status(404).json({ error: 'Not found' });

    const merged = { ...current };
    const editable = [
      'category','supplier_name','estimated_amount','actual_amount',
      'gaile_paid','nald_paid','first_payment','next_payment','third_payment',
      'payment_notes','status','contract_sent','remarks',
      'first_payment_done','next_payment_done','third_payment_done',
    ];
    for (const f of editable) {
      if (req.body[f] !== undefined) merged[f] = req.body[f];
    }
    computeWS(merged);

    const result = await db.query(`
      UPDATE wedding_suppliers SET
        category=$1, supplier_name=$2, estimated_amount=$3, actual_amount=$4,
        total_paid=$5, gaile_paid=$6, nald_paid=$7, balance=$8,
        first_payment=$9, next_payment=$10, third_payment=$11, payment_notes=$12, status=$13,
        contract_sent=$14, remarks=$15, first_payment_done=$16, next_payment_done=$17, third_payment_done=$18
      WHERE id=$19 ${WS_RETURNING}`,
      [merged.category, merged.supplier_name, merged.estimated_amount, merged.actual_amount,
       merged.total_paid, merged.gaile_paid, merged.nald_paid, merged.balance,
       merged.first_payment, merged.next_payment, merged.third_payment, merged.payment_notes, merged.status,
       merged.contract_sent, merged.remarks, merged.first_payment_done, merged.next_payment_done, merged.third_payment_done,
       req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wedding-suppliers', async (req, res) => {
  try {
    const b = req.body;
    const m = computeWS({
      gaile_paid: parseFloat(b.gaile_paid) || 0,
      nald_paid:  parseFloat(b.nald_paid)  || 0,
      actual_amount: parseFloat(b.actual_amount) || 0,
    });
    const result = await db.query(`
      INSERT INTO wedding_suppliers
        (category, supplier_name, estimated_amount, actual_amount,
         total_paid, gaile_paid, nald_paid, balance,
         first_payment, next_payment, third_payment, payment_notes, status, contract_sent, remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ${WS_RETURNING}`,
      [b.category||'', b.supplier_name||'', parseFloat(b.estimated_amount)||0, m.actual_amount,
       m.total_paid, m.gaile_paid, m.nald_paid, m.balance,
       b.first_payment||'', b.next_payment||'', b.third_payment||'', b.payment_notes||'',
       b.status||'Deciding', b.contract_sent||'', b.remarks||'']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/wedding-suppliers/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM wedding_suppliers WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- STATS for dashboards --------------------------------------------------
app.get('/api/stats', async (req, res) => {
  try {
    const { scope, year } = req.query;
    const scoped = scopeFilter(scope, 1);
    const params = [...scoped.params];
    const conditions = scoped.clause ? [scoped.clause] : [];

    if (year && /^\d{4}$/.test(year)) {
      conditions.push(`LEFT(date, 4) = $${params.length + 1}`);
      params.push(year);
    }

    const whereScope  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const monthlyScope = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

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
