import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  fetchLeaveTypes,
  createLeaveType,
  updateLeaveType,
  setLeaveTypeStatus,
  deleteLeaveType,
} from '../services/leaveTypeService.js';

const EMPTY_FORM = { name: '', code: '', description: '', max_days_per_year: '' };

// Same theme-override pattern as Departments.jsx / Roles.jsx.
const kr_page_styles = `
  .kr-page-header { margin-bottom: 1.5rem; }
  .kr-page-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .kr-page-title { font-size: 1.6rem; font-weight: 700; color: var(--vb-text, #1e293b); margin-bottom: 0.15rem; }
  .kr-page-subtitle { color: var(--vb-text-muted, #64748b); margin-bottom: 0; }

  .btn-primary {
    background: linear-gradient(135deg, #7b0d2e, #a4133c);
    border: none;
    color: #fff;
    padding: 0.55rem 1.2rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
  }
  .btn-primary:hover { background: linear-gradient(135deg, #650a26, #8f1035); color: #fff; }
  .btn-secondary {
    background: var(--vb-bg-surface-2, #f1f5f9);
    border: 1px solid var(--vb-border, #e2e8f0);
    color: var(--vb-text, #475569);
    padding: 0.55rem 1.2rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
  }
  .btn-secondary:hover { background: var(--vb-border, #e2e8f0); }

  .kr-page-container .card {
    border: none;
    border-radius: 14px;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
    background: var(--vb-bg-surface, #fff);
  }
  .kr-page-container .card-header {
    background: linear-gradient(90deg, var(--vb-bg-surface-2, #fdf2f4), var(--vb-bg-surface, #ffffff));
    border-bottom: 1px solid var(--vb-border, #f1f1f1);
    border-radius: 14px 14px 0 0 !important;
    font-weight: 600;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .card-body { color: var(--vb-text, #1e293b); }

  .kr-page-container .table { color: var(--vb-text, #1e293b); margin-bottom: 0; }
  .kr-page-container .table thead th {
    color: var(--vb-text-muted, #64748b);
    border-bottom: 2px solid var(--vb-border, #e6e8ec);
    font-weight: 600;
  }
  .kr-page-container .table td { border-color: var(--vb-border, #e6e8ec); vertical-align: middle; }
  .kr-page-container .table > :not(caption) > * > * { background-color: transparent; color: var(--vb-text, #1e293b); }
  .kr-page-container .table-hover > tbody > tr:hover > * { background-color: var(--vb-bg-surface-2, #f8f9fc); }
  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  .kr-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .kr-badge-active { background: #dcfce7; color: #15803d; }
  .kr-badge-inactive { background: #fee2e2; color: #b91c1c; }
  .kr-code-badge { background: #eef1ff; color: #4338ca; font-weight: 700; padding: 5px 10px; letter-spacing: 0.5px; }

  .kr-action-btn-edit { background: #e0e7ff; color: #4338ca; border: none; border-radius: 6px; width: 32px; height: 32px; }
  .kr-action-btn-edit:hover { background: #c7d2fe; }
  .kr-action-btn-delete { background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; width: 32px; height: 32px; }
  .kr-action-btn-delete:hover { background: #fecaca; }
  .kr-action-btn-toggle { background: #fef9c3; color: #854d0e; border: none; border-radius: 6px; width: 32px; height: 32px; }
  .kr-action-btn-toggle:hover { background: #fef08a; }

  .kr-page-container .modal-content { background: var(--vb-bg-surface, #fff); color: var(--vb-text, #1e293b); }
  .kr-page-container .modal-header, .kr-page-container .modal-footer { border-color: var(--vb-border, #e6e8ec); }
  .kr-page-container .modal-title { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-label { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-control, .kr-page-container .form-select {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #ced4da);
  }
  .kr-page-container .form-control::placeholder { color: var(--vb-text-muted, #94a3b8); }
  .kr-page-container .form-text { color: var(--vb-text-muted, #64748b); }

  @media (max-width: 768px) {
    .kr-page-header-row { flex-direction: column; align-items: stretch; }
    .kr-page-header-row .btn-primary { width: 100%; }
    .kr-page-title { font-size: 1.3rem; }
    .kr-page-container .table { font-size: 0.82rem; }
    .kr-page-container .table thead th, .kr-page-container .table td { padding: 0.55rem 0.5rem; white-space: nowrap; }
  }
`;

