// Populates the database with the initial House Budget + Wedding records.
// - Empty DB  -> inserts everything.
// - Existing DB without wedding rows -> adds only the wedding records.
// - "--force"  -> wipes and reseeds everything.

const db = require('./db');
const houseRecords = require('./seedData');
const weddingRecords = require('./weddingData');

const insert = db.prepare(
  `INSERT INTO expenses (category, payer, description, amount, date, status)
   VALUES (@category, @payer, @description, @amount, @date, @status)`
);
const insertMany = db.transaction((rows) => {
  for (const row of rows) insert.run(row);
});

const force = process.argv.includes('--force');
const count = db.prepare('SELECT COUNT(*) AS c FROM expenses').get().c;

if (force) {
  db.exec('DELETE FROM expenses;');
  db.exec("DELETE FROM sqlite_sequence WHERE name = 'expenses';");
  insertMany([...houseRecords, ...weddingRecords]);
  console.log(`Reset and seeded ${houseRecords.length + weddingRecords.length} records.`);
  process.exit(0);
}

if (count === 0) {
  insertMany([...houseRecords, ...weddingRecords]);
  console.log(`Seeded ${houseRecords.length + weddingRecords.length} records.`);
  process.exit(0);
}

// DB already has data: only add wedding rows if they aren't there yet.
const weddingCount = db
  .prepare("SELECT COUNT(*) AS c FROM expenses WHERE category LIKE 'Wedding:%'")
  .get().c;

if (weddingCount > 0) {
  console.log(`Wedding records already present (${weddingCount}). Nothing to do.`);
} else {
  insertMany(weddingRecords);
  console.log(`Added ${weddingRecords.length} wedding records to existing database.`);
}
