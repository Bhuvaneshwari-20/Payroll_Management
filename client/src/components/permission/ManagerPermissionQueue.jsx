import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getPermissionManagerQueue, permissionManagerAction } from '../../services/permissionApi';

const STATUS_BADGE = {
  Pending: 'bg-warning text-dark',
  Approved: 'bg-success',
  Rejected: 'bg-danger',
  Cancelled: 'bg-secondary',
};

export default function ManagerPermissionQueue() {
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
    getPermissionManagerQueue().then((res) => setRows(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    const { value: comments } = await Swal.fire({
      title: action === 'approve' ? 'Approve this permission?' : 'Reject this permission?',
      input: 'textarea',
      inputLabel: 'Comments (optional)',
      showCancelButton: true,
      confirmButtonColor: action === 'reject' ? '#dc3545' : '#198754',
    });
    if (comments === undefined) return;
    await permissionManagerAction(id, action, comments);
    load();
  };

  return (
    <table className="table table-bordered mt-3">
      <thead>
        {/* FIX: was r.date / r.permission_type — those columns don't exist
            on permission_requests. Real columns are request_date / from_time / to_time. */}
        <tr><th>Employee</th><th>Date</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.employee_name} ({r.employee_code})</td>
            <td>{r.request_date}</td>
            <td>{r.from_time}</td>
            <td>{r.to_time}</td>
            <td>{r.reason}</td>
            <td><span className={`badge ${STATUS_BADGE[r.status] || 'bg-secondary'}`}>{r.status}</span></td>
            <td>
              {r.status === 'Pending' ? (
                <>
                  <button className="btn btn-sm btn-success me-2" onClick={() => act(r.id, 'approve')}>Approve</button>
                  <button className="btn btn-sm btn-danger" onClick={() => act(r.id, 'reject')}>Reject</button>
                </>
              ) : (
                <span className="text-muted small">{r.manager_comments || '—'}</span>
              )}
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan="7" className="text-center">No permission requests yet</td></tr>}
      </tbody>
    </table>
  );
}