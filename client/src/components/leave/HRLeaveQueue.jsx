import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getHRQueue, hrAction } from '../../services/leaveApi';
import DataTable from '../common/DataTable';

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
    { key: 'manager_name', label: 'Manager' },
    {
      key: 'manager_comments',
      label: 'Manager Remarks',
      render: (r) => r.manager_comments || '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (r) => (
        <>
          <button className="btn btn-sm btn-success me-2" onClick={() => act(r.id, 'approve')}>Approve</button>
          <button className="btn btn-sm btn-danger" onClick={() => act(r.id, 'reject')}>Reject (LOP)</button>
        </>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search forwarded requests..."
      emptyMessage="No forwarded requests"
      rowKey={(row) => row.id}
    />
  );
}