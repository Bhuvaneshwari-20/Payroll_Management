const payslipModel = require("../models/payslipModel");
const salaryModel = require("../models/salaryModel");
const { resolveEmpCode } = require("../middleware/auth");

// ────────────────────────────────────────────────────────────────
// HELPER: map one `report_data.data[]` entry (whatever shape
// salaryModel.calculateSalary() / freezeReport() produced) into the
// flat shape the frontend expects. Ported 1:1 from the PHP mapping
// blocks used in getEmployeesSalary / generateSingle / savePayslip.
// Works whether `emp` came straight out of calculateSalary() or was
// round-tripped through JSON in salary_history — same field names.
// ────────────────────────────────────────────────────────────────
function mapSalaryHistoryEmployee(emp, from, to) {
  return {
    employee_code:    emp.employee_id ?? "",
    name:             emp.name ?? "",
    designation:      emp.role_name ?? "-",
    department:       emp.department ?? "-",
    joining_date:     emp.joining_date ?? "",
    pan_number:       "",
    pf_no:            "",
    pf_uan:           "",
    bank_name:        "",
    bank_account:     "",
    basic_fixed:      emp.basic_salary?.fixed ?? 0,
    basic_earned:     emp.basic_salary?.earned ?? 0,
    hra_fixed:        emp.hra?.fixed ?? 0,
    hra_earned:       emp.hra?.earned ?? 0,
    da_fixed:         emp.da?.fixed ?? 0,
    da_earned:        emp.da?.earned ?? 0,
    spec_fixed:       emp.allowances?.fixed_spec ?? 0,
    spec_earned:      emp.allowances?.earned_spec ?? 0,
    medi_fixed:       emp.allowances?.fixed_medi ?? 0,
    medi_earned:      emp.allowances?.earned_medi ?? 0,
    conv_fixed:       emp.allowances?.fixed_conv ?? 0,
    conv_earned:      emp.allowances?.earned_conv ?? 0,
    other_ear_fixed:  0,
    other_ear_earned: emp.other_earning ?? 0,
    gross_fixed:      emp.gross_fixed ?? 0,
    gross_earned:     emp.total_gross_earned ?? emp.gross_earned ?? 0,
    days:             emp.days ?? 0,
    present:          emp.present ?? 0,
    holidays:         emp.holidays ?? 0,
    cl:               emp.cl ?? 0,
    od:               emp.od ?? 0,
    sl:               emp.sl ?? 0,
    payable_days:     parseFloat(emp.leave ?? 0),
    lop:              parseFloat(emp.lop ?? 0),
    pf:               emp.deductions?.pf ?? 0,
    esi:              emp.deductions?.esi ?? 0,
    it_tax:           emp.deductions?.it_tax ?? 0,
    p_tax:            emp.deductions?.p_tax ?? 0,
    advance:          emp.deductions?.advance ?? 0,
    food:             emp.deductions?.food ?? 0,
    uniform:          emp.deductions?.uniform ?? 0,
    house_rent:       emp.deductions?.house_rent ?? 0,
    other_deduction:  emp.deductions?.other_deduction ?? 0,
    total_deduction:  emp.total_deduction ?? 0,
    net_salary:       emp.net_salary ?? 0,
    from_date:        from,
    to_date:          to,
  };
}

/** Ported from PHP resolvePayslipMonth() */
function resolvePayslipMonth(postedSelectedMonth, toDate) {
  if (postedSelectedMonth && /^\d{4}-\d{2}$/.test(postedSelectedMonth)) return postedSelectedMonth;
  return new Date(toDate).toISOString().slice(0, 7);
}

// ─────────────────────────────────────────────────────────────────
// 1. POST /api/payslips/employees-salary  (was: get_employees_salary)
// Reads the FROZEN report from salary_history — same as the PHP.
// ─────────────────────────────────────────────────────────────────
async function getEmployeesSalary(req, res) {
  const { from_date, to_date } = req.body;
  if (!from_date || !to_date) {
    return res.json({ status: "error", message: "from_date and to_date required" });
  }

  const histRow = await payslipModel.getSalaryHistoryByRange(from_date, to_date);
  if (!histRow) {
    return res.json({ status: "error", message: "No salary history found for this date range" });
  }

  let report;
  try {
    report = JSON.parse(histRow.report_data);
  } catch {
    return res.json({ status: "error", message: "Salary history data is corrupted" });
  }
  if (!report?.data?.length) {
    return res.json({ status: "error", message: "Salary history data is empty or corrupted" });
  }

  const output = report.data
    .map((emp) => mapSalaryHistoryEmployee(emp, from_date, to_date))
    .sort((a, b) => a.employee_code.localeCompare(b.employee_code));

  res.json({ status: "success", data: output, count: output.length });
}

