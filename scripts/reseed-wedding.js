// Removes all existing wedding data and reseeds from weddingData.js into
// the wedding_suppliers table (and cleans up any residual Wedding:% rows in expenses).
const db = require('../db');
const weddingRecords = require('../weddingData');

async function main() {
  await db.initDb();
  await db.withTransaction(async (client) => {
    // Clean up residual rows in the expenses table
    const del1 = await client.query("DELETE FROM expenses WHERE category LIKE 'Wedding:%'");
    console.log('Deleted from expenses:', del1.rowCount);

    // Clear the dedicated wedding_suppliers table
    const del2 = await client.query('DELETE FROM wedding_suppliers');
    console.log('Deleted from wedding_suppliers:', del2.rowCount);

    const sql = `
      INSERT INTO wedding_suppliers
        (category, supplier_name, estimated_amount, actual_amount, total_paid,
         gaile_paid, nald_paid, balance, first_payment, next_payment,
         payment_notes, status, contract_sent, remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `;
    for (const row of weddingRecords) {
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
    console.log('Inserted into wedding_suppliers:', weddingRecords.length);
  });
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => db.pool.end());
