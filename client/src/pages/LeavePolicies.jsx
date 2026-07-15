import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { fetchLeaveTypes } from '../services/leaveTypeService.js';
import {
  fetchLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  setLeavePolicyStatus,
  deleteLeavePolicy,
} from '../services/leavePolicyService';

const ALLOCATION_PERIODS = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'Unlimited'];
const UNITS = ['Days', 'Hours', 'Times'];
const RESET_CYCLES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'];

const EMPTY_DETAIL = () => ({
  _key: Math.random().toString(36).slice(2),
  leave_type_id: '',
  allocation_period: 'Monthly',
  allocation_value: '',
  unit: 'Days',
  carry_forward: false,
  max_carry: '',
  reset_cycle: 'Yearly',
});

const EMPTY_FORM = () => ({
  policy_name: '',
  description: '',
  status: 'active',
  details: [EMPTY_DETAIL()],
});

// Same theme-override pattern as Departments.jsx / Roles.jsx / LeaveTypes.jsx.
const kr_page_styles = `
  .kr-page-header { margin-bottom: 1.5rem; }
  .kr-page-header-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .kr-page-title { font-size: 1.6rem; font-weight: 700; color: var(--vb-text, #1e293b); margin-bottom: 0.15rem; }
  .kr-page-subtitle { color: var(--vb-text-muted, #64748b); margin-bottom: 0; }

  .btn-primary {
    background: linear-gradient(135deg, #7b0d2e, #a4133c);
    border: none; color: #fff; padding: 0.55rem 1.2rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem;
  }
  .btn-primary:hover { background: linear-gradient(135deg, #650a26, #8f1035); color: #fff; }
  .btn-secondary {
    background: var(--vb-bg-surface-2, #f1f5f9); border: 1px solid var(--vb-border, #e2e8f0);
    color: var(--vb-text, #475569); padding: 0.55rem 1.2rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem;
  }
  .btn-secondary:hover { background: var(--vb-border, #e2e8f0); }

  .kr-page-container .card { border: none; border-radius: 14px; box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06)); background: var(--vb-bg-surface, #fff); }
  .kr-page-container .card-header {
    background: linear-gradient(90deg, var(--vb-bg-surface-2, #fdf2f4), var(--vb-bg-surface, #ffffff));
    border-bottom: 1px solid var(--vb-border, #f1f1f1); border-radius: 14px 14px 0 0 !important; font-weight: 600; color: var(--vb-text, #1e293b);
  }
  .kr-page-container .card-body { color: var(--vb-text, #1e293b); }

  .kr-page-container .table { color: var(--vb-text, #1e293b); margin-bottom: 0; }
  .kr-page-container .table thead th { color: var(--vb-text-muted, #64748b); border-bottom: 2px solid var(--vb-border, #e6e8ec); font-weight: 600; }
  .kr-page-container .table td { border-color: var(--vb-border, #e6e8ec); vertical-align: middle; }
  .kr-page-container .table > :not(caption) > * > * { background-color: transparent; color: var(--vb-text, #1e293b); }
  .kr-page-container .table-hover > tbody > tr:hover > * { background-color: var(--vb-bg-surface-2, #f8f9fc); }
  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  .kr-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .kr-badge-active { background: #dcfce7; color: #15803d; }
  .kr-badge-inactive { background: #fee2e2; color: #b91c1c; }
  .kr-code-badge { background: #eef1ff; color: #4338ca; font-weight: 700; padding: 4px 9px; letter-spacing: 0.5px; font-size: 11px; }
  .kr-carry-yes { background: #dbeafe; color: #1e40af; }
  .kr-carry-no { background: #f1f5f9; color: #64748b; }

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
    background: var(--vb-bg-surface-2, #fff); color: var(--vb-text, #1e293b); border: 1px solid var(--vb-border, #ced4da);
  }
  .kr-page-container .form-control:disabled { opacity: 0.6; }
  .kr-page-container .form-check-label { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-text { color: var(--vb-text-muted, #64748b); }

  .kr-detail-row {
    border: 1px solid var(--vb-border, #e2e8f0);
    border-radius: 10px;
    padding: 0.9rem;
    margin-bottom: 0.75rem;
    background: var(--vb-bg-surface-2, #f8fafc);
    position: relative;
  }
  .kr-detail-remove {
    position: absolute; top: 0.5rem; right: 0.5rem;
    background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; width: 26px; height: 26px; font-size: 12px;
  }
  .kr-detail-remove:hover { background: #fecaca; }
  .kr-add-detail-btn {
    border: 1px dashed var(--vb-border, #cbd5e1);
    background: transparent;
    color: var(--vb-text-muted, #475569);
    border-radius: 10px;
    width: 100%;
    padding: 0.6rem;
    font-weight: 600;
    font-size: 0.85rem;
  }
  .kr-add-detail-btn:hover { background: var(--vb-bg-surface-2, #f1f5f9); }
  .kr-detail-pill {
    display: inline-block; background: #f1f5f9; color: #334155; border-radius: 6px;
    padding: 2px 8px; font-size: 11.5px; margin: 0 4px 4px 0;
  }

  @media (max-width: 768px) {
    .kr-page-header-row { flex-direction: column; align-items: stretch; }
    .kr-page-header-row .btn-primary { width: 100%; }
    .kr-page-title { font-size: 1.3rem; }
    .kr-page-container .table { font-size: 0.82rem; }
    .kr-page-container .table thead th, .kr-page-container .table td { padding: 0.55rem 0.5rem; white-space: nowrap; }
  }
`;

