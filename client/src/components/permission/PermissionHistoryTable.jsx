import { useEffect, useState, useCallback } from 'react';
import { getMyPermissionHistory, cancelPermission } from '../../services/permissionApi';
import LeaveStatusBadge from '../leave/LeaveStatusBadge';
import DataTable from '../common/DataTable';

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

  const columns = [
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
      searchPlaceholder="Search permission history..."
      emptyMessage="No permission requests yet"
      rowKey={(row) => row.id}
    />
  );
}