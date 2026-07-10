import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getEmployeePasswords, resetEmployeePassword } from '../services/passwordApi';

export default function PasswordReset() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(new Set()); // employee ids currently showing plaintext password

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await getEmployeePasswords();
      if (res.data.success) setEmployees(res.data.data);
      else Swal.fire('Error', res.data.message, 'error');
    } catch (err) {
      Swal.fire('Error', 'Failed to load employee passwords', 'error');
    } finally {
      setLoading(false);
    }
  }

  function toggleVisible(id) {
    setVisible((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleReset(emp) {
    const result = await Swal.fire({
      title: 'Reset Password?',
      html: `
        <div class="text-start mt-2">
          <table class="table table-sm table-bordered">
            <tr><th width="45%">Employee</th><td><strong>${emp.first_name} ${emp.last_name}</strong></td></tr>
            <tr><th>Employee Code</th><td><span class="badge bg-primary">${emp.employee_code}</span></td></tr>
            <tr><th>New Password</th><td><span class="badge bg-warning text-dark font-monospace fs-6">${emp.employee_code}</span></td></tr>
          </table>
          <div class="alert alert-info py-2 mb-0">
            <i class="fas fa-info-circle me-1"></i>
            Password will be reset to the <strong>Employee Code</strong>.
          </div>
        </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f0ad4e',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fas fa-redo me-1"></i>Yes, Reset',
      cancelButtonText: 'Cancel',
      width: 460,
    });
    if (!result.isConfirmed) return;

    Swal.fire({ title: 'Resetting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await resetEmployeePassword(emp.id);
      if (res.data.success) {
        await Swal.fire({
          title: 'Password Reset!',
          html: `Password has been reset to <strong class="font-monospace">${emp.employee_code}</strong> successfully.`,
          icon: 'success',
        });
        load();
      } else {
        Swal.fire('Failed', res.data.message || 'Could not reset password.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server error. Please try again.', 'error');
    }
  }

  const filtered = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.employee_code.toLowerCase().includes(q) ||
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4" id="kr-content">
      <div className="kr-page-container">
        <nav aria-label="breadcrumb" className="kr-breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="#"><i className="fas fa-home"></i></a></li>
            <li className="breadcrumb-item active">Password Reset</li>
          </ol>
        </nav>

        <div className="kr-page-header mb-4">
          <h1 className="kr-page-title">Employee Password Reset</h1>
          <p className="kr-page-subtitle mb-0">Reset employee passwords to their Employee Code</p>
        </div>

        <div className="card shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="fas fa-lock me-2 text-primary"></i>Employee Passwords</h5>
            <input
              className="form-control form-control-sm w-auto"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th width="60">S.No</th>
                      <th>Employee Code</th>
                      <th>Employee Name</th>
                      <th>Current Password</th>
                      <th width="100">Status</th>
                      <th width="120">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted py-4">No employees found</td></tr>
                    ) : (
                      filtered.map((emp, i) => (
                        <tr key={emp.id}>
                          <td className="text-center">{i + 1}</td>
                          <td><span className="badge bg-primary" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>{emp.employee_code}</span></td>
                          <td><div className="fw-semibold">{emp.first_name} {emp.last_name}</div></td>
                          <td>
                            {emp.pass ? (
                              <span className="d-inline-flex align-items-center gap-2">
                                <span className="font-monospace" style={{ fontSize: '0.9rem' }}>
                                  {visible.has(emp.id) ? emp.pass : <><i className="fas fa-asterisk fa-xs text-muted"></i> {emp.pass.substring(0, 2)}****</>}
                                </span>
                                <button className="btn btn-sm btn-link p-0 text-secondary" title="Show / Hide" onClick={() => toggleVisible(emp.id)}>
                                  <i className={`fas ${visible.has(emp.id) ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {emp.status === 'active'
                              ? <span className="badge bg-success">Active</span>
                              : <span className="badge bg-danger">Inactive</span>}
                          </td>
                          <td>
                            <button className="btn btn-sm btn-warning" onClick={() => handleReset(emp)} title="Reset Password">
                              <i className="fas fa-redo me-1"></i>Reset
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}