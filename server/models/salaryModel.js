const db = require('../config/db');

function xround(val, digits = 0) {
  const factor = Math.pow(10, digits);
  return Math.floor(val * factor + 0.5) / factor;
}

function getMonthsInRange(fromDate, toDate) {
  const months = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const monthStart = new Date(y, cur.getMonth(), 1);
    const monthEnd = new Date(y, cur.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();

    const asDate = monthStart < start ? start : monthStart;
    const aeDate = monthEnd > end ? end : monthEnd;

    months.push({
      month: m,
      year: y,
      start_date: asDate.toISOString().slice(0, 10),
      end_date: aeDate.toISOString().slice(0, 10),
      days_in_month: daysInMonth,
    });
    cur = new Date(y, cur.getMonth() + 1, 1);
  }
  return months;
}

// Since our schema has ONE `attendance` table (not month-sharded), we
// query it directly with a date range per employee instead of switching
// tables per month like the legacy PHP did.
async function getAttendanceSummary(employeeId, holidayLower, holidayUpper, effStart, effEnd) {
  const [[row]] = await db.query(
    `SELECT
       COUNT(CASE WHEN status = 'Present' THEN 1 END) AS present_full,
       COUNT(CASE WHEN status = 'Holiday' AND date BETWEEN ? AND ? THEN 1 END) AS holidays,
       COUNT(CASE WHEN status = 'CL' THEN 1 END) AS CL,
       COUNT(CASE WHEN status = 'OD' THEN 1 END) AS OD,
       COUNT(CASE WHEN status = 'SL' THEN 1 END) AS SL,
       SUM(CASE WHEN is_half_day = 1 THEN 0.5 ELSE 0 END) AS half_days
     FROM attendance
     WHERE employee_id = ? AND date BETWEEN ? AND ?`,
    [holidayLower, holidayUpper, employeeId, effStart, effEnd]
  );
  return row;
}

