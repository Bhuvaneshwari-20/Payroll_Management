import React, { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const CODE_STYLES = {
  P: { bg: '#dcfce7', color: '#166534' },
  AB: { bg: '#fee2e2', color: '#991b1b' },
  CL: { bg: '#fef9c3', color: '#854d0e' },
  SL: { bg: '#fde68a', color: '#78350f' },
  OD: { bg: '#dbeafe', color: '#1e40af' },
  H: { bg: '#e5e7eb', color: '#374151' },
};

function codeStyle(code) {
  if (!code) return {};
  const base = code.split('/')[0];
  return CODE_STYLES[base] || {};
}

export default function AttendanceMatrixTable({ data, month, year }) {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

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

  const getSortValue = (row, key) => {
    switch (key) {
      case 'employee_code': return (row.employee_code || '').toLowerCase();
      case 'name': return (row.name || '').toLowerCase();
      case 'department': return (row.department || '').toLowerCase();
      case 'joining_date': return row.joining_date || '';
      case 'numDays': return row.numDays;
      case 'Present': return row.Present;
      case 'CL': return row.CL;
      case 'OD': return row.OD;
      case 'SL': return row.SL;
      case 'Holiday': return row.Holiday;
      case 'payableDays': return row.payableDays;
      default: return '';
    }
  };

  const sorted = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortConfig.key);
      const bv = getSortValue(b, sortConfig.key);
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: 'asc' };
    });
    setPage(1);
  };

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(startIdx, startIdx + pageSize);

  useEffect(() => { setPage(1); }, [search, data]);

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safePage - delta && i <= safePage + delta)) range.push(i);
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

  const exportExcel = () => {
    const header = [
      'Employee Code', 'Name', 'Joining Date', 'Department',
      ...dayCols.map(String),
      'Days', 'Present', 'CL', 'OD', 'SL', 'Holiday', 'Payable Days',
    ];
    const rows = sorted.map((r) => [
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

  function SortableTh({ label, sortKey, minWidth, sticky, left }) {
    const isActive = sortConfig.key === sortKey;
    const isAsc = isActive && sortConfig.direction === 'asc';
    const isDesc = isActive && sortConfig.direction === 'desc';
    return (
      <th
        onClick={() => handleSort(sortKey)}
        style={{
          position: 'sticky', top: 0, zIndex: sticky ? 3 : 2, background: '#3b82f6',
          ...(left !== undefined ? { left } : {}),
          minWidth, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        }}
        title="Click to sort"
      >
        {label}
        <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 6, verticalAlign: 'middle', lineHeight: '0.7' }}>
          <span style={{ fontSize: '0.6rem', color: isAsc ? '#fff' : 'rgba(255,255,255,0.5)' }}>▲</span>
          <span style={{ fontSize: '0.6rem', color: isDesc ? '#fff' : 'rgba(255,255,255,0.5)' }}>▼</span>
        </span>
      </th>
    );
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <button className="btn btn-danger btn-sm" onClick={exportExcel}>
            <i className="fas fa-file-excel me-1" /> Export Excel
          </button>
        </div>

        <div className="d-flex flex-wrap gap-3 mb-3 small">
          {Object.entries({ P: 'Present', AB: 'Absent', CL: 'Casual Leave', SL: 'Sick Leave', OD: 'On Duty', H: 'Holiday' }).map(([code, label]) => (
            <span key={code} className="d-inline-flex align-items-center gap-1">
              <span style={{ ...codeStyle(code), width: 16, height: 16, borderRadius: 3, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>

        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Show</span>
            <select
              className="form-select form-select-sm"
              style={{ width: 80 }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-muted small">entries</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Search:</span>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 220 }}
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <table className="table table-bordered table-sm mb-0" style={{ fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#3b82f6', color: '#fff' }}>
                <SortableTh label="Employee Code" sortKey="employee_code" minWidth={100} sticky left={0} />
                <SortableTh label="Name" sortKey="name" minWidth={150} sticky left={100} />
                <SortableTh label="Joining Date" sortKey="joining_date" />
                <SortableTh label="Department" sortKey="department" />
                {dayCols.map((d) => (
                  <th key={d} className="text-center" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#3b82f6', minWidth: 34 }}>{d}</th>
                ))}
                <SortableTh label="Days" sortKey="numDays" />
                <SortableTh label="Present" sortKey="Present" />
                <SortableTh label="CL" sortKey="CL" />
                <SortableTh label="OD" sortKey="OD" />
                <SortableTh label="SL" sortKey="SL" />
                <SortableTh label="Holiday" sortKey="Holiday" />
                <SortableTh label="Payable Days" sortKey="payableDays" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
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
              {pageRows.length === 0 && (
                <tr><td colSpan={8 + numDays} className="text-center text-muted py-3">No records found</td></tr>
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
            <nav>
              <ul className="pagination pagination-sm mb-0">
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
    </div>
  );
}