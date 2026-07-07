import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getEmployeesForOE, saveOtherEarning } from '../../services/salaryApi';

export default function OtherEarningsModal({ show, onClose }) {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    getEmployeesForOE().then((res) => setEmployees(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { if (show) { load(); setSelected(null); setAmount(''); setSearch(''); } }, [show, load]);

  if (!show) return null;

  const filtered = search
    ? employees.filter((e) =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        e.employee_code.toLowerCase().includes(search.toLowerCase()))
    : employees;

  const selectEmp = (emp) => {
    setSelected(emp);
    setAmount(emp.other_earning > 0 ? emp.other_earning : '');
  };

  const handleSave = async () => {
    if (!selected) return;
    const val = parseFloat(amount || 0);
    if (isNaN(val) || val < 0) {
      Swal.fire('Error', 'Enter a valid amount (0 or more)', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await saveOtherEarning(selected.id, val);
      setEmployees(res.data.data || []);
      const updated = (res.data.data || []).find((e) => e.id === selected.id);
      if (updated) setSelected(updated);
      Swal.fire({ icon: 'success', title: 'Saved!', text: 'Other Earning updated.', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    } catch {
      Swal.fire('Error', 'Failed to save.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content" style={{ borderRadius: 14, overflow: 'hidden' }}>
          <div className="modal-header border-0" style={{ background: 'linear-gradient(135deg,#00c89b,#00a882)', padding: '18px 24px' }}>
            <h5 className="modal-title text-white fw-bold"><i className="fas fa-plus-circle me-2"></i>Other Earnings</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-0">
            <div className="row g-0" style={{ minHeight: 460 }}>
              <div className="col-md-7" style={{ borderRight: '1px solid #e9ecef' }}>
                <div className="p-3 pb-2">
                  <input
                    type="text" className="form-control" placeholder="Search name or code..."
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ border: '2px solid #00c89b', borderRadius: 8 }}
                  />
                </div>
                <div className="d-flex justify-content-between px-3 py-2 bg-light border-bottom" style={{ fontSize: 13 }}>
                  <span>{filtered.length} {search ? `of ${employees.length}` : ''} total</span>
                </div>
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {filtered.map((emp) => {
                    const amt = parseFloat(emp.other_earning || 0);
                    const hasAmount = amt > 0;
                    const isSel = selected?.id === emp.id;
                    return (
                      <div
                        key={emp.id}
                        onClick={() => selectEmp(emp)}
                        className="d-flex align-items-center justify-content-between px-3 py-2"
                        style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: isSel ? '#e6faf5' : 'transparent', borderLeft: isSel ? '3px solid #c88200' : 'none' }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d' }}>
                            <i className="fas fa-user"></i>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.first_name} {emp.last_name}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>#{emp.employee_code}</div>
                          </div>
                        </div>
                        <span
                          className="badge rounded-pill"
                          style={{ fontSize: 11, padding: '3px 10px', background: hasAmount ? '#d1e7dd' : '#fff3cd', color: hasAmount ? '#0a3622' : '#856404' }}
                        >
                          {hasAmount ? `₹ ${amt.toLocaleString('en-IN')}` : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && <div className="text-center py-4 text-muted">No employees found</div>}
                </div>
              </div>
              <div className="col-md-5 p-4 d-flex flex-column">
                {selected ? (
                  <div style={{ background: '#f8fffe', border: '1px solid #b2dfdb', borderRadius: 10, padding: '16px 18px' }}>
                    <div style={{ fontSize: 13, color: '#444', marginBottom: 10 }}>
                      <div className="fw-bold fs-6 text-dark">{selected.first_name} {selected.last_name}</div>
                      <div className="text-muted small">#{selected.employee_code}</div>
                      <div className="text-muted small mt-1">{selected.department || '-'}</div>
                    </div>
                    <label className="form-label fw-semibold mt-2" style={{ color: '#00a882' }}>
                      <i className="fas fa-rupee-sign me-1"></i>Other Earning Amount
                    </label>
                    <input
                      type="number" className="form-control form-control-lg"
                      placeholder="Enter amount" min="0" step="1"
                      value={amount} onChange={(e) => setAmount(e.target.value)}
                      style={{ borderRadius: 8, border: '2px solid #00c89b', fontWeight: 600 }}
                    />
                    <div className="d-flex gap-2 mt-3">
                      <button
                        className="btn flex-fill fw-semibold" disabled={loading} onClick={handleSave}
                        style={{ background: 'linear-gradient(135deg,#00c89b,#00a882)', color: '#fff', border: 'none' }}
                      >
                        <i className="fas fa-save me-1"></i>{loading ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn btn-outline-secondary flex-fill" onClick={() => { setSelected(null); setAmount(''); }}>
                        <i className="fas fa-times me-1"></i>Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted m-auto">
                    <i className="fas fa-hand-pointer fa-2x mb-3 d-block" style={{ color: '#b2dfdb' }}></i>
                    <p className="mb-0">Select an employee from the list to set their Other Earning amount</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer border-0 bg-light" style={{ padding: '12px 20px' }}>
            <small className="text-muted me-auto"><i className="fas fa-info-circle me-1"></i>Other Earning is saved directly to the employee salary record.</small>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}