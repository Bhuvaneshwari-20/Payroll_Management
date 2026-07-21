const db = require('../config/db');
// const LeaveTransaction = require('./LeaveTransaction');

// This is the "Employee Leave Allocation" module: HR picks an employee +
// a policy, and this generates one employee_leave_balance row per leave
// type in that policy. No manual CL/SL typing.

exports.getActivePolicyForEmployee = async (employeeId) => {
  const [rows] = await db.query(
    `SELECT elp.*, lp.policy_name
     FROM employee_leave_policy elp
     JOIN leave_policies lp ON lp.id = elp.policy_id
     WHERE elp.employee_id = ?
       AND (elp.effective_to IS NULL OR elp.effective_to >= CURDATE())
     ORDER BY elp.effective_from DESC
     LIMIT 1`,
    [employeeId]
  );
  return rows[0] || null;
};

// Assign a policy to one employee. Ends any currently-active assignment
// the day before this one starts, then generates/refreshes their balance
// rows from the policy's leave_policy_details. Types with
// allocation_period = 'Unlimited' don't get a tracked balance row —
// they're simply never balance-checked on apply (matches the old OD behavior).
exports.assignPolicyToEmployee = async (employeeId, policyId, effectiveFrom) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [policyRows] = await conn.query('SELECT id FROM leave_policies WHERE id = ? AND status = "active"', [policyId]);
    if (policyRows.length === 0) throw new Error('Leave policy not found or inactive');

    const [empRows] = await conn.query('SELECT id FROM employees WHERE id = ? AND status = "active"', [employeeId]);
    if (empRows.length === 0) throw new Error('Employee not found or inactive');

    // Solution 3: reject outright if an active policy already starts on
    // this exact date. Without this, the UPDATE below would try to close
    // out that row with effective_to = DATE_SUB(effectiveFrom, 1 DAY) —
    // which lands one day BEFORE effective_from, producing an impossible
    // range (effective_to < effective_from) instead of a rejected request.
    const [[sameDayExisting]] = await conn.query(
      `SELECT id FROM employee_leave_policy
       WHERE employee_id = ? AND effective_from = ? AND effective_to IS NULL`,
      [employeeId, effectiveFrom]
    );
    if (sameDayExisting) {
      throw new Error('Employee already has an active policy starting on this exact date. Choose a later effective date to replace it.');
    }

    // Solution 2: only close out policies that started STRICTLY BEFORE
    // this one. Without `effective_from < ?`, a same-day row would slip
    // through here too if the check above were ever bypassed — this is
    // the belt-and-suspenders guard against the same impossible-range bug.
    await conn.query(
      `UPDATE employee_leave_policy
       SET effective_to = DATE_SUB(?, INTERVAL 1 DAY)
       WHERE employee_id = ? AND effective_from < ? AND (effective_to IS NULL OR effective_to >= ?)`,
      [effectiveFrom, employeeId, effectiveFrom, effectiveFrom]
    );

    await conn.query(
      `INSERT INTO employee_leave_policy (employee_id, policy_id, effective_from)
       VALUES (?, ?, ?)`,
      [employeeId, policyId, effectiveFrom]
    );

    const [details] = await conn.query(
      `SELECT * FROM leave_policy_details WHERE policy_id = ? AND allocation_period <> 'Unlimited'`,
      [policyId]
    );

    for (const d of details) {
      await conn.query(
        `INSERT INTO employee_leave_balance (employee_id, leave_type_id, allocated, used, carry_forward, last_reset_date)
         VALUES (?, ?, ?, 0, 0, ?)
         ON DUPLICATE KEY UPDATE
           allocated = VALUES(allocated),
           used = 0,
           last_reset_date = VALUES(last_reset_date)`,
        [employeeId, d.leave_type_id, d.allocation_value, effectiveFrom]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// All employees + their per-type balances, for the Leave Allocation table.
// Long format: one row per (employee, leave type) — the frontend can pivot
// into columns if it wants a wide table.
exports.getAllBalances = async () => {
  const [rows] = await db.query(
    `SELECT e.id AS employee_id, e.employee_code, e.first_name, e.last_name, e.jtype,
            lt.id AS leave_type_id, lt.name AS leave_type_name, lt.code AS leave_type_code,
            elb.allocated, elb.used, elb.carry_forward,
            (elb.allocated + elb.carry_forward - elb.used) AS balance,
            lp.policy_name
     FROM employees e
     JOIN employee_leave_balance elb ON elb.employee_id = e.id
     JOIN leave_types lt ON lt.id = elb.leave_type_id
     LEFT JOIN employee_leave_policy elp
       ON elp.employee_id = e.id AND (elp.effective_to IS NULL OR elp.effective_to >= CURDATE())
     LEFT JOIN leave_policies lp ON lp.id = elp.policy_id
     WHERE e.status = 'active'
     ORDER BY e.first_name, lt.name`
  );
  return rows;
};

exports.getBalancesForEmployee = async (employeeId) => {
  const [rows] = await db.query(
    `SELECT lt.id AS leave_type_id, lt.name AS leave_type_name, lt.code AS leave_type_code,
            elb.allocated, elb.used, elb.carry_forward,
            (elb.allocated + elb.carry_forward - elb.used) AS balance
     FROM employee_leave_balance elb
     JOIN leave_types lt ON lt.id = elb.leave_type_id
     WHERE elb.employee_id = ?
     ORDER BY lt.name`,
    [employeeId]
  );
  return rows;
};

// Tells the caller whether this employee's CURRENT active policy has this
// leave type set to allocation_period = 'Unlimited'. Unlimited types never
// get an employee_leave_balance row (see assignPolicyToEmployee above), so
// anything that would otherwise look up a balance row for one — like
// attendanceController's resolveLopFlag — must check this FIRST and skip
// the balance table entirely if true, rather than treating "no row" as
// "zero balance".
exports.isUnlimitedType = async (employeeId, leaveTypeId, conn = db) => {
  const [[detail]] = await conn.query(
    `SELECT lpd.allocation_period
     FROM employee_leave_policy elp
     JOIN leave_policy_details lpd ON lpd.policy_id = elp.policy_id
     WHERE elp.employee_id = ? AND lpd.leave_type_id = ?
       AND (elp.effective_to IS NULL OR elp.effective_to >= CURDATE())
     ORDER BY elp.effective_from DESC
     LIMIT 1`,
    [employeeId, leaveTypeId]
  );
  return !!detail && detail.allocation_period === 'Unlimited';
};

// Single balance row lookup — used by leaveModel.js on apply/cancel/reject
// to decide whether a leave type is balance-tracked for this employee at all.
exports.getBalanceRow = async (employeeId, leaveTypeId) => {
  const [rows] = await db.query(
    `SELECT * FROM employee_leave_balance WHERE employee_id = ? AND leave_type_id = ?`,
    [employeeId, leaveTypeId]
  );
  return rows[0] || null;
};

exports.incrementUsed = async (employeeId, leaveTypeId, days, conn = db) => {
  await conn.query(
    `UPDATE employee_leave_balance SET used = used + ? WHERE employee_id = ? AND leave_type_id = ?`,
    [days, employeeId, leaveTypeId]
  );
};

exports.decrementUsed = async (employeeId, leaveTypeId, days, conn = db) => {
  await conn.query(
    `UPDATE employee_leave_balance SET used = GREATEST(used - ?, 0) WHERE employee_id = ? AND leave_type_id = ?`,
    [days, employeeId, leaveTypeId]
  );
};

// Manual "Reset All" housekeeping — zeroes `used` for every active
// employee's balances (e.g. at policy-cycle rollover). Carry-forward
// handling per-policy reset_cycle is a further enhancement; this button
// intentionally stays simple, matching the old Leave Allocation "Reset All".
exports.resetAllUsed = async () => {
  const [result] = await db.query(
    `UPDATE employee_leave_balance elb
     JOIN employees e ON e.id = elb.employee_id
     SET elb.used = 0
     WHERE e.status = 'active'`
  );
  return result.affectedRows;
};

// Full monthly accrual + carry-forward + reset engine.
//
// Runs once a month (see jobs/monthlyLeaveAccrual.js, cron 1st @ 00:00, or
// manually via the "Run Monthly Accrual" button). For every
// (employee, leave type) balance row under an active policy:
//
//   1. Decide if THIS calendar month is a "reset boundary" for that leave
//      type's reset_cycle (Monthly / Quarterly / Half Yearly / Yearly).
//   2. Decide if THIS calendar month is an "accrual boundary" for that
//      leave type's allocation_period — does it receive a fresh credit
//      this month at all? (Monthly credits every month; Yearly credits
//      only in January; Half Yearly in Jan+Jul; Quarterly in Jan/Apr/Jul/Oct.)
//   3. If it's a reset boundary: cap (carry_forward + this period's fresh
//      credit) at max_carry as a combined ceiling — not just the carried
//      portion alone. Worked examples this matches:
//        - 12 unused, max_carry=12 -> stays at 12 next cycle (the new
//          period's credit has zero room left under the cap, so it's
//          effectively absorbed rather than added — NOT 13).
//        - 9 unused, max_carry=12  -> becomes 10 next cycle (9 carried +
//          1 fresh credit, since 3 units of room remain under the cap).
//      If carry_forward is OFF for that leave type, old balance is
//      discarded outright (no cap needed) and it restarts at just the
//      fresh credit.
//   4. If it's NOT a reset boundary but IS an accrual boundary (e.g. CL
//      in February, under a Yearly reset_cycle that only fires in
//      January): just add this month's credit on top of what's already
//      accumulating — no capping mid-cycle, matching "Jan=1, Feb=2, ...
//      Dec=12" building up freely until the yearly reset boundary hits.
//   5. If neither boundary applies this month (e.g. a Quarterly type in a
//      non-quarter month), the row is left completely untouched.
//
// Idempotency: a row is only a *candidate* if last_reset_date is NULL or
// before the 1st of the current month, so re-running mid-month (server
// restart, manual re-click) never double-processes the same row twice in
// one calendar month — same guard the old version already had.
//
// ASSUMPTION FLAGGED FOR REVIEW: max_carry is treated as a ceiling on the
// combined (carry_forward + fresh credit) total, not just on the carried
// portion in isolation. This was inferred from your two worked examples;
// if that's not the intended rule, only the `room`/capping lines below
// need to change.
exports.runMonthlyAccrual = async () => {
  const [candidates] = await db.query(
    `SELECT elb.id, elb.employee_id, elb.leave_type_id, elb.allocated, elb.used, elb.carry_forward,
            lpd.allocation_value, lpd.allocation_period, lpd.carry_forward AS cf_enabled,
            lpd.max_carry, lpd.reset_cycle
     FROM employee_leave_balance elb
     JOIN employee_leave_policy elp
       ON elp.employee_id = elb.employee_id
      AND (elp.effective_to IS NULL OR elp.effective_to >= CURDATE())
     JOIN leave_policy_details lpd
       ON lpd.policy_id = elp.policy_id AND lpd.leave_type_id = elb.leave_type_id
     WHERE lpd.allocation_period <> 'Unlimited'
       AND (elb.last_reset_date IS NULL OR elb.last_reset_date < DATE_FORMAT(CURDATE(), '%Y-%m-01'))`
  );

  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const todayStr = today.toISOString().slice(0, 10);

  // True if `period` (an allocation_period OR reset_cycle value) has a
  // boundary landing on calendar month `m`.
  const isBoundary = (period, m) => {
    if (period === 'Monthly') return true;
    if (period === 'Quarterly') return [1, 4, 7, 10].includes(m);
    if (period === 'Half Yearly') return [1, 7].includes(m);
    if (period === 'Yearly') return m === 1;
    return false;
  };

  let updated = 0;
  for (const row of candidates) {
    const isResetBoundary = isBoundary(row.reset_cycle, month);
    const isAccrualBoundary = isBoundary(row.allocation_period, month);
    if (!isResetBoundary && !isAccrualBoundary) continue; // nothing to do this month

    const freshCredit = isAccrualBoundary ? Number(row.allocation_value) : 0;
    let newAllocated;
    let newCarry;
    let newUsed;

    if (isResetBoundary) {
      const remaining = Number(row.allocated) + Number(row.carry_forward) - Number(row.used);
      if (row.cf_enabled) {
        const cappedCarry = Math.min(remaining, Number(row.max_carry));
        const room = Math.max(0, Number(row.max_carry) - cappedCarry);
        newCarry = cappedCarry;
        newAllocated = Math.min(freshCredit, room);
      } else {
        // No carry forward for this type: old balance is simply discarded.
        newCarry = 0;
        newAllocated = freshCredit;
      }
      newUsed = 0;
    } else {
      // Accrual boundary only, mid-cycle: add on top, no reset/cap yet.
      newCarry = Number(row.carry_forward);
      newAllocated = Number(row.allocated) + freshCredit;
      newUsed = Number(row.used);
    }

    await db.query(
      `UPDATE employee_leave_balance SET allocated = ?, used = ?, carry_forward = ?, last_reset_date = ? WHERE id = ?`,
      [newAllocated, newUsed, newCarry, todayStr, row.id]
    );
    updated++;
  }

  return updated;
};


exports.assignPolicyToAll = async (policyId, effectiveFrom, jtype = null) => {
  const where = jtype ? `WHERE status = 'active' AND jtype = ?` : `WHERE status = 'active'`;
  const params = jtype ? [jtype] : [];
  const [employees] = await db.query(`SELECT id FROM employees ${where}`, params);

  let successCount = 0;
  const failures = [];
  for (const emp of employees) {
    try {
      await exports.assignPolicyToEmployee(emp.id, policyId, effectiveFrom);
      successCount++;
    } catch (err) {
      failures.push({ employee_id: emp.id, message: err.message });
    }
  }
  return { total: employees.length, successCount, failures };
};