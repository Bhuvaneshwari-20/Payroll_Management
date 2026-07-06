import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getHRQueue, hrAction } from '../../services/leaveApi';

export default function HRLeaveQueue({ category }) {
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
    getHRQueue(category).then((res) => setRows(res.data.data)).catch(() => {});
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    const { value: comments } = await Swal.fire({
      title: action === 'approve' ? 'Approve this leave?' : 'Reject (mark Loss of Pay)?',
      input: 'textarea',
      inputLabel: 'Comments (optional)',
      showCancelButton: true,
      confirmButtonColor: action === 'reject' ? '#dc3545' : '#198754',
    });
    if (comments === undefined) return;
    await hrAction(id, action, comments);
    load();
  };

  return (
    <table className="table table-bordered mt-3">
      <thead>
        <tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Manager</th><th>Manager Remarks</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.employee_name} ({r.employee_code})</td>
            <td>{r.leave_type_name}</td>
            <td>{r.start_date}</td>
            <td>{r.end_date}</td>
            <td>{r.days}</td>
            <td>{r.manager_name}</td>
            <td>{r.manager_comments || '-'}</td>
            <td>
              <button className="btn btn-sm btn-success me-2" onClick={() => act(r.id, 'approve')}>Approve</button>
              <button className="btn btn-sm btn-danger" onClick={() => act(r.id, 'reject')}>Reject (LOP)</button>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan="8" className="text-center">No forwarded requests</td></tr>}
      </tbody>
    </table>
  );
}