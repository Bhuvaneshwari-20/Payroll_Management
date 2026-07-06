const db = require("../config/db");

// ==================== EMPLOYEES ====================

exports.getEmployees = async ({ department, role, status, search }) => {
  let query = `
    SELECT e.*, d.name as department_name, r.name as role_name,
           es.basic_salary, es.hra, es.da, es.other_allowances, es.it_tax, es.p_tax
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN roles r ON e.role_id = r.id
    LEFT JOIN employee_salary es ON e.id = es.employee_id AND es.status = 'active'
    WHERE 1=1`;
  const params = [];

  if (department) { query += " AND e.department_id = ?"; params.push(department); }
  if (role) { query += " AND e.role_id = ?"; params.push(role); }
  if (status) { query += " AND e.status = ?"; params.push(status); }
  if (search) {
    query += " AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  query += " ORDER BY e.first_name, e.last_name";

  const [rows] = await db.query(query, params);
  return rows;
};

exports.getEmployeeById = async (id) => {
  const [rows] = await db.query(
    `SELECT e.*,
            es.basic_salary, es.hra, es.da, es.other_allowances,
            es.conveyance, es.medical_allowance, es.over_time,
            es.pf_applicable, es.esi_applicable,
            es.it_tax, es.p_tax, es.food, es.uniform,
            es.house_rent, es.lwe_fund, es.other_deduction,
            d.name AS department_name,
            r.name AS role_name
     FROM employees e
     LEFT JOIN employee_salary es ON es.employee_id = e.id AND es.status = 'active'
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN roles r ON r.id = e.role_id
     WHERE e.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;

  const emp = rows[0];
  emp.documents = [];
  const certName = (emp.cert_names || "").trim();
  const certFile = (emp.cert_files || "").trim();
  if (certName) emp.documents.push({ document_name: certName, file_path: certFile });

  if (!emp.employee_master_type) {
    if (emp.caution_deposit && emp.caution_deposit > 0) emp.employee_master_type = "caution_deposit";
    else if (emp.documents.length) emp.employee_master_type = "originals_submission";
  }
  return emp;
};

async function generateEmployeeCode(conn) {
  const [rows] = await conn.query(
    `SELECT employee_code FROM employees
     WHERE employee_code REGEXP '^KRCB[0-9]{3}$'
     ORDER BY CAST(SUBSTRING(employee_code, 5) AS UNSIGNED) DESC LIMIT 1`
  );
  const nextNum = rows.length ? parseInt(rows[0].employee_code.slice(4), 10) + 1 : 1;
  return "KRCB" + String(nextNum).padStart(3, "0");
}

exports.insertEmployee = async (b) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const employeeCode = await generateEmployeeCode(conn);

    const [result] = await conn.query(
      `INSERT INTO employees (
        employee_code, pass, first_name, last_name, email, phone, gender, dob,
        address, district, pincode, bank_name, account_number, ifsc_code, branch_name,
        aadhaar, pan, uan_number, esic_number, father_name, qualification, blood_group,
        emergency_contact, profile_image, department_id, role_id, manager_id,
        caution_deposit, employee_master_type, cert_names, cert_files,
        jtype, joining_date, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        employeeCode, employeeCode, b.first_name, b.last_name, b.email, b.phone,
        b.gender, b.dob, b.address, b.district, b.pincode, b.bank_name,
        b.account_number, b.ifsc_code, b.branch_name, b.aadhaar, b.pan,
        b.uan_number, b.esic_number, b.father_name, b.qualification, b.blood_group,
        b.emergency_contact, b.profile_image || null, b.department_id || null, b.role_id || null,
        b.manager_id || null, b.caution_deposit || 0, b.employee_master_type || null,
        b.cert_names || null, b.cert_files || null, b.jtype, b.joining_date, b.status || "active",
      ]
    );

    const employeeId = result.insertId;

    await conn.query(
      `INSERT INTO employee_salary (
        employee_id, basic_salary, hra, da, other_allowances, conveyance, medical_allowance,
        over_time, pf_applicable, esi_applicable, it_tax, p_tax, food, uniform,
        house_rent, lwe_fund, other_deduction, effective_from
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        employeeId, b.basic_salary || 0, b.hra || 0, b.da || 0, b.special_allowances || 0,
        b.conveyance || 0, b.medical_allowances || 0, b.ot || 0,
        b.pf_applicable || 0, b.esi_applicable || 0, b.it_tax || 0, b.p_tax || 0,
        b.food || 0, b.uniform || 0, b.rent || 0, b.lwf || 0, b.other_deduction || 0,
        b.joining_date,
      ]
    );

    await conn.commit();
    return employeeCode;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.updateEmployee = async (id, b) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let employeeCode = b.employee_code;
    if (!employeeCode || employeeCode === "undefined") {
      const [rows] = await conn.query("SELECT employee_code FROM employees WHERE id = ?", [id]);
      employeeCode = rows[0]?.employee_code;
    }

    if (b.profile_image) {
      await conn.query("UPDATE employees SET profile_image = ? WHERE id = ?", [b.profile_image, id]);
    }

    const masterType = b.employee_master_type || "";
    const cautionDeposit = masterType === "caution_deposit" ? (b.caution_deposit || 0) : 0;

    await conn.query(
      `UPDATE employees SET
        employee_code=?, first_name=?, last_name=?, email=?, phone=?, gender=?, dob=?,
        address=?, district=?, pincode=?, bank_name=?, account_number=?, ifsc_code=?, branch_name=?,
        aadhaar=?, pan=?, uan_number=?, esic_number=?, father_name=?, qualification=?, blood_group=?,
        emergency_contact=?, department_id=?, role_id=?, manager_id=?, jtype=?, joining_date=?,
        status=?, caution_deposit=?, employee_master_type=?, cert_names=?, cert_files=?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        employeeCode, b.first_name, b.last_name, b.email, b.phone, b.gender, b.dob,
        b.address, b.district, b.pincode, b.bank_name, b.account_number, b.ifsc_code, b.branch_name,
        b.aadhaar, b.pan, b.uan_number, b.esic_number, b.father_name, b.qualification, b.blood_group,
        b.emergency_contact, b.department_id || null, b.role_id || null, b.manager_id || null,
        b.jtype, b.joining_date, b.status || "active", cautionDeposit, masterType,
        b.cert_names || null, b.cert_files || null, id,
      ]
    );

    await conn.query(
      `UPDATE employee_salary SET
        basic_salary=?, hra=?, da=?, other_allowances=?, conveyance=?, medical_allowance=?,
        over_time=?, pf_applicable=?, esi_applicable=?, it_tax=?, p_tax=?, food=?, uniform=?,
        house_rent=?, lwe_fund=?, other_deduction=?
       WHERE employee_id = ? AND status = 'active'`,
      [
        b.basic_salary || 0, b.hra || 0, b.da || 0, b.special_allowances || 0, b.conveyance || 0,
        b.medical_allowances || 0, b.ot || 0, b.pf_applicable || 0, b.esi_applicable || 0,
        b.it_tax || 0, b.p_tax || 0, b.food || 0, b.uniform || 0, b.rent || 0, b.lwf || 0,
        b.other_deduction || 0, id,
      ]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.deleteEmployee = async (id) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM employee_salary WHERE employee_id = ?", [id]);
    await conn.query("DELETE FROM employees WHERE id = ?", [id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.toggleEmployeeStatus = async (id, newStatus, reason, lastWorkingDate, inactiveDate, changedBy) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query("SELECT employee_code, status FROM employees WHERE id = ?", [id]);
    if (!rows.length) throw new Error("Employee not found");
    const previousStatus = rows[0].status;
    const employeeCode = rows[0].employee_code;

    if (newStatus === "active") {
      await conn.query(
        "UPDATE employees SET status=?, last_working_date=NULL, inactive_date=NULL WHERE id=?",
        [newStatus, id]
      );
    } else {
      await conn.query(
        "UPDATE employees SET status=?, last_working_date=?, inactive_date=? WHERE id=?",
        [newStatus, lastWorkingDate, inactiveDate, id]
      );
    }

    await conn.query(
      `INSERT INTO employee_status_changes
        (employee_id, employee_code, previous_status, new_status, change_reason,
         last_working_date, inactive_date, change_date, changed_by)
       VALUES (?,?,?,?,?,?,?,NOW(),?)`,
      [id, employeeCode, previousStatus, newStatus, reason, lastWorkingDate, inactiveDate, changedBy]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.getRolesByDepartment = async (departmentId) => {
  if (!departmentId) return [];
  const [rows] = await db.query(
    `SELECT id, name FROM roles WHERE department_id = ? AND status = 'active' ORDER BY name`,
    [departmentId]
  );
  return rows;
};

// ==================== MANAGERS ====================

exports.getManagers = async (departmentId) => {
  let query = `
    SELECT m.*, d.name as department_name, e.first_name, e.last_name
    FROM managers m
    LEFT JOIN departments d ON m.department_id = d.id
    LEFT JOIN employees e ON m.employee_id = e.id
    WHERE m.status = 'active'`;
  const params = [];

  if (departmentId) {
    query += " AND m.department_id = ?";
    params.push(departmentId);
  } else {
    query += " ORDER BY d.name, m.name";
  }

  const [rows] = await db.query(query, params);
  return rows;
};

exports.addManager = async (departmentId, employeeId) => {
  const [empRows] = await db.query(
    "SELECT employee_code, CONCAT(first_name, ' ', last_name) as name FROM employees WHERE id = ?",
    [employeeId]
  );
  if (!empRows.length) throw new Error("Employee not found");

  const [dupe] = await db.query(
    "SELECT id FROM managers WHERE department_id = ? AND employee_id = ? AND status = 'active'",
    [departmentId, employeeId]
  );
  if (dupe.length) throw new Error("This employee is already a manager in this department");

  await db.query(
    "INSERT INTO managers (department_id, employee_id, employee_code, name, status) VALUES (?, ?, ?, ?, 'active')",
    [departmentId, employeeId, empRows[0].employee_code, empRows[0].name]
  );
};

exports.deleteManager = async (id) => {
  await db.query("UPDATE managers SET status = 'inactive' WHERE id = ?", [id]);
};

// ==================== STATUS HISTORY / STATUS CHANGES ====================
// Both tabs read from employee_status_changes (populated by toggleEmployeeStatus above).

exports.getEmployeeStatusHistory = async () => {
  const [rows] = await db.query(
    `SELECT esc.*, 'status_change' as action_type,
            CONCAT(e.first_name, ' ', e.last_name) as employee_name,
            CONCAT(admin.first_name, ' ', admin.last_name) as action_by_name,
            esc.change_date as action_date, esc.change_reason as reason
     FROM employee_status_changes esc
     LEFT JOIN employees e ON esc.employee_id = e.id
     LEFT JOIN employees admin ON esc.changed_by = admin.id
     ORDER BY esc.change_date DESC`
  );
  return rows;
};

exports.getStatusChangeHistory = async () => {
  const [rows] = await db.query(
    `SELECT esc.*,
            CONCAT(e.first_name, ' ', e.last_name) as employee_name,
            CONCAT(admin.first_name, ' ', admin.last_name) as changed_by_name
     FROM employee_status_changes esc
     LEFT JOIN employees e ON esc.employee_id = e.id
     LEFT JOIN employees admin ON esc.changed_by = admin.id
     ORDER BY esc.change_date DESC`
  );
  return rows;
};

exports.getStatusHistoryForExport = async () => {
  const [rows] = await db.query(
    `SELECT esc.change_date as action_date, esc.employee_code,
            CONCAT(e.first_name, ' ', e.last_name) as employee_name,
            d.name as department_name, r.name as role_name,
            'status_change' as action_type,
            esc.previous_status, esc.new_status, esc.change_reason as reason,
            CONCAT(admin.first_name, ' ', admin.last_name) as action_by_name
     FROM employee_status_changes esc
     LEFT JOIN employees e ON esc.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN roles r ON e.role_id = r.id
     LEFT JOIN employees admin ON esc.changed_by = admin.id
     ORDER BY esc.change_date DESC`
  );
  return rows;
};

// ==================== BULK DEDUCTION UPLOAD ====================

exports.getEmployeeIdByCode = async (code) => {
  const [rows] = await db.query("SELECT id FROM employees WHERE employee_code = ?", [code]);
  return rows.length ? rows[0].id : null;
};

exports.updateEmployeeDeductions = async (employeeId, d) => {
  const [result] = await db.query(
    `UPDATE employee_salary SET
      pf_applicable=?, esi_applicable=?, it_tax=?, p_tax=?, food=?, uniform=?,
      house_rent=?, lwe_fund=?, other_deduction=?
     WHERE employee_id=? AND status='active'`,
    [d.pf_applicable, d.esi_applicable, d.it_tax, d.p_tax, d.food, d.uniform,
      d.house_rent, d.lwe_fund, d.other_deduction, employeeId]
  );
  return result.affectedRows > 0;
};

exports.insertUploadHistory = async ({ uploadType, fileName, filePath, uploadedBy, recordsCount, successCount, errorCount, status }) => {
  await db.query(
    `INSERT INTO bulk_upload_history
      (upload_type, file_name, file_path, uploaded_by, upload_date, records_count, success_count, error_count, status)
     VALUES (?,?,?,?,NOW(),?,?,?,?)`,
    [uploadType, fileName, filePath, uploadedBy, recordsCount, successCount, errorCount, status]
  );
};

exports.getUploadHistory = async () => {
  const [rows] = await db.query(
    `SELECT buh.*, CONCAT(e.first_name, ' ', e.last_name) as uploaded_by_name
     FROM bulk_upload_history buh
     LEFT JOIN employees e ON buh.uploaded_by = e.id
     ORDER BY buh.upload_date DESC`
  );
  return rows;
};

exports.clearUploadHistory = async () => {
  await db.query("DELETE FROM bulk_upload_history");
};

// ==================== EXCEL EXPORT ====================

// ==================== BULK EMPLOYEE ADD (full employee, not just deductions) ====================

exports.getDepartmentIdByName = async (name) => {
  if (!name) return null;
  const [rows] = await db.query("SELECT id FROM departments WHERE LOWER(name) = LOWER(?) LIMIT 1", [name.trim()]);
  return rows.length ? rows[0].id : null;
};

exports.getRoleIdByNameAndDepartment = async (name, departmentId) => {
  if (!name || !departmentId) return null;
  const [rows] = await db.query(
    "SELECT id FROM roles WHERE LOWER(name) = LOWER(?) AND department_id = ? LIMIT 1",
    [name.trim(), departmentId]
  );
  return rows.length ? rows[0].id : null;
};

exports.getManagerIdByEmployeeCode = async (code) => {
  if (!code) return null;
  const [rows] = await db.query(
    "SELECT id FROM managers WHERE employee_code = ? AND status = 'active' LIMIT 1",
    [code.trim()]
  );
  return rows.length ? rows[0].id : null;
};

exports.isEmailTaken = async (email) => {
  const [rows] = await db.query("SELECT id FROM employees WHERE email = ? LIMIT 1", [email]);
  return rows.length > 0;
};

// One row = one full employee, using the exact same insertEmployee() the
// Add Employee modal uses — so bulk-added and manually-added employees are
// stored 100% identically, no parallel code path to drift out of sync.
exports.bulkInsertEmployee = async (data) => {
  return exports.insertEmployee(data);
};

exports.getEmployeesForExport = async (filter) => {
  let query = `
    SELECT e.*, d.name AS department_name, r.name AS role_name, m.name AS manager_name,
           es.basic_salary, es.hra, es.da, es.other_allowances, es.conveyance,
           es.medical_allowance, es.over_time, es.pf_applicable, es.esi_applicable,
           es.it_tax, es.p_tax, es.food, es.uniform, es.house_rent, es.lwe_fund, es.other_deduction
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN roles r ON e.role_id = r.id
    LEFT JOIN managers m ON e.manager_id = m.id
    LEFT JOIN employee_salary es ON e.id = es.employee_id AND es.status = 'active'`;

  if (filter === "active") query += " WHERE e.status = 'active'";
  else if (filter === "inactive") query += " WHERE e.status = 'inactive'";
  query += " ORDER BY e.id";

  const [rows] = await db.query(query);
  return rows;
};