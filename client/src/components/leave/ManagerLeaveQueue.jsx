import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getManagerQueue, managerAction } from '../../services/leaveApi';
import LeaveStatusBadge from './LeaveStatusBadge';

export default function ManagerLeaveQueue({ category }) {
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
    // FIX: was fetching Pending-only before, so a request vanished the
    // instant the manager acted on it. getManagerQueue now hits the
    // "all requests for this manager" endpoint (see leaveApi.js change
    // below) so history + status stays visible after acting.
    getManagerQueue(category).then((res) => setRows(res.data.data)).catch(() => {});
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    const { value: comments } = await Swal.fire({
      title: action === 'forward' ? 'Forward to HR?' : 'Reject this leave?',
      input: 'textarea',
      inputLabel: 'Comments (optional)',
      showCancelButton: true,
    });
    if (comments === undefined) return; // cancelled
    await managerAction(id, action, comments);
    load();
  };

  return (
    <table className="table table-bordered mt-3">
      <thead>
        <tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.employee_name} ({r.employee_code})</td>
            <td>{r.leave_type_name}</td>
            <td>{r.start_date}</td>
            <td>{r.end_date}</td>
            <td>{r.days}</td>
            <td>{r.reason}</td>
            <td><LeaveStatusBadge status={r.status} isLop={!!r.is_lop} /></td>
            <td>
              {r.status === 'Pending' ? (
                <>
                  <button className="btn btn-sm btn-success me-2" onClick={() => act(r.id, 'forward')}>Forward to HR</button>
                  <button className="btn btn-sm btn-danger" onClick={() => act(r.id, 'reject')}>Reject</button>
                </>
              ) : (
                <span className="text-muted small">{r.manager_comments || '—'}</span>
              )}
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan="8" className="text-center">No requests yet</td></tr>}
      </tbody>
    </table>
  );
}