function fmtNum(n) { return parseFloat(n || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

export default function SalaryTable({ data, holdStatusMap }) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th rowSpan="2">S.No</th><th rowSpan="2">Emp ID</th><th rowSpan="2">Name</th><th rowSpan="2">Dept</th>
            <th colSpan="2">Basic</th><th colSpan="2">HRA</th><th colSpan="2">DA</th>
            <th colSpan="2">Special</th><th colSpan="2">Medical</th><th colSpan="2">Conveyance</th>
            <th colSpan="2">Gross</th>
            <th rowSpan="2">Other Earning</th><th rowSpan="2">Total Gross Earned</th>
            <th rowSpan="2">Days</th><th rowSpan="2">Present</th>
            <th rowSpan="2">CL</th><th rowSpan="2">OD</th><th rowSpan="2">SL</th><th rowSpan="2">Holiday</th>
            <th rowSpan="2">Payable Days</th><th rowSpan="2">LOP</th>
            <th colSpan="10">Deductions</th>
            <th rowSpan="2">Net</th><th rowSpan="2">OT Mins</th><th rowSpan="2">OT Amt</th>
            <th rowSpan="2">HW Days</th><th rowSpan="2">HW Amt</th><th rowSpan="2">Emp PF</th>
            <th rowSpan="2" style={{ background: '#fff8e1', minWidth: 120 }}>Payment Mode</th>
          </tr>
          <tr>
            <th>Fixed</th><th>Earned</th><th>Fixed</th><th>Earned</th><th>Fixed</th><th>Earned</th>
            <th>Fixed</th><th>Earned</th><th>Fixed</th><th>Earned</th><th>Fixed</th><th>Earned</th>
            <th>Fixed</th><th>Earned</th>
            <th>PF</th><th>ESI</th><th>Adv</th><th>IT</th><th>PT</th>
            <th>Food</th><th>Uniform</th><th>Rent</th><th>Fund</th><th>Other</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const mode = holdStatusMap[row.employee_id] || 'neft';
            const isHold = mode === 'cash';
            return (
              <tr key={row.employee_id} style={{ background: isHold ? '#fff5f5' : '#fff' }}>
                <td className="text-center">{i + 1}</td>
                <td>{row.employee_id}</td>
                <td>{row.name}</td>
                <td>{row.department}</td>
                <td className="text-end">{fmtNum(row.basic_salary.fixed)}</td>
                <td className="text-end">{fmtNum(row.basic_salary.earned)}</td>
                <td className="text-end">{fmtNum(row.hra.fixed)}</td>
                <td className="text-end">{fmtNum(row.hra.earned)}</td>
                <td className="text-end">{fmtNum(row.da.fixed)}</td>
                <td className="text-end">{fmtNum(row.da.earned)}</td>
                <td className="text-end">{fmtNum(row.allowances.fixed_spec)}</td>
                <td className="text-end">{fmtNum(row.allowances.earned_spec)}</td>
                <td className="text-end">{fmtNum(row.allowances.fixed_medi)}</td>
                <td className="text-end">{fmtNum(row.allowances.earned_medi)}</td>
                <td className="text-end">{fmtNum(row.allowances.fixed_conv)}</td>
                <td className="text-end">{fmtNum(row.allowances.earned_conv)}</td>
                <td className="text-end">{fmtNum(row.gross_fixed)}</td>
                <td className="text-end">{fmtNum(row.gross_earned)}</td>
                <td className="text-end">{fmtNum(row.other_earning)}</td>
                <td className="text-end fw-bold">{fmtNum(row.total_gross_earned)}</td>
                <td className="text-center">{row.days}</td>
                <td className="text-center">{row.present}</td>
                <td className="text-center">{row.cl}</td>
                <td className="text-center">{row.od}</td>
                <td className="text-center">{row.sl}</td>
                <td className="text-center">{row.holidays}</td>
                <td className="text-center">{row.leave}</td>
                <td className="text-center">{row.lop}</td>
                <td className="text-end">{fmtNum(row.deductions.pf)}</td>
                <td className="text-end">{fmtNum(row.deductions.esi)}</td>
                <td className="text-end">{fmtNum(row.deductions.advance)}</td>
                <td className="text-end">{fmtNum(row.deductions.it_tax)}</td>
                <td className="text-end">{fmtNum(row.deductions.p_tax)}</td>
                <td className="text-end">{fmtNum(row.deductions.food)}</td>
                <td className="text-end">{fmtNum(row.deductions.uniform)}</td>
                <td className="text-end">{fmtNum(row.deductions.house_rent)}</td>
                <td className="text-end">{fmtNum(row.deductions.live_fund)}</td>
                <td className="text-end">{fmtNum(row.deductions.other_deduction)}</td>
                <td className="text-end fw-bold">{fmtNum(row.net_salary)}</td>
                <td className="text-center">{row.ot_minutes}</td>
                <td className="text-end">{fmtNum(row.ot_amount)}</td>
                <td className="text-center">{row.holiday_wage_days}</td>
                <td className="text-end">{fmtNum(row.holiday_wage_amount)}</td>
                <td className="text-end">{fmtNum(row.employer_pf)}</td>
                <td className="text-center">
                  {isHold
                    ? <span className="badge" style={{ background: '#fdecea', color: '#c62828', border: '1px solid #f5b8b5' }}><i className="fas fa-hand-paper me-1"></i>Cash / Hold</span>
                    : <span className="badge" style={{ background: '#eaf4eb', color: '#2e7d32', border: '1px solid #b2dfb4' }}><i className="fas fa-university me-1"></i>NEFT</span>}
                </td>
              </tr>
            );
          })}
          {data.length === 0 && <tr><td colSpan="48" className="text-center py-4">No data found for the selected period.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}