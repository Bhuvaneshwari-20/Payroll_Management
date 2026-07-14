import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { getAllForHR, getHRStats, hrAction } from '../services/leaveApi';
import { getAllPermissionsForAdmin, permissionHrAction, getPermissionHRStats } from '../services/permissionApi';
import LeaveStatusBadge from '../components/leave/LeaveStatusBadge';

// ---------------------------------------------------------------------------
// Vertex Bank — Admin Leave Management ("Request Management")
// The stat cards used Bootstrap's bg-{color} bg-opacity-10 utilities with no
// explicit text color, which blends into the dark page background and makes
// the numbers/labels nearly unreadable in dark mode. Replaced with explicit
// tinted cards (readable in both themes) plus the same card/table/tabs
// dark-mode treatment used on Departments.jsx / Roles.jsx /
// EmployeeManagement.jsx / LeaveManagement.jsx, using the --vb-* variables
// defined in Topbar.jsx.
// ---------------------------------------------------------------------------
const admin_leave_styles = `
  .kr-page-container .stat-tile {
    border: none;
    border-radius: 14px;
    padding: 1rem 1.1rem;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
  }
  .kr-page-container .stat-tile small {
    color: var(--vb-text-muted, #64748b);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 0.72rem;
  }
  .kr-page-container .stat-tile h3 {
    color: var(--vb-text, #1e293b);
    font-weight: 700;
    margin-top: 0.15rem;
    margin-bottom: 0;
  }
  .kr-page-container .stat-tile-primary { background: rgba(37, 99, 235, 0.15); }
  .kr-page-container .stat-tile-primary i { color: #3b82f6; }
  .kr-page-container .stat-tile-warning { background: rgba(217, 119, 6, 0.15); }
  .kr-page-container .stat-tile-warning i { color: #f59e0b; }
  .kr-page-container .stat-tile-success { background: rgba(16, 185, 129, 0.15); }
  .kr-page-container .stat-tile-success i { color: #10b981; }
  .kr-page-container .stat-tile-danger { background: rgba(220, 38, 38, 0.15); }
  .kr-page-container .stat-tile-danger i { color: #ef4444; }

  .kr-page-container .card {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: none;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
  }
  .kr-page-container .card-header {
    background: linear-gradient(90deg, var(--vb-bg-surface-2, #fdf2f4), var(--vb-bg-surface, #ffffff));
    border-bottom: 1px solid var(--vb-border, #f1f1f1);
    color: var(--vb-text, #1e293b);
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
  }
  .kr-page-container .card-header h5 { color: var(--vb-text, #1e293b); margin: 0; }

  .kr-page-container .nav-tabs {
    border-bottom: 1px solid var(--vb-border, #dee2e6);
    flex-wrap: wrap !important;
    overflow-x: visible !important;
    row-gap: 0.35rem;
  }
  .kr-page-container .nav-tabs .nav-link {
    color: var(--vb-text-muted, #495057);
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    white-space: nowrap;
  }
  .kr-page-container .nav-tabs .nav-link:hover {
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .nav-tabs .nav-link.active {
    color: var(--vb-text, #1e293b);
    background: transparent;
    border-bottom: 2px solid #a4133c;
  }

  .kr-page-container .form-select,
  .kr-page-container .form-control {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #ced4da);
  }

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

  /* ---------- Responsive ---------- */
  @media (max-width: 768px) {
    .kr-page-container .card-header { padding: 0.85rem 1rem; }
    .kr-page-container .card-header .form-select { width: 100%; }
    .kr-page-container .table { font-size: 0.82rem; }
    .kr-page-container .table thead th,
    .kr-page-container .table td {
      padding: 0.55rem 0.5rem;
      white-space: nowrap;
    }
    .kr-page-container .nav-tabs .nav-link {
      padding: 0.5rem 0.65rem;
      font-size: 0.82rem;
    }
  }

  @media (max-width: 480px) {
    .kr-page-container .stat-tile h3 { font-size: 1.35rem; }
  }
`;

export default function AdminLeaveManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState('leave'); // 'leave' | 'permission' | 'special'
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, rejected: 0, approved_today: 0 });
  const [rows, setRows] = useState([]);

  const category = tab === 'special' ? 'special' : 'leave';


