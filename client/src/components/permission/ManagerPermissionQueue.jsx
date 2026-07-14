import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getPermissionManagerQueue, permissionManagerAction } from '../../services/permissionApi';
import LeaveStatusBadge from '../leave/LeaveStatusBadge';
import DataTable from '../common/DataTable';

export default function ManagerPermissionQueue() {
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
    getPermissionManagerQueue().then((res) => setRows(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Manager can only Forward (to HR) or Reject (final) — never Approve
  // directly, same rule as Leave.
  const act = async (id, action) => {
    const { value: comments } = await Swal.fire({
      title: action === 'forward' ? 'Forward to HR?' : 'Reject this permission?',
      input: 'textarea',
      inputLabel: 'Comments (optional)',
      showCancelButton: true,
      confirmButtonColor: action === 'reject' ? '#dc3545' : '#198754',
    });
    if (comments === undefined) return;
    await permissionManagerAction(id, action, comments);
    load();
  };

  const columns = [
    {
      key: 'employee_name',
      label: 'Employee',
      render: (r) => `${r.employee_name} (${r.employee_code})`,
    },
    { key: 'request_date', label: 'Date' },
    { key: 'from_time', label: 'From' },
    { key: 'to_time', label: 'To' },
    { key: 'reason', label: 'Reason' },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (r) => <LeaveStatusBadge status={r.status} isLop={false} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (r) =>
        r.status === 'Pending' ? (
          <>
            <button className="btn btn-sm btn-success me-2" onClick={() => act(r.id, 'forward')}>Forward to HR</button>
            <button className="btn btn-sm btn-danger" onClick={() => act(r.id, 'reject')}>Reject</button>
          </>
        ) : (
          <span className="text-muted small">{r.manager_comments || '—'}</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search permission requests..."
      emptyMessage="No permission requests yet"
      rowKey={(row) => row.id}
    />
  );
}