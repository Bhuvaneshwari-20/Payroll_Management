import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { fetchRoles, fetchRole, createRole, updateRole, deleteRole } from '../services/roleService';
import { fetchDepartments } from '../services/departmentService';
import './Departments.css';

const EMPTY_FORM = { name: '', department_id: '', description: '', status: 'active' };

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
      <nav aria-label="breadcrumb" className="kr-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="#/dashboard"><i className="fas fa-home"></i></a></li>
          <li className="breadcrumb-item active">Role Management</li>
        </ol>
      </nav>

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