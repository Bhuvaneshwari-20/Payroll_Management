import { useEffect, useMemo, useState } from 'react';

function fmtNum(n) { return parseFloat(n || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

const PAGE_SIZES = [10, 25, 50, 100];

export default function SalaryTable({ data, holdStatusMap }) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (row) =>
        String(row.employee_id ?? '').toLowerCase().includes(term) ||
        (row.name || '').toLowerCase().includes(term) ||
        (row.department || '').toLowerCase().includes(term)
    );
  }, [data, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);

  // Reset to page 1 whenever the underlying dataset changes (new report
  // generated, history report loaded) so you don't land on a stale/empty page.
  useEffect(() => { setPage(1); }, [data]);

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  // Windowed page numbers with ellipses — same scheme as the shared DataTable.
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safePage - delta && i <= safePage + delta)) {
        range.push(i);
      }
    }
    const withDots = [];
    let last = null;
    range.forEach((i) => {
      if (last !== null) {
        if (i - last === 2) withDots.push(last + 1);
        else if (i - last > 2) withDots.push('...');
      }
      withDots.push(i);
      last = i;
    });
    return withDots;
  }, [totalPages, safePage]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          <span className="text-muted small">Show</span>
          <select
            className="form-select form-select-sm"
            style={{ width: 80, minWidth: 70 }}
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-muted small">entries</span>
        </div>
        <div className="d-flex align-items-center gap-2" style={{ flex: '1 1 220px', minWidth: 0 }}>
          <span className="text-muted small">Search:</span>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ width: '100%', maxWidth: 220, minWidth: 140 }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by employee, name, or dept..."
          />
        </div>
      </div>

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
              <th rowSpan="2" style={{ background: 'rgba(255, 193, 7, 0.15)', minWidth: 120 }}>Payment Mode</th>
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
            {pageRows.map((row, i) => {
              const mode = holdStatusMap[row.employee_id] || 'neft';
              const isHold = mode === 'cash';
              return (
                <tr key={row.employee_id} style={{ background: isHold ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                  <td className="text-center">{startIdx + i + 1}</td>
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
            {total === 0 && (
              <tr>
                <td colSpan="48" className="text-center py-4">
                  {data.length === 0 ? 'No data found for the selected period.' : 'No employees match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
        <div className="text-muted small">
          {total === 0
            ? 'Showing 0 entries'
            : `Showing ${startIdx + 1} to ${Math.min(startIdx + pageSize, total)} of ${total} entries`}
        </div>
        {totalPages > 1 && (
          <nav style={{ maxWidth: '100%' }}>
            <ul className="pagination pagination-sm mb-0 flex-wrap">
              <li className={`page-item ${safePage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => goToPage(safePage - 1)}>Previous</button>
              </li>
              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <li key={`dots-${i}`} className="page-item disabled"><span className="page-link">...</span></li>
                ) : (
                  <li key={p} className={`page-item ${p === safePage ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => goToPage(p)}>{p}</button>
                  </li>
                )
              )}
              <li className={`page-item ${safePage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => goToPage(safePage + 1)}>Next</button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}