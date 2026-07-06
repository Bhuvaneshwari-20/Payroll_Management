import { useEffect, useState, useCallback } from 'react';
import { getMyHistory, cancelLeave } from '../../services/leaveApi';
import LeaveStatusBadge from './LeaveStatusBadge';

export default function LeaveHistoryTable({ category, refreshKey }) {
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
    getMyHistory(category).then((res) => setRows(res.data.data)).catch(() => {});
  }, [category]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    await cancelLeave(id);
    load();
  };

  return (
    <table className="table table-bordered mt-3">
      <thead>
        <tr>
          <th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Manager Remarks</th><th>HR Remarks</th><th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.leave_type_name}</td>
            <td>{r.start_date}</td>
            <td>{r.end_date}</td>
            <td>{r.days}</td>
            <td><LeaveStatusBadge status={r.status} isLop={!!r.is_lop} /></td>
            <td>{r.manager_comments || '-'}</td>
            <td>{r.hr_comments || '-'}</td>
            <td>
              {r.status === 'Pending' && (
                <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(r.id)}>Cancel</button>
              )}
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan="8" className="text-center">No requests yet</td></tr>}
      </tbody>
    </table>
  );
}