exports.calculateSalary = async (fromDate, toDate) => {
  const months = getMonthsInRange(fromDate, toDate);
  const fromDt = new Date(fromDate);
  const toDt = new Date(toDate);
  const employeeTotals = {};

  // Fetch all active/recently-inactive employees once
  const [employees] = await db.query(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.joining_date, e.jtype,
            e.last_working_date, e.status AS emp_status,
            r.name AS role_name, d.name AS department,
            es.basic_salary, es.hra, es.da, es.other_allowances, es.conveyance,
            es.medical_allowance, es.advance, es.pf_applicable, es.esi_applicable,
            es.it_tax, es.p_tax, es.food, es.uniform, es.house_rent, es.lwe_fund,
            es.other_deduction, COALESCE(es.other_earning, 0) AS other_earning,
            COALESCE(es.hold_mode, 'neft') AS hold_mode
     FROM employees e
     LEFT JOIN employee_salary es ON e.id = es.employee_id AND es.status = 'active'
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN roles r ON e.role_id = r.id
     WHERE e.status = 'active' OR (e.status = 'inactive' AND e.last_working_date >= ?)`,
    [fromDate]
  );

  for (const emp of employees) {
    const eid = emp.employee_code;
    const joiningDate = emp.joining_date || fromDate;
    let effStart = fromDate;
    if (joiningDate > effStart) effStart = joiningDate;

    let effEnd;
    if (emp.emp_status === 'inactive' && emp.last_working_date) {
      effEnd = [emp.last_working_date, toDate].sort()[0];
    } else {
      effEnd = toDate;
    }
    if (effStart > effEnd) continue;

    const att = await getAttendanceSummary(emp.id, effStart, effEnd, effStart, effEnd);

    if (!employeeTotals[eid]) {
      const joinDt = new Date(emp.joining_date || fromDate);
      const effStartTotal = joinDt > fromDt ? joinDt : fromDt;
      let effEndTotal = toDt;
      if (emp.emp_status === 'inactive' && emp.last_working_date) {
        const lwdDt = new Date(emp.last_working_date);
        effEndTotal = lwdDt < toDt ? lwdDt : toDt;
      }
      const totalDays = effStartTotal <= effEndTotal
        ? Math.round((effEndTotal - effStartTotal) / 86400000) + 1
        : 0;

      employeeTotals[eid] = {
        employee_id: eid,
        name: `${emp.first_name} ${emp.last_name}`.trim(),
        department: emp.department || '',
        joining_date: emp.joining_date || '',
        role_name: emp.role_name || '',
        jtype: emp.jtype || '',
        last_working_date: emp.last_working_date,
        basic_salary: { fixed: Number(emp.basic_salary) || 0, earned: 0 },
        hra: { fixed: Number(emp.hra) || 0, earned: 0 },
        da: { fixed: Number(emp.da) || 0, earned: 0 },
        allowances: {
          fixed_spec: Number(emp.other_allowances) || 0, earned_spec: 0,
          fixed_medi: Number(emp.medical_allowance) || 0, earned_medi: 0,
          fixed_conv: Number(emp.conveyance) || 0, earned_conv: 0,
        },
        other_earning: Number(emp.other_earning) || 0,
        payment_mode: emp.hold_mode || 'neft',
        ot_minutes: 0, ot_amount: 0,
        holiday_wage_days: 0, holiday_wage_amount: 0,
        days: totalDays, present: 0, holidays: 0, cl: 0, od: 0, sl: 0, el: 0, leave: 0,
        deductions: {
          pf: 0, esi: 0,
          advance: Number(emp.advance) || 0,
          it_tax: Number(emp.it_tax) || 0,
          p_tax: Number(emp.p_tax) || 0,
          food: Number(emp.food) || 0,
          uniform: Number(emp.uniform) || 0,
          house_rent: Number(emp.house_rent) || 0,
          live_fund: Number(emp.lwe_fund) || 0,
          other_deduction: Number(emp.other_deduction) || 0,
        },
        pf_applicable: Number(emp.pf_applicable) || 0,
        esi_applicable: Number(emp.esi_applicable) || 0,
        employer_pf: 0,
        gross_fixed: 0, gross_earned: 0, total_gross_earned: 0,
        total_deduction: 0, net_salary: 0,
      };
    }

    const presentFull = Number(att.present_full) || 0;
    const halfDays = Number(att.half_days) || 0;
    const holidays = Number(att.holidays) || 0;
    const cl = Number(att.CL) || 0;
    const od = Number(att.OD) || 0;
    const sl = Number(att.SL) || 0;

    const totalPresent = presentFull + halfDays;
    const emp_actual_days = Math.round((new Date(effEnd) - new Date(effStart)) / 86400000) + 1;
    const rawPayable = totalPresent + cl + sl + od + holidays;
    const payableThisMonth = Math.min(emp_actual_days, rawPayable);

    const t = employeeTotals[eid];
    t.basic_salary.earned += Math.round(t.basic_salary.fixed / 31 * payableThisMonth);
    t.hra.earned += Math.round(t.hra.fixed / 31 * payableThisMonth);
    t.da.earned += Math.round(t.da.fixed / 31 * payableThisMonth);
    t.allowances.earned_spec += Math.round(t.allowances.fixed_spec / 31 * payableThisMonth);
    t.allowances.earned_medi += Math.round(t.allowances.fixed_medi / 31 * payableThisMonth);
    t.allowances.earned_conv += Math.round(t.allowances.fixed_conv / 31 * payableThisMonth);

    t.present += totalPresent;
    t.holidays += holidays;
    t.cl += cl; t.od += od; t.sl += sl;
    t.leave += payableThisMonth;
  }

  // Phase 2: final derived fields
  const results = Object.values(employeeTotals).map((emp) => {
    emp.gross_fixed = emp.basic_salary.fixed + emp.hra.fixed + emp.da.fixed +
      emp.allowances.fixed_spec + emp.allowances.fixed_medi + emp.allowances.fixed_conv;

    emp.gross_earned = xround(
      emp.basic_salary.earned + emp.hra.earned + emp.da.earned +
      emp.allowances.earned_spec + emp.allowances.earned_medi + emp.allowances.earned_conv
    );

    emp.total_gross_earned = xround(emp.gross_earned + emp.other_earning);

    if (emp.pf_applicable === 1) {
      const pfBase = emp.gross_earned - emp.hra.earned;
      emp.deductions.pf = Math.min(1800, xround(pfBase * 0.12));
    }
    if (emp.esi_applicable === 1) {
      emp.deductions.esi = xround(emp.gross_earned * 0.0075);
    }
    emp.employer_pf = emp.deductions.pf;

    const d = emp.deductions;
    emp.total_deduction = xround(
      (d.pf||0) + (d.esi||0) + (d.advance||0) + (d.it_tax||0) + (d.p_tax||0) +
      (d.food||0) + (d.uniform||0) + (d.house_rent||0) + (d.live_fund||0) + (d.other_deduction||0)
    );

    emp.net_salary = Math.max(0, xround(emp.total_gross_earned - emp.total_deduction));

    const lop = Math.max(0, emp.days - emp.leave);
    emp.present = emp.present.toFixed(1);
    emp.holidays = emp.holidays.toFixed(1);
    emp.cl = emp.cl.toFixed(1);
    emp.od = emp.od.toFixed(1);
    emp.sl = emp.sl.toFixed(1);
    emp.leave = emp.leave.toFixed(1);
    emp.lop = lop.toFixed(1);

    return emp;
  });

  return results;
};

exports.getEmployeesForOE = async () => {
  const [rows] = await db.query(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name,
            COALESCE(d.name,'-') AS department,
            COALESCE(es.other_earning, 0) AS other_earning,
            COALESCE(es.hold_mode, 'neft') AS hold_mode
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN employee_salary es ON es.employee_id = e.id AND es.status = 'active'
     WHERE e.status = 'active'
     ORDER BY e.employee_code ASC`
  );
  return rows;
};

