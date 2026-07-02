import React, { useEffect, useState } from 'react';
import employeeService from '../../services/employeeService';

export default function StatusChangeHistoryTab() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    employeeService.getStatusChangeHistory().then((res) => { if (res.success) setHistory(res.data); });
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
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Date</th><th>Employee Code</th><th>Employee Name</th><th>Previous Status</th>
                <th>New Status</th><th>Last Working Date</th><th>Inactive Date</th><th>Reason</th><th>Changed By</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan="9" className="text-center">No status changes found</td></tr>}
              {history.map((c, idx) => (
                <tr key={idx}>
                  <td>{c.change_date}</td>
                  <td>{c.employee_code}</td>
                  <td>{c.employee_name}</td>
                  <td>{badge(c.previous_status)}</td>
                  <td>{badge(c.new_status)}</td>
                  <td>{c.last_working_date ? <span className="badge bg-warning">{c.last_working_date}</span> : '-'}</td>
                  <td>{c.inactive_date ? <span className="badge bg-danger">{c.inactive_date}</span> : '-'}</td>
                  <td>{c.change_reason || '-'}</td>
                  <td>{c.changed_by_name || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