// ─────────────────────────────────────────────────────────────────
// 2. POST /api/payslips/generate-single (was: generate_single)
// ─────────────────────────────────────────────────────────────────
async function generateSingle(req, res) {
  const employee_code = (req.body.employee_code || "").trim();
  const { from_date, to_date } = req.body;
  if (!employee_code || !from_date || !to_date) {
    return res.json({ status: "error", message: "Missing fields" });
  }

  const histRow = await payslipModel.getSalaryHistoryByRange(from_date, to_date);
  if (!histRow) {
    return res.json({ status: "error", message: "No salary history found for this date range" });
  }

  const report = JSON.parse(histRow.report_data);
  const empData = report?.data?.find((e) => e.employee_id === employee_code);
  if (!empData) {
    return res.json({ status: "error", message: "Employee not found in salary history for this period" });
  }

  res.json({ status: "success", data: mapSalaryHistoryEmployee(empData, from_date, to_date) });
}

// ─────────────────────────────────────────────────────────────────
// 3. POST /api/payslips/generate-all (was: generate_all)
//
// Unlike the original PHP (which re-derived payroll math from raw
// attendance tables), this reuses your EXISTING salaryModel.calculateSalary()
// — the same function your "freeze report" flow already uses — so the
// numbers are always identical to whatever your salary report page shows.
// This does NOT read salary_history; it computes fresh, then writes
// individual `payslips` rows (useful for generating without freezing first).
// ─────────────────────────────────────────────────────────────────
async function generateAll(req, res) {
  const { from_date, to_date } = req.body;
  const status = req.body.status || "pending";

  const results = await salaryModel.calculateSalary(from_date, to_date);
  if (!results.length) {
    return res.json({ status: "error", message: "No employees found for this period" });
  }

  const payslipMonth = resolvePayslipMonth(req.body.selected_month, to_date);
  let count = 0;

  for (const emp of results) {
    const calc = mapSalaryHistoryEmployee(emp, from_date, to_date);
    calc.payslip_month = payslipMonth;

    await payslipModel.upsertPayslip({
      employee_code: calc.employee_code,
      emp_name: calc.name,
      from_date,
      to_date,
      net_salary: calc.net_salary,
      payslip_data: JSON.stringify(calc),
      status,
      payslip_month: payslipMonth,
    });
    count++;
  }

  res.json({ status: "success", count, message: `${count} payslips processed` });
}

// ─────────────────────────────────────────────────────────────────
// 4. POST /api/payslips/save (was: save_payslip)
// ─────────────────────────────────────────────────────────────────
async function savePayslip(req, res) {
  const employee_code = (req.body.employee_code || "").trim();
  const { from_date, to_date } = req.body;
  const status = req.body.status || "pending";

  if (!employee_code || !from_date || !to_date) {
    return res.json({ status: "error", message: "Missing required fields" });
  }

  const histRow = await payslipModel.getSalaryHistoryByRange(from_date, to_date);
  if (!histRow) {
    return res.json({ status: "error", message: "No salary history found for this date range" });
  }

  const report = JSON.parse(histRow.report_data);
  const empData = report?.data?.find((e) => e.employee_id === employee_code);
  if (!empData) {
    return res.json({ status: "error", message: "Employee not found in salary history for this period" });
  }

  const payslipMonth = resolvePayslipMonth(req.body.selected_month, to_date);
  const calc = mapSalaryHistoryEmployee(empData, from_date, to_date);
  calc.payslip_month = payslipMonth;

  await payslipModel.upsertPayslip({
    employee_code,
    emp_name: calc.name,
    from_date,
    to_date,
    net_salary: parseFloat(calc.net_salary) || 0,
    payslip_data: JSON.stringify(calc),
    status,
    payslip_month: payslipMonth,
  });

  res.json({ status: "success", message: "Payslip saved successfully" });
}

