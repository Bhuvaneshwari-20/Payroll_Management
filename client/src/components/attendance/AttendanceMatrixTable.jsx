import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

// Color per base status code (half-day codes like "OD/S" still match via startsWith)
const CODE_STYLES = {
  P: { bg: '#dcfce7', color: '#166534' },   // Present - green
  AB: { bg: '#fee2e2', color: '#991b1b' },  // Absent - red
  CL: { bg: '#fef9c3', color: '#854d0e' },  // Casual leave - yellow
  SL: { bg: '#fde68a', color: '#78350f' },  // Sick leave - amber
  OD: { bg: '#dbeafe', color: '#1e40af' },  // On duty - blue
  H: { bg: '#e5e7eb', color: '#374151' },   // Holiday - grey
};

function codeStyle(code) {
  if (!code) return {};
  const base = code.split('/')[0];
  return CODE_STYLES[base] || {};
}

// Renders the same matrix shape getMonthlyReport() returns:
// { employee_code, name, joining_date, department, days: {1:'P',2:'AB',...}, numDays, Present, CL, OD, SL, Holiday, payableDays }
export default function AttendanceMatrixTable({ data, month, year }) {
  const [search, setSearch] = useState('');

  const numDays = data && data.length > 0 ? data[0].numDays : new Date(year, month, 0).getDate();
  const dayCols = Array.from({ length: numDays }, (_, i) => i + 1);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter(
      (r) => r.employee_code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [data, search]);

  const exportExcel = () => {
    const header = [
      'Employee Code', 'Name', 'Joining Date', 'Department',
      ...dayCols.map(String),
      'Days', 'Present', 'CL', 'OD', 'SL', 'Holiday', 'Payable Days',
    ];
    const rows = filtered.map((r) => [
      r.employee_code, r.name,
      r.joining_date ? new Date(r.joining_date).toLocaleDateString('en-GB') : '',
      r.department || '',
      ...dayCols.map((d) => r.days[d] || ''),
      r.numDays, r.Present, r.CL, r.OD, r.SL, r.Holiday, r.payableDays,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = header.map((h) => ({ wch: ['Employee Code', 'Name', 'Joining Date', 'Department'].includes(h) ? 16 : 6 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${year}_${String(month).padStart(2, '0')}.xlsx`);
  };

  if (!data) return null;

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <button className="btn btn-danger btn-sm" onClick={exportExcel}>
            <i className="fas fa-file-excel me-1" /> Export Excel
          </button>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: 220 }}
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="d-flex flex-wrap gap-3 mb-2 small">
          {Object.entries({ P: 'Present', AB: 'Absent', CL: 'Casual Leave', SL: 'Sick Leave', OD: 'On Duty', H: 'Holiday' }).map(([code, label]) => (
            <span key={code} className="d-inline-flex align-items-center gap-1">
              <span style={{ ...codeStyle(code), width: 16, height: 16, borderRadius: 3, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>

        <div className="table-responsive" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <table className="table table-bordered table-sm mb-0" style={{ fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#3b82f6', color: '#fff' }}>
                <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, background: '#3b82f6', minWidth: 100 }}>Employee Code</th>
                <th style={{ position: 'sticky', top: 0, left: 100, zIndex: 3, background: '#3b82f6', minWidth: 150 }}>Name</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6' }}>Joining Date</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6' }}>Department</th>
                {dayCols.map((d) => (
                  <th key={d} className="text-center" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6', minWidth: 34 }}>{d}</th>
                ))}
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6' }}>Days</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6' }}>Present</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6' }}>CL</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6' }}>OD</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6' }}>SL</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6' }}>Holiday</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6' }}>Payable Days</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.employee_code}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', fontWeight: 500 }}>{r.employee_code}</td>
                  <td style={{ position: 'sticky', left: 100, zIndex: 1, background: '#fff' }}>{r.name}</td>
                  <td>{r.joining_date ? new Date(r.joining_date).toLocaleDateString('en-GB') : '-'}</td>
                  <td>{r.department || '-'}</td>
                  {dayCols.map((d) => {
                    const code = r.days[d] || '';
                    return (
                      <td key={d} className="text-center" style={{ ...codeStyle(code), fontWeight: 600 }}>
                        {code}
                      </td>
                    );
                  })}
                  <td>{r.numDays}</td>
                  <td>{r.Present}</td>
                  <td>{r.CL}</td>
                  <td>{r.OD}</td>
                  <td>{r.SL}</td>
                  <td>{r.Holiday}</td>
                  <td className="fw-semibold">{r.payableDays}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8 + numDays} className="text-center text-muted py-3">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-muted small mb-0 mt-2">Showing {filtered.length} of {data.length} entries</p>
      </div>
    </div>
  );
}