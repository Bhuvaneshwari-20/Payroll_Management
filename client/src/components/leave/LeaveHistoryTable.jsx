import { useEffect, useState, useCallback } from 'react';
import { getMyHistory, cancelLeave } from '../../services/leaveApi';
import LeaveStatusBadge from './LeaveStatusBadge';
import DataTable from '../common/DataTable';

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

  const columns = [
    { key: 'leave_type_name', label: 'Type' },
    { key: 'start_date', label: 'From' },
    { key: 'end_date', label: 'To' },
    { key: 'days', label: 'Days' },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (r) => <LeaveStatusBadge status={r.status} isLop={!!r.is_lop} />,
    },
    {
      key: 'manager_comments',
      label: 'Manager Remarks',
      render: (r) => r.manager_comments || '-',
    },
    {
      key: 'hr_comments',
      label: 'HR Remarks',
      render: (r) => r.hr_comments || '-',
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (r) =>
        r.status === 'Pending' ? (
          <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(r.id)}>Cancel</button>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search leave history..."
      emptyMessage="No requests yet"
      rowKey={(row) => row.id}
    />
  );
}