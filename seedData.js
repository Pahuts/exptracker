// Seed records extracted from "GaileNald - House Budget" CSV.
// Categories: "Titling Fee", "Downpayment", "House Dues", "UB Loan"

const pad = (n) => String(n).padStart(2, '0');
const iso = (m, d, y) => `${y}-${pad(m)}-${pad(d)}`;

const records = [];
const add = (category, payer, description, amount, date, status) =>
  records.push({ category, payer, description, amount, date, status });

// ---------------------------------------------------------------------------
// Titling (Processing) Fee Tracker
// ---------------------------------------------------------------------------
// 2024
add('Titling Fee', 'Gaile', 'February 28', 5105.0, iso(1, 16, 2024), 'Paid');
add('Titling Fee', 'Nald', 'February 28', 5105.0, iso(1, 16, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'March 28', 5261.5, iso(3, 18, 2024), 'Paid');
add('Titling Fee', 'Nald', 'March 28', 5261.5, iso(3, 18, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'April 28', 5261.5, iso(4, 2, 2024), 'Paid');
add('Titling Fee', 'Nald', 'April 28', 5261.5, iso(4, 22, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'May 28', 5261.5, iso(4, 30, 2024), 'Paid');
add('Titling Fee', 'Nald', 'May 28', 5261.5, iso(5, 14, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'June 28', 5261.5, iso(5, 30, 2024), 'Paid');
add('Titling Fee', 'Nald', 'June 28', 5261.5, iso(6, 14, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'July 28', 5261.5, iso(7, 7, 2024), 'Paid');
add('Titling Fee', 'Nald', 'July 28', 5261.5, iso(7, 14, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'August 28', 5261.5, iso(7, 30, 2024), 'Paid');
add('Titling Fee', 'Nald', 'August 28', 5261.5, iso(8, 14, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'September 28', 5261.5, iso(8, 29, 2024), 'Paid');
add('Titling Fee', 'Nald', 'September 28', 5261.5, iso(9, 13, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'October 28', 5261.5, iso(9, 14, 2024), 'Paid');
add('Titling Fee', 'Nald', 'October 28', 5261.5, iso(10, 15, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'November 28', 5261.5, iso(10, 30, 2024), 'Paid');
add('Titling Fee', 'Nald', 'November 28', 5261.5, iso(11, 15, 2024), 'Paid');
add('Titling Fee', 'Gaile', 'December 28', 5261.5, iso(11, 28, 2024), 'Paid');
add('Titling Fee', 'Nald', 'December 28', 5261.5, iso(12, 14, 2024), 'Paid');
// 2025
add('Titling Fee', 'Gaile', 'January 28', 5261.5, iso(12, 26, 2024), 'Paid');
add('Titling Fee', 'Nald', 'January 28', 5261.5, iso(1, 15, 2025), 'Paid');
add('Titling Fee', 'Gaile', 'February 28', 5261.5, iso(1, 24, 2025), 'Paid');
add('Titling Fee', 'Nald', 'February 28', 5261.5, iso(1, 14, 2025), 'Paid');
add('Titling Fee', 'Gaile', 'March 28', 5261.5, iso(2, 3, 2025), 'Paid');
add('Titling Fee', 'Nald', 'March 28', 5261.5, iso(3, 21, 2025), 'Paid');
add('Titling Fee', 'Gaile', 'April 28', 5261.5, iso(3, 29, 2025), 'Paid');
add('Titling Fee', 'Nald', 'April 28', 5261.5, iso(4, 24, 2025), 'Paid');
add('Titling Fee', 'Gaile', 'May 28', 5261.5, iso(5, 15, 2025), 'Paid');
add('Titling Fee', 'Nald', 'May 28', 5261.5, iso(5, 20, 2025), 'Paid');
add('Titling Fee', 'Gaile', 'June 28', 5261.5, iso(6, 16, 2025), 'Paid');
add('Titling Fee', 'Nald', 'June 28', 5261.5, iso(6, 21, 2025), 'Paid');
add('Titling Fee', 'Gaile', 'July 28', 5261.5, iso(7, 17, 2025), 'Paid');
add('Titling Fee', 'Nald', 'July 28', 5261.5, iso(7, 19, 2025), 'Paid');
add('Titling Fee', 'Gaile', 'August 28', 5261.5, iso(8, 22, 2025), 'Paid');
add('Titling Fee', 'Nald', 'August 28', 5261.5, iso(8, 26, 2025), 'Paid');
add('Titling Fee', 'Gaile', 'September 28', 5261.5, iso(9, 25, 2025), 'Paid');
add('Titling Fee', 'Nald', 'September 28', 5261.5, iso(9, 25, 2025), 'Paid');

// ---------------------------------------------------------------------------
// 30% Downpayment Tracker
// ---------------------------------------------------------------------------
add('Downpayment', 'Both', 'Reservation Fee (January)', 30000.0, iso(1, 11, 2024), 'Paid');
// 2024
add('Downpayment', 'Gaile', 'February 28', 27963.0, iso(1, 16, 2024), 'Paid');
add('Downpayment', 'Nald', 'February 28', 27963.0, iso(1, 16, 2024), 'Paid');
add('Downpayment', 'Gaile', 'March 28', 28840.0, iso(3, 18, 2024), 'Paid');
add('Downpayment', 'Nald', 'March 28', 28840.0, iso(3, 18, 2024), 'Paid');
add('Downpayment', 'Gaile', 'April 28', 28840.0, iso(4, 15, 2024), 'Paid');
add('Downpayment', 'Nald', 'April 28', 28840.0, iso(4, 22, 2024), 'Paid');
add('Downpayment', 'Gaile', 'May 28', 28840.0, iso(5, 14, 2024), 'Paid');
add('Downpayment', 'Nald', 'May 28', 28840.0, iso(5, 14, 2024), 'Paid');
add('Downpayment', 'Gaile', 'June 28', 28840.0, iso(6, 14, 2024), 'Paid');
add('Downpayment', 'Nald', 'June 28', 28840.0, iso(6, 14, 2024), 'Paid');
add('Downpayment', 'Gaile', 'July 28', 28840.0, iso(7, 15, 2024), 'Paid');
add('Downpayment', 'Nald', 'July 28', 28840.0, iso(7, 14, 2024), 'Paid');
add('Downpayment', 'Gaile', 'August 28', 28840.0, iso(7, 30, 2024), 'Paid');
add('Downpayment', 'Nald', 'August 28', 28840.0, iso(8, 14, 2024), 'Paid');
add('Downpayment', 'Gaile', 'September 28', 28840.0, iso(8, 29, 2024), 'Paid');
add('Downpayment', 'Nald', 'September 28', 28840.0, iso(9, 13, 2024), 'Paid');
add('Downpayment', 'Gaile', 'October 28', 28840.0, iso(9, 18, 2024), 'Paid');
add('Downpayment', 'Nald', 'October 28', 28840.0, iso(10, 15, 2024), 'Paid');
add('Downpayment', 'Gaile', 'November 28', 28840.0, iso(11, 14, 2024), 'Paid');
add('Downpayment', 'Nald', 'November 28', 28840.0, iso(11, 15, 2024), 'Paid');
add('Downpayment', 'Gaile', 'December 28', 28840.0, iso(12, 12, 2024), 'Paid');
add('Downpayment', 'Nald', 'December 28', 28840.0, iso(12, 14, 2024), 'Paid');
// 2025
add('Downpayment', 'Gaile', 'January 28', 28840.0, iso(1, 14, 2025), 'Paid');
add('Downpayment', 'Nald', 'January 28', 28840.0, iso(1, 15, 2025), 'Paid');
add('Downpayment', 'Gaile', 'February 28', 28840.0, iso(1, 24, 2025), 'Paid');
add('Downpayment', 'Nald', 'February 28', 28840.0, iso(1, 14, 2025), 'Paid');
add('Downpayment', 'Gaile', 'March 28', 28840.0, iso(2, 3, 2025), 'Paid');
add('Downpayment', 'Nald', 'March 28', 28840.0, iso(3, 21, 2025), 'Paid');
add('Downpayment', 'Gaile', 'April 28', 28840.0, iso(3, 29, 2025), 'Paid');
add('Downpayment', 'Nald', 'April 28', 28840.0, iso(4, 24, 2025), 'Paid');
add('Downpayment', 'Gaile', 'May 28', 28840.0, iso(5, 15, 2025), 'Paid');
add('Downpayment', 'Nald', 'May 28', 28840.0, iso(5, 20, 2025), 'Paid');
add('Downpayment', 'Gaile', 'June 28', 28840.0, iso(6, 16, 2025), 'Paid');
add('Downpayment', 'Nald', 'June 28', 28840.0, iso(6, 21, 2025), 'Paid');
add('Downpayment', 'Gaile', 'July 28', 28840.0, iso(7, 17, 2025), 'Paid');
add('Downpayment', 'Nald', 'July 28', 28840.0, iso(7, 19, 2025), 'Paid');
add('Downpayment', 'Gaile', 'August 28', 28840.0, iso(8, 22, 2025), 'Paid');
add('Downpayment', 'Nald', 'August 28', 28840.0, iso(8, 26, 2025), 'Paid');
add('Downpayment', 'Gaile', 'September 28', 28840.0, iso(9, 25, 2025), 'Paid');
add('Downpayment', 'Nald', 'September 28', 28840.0, iso(9, 25, 2025), 'Paid');

// ---------------------------------------------------------------------------
// House Dues Tracker (Grass Cutting and Streetlights) - PHP 292 / month
// ---------------------------------------------------------------------------
const monthName = (m) =>
  ['January', 'February', 'March', 'April', 'May', 'June', 'July',
   'August', 'September', 'October', 'November', 'December'][m - 1];

const houseDuesYear = (year, paidByGaileThrough, unpaidFrom) => {
  for (let m = 1; m <= 12; m++) {
    if (year === 2024 && m === 1) continue; // 2024 started in February
    const payer = m <= paidByGaileThrough ? 'Gaile' : 'Nald';
    const status = unpaidFrom && m >= unpaidFrom ? 'Unpaid' : 'Paid';
    add('House Dues', payer, `${monthName(m)} 1`, 292.0, iso(m, 1, year), status);
  }
};
houseDuesYear(2024, 6, null); // Gaile Feb-Jun, Nald Jul-Dec, all paid
houseDuesYear(2025, 6, null); // Gaile Jan-Jun, Nald Jul-Dec, all paid
houseDuesYear(2026, 6, 9);    // Gaile Jan-Jun paid, Nald Jul-Aug paid, Sep-Dec unpaid

// ---------------------------------------------------------------------------
// UB Loan Payment - PHP 29,998.03 / month (due 19th)
// ---------------------------------------------------------------------------
const UB_AMOUNT = 29998.03;
const ubLoanYear = (year, startMonth, paidThrough) => {
  for (let m = startMonth; m <= 12; m++) {
    const status = paidThrough && m <= paidThrough ? 'Paid' : 'Unpaid';
    add('UB Loan', 'Both', `${monthName(m)} 19`, UB_AMOUNT, iso(m, 19, year), status);
  }
};
ubLoanYear(2026, 3, 8); // Mar-Aug paid, Sep-Dec unpaid
ubLoanYear(2027, 1, 0); // all unpaid
ubLoanYear(2028, 1, 0); // all unpaid

module.exports = records;
