// Populates the Postgres database with initial House Budget + Wedding records.
// - Empty DB           -> inserts everything.
// - Existing house DB without wedding_suppliers rows -> adds only wedding rows.
// - "--force"          -> truncates expenses and reseeds everything.
//
// NOTE: wedding data now lives in the wedding_suppliers table (not expenses).

const db = require('./db');
const houseRecords = require('./seedData');
const weddingRecords = require('./weddingData');

async function insertHouseRecords(client, rows) {
  const sql = `
    INSERT INTO expenses (category, payer, description, amount, date, status)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  for (const row of rows) {
    await client.query(sql, [
      row.category,
      row.payer,
      row.description,
      row.amount,
      row.date,
      row.status,
    ]);
  }
}

async function insertWeddingRecords(client, rows) {
  const sql = `
    INSERT INTO wedding_suppliers
      (category, supplier_name, estimated_amount, actual_amount, total_paid,
       gaile_paid, nald_paid, balance, first_payment, next_payment,
       payment_notes, status, contract_sent, remarks)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
  `;
  for (const row of rows) {
    await client.query(sql, [
      row.category,
      row.supplier_name,
      row.estimated_amount,
      row.actual_amount,
      row.total_paid,
      row.gaile_paid,
      row.nald_paid,
      row.balance,
      row.first_payment,
      row.next_payment,
      row.payment_notes,
      row.status,
      row.contract_sent,
      row.remarks,
    ]);
  }
}

async function main() {
  await db.initDb();

  const force = process.argv.includes('--force');

  if (force) {
    await db.withTransaction(async (client) => {
      await client.query('TRUNCATE TABLE expenses RESTART IDENTITY;');
      await client.query('TRUNCATE TABLE wedding_suppliers RESTART IDENTITY;');
      await insertHouseRecords(client, houseRecords);
      await insertWeddingRecords(client, weddingRecords);
    });
    console.log(`Reset and seeded ${houseRecords.length} house + ${weddingRecords.length} wedding records.`);
    return;
  }

  // --- House records -------------------------------------------------------
  const countRes = await db.query('SELECT COUNT(*)::int AS c FROM expenses');
  const houseCount = countRes.rows[0].c;

  if (houseCount === 0) {
    await db.withTransaction(async (client) => {
      await insertHouseRecords(client, houseRecords);
    });
    console.log(`Seeded ${houseRecords.length} house records.`);
  } else {
    console.log(`House records already present (${houseCount}). Skipping.`);
  }

  // --- Wedding suppliers ---------------------------------------------------
  const weddingRes = await db.query('SELECT COUNT(*)::int AS c FROM wedding_suppliers');
  const weddingCount = weddingRes.rows[0].c;

  if (weddingCount === 0) {
    await db.withTransaction(async (client) => {
      await insertWeddingRecords(client, weddingRecords);
    });
    console.log(`Seeded ${weddingRecords.length} wedding supplier records.`);
  } else {
    console.log(`Wedding supplier records already present (${weddingCount}). Skipping.`);
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.pool.end();
  });

