import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import employeeService, { FILE_BASE } from '../../services/employeeService';

export default function UploadHistoryTab() {
  const [history, setHistory] = useState([]);

  const load = () => {
    employeeService.getUploadHistory().then((res) => { if (res.success) setHistory(res.data); });
  };

  useEffect(() => { load(); }, []);

  const downloadFile = (filepath, filename) => {
    const link = document.createElement('a');
    link.href = `${FILE_BASE}/uploads/${filepath}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearHistory = async () => {
    const result = await Swal.fire({
      title: 'Clear Upload History?',
      text: 'This will remove all upload records. Files will remain in storage.',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, clear it!',
    });
    if (!result.isConfirmed) return;
    const res = await employeeService.clearUploadHistory();
    if (res.success) { Swal.fire('Cleared!', res.message, 'success'); load(); }
    else Swal.fire('Error', res.message, 'error');
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0"><i className="fas fa-history me-2"></i>Bulk Upload History</h6>
        <button className="btn btn-sm btn-danger" onClick={clearHistory}><i className="fas fa-trash me-2"></i>Clear History</button>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover" width="100%">
            <thead>
              <tr>
                <th>Date & Time</th><th>Upload Type</th><th>File Name</th><th>Records</th>
                <th>Success</th><th>Errors</th><th>Status</th><th>Uploaded By</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan="9" className="text-center">No upload history</td></tr>}
              {history.map((h, idx) => (
                <tr key={idx}>
                  <td>{h.upload_date}</td>
                  <td><span className="badge bg-info">{h.upload_type}</span></td>
                  <td>{h.file_name}</td>
                  <td>{h.records_count}</td>
                  <td><span className="text-success">{h.success_count}</span></td>
                  <td><span className="text-danger">{h.error_count}</span></td>
                  <td>{h.status === 'completed'
                    ? <span className="badge bg-success">Completed</span>
                    : <span className="badge bg-warning">Partial</span>}</td>
                  <td>{h.uploaded_by_name || 'System'}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => downloadFile(h.file_path, h.file_name)}>
                      <i className="fas fa-download"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