// ─────────────────────────────────────────────────────────────────
// 5. POST /api/payslips/approval-status (was: get_approval_status)
// ─────────────────────────────────────────────────────────────────
async function getApprovalStatus(req, res) {
  const { from_date, to_date } = req.body;
  if (!from_date || !to_date) return res.json({ status: "error", message: "Missing dates" });

  const rows = await payslipModel.getApprovalStatus(from_date, to_date);
  res.json({ status: "success", data: rows });
}

// ─────────────────────────────────────────────────────────────────
// 6. GET /api/payslips/history (was: get_payslip_history) — HR/manager
// ─────────────────────────────────────────────────────────────────
async function getPayslipHistory(req, res) {
  const rows = await payslipModel.getPayslipHistory();
  res.json({ status: "success", data: rows });
}

// ─────────────────────────────────────────────────────────────────
// 7. GET /api/payslips/:id (was: get_payslip_by_id)
// ─────────────────────────────────────────────────────────────────
async function getPayslipById(req, res) {
  const id = parseInt(req.params.id || req.body.id || req.query.id || 0);
  const row = await payslipModel.getPayslipById(id);
  row ? res.json({ status: "success", data: row }) : res.json({ status: "error", message: "Not found" });
}

// ─────────────────────────────────────────────────────────────────
// 8. PATCH /api/payslips/:id/status (was: update_status)
// ─────────────────────────────────────────────────────────────────
async function updateStatus(req, res) {
  const id = parseInt(req.params.id || req.body.id || 0);
  const status = (req.body.status || "").trim();
  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.json({ status: "error", message: "Invalid status" });
  }
  const ok = await payslipModel.updateStatus(id, status);
  ok ? res.json({ status: "success" }) : res.json({ status: "error", message: "Update failed" });
}

// ─────────────────────────────────────────────────────────────────
// 9. DELETE /api/payslips/:id (was: delete_payslip)
// ─────────────────────────────────────────────────────────────────
async function deletePayslip(req, res) {
  const id = parseInt(req.params.id || req.body.id || 0);
  const ok = await payslipModel.deletePayslip(id);
  ok ? res.json({ status: "success" }) : res.json({ status: "error", message: "Delete failed" });
}

// ─────────────────────────────────────────────────────────────────
// 10. GET /api/payslips/my/list (was: get_employee_payslips)
// ─────────────────────────────────────────────────────────────────
async function getEmployeePayslips(req, res) {
  const empCode = await resolveEmpCode(req);
  if (!empCode) {
    return res.json({ status: "error", message: "Could not identify employee. Please log in again." });
  }
  const rows = await payslipModel.getEmployeePayslips(empCode);
  res.json({ status: "success", data: rows, count: rows.length });
}

// ─────────────────────────────────────────────────────────────────
// 11. GET /api/payslips/my/:id (was: get_employee_payslip_detail)
// ─────────────────────────────────────────────────────────────────
async function getEmployeePayslipDetail(req, res) {
  const empCode = await resolveEmpCode(req);
  if (!empCode) {
    return res.json({ status: "error", message: "Session expired. Please log in again." });
  }

  const id = parseInt(req.params.id || req.body.id || req.query.id || 0);
  if (id <= 0) return res.json({ status: "error", message: "Invalid payslip ID" });

  const row = await payslipModel.getEmployeePayslipDetail(id, empCode);
  if (!row) return res.json({ status: "error", message: "Payslip not found" });

  let decoded;
  try {
    decoded = JSON.parse(row.payslip_data);
  } catch {
    return res.json({ status: "error", message: "Payslip data is corrupted" });
  }

  if (!decoded.from_date) decoded.from_date = row.from_date;
  if (!decoded.to_date) decoded.to_date = row.to_date;
  decoded.payslip_month = row.payslip_month || decoded.payslip_month || "";
  row.payslip_data = JSON.stringify(decoded);

  res.json({ status: "success", data: row });
}

module.exports = {
  getEmployeesSalary,
  generateSingle,
  generateAll,
  savePayslip,
  getApprovalStatus,
  getPayslipHistory,
  getPayslipById,
  updateStatus,
  deletePayslip,
  getEmployeePayslips,
  getEmployeePayslipDetail,
};