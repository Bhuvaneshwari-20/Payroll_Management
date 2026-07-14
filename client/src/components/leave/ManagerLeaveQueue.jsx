import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getManagerQueue, managerAction } from '../../services/leaveApi';
import LeaveStatusBadge from './LeaveStatusBadge';
import DataTable from '../common/DataTable';

export default function ManagerLeaveQueue({ category }) {
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
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

  const columns = [
    {
      key: 'employee_name',
      label: 'Employee',
      render: (r) => `${r.employee_name} (${r.employee_code})`,
    },
    { key: 'leave_type_name', label: 'Type' },
    { key: 'start_date', label: 'From' },
    { key: 'end_date', label: 'To' },
    { key: 'days', label: 'Days' },
    { key: 'reason', label: 'Reason' },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (r) => <LeaveStatusBadge status={r.status} isLop={!!r.is_lop} />,
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
      searchPlaceholder="Search team requests..."
      emptyMessage="No requests yet"
      rowKey={(row) => row.id}
    />
  );
}