export default function LeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetchLeaveTypes(true); // HR sees inactive too, to re-enable them
      if (res.success) {
        setLeaveTypes(res.data || []);
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to load leave types', 'error');
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowModal(true);
  }

  function openEditModal(lt) {
    setEditingId(lt.id);
    setForm({
      name: lt.name,
      code: lt.code,
      description: lt.description || '',
      max_days_per_year: lt.max_days_per_year ?? '',
    });
    setErrors({});
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please enter a leave name';
    if (!form.code.trim()) errs.code = 'Please enter a leave code';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      max_days_per_year: form.max_days_per_year === '' ? null : Number(form.max_days_per_year),
    };

    try {
      const res = editingId
        ? await updateLeaveType(editingId, payload)
        : await createLeaveType(payload);

      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 1800, showConfirmButton: false });
        closeModal();
        load();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', editingId ? 'Failed to update leave type' : 'Failed to add leave type', 'error');
    }
  }

  async function handleToggleStatus(lt) {
    const nextStatus = lt.status === 'active' ? 'inactive' : 'active';
    const result = await Swal.fire({
      title: nextStatus === 'inactive' ? 'Disable this leave type?' : 'Enable this leave type?',
      text: nextStatus === 'inactive'
        ? 'It will stop appearing in Attendance and Leave Request dropdowns for new entries.'
        : 'It will become available again everywhere leave types are used.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${nextStatus === 'inactive' ? 'disable' : 'enable'} it`,
    });
    if (!result.isConfirmed) return;

    try {
      const res = await setLeaveTypeStatus(lt.id, nextStatus);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Updated', text: res.message, timer: 1500, showConfirmButton: false });
        load();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to update status', 'error');
    }
  }

  async function handleDelete(id) {
    const result = await Swal.fire({
      title: 'Are you sure you want to delete this leave type?',
      text: 'Only possible if it has no policy or leave history yet.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await deleteLeaveType(id);
      if (res.success) {
        Swal.fire('Deleted!', res.message, 'success');
        load();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to delete leave type', 'error');
    }
  }

  return (
    <div className="kr-page-container">
      <style>{kr_page_styles}</style>

      <div className="kr-page-header">
        <div className="kr-page-header-row">
          <div>
            <h1 className="kr-page-title">Leave Types</h1>
            <p className="kr-page-subtitle">Define the leave types your organization uses — no code changes needed to add new ones</p>
          </div>
          <button type="button" className="btn-primary" onClick={openAddModal}>
            <i className="fas fa-plus-circle me-2"></i>Add Leave Type
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-calendar-alt me-2"></i>Leave Types</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Leave Name</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Max Days/Year</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((lt, index) => (
                  <tr key={lt.id}>
                    <td>{index + 1}</td>
                    <td><div className="fw-bold">{lt.name}</div></td>
                    <td><span className="badge kr-code-badge">{lt.code}</span></td>
                    <td>{lt.description || '-'}</td>
                    <td>{lt.max_days_per_year ?? '-'}</td>
                    <td>
                      {lt.status === 'active' ? (
                        <span className="kr-badge kr-badge-active">Active</span>
                      ) : (
                        <span className="kr-badge kr-badge-inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm kr-action-btn-edit" title="Edit" onClick={() => openEditModal(lt)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn btn-sm kr-action-btn-toggle"
                          title={lt.status === 'active' ? 'Disable' : 'Enable'}
                          onClick={() => handleToggleStatus(lt)}
                        >
                          <i className={`fas ${lt.status === 'active' ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                        </button>
                        <button className="btn btn-sm kr-action-btn-delete" title="Delete" onClick={() => handleDelete(lt.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {leaveTypes.length === 0 && (
                  <tr><td colSpan="7" className="text-center text-muted">No leave types found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-alt me-2"></i>
                  <span>{editingId ? 'Edit Leave Type' : 'Add Leave Type'}</span>
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-4">
                    <label htmlFor="leaveName" className="form-label">Leave Name</label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      id="leaveName"
                      placeholder="e.g. Casual Leave"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="leaveCode" className="form-label">Leave Code</label>
                    <input
                      type="text"
                      className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                      id="leaveCode"
                      placeholder="e.g. CL"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      maxLength={20}
                      required
                    />
                    {errors.code && <div className="invalid-feedback">{errors.code}</div>}
                    <div className="form-text">Short unique code, shown in Attendance and reports once wired up.</div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="leaveDesc" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="leaveDesc"
                      rows="3"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="mb-2">
                    <label htmlFor="leaveMaxDays" className="form-label">Max Days/Year (optional)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="form-control"
                      id="leaveMaxDays"
                      placeholder="Leave blank for unlimited"
                      value={form.max_days_per_year}
                      onChange={(e) => setForm({ ...form, max_days_per_year: e.target.value })}
                    />
                    <div className="form-text">
                      Simple legacy cap. For full control (period, carry-forward, reset cycle), configure it
                      on the Leave Policy screen after saving.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Leave Type</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}