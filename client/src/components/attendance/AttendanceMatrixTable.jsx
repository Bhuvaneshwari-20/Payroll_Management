import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

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
    <div className="card mt-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <button className="btn btn-danger btn-sm" onClick={exportExcel}>
            <i className="fas fa-file-excel me-1" /> Excel
          </button>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: 220 }}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table className="table table-bordered table-sm" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#3b82f6', color: '#fff' }}>
                <th>Employee Code</th>
                <th>Name</th>
                <th>Joining Date</th>
                <th>Department</th>
                {dayCols.map((d) => (
                  <th key={d} className="text-center" style={{ minWidth: 34 }}>{d}</th>
                ))}
                <th>Days</th>
                <th>Present</th>
                <th>CL</th>
                <th>OD</th>
                <th>SL</th>
                <th>Holiday</th>
                <th>Payable Days</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.employee_code}>
                  <td>{r.employee_code}</td>
                  <td>{r.name}</td>
                  <td>{r.joining_date ? new Date(r.joining_date).toLocaleDateString('en-GB') : '-'}</td>
                  <td>{r.department || '-'}</td>
                  {dayCols.map((d) => {
                    const code = r.days[d] || '';
                    const isAbsent = code.startsWith('AB');
                    return (
                      <td key={d} className={`text-center ${isAbsent ? 'table-danger' : ''}`}>
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
                  <td>{r.payableDays}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8 + numDays} className="text-center text-muted">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-muted small mb-0">Showing {filtered.length} of {data.length} entries</p>
      </div>
    </div>
  );
}