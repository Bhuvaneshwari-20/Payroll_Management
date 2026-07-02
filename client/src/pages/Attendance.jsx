import { useState, useEffect, useCallback } from 'react';
import attendanceService, { STATUS_OPTIONS } from '../services/attendanceService';
import AttendanceMatrixTable from '../components/attendance/AttendanceMatrixTable';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Shared by both Daily and Date-wise tabs — same table, only the date differs.
function MarkAttendanceTable({ date, onDateChange, allowDateChange }) {
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

  // This is what actually persists to the `attendance` table
  // (employee_id, date, status, is_half_day, remarks, marked_by, source='manual')
  // via POST /api/attendance/mark — see attendanceController.js markAttendance
  // and attendanceModel.js upsertAttendanceBatch (ON DUPLICATE KEY UPDATE keyed
  // on the employee_id+date unique constraint, so re-saving the same date edits
  // the existing rows instead of duplicating them).
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
      // Re-pull from DB to confirm what actually got persisted, rather than
      // trusting local state — this is the "where does this actually save"
      // confirmation loop.
      load();
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
    <div>
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
        {!allowDateChange && <strong>{date}</strong>}
        <button className="btn btn-primary" disabled={saving || loading} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p>Loading employees...</p>
      ) : (
        <table className="table table-bordered table-sm">
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Employee Name</th>
              <th style={{ width: 140 }}>Status</th>
              <th style={{ width: 90 }}>Half day</th>
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
                    value={statusMap[e.id] || 'Present'}
                    onChange={(ev) => setStatusMap({ ...statusMap, [e.id]: ev.target.value })}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
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
          </tbody>
        </table>
      )}
    </div>
  );
}

function UploadAttendanceTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [downloading, setDownloading] = useState(false);

  // FIX: previously this only read res.data from the upload response and,
  // if the backend didn't return the matrix inline, the table silently
  // stayed empty and you only ever saw the plain success toast. Now the
  // upload endpoint returns the freshly-built matrix directly (see
  // attendanceController.js uploadAttendance -> model.getMonthlyReport),
  // and as a safety net we re-fetch explicitly if that's ever missing.
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await attendanceService.uploadAttendance(file, month, year, setProgress);
      setResult({ type: 'success', text: res.message });

      if (res.data && res.data.length > 0) {
        setReportData(res.data);
      } else {
        const reportRes = await attendanceService.getMonthlyReport(month, year);
        setReportData(reportRes.data || []);
      }
    } catch (err) {
      const data = err?.response?.data;
      setResult({ type: 'error', text: data?.message || 'Upload failed', errors: data?.errors });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Also load the report whenever month/year changes, so switching periods
  // shows existing DB data even without a fresh upload.
  const loadExistingReport = useCallback(async () => {
    try {
      const reportRes = await attendanceService.getMonthlyReport(month, year);
      setReportData(reportRes.data || []);
    } catch {
      /* leave table hidden if nothing exists yet for this period */
    }
  }, [month, year]);

  useEffect(() => {
    loadExistingReport();
  }, [loadExistingReport]);

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

  return (
    <div>
      <div className="row g-3 align-items-end mb-4">
        <div className="col-auto">
          <label className="form-label">Month</label>
          <select className="form-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <label className="form-label">Year</label>
          <input
            type="number"
            className="form-control"
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

      <p className="text-muted small mb-3">
        Codes: <strong>P</strong> Present, <strong>AB</strong> Absent, <strong>CL</strong>, <strong>SL</strong>,{' '}
        <strong>OD</strong>, <strong>H</strong> Holiday. Add <strong>/S</strong> for half-day (e.g. OD/S).
      </p>

      <div className="row g-3 align-items-end">
        <div className="col-auto">
          <label className="form-label">Upload Filled Template</label>
          <input
            type="file"
            className="form-control"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-success" disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? `Uploading ${progress}%` : 'Upload'}
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

      {reportData.length > 0 && (
        <AttendanceMatrixTable data={reportData} month={month} year={year} />
      )}
    </div>
  );
}

export default function Attendance() {
  const [tab, setTab] = useState('upload');
  const [dateWiseDate, setDateWiseDate] = useState(todayISO());

  return (
    <div className="kr-page">
      <h3 className="mb-4">
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

      {tab === 'upload' && <UploadAttendanceTab />}
      {tab === 'daily' && <MarkAttendanceTable date={todayISO()} allowDateChange={false} />}
      {tab === 'datewise' && (
        <MarkAttendanceTable date={dateWiseDate} onDateChange={setDateWiseDate} allowDateChange />
      )}
    </div>
  );
}