exports.saveOtherEarning = async (employeeId, otherEarning) => {
  const [[existing]] = await db.query(
    `SELECT id FROM employee_salary WHERE employee_id = ? AND status = 'active'
     ORDER BY effective_from DESC LIMIT 1`,
    [employeeId]
  );
  if (existing) {
    await db.query('UPDATE employee_salary SET other_earning = ? WHERE id = ?', [otherEarning, existing.id]);
  } else {
    await db.query(
      `INSERT INTO employee_salary (employee_id, basic_salary, other_earning, effective_from, status)
       VALUES (?, 0, ?, CURDATE(), 'active')`,
      [employeeId, otherEarning]
    );
  }
  return exports.getEmployeesForOE();
};

exports.saveHoldStatus = async (holdMap) => {
  let updated = 0;
  for (const [empCode, mode] of Object.entries(holdMap)) {
    const safeMode = ['neft', 'cash'].includes(mode) ? mode : 'neft';
    const [result] = await db.query(
      `UPDATE employee_salary es
       JOIN employees e ON e.id = es.employee_id AND e.employee_code = ? AND es.status = 'active'
       SET es.hold_mode = ?`,
      [empCode, safeMode]
    );
    updated += result.affectedRows;
  }
  return updated;
};

exports.freezeReport = async (reportName, fromDate, toDate, reportData) => {
  const [[existing]] = await db.query('SELECT id FROM salary_history WHERE report_name = ?', [reportName]);
  if (existing) throw new Error('A report with this name already exists.');

  const [result] = await db.query(
    `INSERT INTO salary_history (report_name, from_date, to_date, report_data) VALUES (?, ?, ?, ?)`,
    [reportName, fromDate, toDate, JSON.stringify(reportData)]
  );
  return result.insertId;
};

exports.getHistoryList = async () => {
  const [rows] = await db.query(
    'SELECT id, report_name, from_date, to_date, created_at FROM salary_history ORDER BY created_at DESC'
  );
  return rows;
};

exports.getHistoryReport = async (id) => {
  const [[row]] = await db.query('SELECT * FROM salary_history WHERE id = ?', [id]);
  return row;
};

exports.deleteHistory = async (id) => {
  await db.query('DELETE FROM salary_history WHERE id = ?', [id]);
};