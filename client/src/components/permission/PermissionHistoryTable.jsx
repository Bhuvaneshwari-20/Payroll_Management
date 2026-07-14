import { useEffect, useState, useCallback } from 'react';
import { getMyPermissionHistory, cancelPermission } from '../../services/permissionApi';
import LeaveStatusBadge from '../leave/LeaveStatusBadge';

export default function PermissionHistoryTable({ refreshKey }) {
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
    getMyPermissionHistory().then((res) => setRows(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this permission request?')) return;
    await cancelPermission(id);
    load();
  };

  return (
    <div className="table-responsive">
      <table className="table table-bordered mt-3">
        <thead>
          <tr>
            <th>Date</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Manager Remarks</th><th>HR Remarks</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.request_date}</td>
              <td>{r.from_time}</td>
              <td>{r.to_time}</td>
              <td>{r.reason}</td>
              <td><LeaveStatusBadge status={r.status} isLop={false} /></td>
              <td>{r.manager_comments || '-'}</td>
              <td>{r.hr_comments || '-'}</td>
              <td>
                {r.status === 'Pending' && (
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(r.id)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan="8" className="text-center">No permission requests yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}