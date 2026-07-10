import { useEffect, useState } from 'react';
import { fetchEmployeeAttendanceDetail } from '../../services/attendanceReportApi';

const STATUS_LABELS = {
  P: 'Present', AB: 'Absent', S: 'Half Day', H: 'Holiday', WO: 'Week Off',
  L: 'Leave', CL: 'Casual Leave', SL: 'Sick Leave', EL: 'Earned Leave',
  OD: 'On Duty', ML: 'Maternity Leave', PL: 'Paternity Leave',
};

const STATUS_COLORS = {
  P: '#90EE90', AB: '#FFB6C1', S: '#FFD700', H: '#87CEEB', WO: '#d1d1d1',
};

export default function AttendanceDetailModal({ employeeCode, fromDate, toDate, status, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchEmployeeAttendanceDetail(employeeCode, { from_date: fromDate, to_date: toDate, status })
      .then((res) => {
        if (cancelled) return;
        setEmployee(res.data.employee);
        setAttendance(res.data.attendance || []);
      })
      .catch(() => { if (!cancelled) setError('Could not load attendance detail.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [employeeCode, fromDate, toDate, status]);

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 20000 }} tabIndex="-1">
      <div className="modal-backdrop fade show" style={{ zIndex: 19999 }} onClick={onClose}></div>
      <div className="modal-dialog modal-dialog-centered modal-lg" style={{ zIndex: 20001 }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-bold">
              {employee ? `${employee.employee_code} — ${employee.name}` : 'Employee Attendance'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading && <div className="text-center py-4">Loading...</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            {!loading && !error && employee && (
              <div className="mb-3 text-muted small">
                Department: {employee.department} &nbsp;|&nbsp; Joined: {employee.joining_date}
              </div>
            )}

            {!loading && !error && (
              <div className="table-responsive" style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="table table-bordered table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Working Hours</th>
                      <th>Late</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted py-3">No records for this range.</td></tr>
                    )}
                    {attendance.map((a) => (
                      <tr key={a.date}>
                        <td>{a.date}</td>
                        <td>
                          <span
                            className="badge"
                            style={{ backgroundColor: STATUS_COLORS[a.status] || '#e0e0e0', color: '#222' }}
                          >
                            {STATUS_LABELS[a.status] || a.status}
                          </span>
                        </td>
                        <td>{a.check_in}</td>
                        <td>{a.check_out}</td>
                        <td>{a.working_hours}</td>
                        <td>{a.late}</td>
                        <td>{a.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}