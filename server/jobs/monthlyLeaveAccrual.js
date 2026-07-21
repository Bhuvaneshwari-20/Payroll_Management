const cron = require('node-cron');
const EmployeeLeaveBalance = require('../models/EmployeeLeaveBalance');

// Fires at 00:00 on the 1st of every month (cron: minute hour day month
// weekday). Credits that month's allocation (e.g. +1.00 CL, +1.00 SL) onto
// every eligible employee's balance in a single batch query — see
// EmployeeLeaveBalance.runMonthlyAccrual for the actual SQL and its
// idempotency guard (safe against double-firing / server restarts).
function scheduleMonthlyAccrual() {
  cron.schedule('0 0 1 * *', async () => {
    const period = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
    try {
      const credited = await EmployeeLeaveBalance.runMonthlyAccrual();
      console.log(`[monthly-accrual] ${period}: credited ${credited} employee_leave_balance row(s)`);
    } catch (err) {
      console.error(`[monthly-accrual] ${period}: FAILED —`, err);
    }
  });
  console.log('[monthly-accrual] Scheduled: runs at 00:00 on the 1st of every month.');
}

module.exports = { scheduleMonthlyAccrual };