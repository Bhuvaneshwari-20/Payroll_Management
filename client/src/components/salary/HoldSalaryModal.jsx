import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { saveHoldStatus } from '../../services/salaryApi';

export default function HoldSalaryModal({ show, onClose, reportData, holdStatusMap, setHoldStatusMap }) {
  const [search, setSearch] = useState('');
  const [localMap, setLocalMap] = useState({});

  useEffect(() => { if (show) { setLocalMap({ ...holdStatusMap }); setSearch(''); } }, [show, holdStatusMap]);

  if (!show || !reportData) return null;

  const filtered = search
    ? reportData.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.employee_id.toLowerCase().includes(search.toLowerCase()))
    : reportData;

  const total = reportData.length;
  const cashCount = reportData.filter((r) => (localMap[r.employee_id] || 'neft') === 'cash').length;
  const neftCount = total - cashCount;

  const setMode = (empId, mode) => setLocalMap((prev) => ({ ...prev, [empId]: mode }));

  const handleSaveAll = async () => {
    try {
      await saveHoldStatus(localMap);
      setHoldStatusMap(localMap);
      Swal.fire({ icon: 'success', title: 'Saved!', text: 'Hold status updated for all employees.', timer: 1800, showConfirmButton: false, toast: true, position: 'top-end' });
    } catch {
      setHoldStatusMap(localMap);
      Swal.fire({ icon: 'warning', title: 'Note', text: 'Server save failed, but status is applied locally.', timer: 2000, showConfirmButton: false });
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content" style={{ borderRadius: 14, overflow: 'hidden' }}>
          <div className="modal-header border-0" style={{ background: '#1a2a4a', padding: '18px 24px' }}>
            <div>
              <h5 className="modal-title text-white fw-bold"><i className="fas fa-hand-paper me-2"></i>Hold Salary Management</h5>
              <small className="text-white opacity-75">NEFT = Transfer &nbsp;|&nbsp; Cash = Hold</small>
            </div>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="px-4 py-3 border-bottom bg-light d-flex gap-3 flex-wrap align-items-center">
            <StatCard color="#1a2a4a" label="Total Employees" value={total} />
            <StatCard color="#2e7d32" label="NEFT/Transfer" value={neftCount} />
            <StatCard color="#e65100" label="Cash/Hold" value={cashCount} />
            <div className="ms-auto">
              <input type="text" className="form-control form-control-sm" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
            </div>
          </div>
          <div className="modal-body p-0">
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {filtered.map((row) => {
                const eid = row.employee_id;
                const mode = localMap[eid] || 'neft';
                const isHold = mode === 'cash';
                return (
                  <div key={eid} className="d-flex align-items-center justify-content-between px-3 py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d' }}>
                        <i className="fas fa-user"></i>
                      </div>
                      <div>
                        <div className="fw-semibold" style={{ fontSize: 13 }}>{row.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{eid} &bull; {row.department}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>Net: <strong>₹{Number(row.net_salary).toLocaleString('en-IN')}</strong></div>
                      </div>
                    </div>
                    <div className="d-flex gap-2" style={{ minWidth: 160 }}>
                      <button
                        onClick={() => setMode(eid, 'neft')}
                        className="btn"
                        style={{ flex: 1, padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1.5px solid', ...(!isHold ? { background: '#2e7d32', color: '#fff', borderColor: '#2e7d32' } : { background: '#eaf4eb', color: '#2e7d32', borderColor: '#b2dfb4' }) }}
                      >
                        <i className="fas fa-university me-1"></i>NEFT
                      </button>
                      <button
                        onClick={() => setMode(eid, 'cash')}
                        className="btn"
                        style={{ flex: 1, padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1.5px solid', ...(isHold ? { background: '#e65100', color: '#fff', borderColor: '#e65100' } : { background: '#fafafa', color: '#555', borderColor: '#ddd' }) }}
                      >
                        <i className="fas fa-hand-paper me-1"></i>Cash
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="text-center py-4 text-muted">No employees found.</div>}
            </div>
          </div>
          <div className="modal-footer border-0 bg-light" style={{ padding: '12px 20px' }}>
            <small className="text-muted me-auto"><i className="fas fa-info-circle me-1"></i>Changes are saved immediately. Cash = Salary On Hold. NEFT = Normal Transfer.</small>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-success" onClick={handleSaveAll}><i className="fas fa-save me-1"></i>Save All</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ color, label, value }) {
  return (
    <div className="d-flex align-items-center gap-2 bg-white border rounded px-3 py-2" style={{ fontSize: 13, fontWeight: 600 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }}></span>
      <span>{label}: <strong>{value}</strong></span>
    </div>
  );
}