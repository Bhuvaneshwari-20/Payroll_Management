import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { fetchRoles, fetchRole, createRole, updateRole, deleteRole } from '../services/roleService';
import { fetchDepartments } from '../services/departmentService';

const EMPTY_FORM = { name: '', department_id: '', description: '', status: 'active' };

// ---------------------------------------------------------------------------
// Styles were previously in a separate Departments.css (shared with
// Departments.jsx) with hardcoded light-mode colors, so the card/table/modal
// text stayed dark on a dark background whenever dark mode was on. Now
// embedded here, using the --vb-* theme variables (defined in Topbar.jsx) so
// everything follows the active theme, same pattern as Dashboard.jsx.
// ---------------------------------------------------------------------------
const kr_page_styles = `
  /* ---------- Breadcrumb ---------- */
  .kr-breadcrumb { margin-bottom: 1rem; }
  .kr-breadcrumb .breadcrumb { margin-bottom: 0; font-size: 0.9rem; }
  .kr-breadcrumb .breadcrumb-item.active { color: #a4133c; font-weight: 500; }
  .kr-breadcrumb .breadcrumb-item a { color: var(--vb-text-muted, #6b7280); text-decoration: none; }

  /* ---------- Page header ---------- */
  .kr-page-header { margin-bottom: 1.5rem; }
  .kr-page-title { font-size: 1.6rem; font-weight: 700; color: var(--vb-text, #1e293b); margin-bottom: 0.15rem; }
  .kr-page-subtitle { color: var(--vb-text-muted, #64748b); margin-bottom: 0; }

  /* ---------- Buttons ---------- */
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

  /* ---------- Card ---------- */
  .kr-page-container .card {
    border: none;
    border-radius: 14px;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
    background: var(--vb-bg-surface, #fff);
    transition: background 0.3s ease;
  }
  .kr-page-container .card-header {
    background: linear-gradient(90deg, var(--vb-bg-surface-2, #fdf2f4), var(--vb-bg-surface, #ffffff));
    border-bottom: 1px solid var(--vb-border, #f1f1f1);
    border-radius: 14px 14px 0 0 !important;
    font-weight: 600;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .card-body { color: var(--vb-text, #1e293b); }

  /* ---------- Table ---------- */
  .kr-page-container .table {
    color: var(--vb-text, #1e293b);
    margin-bottom: 0;
  }
  .kr-page-container .table thead th {
    color: var(--vb-text-muted, #64748b);
    border-bottom: 2px solid var(--vb-border, #e6e8ec);
    font-weight: 600;
  }
  .kr-page-container .table td {
    border-color: var(--vb-border, #e6e8ec);
    vertical-align: middle;
  }
  .kr-page-container .table > :not(caption) > * > * {
    background-color: transparent;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table-hover > tbody > tr:hover > * {
    background-color: var(--vb-bg-surface-2, #f8f9fc);
  }
  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  /* ---------- Status badges ---------- */
  .kr-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .kr-badge-active { background: #dcfce7; color: #15803d; }
  .kr-badge-inactive { background: #fee2e2; color: #b91c1c; }

  /* ---------- Department badge (Roles table) ---------- */
  .kr-department-badge { background: #eef1ff; color: #4338ca; font-weight: 600; padding: 5px 10px; }

  /* ---------- Action buttons ---------- */
  .kr-action-btn-edit { background: #e0e7ff; color: #4338ca; border: none; border-radius: 6px; width: 32px; height: 32px; }
  .kr-action-btn-edit:hover { background: #c7d2fe; }
  .kr-action-btn-delete { background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; width: 32px; height: 32px; }
  .kr-action-btn-delete:hover { background: #fecaca; }

  /* ---------- Modal ---------- */
  .kr-page-container .modal-content {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .modal-header,
  .kr-page-container .modal-footer {
    border-color: var(--vb-border, #e6e8ec);
  }
  .kr-page-container .modal-title { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-label { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-control,
  .kr-page-container .form-select {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #ced4da);
  }
  .kr-page-container .form-control:focus,
  .kr-page-container .form-select:focus {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .form-control::placeholder { color: var(--vb-text-muted, #94a3b8); }
  :root[data-theme='dark'] .kr-page-container .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
`;

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadRoles();
    loadDepartmentsForSelect();
  }, []);

  async function loadRoles() {
    try {
      const res = await fetchRoles();
      if (res.success) {
        setRoles(res.data || []);
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to load roles', 'error');
    }
  }

  async function loadDepartmentsForSelect() {
    try {
      const res = await fetchDepartments();
      if (res.success) setDepartments(res.data || []);
    } catch {
      /* silent — same as PHP, select just stays empty */
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowModal(true);
  }

  async function openEditModal(id) {
    try {
      const res = await fetchRole(id);
      if (res.success) {
        const r = res.data;
        setEditingId(r.id);
        setForm({
          name: r.name,
          department_id: r.department_id || '',
          description: r.description || '',
          status: r.status,
        });
        setErrors({});
        setShowModal(true);
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to load role details', 'error');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please enter role name';
    if (!form.department_id) errs.department_id = 'Please select a department';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    try {
      const res = editingId ? await updateRole(editingId, form) : await createRole(form);

      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 1800, showConfirmButton: false });
        closeModal();
        loadRoles();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', editingId ? 'Failed to update role' : 'Failed to save role', 'error');
    }
  }

  async function handleDelete(id) {
    const result = await Swal.fire({
      title: 'Are you sure you want to delete this role?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await deleteRole(id);
      if (res.success) {
        Swal.fire('Deleted!', res.message, 'success');
        loadRoles();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to delete role', 'error');
    }
  }

  return (
    <div className="kr-page-container">
      <style>{kr_page_styles}</style>

      {/* <nav aria-label="breadcrumb" className="kr-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="#/dashboard"><i className="fas fa-home"></i></a></li>
          <li className="breadcrumb-item active">Role Management</li>
        </ol>
      </nav> */}

      <div className="kr-page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="kr-page-title">Role Management</h1>
            <p className="kr-page-subtitle">Manage employee roles and responsibilities</p>
          </div>
          <button type="button" className="btn-primary" onClick={openAddModal}>
            <i className="fas fa-plus-circle me-2"></i>Add Role
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-user-tag me-2"></i>Roles</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table" id="rolesTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Role Name</th>
                  <th>Department</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role, index) => (
                  <tr key={role.id}>
                    <td>{index + 1}</td>
                    <td><div className="fw-bold">{role.name}</div></td>
                    <td><span className="badge kr-department-badge">{role.department_name}</span></td>
                    <td>{role.description || '-'}</td>
                    <td>
                      {role.status === 'active' ? (
                        <span className="kr-badge kr-badge-active">Active</span>
                      ) : (
                        <span className="kr-badge kr-badge-inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm kr-action-btn-edit me-1" title="Edit" onClick={() => openEditModal(role.id)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn btn-sm kr-action-btn-delete" title="Delete" onClick={() => handleDelete(role.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {roles.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted">No roles found</td></tr>
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
                  <i className="fas fa-user-tag me-2"></i>
                  <span>{editingId ? 'Edit Role' : 'Add Role'}</span>
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-4">
                    <label htmlFor="roleName" className="form-label">Role Name</label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      id="roleName"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="roleDepartment" className="form-label">Department</label>
                    <select
                      className={`form-select ${errors.department_id ? 'is-invalid' : ''}`}
                      id="roleDepartment"
                      value={form.department_id}
                      onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    {errors.department_id && <div className="invalid-feedback">{errors.department_id}</div>}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="roleDesc" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="roleDesc"
                      rows="3"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="roleStatus" className="form-label">Status</label>
                    <select
                      className="form-select"
                      id="roleStatus"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Role</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}