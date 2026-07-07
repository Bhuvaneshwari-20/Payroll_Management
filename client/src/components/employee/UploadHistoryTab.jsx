import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import employeeService, { FILE_BASE } from '../../services/employeeService';
import DataTable from '../common/DataTable';

export default function UploadHistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    employeeService.getUploadHistory()
      .then((res) => { if (res.success) setHistory(res.data); })
      .finally(() => setLoading(false));
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
        {loading ? (
          <div className="text-center py-3">Loading...</div>
        ) : (
          <DataTable
            data={history}
            rowKey={(row, i) => row.id ?? i}
            searchPlaceholder="Search uploads..."
            emptyMessage="No upload history"
            columns={[
              { key: 'upload_date', label: 'Date & Time' },
              { key: 'upload_type', label: 'Upload Type', render: (h) => <span className="badge bg-info">{h.upload_type}</span> },
              { key: 'file_name', label: 'File Name' },
              { key: 'records_count', label: 'Records' },
              { key: 'success_count', label: 'Success', render: (h) => <span className="text-success">{h.success_count}</span> },
              { key: 'error_count', label: 'Errors', render: (h) => <span className="text-danger">{h.error_count}</span> },
              {
                key: 'status', label: 'Status',
                render: (h) => h.status === 'completed'
                  ? <span className="badge bg-success">Completed</span>
                  : <span className="badge bg-warning">Partial</span>,
              },
              { key: 'uploaded_by_name', label: 'Uploaded By', render: (h) => h.uploaded_by_name || 'System' },
              {
                key: 'actions', label: 'Actions', sortable: false,
                render: (h) => (
                  <button className="btn btn-sm btn-primary" onClick={() => downloadFile(h.file_path, h.file_name)}>
                    <i className="fas fa-download"></i>
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}