const loadStats = useCallback(() => {
  setStats({ total: 0, pending: 0, rejected: 0, approved_today: 0 }); 
  const fetchStats = tab === 'permission' ? getPermissionHRStats() : getHRStats(category);
  fetchStats.then((res) => setStats(res.data.data)).catch(() => {});
}, [tab, category]);
  const loadRows = useCallback(() => {
    if (tab === 'permission') {
  
      getAllPermissionsForAdmin(statusFilter || null)
        .then((res) => setRows((res.data.data || []).filter((r) => r.status !== 'Pending')))
        .catch(() => {});
    } else {
      getAllForHR(category, statusFilter || null)
        .then((res) => setRows((res.data.data || []).filter((r) => r.status !== 'Pending')))
        .catch(() => {});
    }
  }, [tab, category, statusFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const act = async (row, action) => {
    const { value: comments } = await Swal.fire({
      title: action === 'approve' ? 'Approve this request?' : 'Reject (mark Loss of Pay)?',
      input: 'textarea',
      inputLabel: 'Comments (optional)',
      showCancelButton: true,
      confirmButtonColor: action === 'reject' ? '#dc3545' : '#198754',
    });
    if (comments === undefined) return;

    try {
      if (tab === 'permission') {
        await permissionHrAction(row.id, action, comments);
      } else {
        await hrAction(row.id, action, comments);
      }
      loadRows();
      loadStats();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Action failed', 'error');
    }
  };

  
  const renderActions = (row) => {
    if (row.status === 'Forwarded') {
      return (
        <>
          <button className="btn btn-sm btn-success me-2" onClick={() => act(row, 'approve')}>Approve</button>
          <button className="btn btn-sm btn-danger" onClick={() => act(row, 'reject')}>
            {tab === 'permission' ? 'Reject' : 'Reject (LOP)'}
          </button>
        </>
      );
    }
    if (row.status === 'Pending') {
      return <span className="text-muted small">Awaiting manager review</span>;
    }
    return <span className="text-muted">—</span>;
  };

  return (
    <div className="kr-page-container">
      <style>{admin_leave_styles}</style>

      <div className="row mb-4 g-3">
        <div className="col-6 col-md-3">
          <div className="stat-tile stat-tile-primary">
            <div className="d-flex justify-content-between">
              <div><small>Total Requests</small><h3>{stats.total}</h3></div>
              <i className="fas fa-clipboard-list fs-2"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="stat-tile stat-tile-warning">
            <div className="d-flex justify-content-between">
              <div><small>Pending</small><h3>{stats.pending}</h3></div>
              <i className="fas fa-clock fs-2"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="stat-tile stat-tile-success">
            <div className="d-flex justify-content-between">
              <div><small>Approved Today</small><h3>{stats.approved_today}</h3></div>
              <i className="fas fa-check-circle fs-2"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="stat-tile stat-tile-danger">
            <div className="d-flex justify-content-between">
              <div><small>Rejected</small><h3>{stats.rejected}</h3></div>
              <i className="fas fa-times-circle fs-2"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Request Management</h5>
          <select className="form-select w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {/* 'Pending' intentionally excluded on every tab — HR can never act on it */}
            <option value="Forwarded">Forwarded</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="card-body">
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item"><button className={`nav-link ${tab === 'leave' ? 'active' : ''}`} onClick={() => { setTab('leave'); setStatusFilter(''); }}><i className="fas fa-calendar me-1"></i>Leave Requests</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === 'permission' ? 'active' : ''}`} onClick={() => { setTab('permission'); setStatusFilter(''); }}><i className="fas fa-clock me-1"></i>Permission Requests</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === 'special' ? 'active' : ''}`} onClick={() => { setTab('special'); setStatusFilter(''); }}><i className="fas fa-star me-1"></i>Special Leave Requests</button></li>
          </ul>

          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>S.No</th><th>ID</th><th>Employee</th>
                  {tab === 'permission' ? <><th>From</th><th>To</th></> : <><th>Type</th><th>Start</th><th>End</th><th>Days</th></>}
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.employee_code}</td>
                    <td>{r.employee_name}</td>
                    {tab === 'permission' ? (
                      <><td>{r.from_time}</td><td>{r.to_time}</td></>
                    ) : (
                      <><td>{r.leave_type_name}</td><td>{r.start_date}</td><td>{r.end_date}</td><td>{r.days}</td></>
                    )}
                    <td><LeaveStatusBadge status={r.status} isLop={!!r.is_lop} /></td>
                    <td>{renderActions(r)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan="8" className="text-center">No requests found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}