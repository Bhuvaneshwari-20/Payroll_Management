import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import employeeService, { FILE_BASE } from '../../services/employeeService';

export default function StatusHistoryTab() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    employeeService.getStatusHistory().then((res) => { if (res.success) setHistory(res.data); });
  }, []);

  const download = async () => {
    try {
      const res = await employeeService.exportStatusHistory();
      if (res.success && res.data.filepath) {
        const link = document.createElement('a');
        link.href = `${FILE_BASE}/${res.data.filepath}`;
        link.download = res.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Swal.fire('Success', 'File downloaded successfully!', 'success');
      } else {
        Swal.fire('Error', res.message || 'Failed to generate file', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Failed to download file', 'error');
    }
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0"><i className="fas fa-history me-2"></i>Status History</h6>
        <button className="btn btn-sm btn-success" onClick={download}><i className="fas fa-file-excel me-2"></i>Download</button>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr><th>Date</th><th>Employee</th><th>Action</th><th>Prev Status</th><th>New Status</th><th>Reason</th><th>By</th></tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan="7" className="text-center">No history found</td></tr>}
              {history.map((h, idx) => (
                <tr key={idx}>
                  <td>{h.action_date}</td>
                  <td>{h.employee_name}<br /><small>{h.employee_code}</small></td>
                  <td><span className="badge bg-primary">{h.action_type}</span></td>
                  <td>{h.previous_status || '-'}</td>
                  <td><span className={`badge bg-${h.new_status === 'active' ? 'success' : 'danger'}`}>{h.new_status}</span></td>
                  <td>{h.reason || '-'}</td>
                  <td>{h.action_by_name || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}