const db = require('../config/db');

// A policy is now a NAMED BUNDLE of leave types ("Monthly Staff Policy" ->
// CL: 1/month, SL: 1/month, OD: unlimited), not one row per leave type.

exports.getAll = async () => {
  const [policies] = await db.query(
    `SELECT * FROM leave_policies ORDER BY policy_name`
  );
  if (policies.length === 0) return [];

  const [details] = await db.query(
    `SELECT lpd.*, lt.name AS leave_type_name, lt.code AS leave_type_code
     FROM leave_policy_details lpd
     JOIN leave_types lt ON lt.id = lpd.leave_type_id
     WHERE lpd.policy_id IN (?)
     ORDER BY lt.name`,
    [policies.map((p) => p.id)]
  );

  const byPolicy = new Map(policies.map((p) => [p.id, { ...p, details: [] }]));
  details.forEach((d) => byPolicy.get(d.policy_id)?.details.push(d));
  return [...byPolicy.values()];
};

exports.getById = async (id) => {
  const [rows] = await db.query('SELECT * FROM leave_policies WHERE id = ?', [id]);
  const policy = rows[0];
  if (!policy) return null;

  const [details] = await db.query(
    `SELECT lpd.*, lt.name AS leave_type_name, lt.code AS leave_type_code
     FROM leave_policy_details lpd
     JOIN leave_types lt ON lt.id = lpd.leave_type_id
     WHERE lpd.policy_id = ?
     ORDER BY lt.name`,
    [id]
  );
  return { ...policy, details };
};

const DETAIL_FIELDS = [
  'leave_type_id', 'allocation_value', 'unit', 'allocation_period',
  'carry_forward', 'max_carry', 'reset_cycle', 'is_paid',
];

function normalizeDetail(d) {
  return {
    leave_type_id: d.leave_type_id,
    allocation_value: d.allocation_period === 'Unlimited' ? 0 : Number(d.allocation_value) || 0,
    unit: d.unit || 'Days',
    allocation_period: d.allocation_period || 'Yearly',
    carry_forward: d.carry_forward ? 1 : 0,
    max_carry: d.carry_forward ? Number(d.max_carry) || 0 : 0,
    reset_cycle: d.reset_cycle || 'Yearly',
    is_paid: d.is_paid === undefined ? 1 : (d.is_paid ? 1 : 0),
  };
}

// create/update both replace-all the details rows for simplicity — the UI
// always submits the full set of leave types in the policy, never a partial diff.
exports.create = async ({ policy_name, description, status }, details) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO leave_policies (policy_name, description, status) VALUES (?, ?, ?)`,
      [policy_name, description || null, status || 'active']
    );
    const policyId = result.insertId;

    for (const raw of details) {
      const d = normalizeDetail(raw);
      await conn.query(
        `INSERT INTO leave_policy_details (policy_id, ${DETAIL_FIELDS.join(', ')})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [policyId, ...DETAIL_FIELDS.map((f) => d[f])]
      );
    }

    await conn.commit();
    return policyId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.update = async (id, { policy_name, description, status }, details) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `UPDATE leave_policies SET policy_name = ?, description = ?, status = ? WHERE id = ?`,
      [policy_name, description || null, status || 'active', id]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return 0;
    }

    await conn.query(`DELETE FROM leave_policy_details WHERE policy_id = ?`, [id]);
    for (const raw of details) {
      const d = normalizeDetail(raw);
      await conn.query(
        `INSERT INTO leave_policy_details (policy_id, ${DETAIL_FIELDS.join(', ')})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ...DETAIL_FIELDS.map((f) => d[f])]
      );
    }

    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// A policy currently assigned to any employee shouldn't be silently
// deleted out from under them — same "disable instead of delete" guard
// pattern used for leave types.
exports.isAssignedToAnyEmployee = async (id) => {
  const [[{ count }]] = await db.query(
    `SELECT COUNT(*) AS count FROM employee_leave_policy
     WHERE policy_id = ? AND (effective_to IS NULL OR effective_to >= CURDATE())`,
    [id]
  );
  return count > 0;
};

exports.remove = async (id) => {
  const [result] = await db.query('DELETE FROM leave_policies WHERE id = ?', [id]);
  return result.affectedRows;
};

exports.setStatus = async (id, status) => {
  const [result] = await db.query('UPDATE leave_policies SET status = ? WHERE id = ?', [status, id]);
  return result.affectedRows;
};