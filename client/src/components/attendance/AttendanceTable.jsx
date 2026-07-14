import { useMemo, useState } from 'react';

const COLUMNS = [
  { key: 'employee_code', label: 'Employee Code' },
  { key: 'name', label: 'Name' },
  { key: 'department', label: 'Department' },
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
  { key: 'half_day', label: 'Half Day' },
  { key: 'leave', label: 'Leave' },
  { key: 'holiday', label: 'Holiday' },
  { key: 'week_off', label: 'Week Off' },
  { key: 'lop', label: 'LOP' },
  { key: 'working_days', label: 'Working Days' },
  { key: 'attendance_percent', label: 'Attendance %' },
];

const PAGE_SIZES = [10, 25, 50];

export default function AttendanceTable({ data, onSelectEmployee }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('employee_code');
  const [sortDir, setSortDir] = useState('asc');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    return data.map((e) => ({ ...e, name: `${e.first_name} ${e.last_name}` }));
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.employee_code.toLowerCase().includes(term) ||
        r.name.toLowerCase().includes(term) ||
        (r.department || '').toLowerCase().includes(term)
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <input
          type="text"
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder="Search employee..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="form-select"
          style={{ maxWidth: 140 }}
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
        >
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} rows</option>)}
        </select>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover" id="attendanceReportTable">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  role="button"
                  onClick={() => toggleSort(c.key)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {c.label}
                  {sortKey === c.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={COLUMNS.length} className="text-center text-muted py-4">No data for the selected filters.</td></tr>
            )}
            {pageRows.map((r) => (
              <tr
                key={r.employee_code}
                role="button"
                onClick={() => onSelectEmployee(r.employee_code)}
              >
                <td>{r.employee_code}</td>
                <td>{r.name}</td>
                <td>{r.department}</td>
                <td>{r.present}</td>
                <td>{r.absent}</td>
                <td>{r.half_day}</td>
                <td>{r.leave}</td>
                <td>{r.holiday}</td>
                <td>{r.week_off}</td>
                <td>{r.lop}</td>
                <td>{r.working_days}</td>
                <td>{r.attendance_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
          <span className="text-muted small">Page {page} of {totalPages}</span>
          <div className="btn-group">
            <button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <button className="btn btn-sm btn-outline-secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}