import { useState, useEffect, useCallback } from 'react';
import attendanceService from '../services/attendanceService';
import { useAttendanceStatusOptions } from '../utils/useAttendanceStatusOptions';
import AttendanceMatrixTable from '../components/attendance/AttendanceMatrixTable';

// Same pattern as LeaveManagement.jsx / Departments.jsx / Roles.jsx /
// EmployeeManagement.jsx: Bootstrap's .card/.table/.nav-tabs/.form-control
// don't know about the --vb-* theme variables (defined once in
// Topbar.jsx), so without this override block they stay hardcoded light
// and show up as white panels on a dark page.
const attendance_styles = `
  .kr-page .nav-tabs {
    border-bottom: 1px solid var(--vb-border, #dee2e6);
  }
  .kr-page .nav-tabs .nav-link {
    color: var(--vb-text-muted, #495057);
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
  }
  .kr-page .nav-tabs .nav-link:hover {
    color: var(--vb-text, #1e293b);
  }
  .kr-page .nav-tabs .nav-link.active {
    color: var(--vb-text, #1e293b);
    background: transparent;
    border-bottom: 2px solid #a4133c;
  }

  .kr-page .form-select,
  .kr-page .form-control {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #ced4da);
  }
  .kr-page .form-select:focus,
  .kr-page .form-control:focus {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
  }
  .kr-page .form-label { color: var(--vb-text, #1e293b); }

  .kr-page .card {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: none;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
  }

  .kr-page .table {
    color: var(--vb-text, #1e293b);
  }
  .kr-page .table.table-bordered {
    border-color: var(--vb-border, #dee2e6);
  }
  .kr-page .table thead th,
  .kr-page .table thead.table-light th {
    background: var(--vb-bg-surface-2, #f8f9fc);
    color: var(--vb-text-muted, #495057);
    border-color: var(--vb-border, #dee2e6);
    font-weight: 600;
  }
  .kr-page .table td,
  .kr-page .table th {
    border-color: var(--vb-border, #dee2e6);
    vertical-align: middle;
  }
  .kr-page .table > :not(caption) > * > * {
    background-color: transparent;
    color: var(--vb-text, #1e293b);
  }
  .kr-page .table-hover > tbody > tr:hover > * {
    background-color: var(--vb-bg-surface-2, #f8f9fc);
  }

  .kr-page .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  .kr-page .page-heading {
    color: var(--vb-text, #1e293b);
    font-weight: 700;
  }
`;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}


