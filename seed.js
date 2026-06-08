// Populates the Postgres database with initial House Budget + Wedding records.
// - Empty DB  -> inserts everything.
// - Existing DB without wedding rows -> adds only wedding records.
// - "--force"  -> truncates and reseeds everything.

const db = require('./db');
const houseRecords = require('./seedData');
const weddingRecords = require('./weddingData');

async function insertMany(client, rows) {
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

async function main() {
  await db.initDb();

  const force = process.argv.includes('--force');
  const totalRows = [...houseRecords, ...weddingRecords];

  if (force) {
    await db.withTransaction(async (client) => {
      await client.query('TRUNCATE TABLE expenses RESTART IDENTITY;');
      await insertMany(client, totalRows);
    });
    console.log(`Reset and seeded ${totalRows.length} records.`);
    return;
  }

  const countRes = await db.query('SELECT COUNT(*)::int AS c FROM expenses');
  const count = countRes.rows[0].c;

  if (count === 0) {
    await db.withTransaction(async (client) => {
      await insertMany(client, totalRows);
    });
    console.log(`Seeded ${totalRows.length} records.`);
    return;
  }

  const weddingRes = await db.query(
    "SELECT COUNT(*)::int AS c FROM expenses WHERE category LIKE 'Wedding:%'"
  );
  const weddingCount = weddingRes.rows[0].c;

  if (weddingCount > 0) {
    console.log(`Wedding records already present (${weddingCount}). Nothing to do.`);
    return;
  }

  await db.withTransaction(async (client) => {
    await insertMany(client, weddingRecords);
  });
  console.log(`Added ${weddingRecords.length} wedding records to existing database.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.pool.end();
  });
