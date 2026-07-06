import React, { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import employeeService from '../../services/employeeService';

export default function BulkUploadTab({ onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [failed, setFailed] = useState(false);
  const [rowErrors, setRowErrors] = useState([]);
  const fileInputRef = useRef(null);

  const doUpload = async (file) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      Swal.fire('Error', 'Please upload Excel/CSV file', 'error');
      return;
    }
    setShowProgress(true);
    setFailed(false);
    setProgress(0);
    setRowErrors([]);
    setStatus('Uploading...');
    try {
      const res = await employeeService.uploadBulkEmployees(file, (pct) => setProgress(pct));
      if (res.success) {
        setStatus(res.message);
        if (res.data?.errors?.length) setRowErrors(res.data.errors);
        Swal.fire(
          res.data?.errors?.length ? 'Completed with some errors' : 'Success',
          res.message,
          res.data?.errors?.length ? 'warning' : 'success'
        );
        setTimeout(() => {
          setShowProgress(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          onUploaded && onUploaded();
        }, 2500);
      } else {
        setFailed(true);
        setStatus('Failed: ' + res.message);
        Swal.fire('Error', res.message, 'error');
      }
    } catch (e) {
      setFailed(true);
      setStatus('Upload failed');
      Swal.fire('Error', 'Upload failed', 'error');
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) doUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  };

  return (
    <div className="row">
      <div className="col-12 mb-3">
        <div className="alert alert-info">
          <strong>Instructions:</strong> Download template → Fill in employee details (red columns are
          required, blue are optional) → Department and Role must match names exactly as they exist in
          the system → Enter <strong>Total Gross Salary</strong> only, it auto-splits into
          Basic/HRA/Medical/Conveyance the same way the Add Employee form does → Upload. Employee Code
          is auto-generated, don't include it.
        </div>
      </div>

      <div className="col-md-6 mb-3">
        <div className="card">
          <div className="card-body text-center">
            <i className="fas fa-download fa-3x text-primary mb-3"></i>
            <h5>Download Template</h5>
            <a className="btn btn-primary w-100" href={employeeService.downloadEmployeeTemplate()}>
              <i className="fas fa-file-excel me-2"></i>Download
            </a>
          </div>
        </div>
      </div>
      <div className="col-md-6 mb-3">
        <div className="card">
          <div className="card-body">
            <div
              className={`upload-area ${dragOver ? 'dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={onDrop}
            >
              <i className="fas fa-cloud-upload-alt fa-3x mb-3"></i>
              <h5>Upload File</h5>
              <input ref={fileInputRef} type="file" className="d-none" id="bulkEmployeeFile" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
              <button className="btn btn-outline-primary" onClick={() => fileInputRef.current.click()}>Browse</button>
            </div>
          </div>
        </div>
      </div>

      {showProgress && (
        <div className="col-12">
          <div className="progress mb-2" style={{ height: 25 }}>
            <div
              className={`progress-bar progress-bar-striped progress-bar-animated ${failed ? 'bg-danger' : 'bg-success'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center">{status}</p>
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="col-12">
          <div className="alert alert-warning">
            <strong>{rowErrors.length} row(s) had issues:</strong>
            <ul className="mb-0 mt-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {rowErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}