import { useEffect, useState } from 'react';
import { fetchDepartments, fetchEmployeesLite } from '../../services/attendanceReportApi';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTIONS = ['All', 'Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Week Off'];

function monthToRange(monthValue) {
  // monthValue is "YYYY-MM"
  const [y, m] = monthValue.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export default function AttendanceFilter({ onGenerate, loading }) {
  const { user } = useAuth();
  const isHR = user?.role === 'HR';
  const isManager = !!user?.isManager;
  const canPickOtherEmployees = isHR || isManager;

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [departmentId, setDepartmentId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [mode, setMode] = useState('month'); // 'month' | 'range'

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('All');

  useEffect(() => {
    if (!isHR) return; // only HR filters by department across everyone
    fetchDepartments()
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => setDepartments([]));
  }, [isHR]);

  useEffect(() => {
    if (!canPickOtherEmployees) return;
    fetchEmployeesLite(departmentId || undefined)
      .then((res) => setEmployees(res.data.data || []))
      .catch(() => setEmployees([]));
  }, [departmentId, canPickOtherEmployees]);

  function handleGenerate() {
    const range = mode === 'month' ? monthToRange(month) : { from: fromDate, to: toDate };
    if (!range.from || !range.to) return;

    onGenerate({
      from_date: range.from,
      to_date: range.to,
      department_id: isHR ? departmentId || undefined : undefined,
      employee_id: canPickOtherEmployees ? employeeCode || undefined : undefined,
      status,
    });
  }

  return (
    <div className="card p-3 mb-3">
      <div className="row g-3 align-items-end">
        {isHR && (
          <div className="col-6 col-md-2">
            <label className="form-label fw-bold">Department</label>
            <select
              className="form-select"
              value={departmentId}
              onChange={(e) => { setDepartmentId(e.target.value); setEmployeeCode(''); }}
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {canPickOtherEmployees && (
          <div className="col-6 col-md-2">
            <label className="form-label fw-bold">Employee</label>
            <select
              className="form-select"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
            >
              <option value="">All</option>
              {employees.map((emp) => (
                <option key={emp.employee_code} value={emp.employee_code}>
                  {emp.employee_code} — {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="col-6 col-md-2">
          <label className="form-label fw-bold">Period</label>
          <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="month">Month</option>
            <option value="range">Date Range</option>
          </select>
        </div>

        {mode === 'month' ? (
          <div className="col-6 col-md-2">
            <label className="form-label fw-bold">Month</label>
            <input
              type="month"
              className="form-control"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="col-6 col-md-2">
              <label className="form-label fw-bold">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label fw-bold">To Date</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="col-6 col-md-2">
          <label className="form-label fw-bold">Status</label>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="col-12 col-md-2">
          <button className="btn btn-primary w-100" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
}