import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  fetchDepartments,
  fetchDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../services/departmentService';
import './Departments.css';

const EMPTY_FORM = { name: '', description: '', status: 'active' };

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    try {
      const res = await fetchDepartments();
      if (res.success) {
        setDepartments(res.data || []);
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to load departments', 'error');
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
      const res = await fetchDepartment(id);
      if (res.success) {
        const d = res.data;
        setEditingId(d.id);
        setForm({ name: d.name, description: d.description || '', status: d.status });
        setErrors({});
        setShowModal(true);
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to load department details', 'error');
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
    if (!form.name.trim()) errs.name = 'Please enter department name';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    try {
      const res = editingId
        ? await updateDepartment(editingId, form)
        : await createDepartment(form);

      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 1800, showConfirmButton: false });
        closeModal();
        loadDepartments();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', editingId ? 'Failed to update department' : 'Failed to save department', 'error');
    }
  }

  async function handleDelete(id) {
    const result = await Swal.fire({
      title: 'Are you sure you want to delete this department?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await deleteDepartment(id);
      if (res.success) {
        Swal.fire('Deleted!', res.message, 'success');
        loadDepartments();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to delete department', 'error');
    }
  }

  return (
    <div className="kr-page-container">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="kr-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="#/dashboard"><i className="fas fa-home"></i></a></li>
          <li className="breadcrumb-item active">Department Management</li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="kr-page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="kr-page-title">Department Management</h1>
            <p className="kr-page-subtitle">Manage your organization's departments</p>
          </div>
          <button type="button" className="btn-primary" onClick={openAddModal}>
            <i className="fas fa-plus-circle me-2"></i>Add Department
          </button>
        </div>
      </div>

      {/* Department List Card */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-building me-2"></i>Departments</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table" id="departmentsTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept, index) => (
                  <tr key={dept.id}>
                    <td>{index + 1}</td>
                    <td><div className="fw-bold">{dept.name}</div></td>
                    <td>{dept.description || '-'}</td>
                    <td>
                      {dept.status === 'active' ? (
                        <span className="kr-badge kr-badge-active">Active</span>
                      ) : (
                        <span className="kr-badge kr-badge-inactive">Inactive</span>
                      )}
                    </td>
                    <td>{dept.created_at}</td>
                    <td>
                      <button className="btn btn-sm kr-action-btn-edit" title="Edit" onClick={() => openEditModal(dept.id)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn btn-sm kr-action-btn-delete" title="Delete" onClick={() => handleDelete(dept.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted">No departments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Department Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-building me-2"></i>
                  <span>{editingId ? 'Edit Department' : 'Add Department'}</span>
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-4">
                    <label htmlFor="departmentName" className="form-label">Department Name</label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      id="departmentName"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="departmentDesc" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="departmentDesc"
                      rows="3"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="departmentStatus" className="form-label">Status</label>
                    <select
                      className="form-select"
                      id="departmentStatus"
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
                  <button type="submit" className="btn-primary">Save Department</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}