function MarkAttendanceTable({ date, onDateChange, allowDateChange, onSaved }) {
   const { statusOptions, optionLabel } = useAttendanceStatusOptions({ withBalances: true });
  const [employees, setEmployees] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [halfDayMap, setHalfDayMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [empRes, attRes] = await Promise.all([
        attendanceService.getEmployees(),
        attendanceService.getByDate(date),
      ]);
      const emps = empRes.data || [];
      setEmployees(emps);

      const existingStatus = {};
      const existingHalf = {};
      const existingRemarks = {};
      (attRes.data || []).forEach((r) => {
        existingStatus[r.employee_id] = r.status;
        existingHalf[r.employee_id] = !!r.is_half_day;
        existingRemarks[r.employee_id] = r.remarks || '';
      });

      const statusDefaults = {};
      const halfDefaults = {};
      emps.forEach((e) => {
        statusDefaults[e.id] = existingStatus[e.id] || 'Present';
        halfDefaults[e.id] = existingHalf[e.id] || false;
      });
      setStatusMap(statusDefaults);
      setHalfDayMap(halfDefaults);
      setRemarksMap(existingRemarks);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load attendance data' });
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);


  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const records = employees.map((e) => ({
        employee_id: e.id,
        status: statusMap[e.id] || 'Present',
        is_half_day: !!halfDayMap[e.id],
        remarks: remarksMap[e.id] || null,
      }));
      const res = await attendanceService.markAttendance(date, records);
      setMessage({ type: 'success', text: res.message || 'Saved' });

      await load();

     
      if (onSaved) onSaved(date);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to save attendance',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex align-items-center gap-3 mb-3">
          {allowDateChange && (
            <input
              type="date"
              className="form-control"
              style={{ maxWidth: 200 }}
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            />
          )}
          {!allowDateChange && (
            <span className="badge bg-primary-subtle text-primary-emphasis fs-6 px-3 py-2">
              <i className="fas fa-calendar-day me-1" /> {date}
            </span>
          )}
          <button className="btn btn-primary ms-auto" disabled={saving || loading} onClick={handleSave}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save me-1" /> Save Attendance
              </>
            )}
          </button>
        </div>

        {message && (
          <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} py-2`}>
            <i className={`fas ${message.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} me-2`} />
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted py-4">
            <span className="spinner-border spinner-border-sm me-2" />
            Loading employees...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>Employee Code</th>
                  <th>Employee Name</th>
                  <th style={{ width: 150 }}>Status</th>
                  <th style={{ width: 90 }} className="text-center">Half day</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td>{e.employee_code}</td>
                    <td>{e.name}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                         value={statusMap[e.id] || 'P'}
                        onChange={(ev) => setStatusMap({ ...statusMap, [e.id]: ev.target.value })}
                      >
                          {statusOptions.map((s) => (
                         <option key={s.code} value={s.code}>
                           {optionLabel(s.code, e.id)}
                        </option>
                       ))}
                      </select>
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={!!halfDayMap[e.id]}
                        onChange={(ev) => setHalfDayMap({ ...halfDayMap, [e.id]: ev.target.checked })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={remarksMap[e.id] || ''}
                        onChange={(ev) => setRemarksMap({ ...remarksMap, [e.id]: ev.target.value })}
                      />
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">No active employees found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Upload tab — no longer owns report state. It just uploads and
   tells the parent to refresh (via onUploaded), and reads the
   shared month/year selectors from props so the upload target
   period always matches the period being viewed in the matrix.
   ============================================================ */
function UploadAttendanceTab({ month, year, setMonth, setYear, onUploaded }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await attendanceService.uploadAttendance(file, month, year, setProgress);
      setResult({ type: 'success', text: res.message });
      setFile(null);
      // Always refetch from DB rather than trusting any inline payload —
      // this is the single source of truth path shared by all 3 modules.
      if (onUploaded) await onUploaded();
    } catch (err) {
      const data = err?.response?.data;
      setResult({ type: 'error', text: data?.message || 'Upload failed', errors: data?.errors });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await attendanceService.downloadTemplate(month, year);
    } catch (err) {
      setResult({ type: 'error', text: 'Failed to download template' });
    } finally {
      setDownloading(false);
    }
  };
  function UploadCodesHelp() {
  const { codesHelpText } = useAttendanceStatusOptions();
  return <p className="text-muted small mb-3">Codes: {codesHelpText}</p>;
}

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="row g-3 align-items-end mb-3">
          <div className="col-auto">
            <label className="form-label small text-muted mb-1">Month</label>
            <select className="form-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-auto">
            <label className="form-label small text-muted mb-1">Year</label>
            <input
              type="number"
              className="form-control"
              style={{ width: 110 }}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div className="col-auto">
            <button className="btn btn-outline-primary" disabled={downloading} onClick={handleDownload}>
              <i className="fas fa-download me-1" /> {downloading ? 'Downloading...' : 'Download Template'}
            </button>
          </div>
        </div>

       <UploadCodesHelp />

        <div className="row g-3 align-items-end">
          <div className="col-auto">
            <label className="form-label small text-muted mb-1">Upload Filled Template</label>
            <input
              type="file"
              className="form-control"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
          <div className="col-auto">
            <button className="btn btn-success" disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Uploading {progress}%
                </>
              ) : (
                <>
                  <i className="fas fa-upload me-1" /> Upload
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className={`alert mt-3 ${result.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
            {result.text}
            {result.errors && (
              <ul className="mb-0 mt-2">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   The ONE Attendance Matrix on the page. Lives outside the tabs
   so it's always visible and always reflects whichever module
   last wrote to the DB — Upload, Daily, or Date-wise.
   ============================================================ */
function AttendanceMatrixSection({ month, year, setMonth, setYear, data, loading, onRefresh }) {
  return (
    <div className="mt-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <h5 className="mb-0 page-heading">
          <i className="fas fa-table me-2 text-primary" />
          Attendance Matrix — {month}/{year}
        </h5>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select form-select-sm" style={{ width: 90 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            className="form-control form-control-sm"
            style={{ width: 90 }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <button className="btn btn-outline-secondary btn-sm" onClick={onRefresh} disabled={loading}>
            <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''} me-1`} /> Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center text-muted py-4">
          <span className="spinner-border spinner-border-sm me-2" />
          Loading latest attendance data...
        </div>
      )}

      {!loading && data.length > 0 && (
        <AttendanceMatrixTable data={data} month={month} year={year} />
      )}

      {!loading && data.length === 0 && (
        <div className="card">
          <div className="card-body text-center text-muted py-4">
            No attendance records found for {month}/{year} yet.
          </div>
        </div>
      )}
    </div>
  );
}

export default function Attendance() {
  const [tab, setTab] = useState('upload');
  const [dateWiseDate, setDateWiseDate] = useState(todayISO());

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const loadReport = useCallback(async (m, y) => {
    setReportLoading(true);
    try {
      const res = await attendanceService.getMonthlyReport(m, y);
      setReportData(res.data || []);
    } catch {
      setReportData([]);
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Initial load + reload whenever the viewed month/year changes
  // (covers the matrix's own selector AND setMonth/setYear calls
  // triggered by a save landing in a different period).
  useEffect(() => {
    loadReport(month, year);
  }, [month, year, loadReport]);

  // Called by Daily/Date-wise tabs after a successful save.
  const handleAttendanceSaved = useCallback((savedDate) => {
    const d = new Date(savedDate);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    if (m === month && y === year) {
      // Same period already shown — just refetch.
      loadReport(m, y);
    } else {
      // Different period — switch the matrix to it; the useEffect
      // above will fetch automatically.
      setMonth(m);
      setYear(y);
    }
  }, [month, year, loadReport]);

  return (
    <div className="kr-page">
      <style>{attendance_styles}</style>

      <h3 className="mb-4 page-heading">
        <i className="fas fa-calendar-check me-2" />
        Attendance
      </h3>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
            <i className="fas fa-file-excel me-1" /> Upload Excel Attendance
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>
            <i className="fas fa-calendar-day me-1" /> Daily Attendance
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'datewise' ? 'active' : ''}`} onClick={() => setTab('datewise')}>
            <i className="fas fa-calendar-alt me-1" /> Date-wise Attendance
          </button>
        </li>
      </ul>

      {tab === 'upload' && (
        <UploadAttendanceTab
          month={month}
          year={year}
          setMonth={setMonth}
          setYear={setYear}
          onUploaded={() => loadReport(month, year)}
        />
      )}
      {tab === 'daily' && (
        <MarkAttendanceTable date={todayISO()} allowDateChange={false} onSaved={handleAttendanceSaved} />
      )}
      {tab === 'datewise' && (
        <MarkAttendanceTable
          date={dateWiseDate}
          onDateChange={setDateWiseDate}
          allowDateChange
          onSaved={handleAttendanceSaved}
        />
      )}

      {/* Single shared matrix — always visible, always latest DB state */}
      <AttendanceMatrixSection
        month={month}
        year={year}
        setMonth={setMonth}
        setYear={setYear}
        data={reportData}
        loading={reportLoading}
        onRefresh={() => loadReport(month, year)}
      />
    </div>
  );
}