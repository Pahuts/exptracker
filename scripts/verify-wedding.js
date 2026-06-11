const db = require('../db');

db.query(
  "SELECT category, COUNT(*)::int AS rows, SUM(amount)::numeric AS total FROM expenses WHERE category LIKE 'Wedding:%' GROUP BY category ORDER BY category"
).then((r) => {
  console.table(r.rows);
  db.pool.end();
});