export default function LeavePolicies() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM());
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [typesRes, policiesRes] = await Promise.all([fetchLeaveTypes(false), fetchLeavePolicies()]);
      if (typesRes.success) setLeaveTypes(typesRes.data || []);
      if (policiesRes.success) setPolicies(policiesRes.data || []);
      if (!typesRes.success) Swal.fire('Error', typesRes.message, 'error');
    } catch {
      Swal.fire('Error', 'Failed to load leave policies', 'error');
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM());
    setError('');
    setShowModal(true);
  }

  function openEditModal(policy) {
    setEditingId(policy.id);
    setForm({
      policy_name: policy.policy_name,
      description: policy.description || '',
      status: policy.status,
      details: (policy.details || []).map((d) => ({
        _key: Math.random().toString(36).slice(2),
        leave_type_id: String(d.leave_type_id),
        allocation_period: d.allocation_period,
        allocation_value: d.allocation_value ?? '',
        unit: d.unit,
        carry_forward: !!d.carry_forward,
        max_carry: d.max_carry ?? '',
        reset_cycle: d.reset_cycle,
      })),
    });
    setError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM());
    setError('');
  }

  function addDetailRow() {
    setForm((f) => ({ ...f, details: [...f.details, EMPTY_DETAIL()] }));
  }

  function removeDetailRow(key) {
    setForm((f) => ({ ...f, details: f.details.filter((d) => d._key !== key) }));
  }

  function updateDetailRow(key, field, value) {
    setForm((f) => ({
      ...f,
      details: f.details.map((d) => (d._key === key ? { ...d, [field]: value } : d)),
    }));
  }

  // Mirrors validatePolicyBody in leavePolicyController.js, so bad input
  // never round-trips to the server just to bounce back with a 400.
  function validate() {
    if (!form.policy_name.trim()) return 'Policy name is required';
    if (form.details.length === 0) return 'At least one leave type must be added to the policy';

    const seen = new Set();
    for (const d of form.details) {
      if (!d.leave_type_id) return 'Each policy line needs a leave type';
      if (seen.has(d.leave_type_id)) return 'The same leave type is added more than once';
      seen.add(d.leave_type_id);

      if (!ALLOCATION_PERIODS.includes(d.allocation_period)) return 'Invalid allocation period';
      if (d.allocation_period !== 'Unlimited') {
        const value = Number(d.allocation_value);
        if (d.allocation_value === '' || Number.isNaN(value) || value < 0) {
          return 'Allocation value must be a positive number';
        }
      }
      if (d.carry_forward) {
        const maxCarry = Number(d.max_carry);
        if (d.max_carry === '' || Number.isNaN(maxCarry) || maxCarry < 0) {
          return 'Maximum carry forward must be a positive number';
        }
      }
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');

    const payload = {
      policy_name: form.policy_name.trim(),
      description: form.description.trim(),
      status: form.status,
      details: form.details.map((d) => ({
        leave_type_id: Number(d.leave_type_id),
        allocation_period: d.allocation_period,
        allocation_value: d.allocation_period === 'Unlimited' ? 0 : Number(d.allocation_value),
        unit: d.unit,
        carry_forward: d.carry_forward,
        max_carry: d.carry_forward ? Number(d.max_carry) : 0,
        reset_cycle: d.reset_cycle,
      })),
    };

    try {
      const res = editingId
        ? await updateLeavePolicy(editingId, payload)
        : await createLeavePolicy(payload);

      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 1800, showConfirmButton: false });
        closeModal();
        load();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save leave policy');
    }
  }

  async function handleToggleStatus(policy) {
    const nextStatus = policy.status === 'active' ? 'inactive' : 'active';
    const result = await Swal.fire({
      title: nextStatus === 'inactive' ? 'Disable this policy?' : 'Enable this policy?',
      text: nextStatus === 'inactive'
        ? 'Employees currently on it keep their existing balances; it just stops being assignable.'
        : 'It becomes assignable to employees again.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${nextStatus === 'inactive' ? 'disable' : 'enable'} it`,
    });
    if (!result.isConfirmed) return;

    try {
      const res = await setLeavePolicyStatus(policy.id, nextStatus);
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

  async function handleDelete(policy) {
    const result = await Swal.fire({
      title: 'Delete this policy?',
      text: 'Only possible if no employee is currently assigned to it.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await deleteLeavePolicy(policy.id);
      if (res.success) {
        Swal.fire('Deleted!', res.message, 'success');
        load();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to delete leave policy', 'error');
    }
  }

  function formatAllocation(d) {
    if (d.allocation_period === 'Unlimited') return 'Unlimited';
    return `${d.allocation_value} ${d.unit} / ${d.allocation_period}`;
  }

  return (
    <div className="kr-page-container">
      <style>{kr_page_styles}</style>

      <div className="kr-page-header">
        <div className="kr-page-header-row">
          <div>
            <h1 className="kr-page-title">Leave Policies</h1>
            <p className="kr-page-subtitle">Bundle leave types into named policies (e.g. "Permanent Staff") and assign them to employees</p>
          </div>
          <button type="button" className="btn-primary" onClick={openAddModal}>
            <i className="fas fa-plus-circle me-2"></i>Add Policy
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-sliders-h me-2"></i>Leave Policies</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Policy Name</th>
                  <th>Description</th>
                  <th>Leave Types</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id}>
                    <td><div className="fw-bold">{policy.policy_name}</div></td>
                    <td>{policy.description || '-'}</td>
                    <td>
                      {(policy.details || []).map((d) => (
                        <span key={d.id || d.leave_type_id} className="kr-detail-pill">
                          {d.leave_type_code || d.leave_type_name}: {formatAllocation(d)}
                          {d.carry_forward ? ` (CF ${d.max_carry})` : ''}
                        </span>
                      ))}
                    </td>
                    <td>
                      {policy.status === 'active' ? (
                        <span className="kr-badge kr-badge-active">Active</span>
                      ) : (
                        <span className="kr-badge kr-badge-inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm kr-action-btn-edit" title="Edit" onClick={() => openEditModal(policy)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn btn-sm kr-action-btn-toggle"
                          title={policy.status === 'active' ? 'Disable' : 'Enable'}
                          onClick={() => handleToggleStatus(policy)}
                        >
                          <i className={`fas ${policy.status === 'active' ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                        </button>
                        <button className="btn btn-sm kr-action-btn-delete" title="Delete" onClick={() => handleDelete(policy)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr><td colSpan="5" className="text-center text-muted">No leave policies yet — click "Add Policy" to create one</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-sliders-h me-2"></i>
                  <span>{editingId ? 'Edit Leave Policy' : 'Add Leave Policy'}</span>
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}

                  <div className="mb-3">
                    <label htmlFor="policyName" className="form-label">Policy Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="policyName"
                      placeholder="e.g. Permanent Staff Policy"
                      value={form.policy_name}
                      onChange={(e) => setForm({ ...form, policy_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="policyDesc" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="policyDesc"
                      rows="2"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="policyStatus" className="form-label">Status</label>
                    <select
                      className="form-select"
                      id="policyStatus"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <hr />
                  <label className="form-label fw-bold">Leave Types in this Policy</label>

                  {form.details.map((d) => (
                    <div key={d._key} className="kr-detail-row">
                      {form.details.length > 1 && (
                        <button type="button" className="kr-detail-remove" onClick={() => removeDetailRow(d._key)}>
                          <i className="fas fa-times"></i>
                        </button>
                      )}

                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Leave Type</label>
                          <select
                            className="form-select"
                            value={d.leave_type_id}
                            onChange={(e) => updateDetailRow(d._key, 'leave_type_id', e.target.value)}
                            required
                          >
                            <option value="">Select Leave Type</option>
                            {leaveTypes.map((lt) => (
                              <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-6 mb-3">
                          <label className="form-label">Allocation Period</label>
                          <select
                            className="form-select"
                            value={d.allocation_period}
                            onChange={(e) => updateDetailRow(d._key, 'allocation_period', e.target.value)}
                          >
                            {ALLOCATION_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>

                      {d.allocation_period !== 'Unlimited' && (
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label">Allocation {d.unit}</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="form-control"
                              placeholder="e.g. 1, 1.5, 12"
                              value={d.allocation_value}
                              onChange={(e) => updateDetailRow(d._key, 'allocation_value', e.target.value)}
                            />
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label">Unit</label>
                            <select
                              className="form-select"
                              value={d.unit}
                              onChange={(e) => updateDetailRow(d._key, 'unit', e.target.value)}
                            >
                              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="row align-items-center">
                        <div className="col-md-6 mb-3 form-check ms-1">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`cf-${d._key}`}
                            checked={d.carry_forward}
                            onChange={(e) => updateDetailRow(d._key, 'carry_forward', e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor={`cf-${d._key}`}>Allow Carry Forward</label>
                        </div>
                        {d.carry_forward && (
                          <div className="col-md-6 mb-3">
                            <label className="form-label">Max Carry Forward</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="form-control"
                              value={d.max_carry}
                              onChange={(e) => updateDetailRow(d._key, 'max_carry', e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="mb-1">
                        <label className="form-label">Reset Cycle</label>
                        <select
                          className="form-select"
                          value={d.reset_cycle}
                          onChange={(e) => updateDetailRow(d._key, 'reset_cycle', e.target.value)}
                        >
                          {RESET_CYCLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}

                  <button type="button" className="kr-add-detail-btn" onClick={addDetailRow}>
                    <i className="fas fa-plus me-2"></i>Add Another Leave Type
                  </button>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Policy</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}