import * as XLSX from 'xlsx';

function fmt(v) { return parseFloat(v || 0); }

export function downloadSalaryExcel(data, holdStatusMap, fromDate, toDate, filter = 'all') {
  let dataToExport = data;
  let sheetTitle = 'All Employees';
  let fileTag = 'ALL';

  if (filter === 'neft') {
    dataToExport = data.filter((r) => (holdStatusMap[r.employee_id] || 'neft') === 'neft');
    sheetTitle = 'NEFT Transfer Employees';
    fileTag = 'NEFT_TRANSFER';
  } else if (filter === 'cash') {
    dataToExport = data.filter((r) => (holdStatusMap[r.employee_id] || 'neft') === 'cash');
    sheetTitle = 'Cash Hold Employees';
    fileTag = 'CASH_HOLD';
  }

  if (!dataToExport.length) return { ok: false, message: `No employees found for filter: ${filter.toUpperCase()}` };

  const filename = `Salary_Report_${fromDate}_to_${toDate}_${fileTag}.xlsx`;
  const wb = XLSX.utils.book_new();

  const excelData = [];
  excelData.push([`KR Toyota — ${sheetTitle}`]);
  excelData.push([`Period: ${fromDate} to ${toDate}`]);
  excelData.push([`Generated: ${new Date().toLocaleString()}`]);
  excelData.push([`Filter: ${filter === 'all' ? 'All Employees' : filter === 'neft' ? 'NEFT / Transfer Only' : 'Cash / Hold Only'}`]);
  excelData.push([`Total Records: ${dataToExport.length}`]);
  excelData.push([]);

  excelData.push([
    'S.No', 'Emp ID', 'Name', 'Department', 'Role', 'Joining Date', 'Job Type', 'Last Working Date',
    'Basic Fixed', 'Basic Earned', 'HRA Fixed', 'HRA Earned', 'DA Fixed', 'DA Earned',
    'Special Fixed', 'Special Earned', 'Medical Fixed', 'Medical Earned',
    'Conveyance Fixed', 'Conveyance Earned',
    'Gross Fixed', 'Gross Earned', 'Other Earning', 'Total Gross Earned',
    'Days', 'Present', 'CL', 'OD', 'SL', 'Holiday', 'Payable Days', 'LOP',
    'PF', 'ESI', 'Advance', 'IT Tax', 'P Tax',
    'Food', 'Uniform', 'House Rent', 'Live Fund', 'Other Deduction', 'Total Deduction',
    'Net Salary', 'OT Mins', 'OT Amount', 'HW Days', 'HW Amount', 'Employer PF',
    'Payment Mode', 'Hold Status',
  ]);

  dataToExport.forEach((row, idx) => {
    const mode = holdStatusMap[row.employee_id] || 'neft';
    const modeLabel = mode === 'cash' ? 'Cash' : 'NEFT';
    const holdLabel = mode === 'cash' ? 'HOLD' : 'Transfer';

    excelData.push([
      idx + 1, row.employee_id, row.name, row.department,
      row.role_name, row.joining_date, row.jtype, row.last_working_date,
      row.basic_salary.fixed, row.basic_salary.earned,
      row.hra.fixed, row.hra.earned,
      row.da.fixed, row.da.earned,
      row.allowances.fixed_spec || 0, row.allowances.earned_spec || 0,
      row.allowances.fixed_medi || 0, row.allowances.earned_medi || 0,
      row.allowances.fixed_conv || 0, row.allowances.earned_conv || 0,
      row.gross_fixed || 0, row.gross_earned || 0,
      fmt(row.other_earning), fmt(row.total_gross_earned),
      row.days, fmt(row.present),
      row.cl || 0, row.od || 0, row.sl || 0, fmt(row.holidays),
      fmt(row.leave), fmt(row.lop),
      row.deductions.pf, row.deductions.esi, row.deductions.advance,
      row.deductions.it_tax, row.deductions.p_tax,
      row.deductions.food || 0, row.deductions.uniform || 0, row.deductions.house_rent || 0,
      row.deductions.live_fund || 0, row.deductions.other_deduction || 0,
      row.total_deduction || 0, row.net_salary,
      row.ot_minutes || 0, row.ot_amount || 0,
      row.holiday_wage_days || 0, row.holiday_wage_amount || 0, row.employer_pf || 0,
      modeLabel, holdLabel,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  const headerRowIdx = 6;
  const cols = excelData[headerRowIdx].length;
  for (let c = 0; c < cols; c++) {
    const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[ref]) ws[ref].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F8C6D2' } } };
  }
  dataToExport.forEach((row, idx) => {
    const dataRowIdx = headerRowIdx + 1 + idx;
    const mode = holdStatusMap[row.employee_id] || 'neft';
    const color = mode === 'cash' ? 'FFF9C4' : 'E8F5E9';
    [-2, -1].forEach((offset) => {
      const ref = XLSX.utils.encode_cell({ r: dataRowIdx, c: cols + offset });
      if (ws[ref]) ws[ref].s = { fill: { fgColor: { rgb: color } }, font: { bold: true } };
    });
  });

  ws['!cols'] = new Array(cols).fill({ wch: 12 });
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.substring(0, 31));

  if (filter === 'all') {
    const neftRows = data.filter((r) => (holdStatusMap[r.employee_id] || 'neft') === 'neft');
    const cashRows = data.filter((r) => (holdStatusMap[r.employee_id] || 'neft') === 'cash');
    const summaryData = [
      ['KR Toyota — Salary Summary'],
      [`Period: ${fromDate} to ${toDate}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Payment Mode Summary'],
      ['Mode', 'Count', 'Total Net Salary'],
      ['NEFT / Transfer', neftRows.length, neftRows.reduce((s, r) => s + fmt(r.net_salary), 0)],
      ['Cash / Hold', cashRows.length, cashRows.reduce((s, r) => s + fmt(r.net_salary), 0)],
      ['Grand Total', data.length, data.reduce((s, r) => s + fmt(r.net_salary), 0)],
      [],
      ['Hold Detail — Cash Employees'],
      ['S.No', 'Emp ID', 'Name', 'Department', 'Net Salary', 'Status'],
    ];
    cashRows.forEach((r, i) => summaryData.push([i + 1, r.employee_id, r.name, r.department, fmt(r.net_salary), 'HOLD']));
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  }

  XLSX.writeFile(wb, filename);
  return { ok: true, count: dataToExport.length };
}