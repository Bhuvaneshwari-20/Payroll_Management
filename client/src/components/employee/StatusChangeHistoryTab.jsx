import React, { useEffect, useState } from 'react';
import employeeService from '../../services/employeeService';
import DataTable from '../common/DataTable';

export default function StatusChangeHistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    employeeService.getStatusChangeHistory()
      .then((res) => { if (res.success) setHistory(res.data); })
      .finally(() => setLoading(false));
  }, []);

  const badge = (status) => (
    <span className={`badge bg-${status === 'active' ? 'success' : 'danger'}`}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0"><i className="fas fa-exchange-alt me-2"></i>Employee Status Change History</h6>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-3">Loading...</div>
        ) : (
          <div className="table-responsive">
            <DataTable
              data={history}
              rowKey={(row, i) => row.id ?? i}
              searchPlaceholder="Search status changes..."
              emptyMessage="No status changes found"
              columns={[
                { key: 'change_date', label: 'Date' },
                { key: 'employee_code', label: 'Employee Code' },
                { key: 'employee_name', label: 'Employee Name' },
                { key: 'previous_status', label: 'Previous Status', render: (c) => badge(c.previous_status) },
                { key: 'new_status', label: 'New Status', render: (c) => badge(c.new_status) },
                {
                  key: 'last_working_date', label: 'Last Working Date',
                  render: (c) => c.last_working_date ? <span className="badge bg-warning">{c.last_working_date}</span> : '-',
                },
                {
                  key: 'inactive_date', label: 'Inactive Date',
                  render: (c) => c.inactive_date ? <span className="badge bg-danger">{c.inactive_date}</span> : '-',
                },
                { key: 'change_reason', label: 'Reason', render: (c) => c.change_reason || '-' },
                { key: 'changed_by_name', label: 'Changed By', render: (c) => c.changed_by_name || 'System' },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}