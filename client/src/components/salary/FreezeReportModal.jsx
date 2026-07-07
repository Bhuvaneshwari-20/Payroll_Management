import { useState } from 'react';
import Swal from 'sweetalert2';
import { freezeReport } from '../../services/salaryApi';

export default function FreezeReportModal({ show, onClose, fromDate, toDate, employeeCount, reportPayload, onFrozen }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      Swal.fire('Error', 'Please enter a report name', 'error');
      return;
    }
    setLoading(true);
    try {
      await freezeReport(name.trim(), fromDate, toDate, reportPayload);
      Swal.fire('Success', 'Report saved!', 'success');
      onFrozen?.();
      onClose();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to save report', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title"><i className="fas fa-lock me-2"></i>Freeze Salary Report</h5>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>Enter a name to save this salary report permanently:</p>
            <div className="mb-3">
              <label className="form-label">Report Name <span className="text-danger">*</span></label>
              <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., February 2025 Payroll" />
            </div>
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              <strong>Date Range:</strong> {fromDate} to {toDate}<br />
              <strong>Total Employees:</strong> {employeeCount}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-success" disabled={loading} onClick={handleSave}>
              <i className="fas fa-save me-2"></i>{loading ? 'Saving...' : 'Save Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}