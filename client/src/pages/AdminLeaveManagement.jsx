import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { getAllForHR, getHRStats, hrAction } from '../services/leaveApi';
import { getAllPermissionsForAdmin, permissionHrAction, getPermissionHRStats } from '../services/permissionApi';
import LeaveStatusBadge from '../components/leave/LeaveStatusBadge';

// ---------------------------------------------------------------------------
// Vertex Bank — Admin Leave Management ("Request Management")
// v2: bigger type scale, gradient stat tiles, click-to-lift interaction,
// entrance animation on mount, smoother hover/tab/table transitions.
// Still uses the shared --vb-* variables defined in Topbar.jsx so it stays
// in sync with light/dark theme.
// ---------------------------------------------------------------------------
const admin_leave_styles = `
  @keyframes krFadeInUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes krCardIn {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes krPop {
    0%   { transform: translateY(-10px) scale(1.045); }
    45%  { transform: translateY(-13px) scale(1.06); }
    100% { transform: translateY(-10px) scale(1.045); }
  }

  .kr-page-container .stat-tile {
    position: relative;
    border: none;
    border-radius: 16px;
    padding: 1.25rem 1.4rem;
    cursor: pointer;
    overflow: hidden;
    transform: translateY(0) scale(1);
    transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.28s ease,
                filter 0.28s ease;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
    animation: krFadeInUp 0.5s ease both;
  }
  .kr-page-container .stat-tile:nth-child(1) { animation-delay: 0.02s; }
  .kr-page-container .stat-tile:nth-child(2) { animation-delay: 0.10s; }
  .kr-page-container .stat-tile:nth-child(3) { animation-delay: 0.18s; }
  .kr-page-container .stat-tile:nth-child(4) { animation-delay: 0.26s; }

  .kr-page-container .stat-tile:hover {
    transform: translateY(-6px) scale(1.015);
    box-shadow: 0 14px 30px var(--vb-shadow, rgba(0,0,0,0.14));
    filter: brightness(1.04);
  }
  .kr-page-container .stat-tile:active {
    transform: translateY(-3px) scale(0.99);
  }
  /* Clicked / "lifted" state, toggled from React state */
  .kr-page-container .stat-tile.stat-tile-lifted {
    animation: krPop 1.1s ease-in-out infinite;
    box-shadow: 0 20px 40px var(--vb-shadow, rgba(0,0,0,0.22));
    filter: brightness(1.08) saturate(1.15);
  }
  .kr-page-container .stat-tile.stat-tile-lifted::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.28) inset;
    pointer-events: none;
  }

  .kr-page-container .stat-tile small {
    color: var(--vb-text-muted, #64748b);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.8rem;
  }
  .kr-page-container .stat-tile h3 {
    color: var(--vb-text, #1e293b);
    font-weight: 800;
    font-size: 2.6rem;
    line-height: 1.1;
    margin-top: 0.2rem;
    margin-bottom: 0;
    transition: transform 0.25s ease;
  }
  .kr-page-container .stat-tile:hover h3 { transform: scale(1.05); }
  .kr-page-container .stat-tile i {
    font-size: 2.1rem;
    opacity: 0.9;
    transition: transform 0.35s ease;
  }
  .kr-page-container .stat-tile:hover i { transform: rotate(-8deg) scale(1.12); }

  .kr-page-container .stat-tile-primary {
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(59, 130, 246, 0.06));
  }
  .kr-page-container .stat-tile-primary i,
  .kr-page-container .stat-tile-primary h3 { color: #3b82f6; }
  .kr-page-container .stat-tile-primary.stat-tile-lifted {
    background: linear-gradient(135deg, #2563eb, #60a5fa);
  }
  .kr-page-container .stat-tile-primary.stat-tile-lifted i,
  .kr-page-container .stat-tile-primary.stat-tile-lifted h3,
  .kr-page-container .stat-tile-primary.stat-tile-lifted small { color: #fff; }

  .kr-page-container .stat-tile-warning {
    background: linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(245, 158, 11, 0.06));
  }
  .kr-page-container .stat-tile-warning i,
  .kr-page-container .stat-tile-warning h3 { color: #f59e0b; }
  .kr-page-container .stat-tile-warning.stat-tile-lifted {
    background: linear-gradient(135deg, #d97706, #fbbf24);
  }
  .kr-page-container .stat-tile-warning.stat-tile-lifted i,
  .kr-page-container .stat-tile-warning.stat-tile-lifted h3,
  .kr-page-container .stat-tile-warning.stat-tile-lifted small { color: #fff; }

  .kr-page-container .stat-tile-success {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(52, 211, 153, 0.06));
  }
  .kr-page-container .stat-tile-success i,
  .kr-page-container .stat-tile-success h3 { color: #10b981; }
  .kr-page-container .stat-tile-success.stat-tile-lifted {
    background: linear-gradient(135deg, #059669, #34d399);
  }
  .kr-page-container .stat-tile-success.stat-tile-lifted i,
  .kr-page-container .stat-tile-success.stat-tile-lifted h3,
  .kr-page-container .stat-tile-success.stat-tile-lifted small { color: #fff; }

  .kr-page-container .stat-tile-danger {
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.22), rgba(239, 68, 68, 0.06));
  }
  .kr-page-container .stat-tile-danger i,
  .kr-page-container .stat-tile-danger h3 { color: #ef4444; }
  .kr-page-container .stat-tile-danger.stat-tile-lifted {
    background: linear-gradient(135deg, #dc2626, #f87171);
  }
  .kr-page-container .stat-tile-danger.stat-tile-lifted i,
  .kr-page-container .stat-tile-danger.stat-tile-lifted h3,
  .kr-page-container .stat-tile-danger.stat-tile-lifted small { color: #fff; }

  .kr-page-container .card {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: none;
    border-radius: 16px;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
    animation: krCardIn 0.5s ease 0.32s both;
    transition: box-shadow 0.3s ease;
  }
  .kr-page-container .card:hover {
    box-shadow: 0 10px 28px var(--vb-shadow, rgba(0,0,0,0.1));
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
    border-radius: 16px 16px 0 0;
  }
  .kr-page-container .card-header h5 {
    color: var(--vb-text, #1e293b);
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

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
    font-size: 1.02rem;
    font-weight: 600;
    padding: 0.6rem 1rem;
    transition: color 0.2s ease, border-color 0.25s ease, transform 0.2s ease;
  }
  .kr-page-container .nav-tabs .nav-link:hover {
    color: var(--vb-text, #1e293b);
    transform: translateY(-2px);
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
    font-size: 1rem;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .kr-page-container .form-select:focus,
  .kr-page-container .form-control:focus {
    box-shadow: 0 0 0 3px rgba(164, 19, 60, 0.15);
    border-color: #a4133c;
  }

  .kr-page-container .table {
    color: var(--vb-text, #1e293b);
    margin-bottom: 0;
    font-size: 1rem;
  }
  .kr-page-container .table thead th {
    color: var(--vb-text-muted, #64748b);
    border-bottom: 2px solid var(--vb-border, #e6e8ec);
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .kr-page-container .table td {
    border-color: var(--vb-border, #e6e8ec);
    vertical-align: middle;
  }
  .kr-page-container .table > :not(caption) > * > * {
    background-color: transparent;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table tbody tr {
    transition: background-color 0.2s ease, transform 0.2s ease;
    animation: krFadeInUp 0.4s ease both;
  }
  .kr-page-container .table-hover > tbody > tr:hover {
    background-color: var(--vb-bg-surface-2, #f8f9fc);
    transform: translateX(3px);
  }
  .kr-page-container .table-hover > tbody > tr:hover > * {
    background-color: var(--vb-bg-surface-2, #f8f9fc);
  }
  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  .kr-page-container .btn {
    transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  }
  .kr-page-container .btn:hover {
    transform: translateY(-2px) scale(1.04);
    filter: brightness(1.06);
    box-shadow: 0 6px 14px rgba(0,0,0,0.15);
  }
  .kr-page-container .btn:active {
    transform: translateY(0) scale(0.97);
  }

  /* ---------- Responsive ---------- */
  @media (max-width: 768px) {
    .kr-page-container .card-header { padding: 0.85rem 1rem; }
    .kr-page-container .card-header .form-select { width: 100%; }
    .kr-page-container .table { font-size: 0.88rem; }
    .kr-page-container .table thead th,
    .kr-page-container .table td {
      padding: 0.55rem 0.5rem;
      white-space: nowrap;
    }
    .kr-page-container .nav-tabs .nav-link {
      padding: 0.5rem 0.65rem;
      font-size: 0.9rem;
    }
    .kr-page-container .stat-tile h3 { font-size: 2rem; }
  }

  @media (max-width: 480px) {
    .kr-page-container .stat-tile h3 { font-size: 1.7rem; }
    .kr-page-container .stat-tile i { font-size: 1.6rem; }
  }
`;

export default function AdminLeaveManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState('leave'); // 'leave' | 'permission' | 'special'
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, rejected: 0, approved_today: 0 });
  const [rows, setRows] = useState([]);
  const [liftedTile, setLiftedTile] = useState(null); // which stat card is "lifted" on click

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

  // Toggles the "lifted" (gradient + pop) state for a stat card on click
  const toggleLift = (key) => {
    setLiftedTile((prev) => (prev === key ? null : key));
  };

  const statTileClass = (key, base) =>
    `stat-tile ${base}${liftedTile === key ? ' stat-tile-lifted' : ''}`;

  return (
    <div className="kr-page-container">
      <style>{admin_leave_styles}</style>

      <div className="row mb-4 g-3">
        <div className="col-6 col-md-3">
          <div className={statTileClass('total', 'stat-tile-primary')} onClick={() => toggleLift('total')}>
            <div className="d-flex justify-content-between">
              <div><small>Total Requests</small><h3>{stats.total}</h3></div>
              <i className="fas fa-clipboard-list"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className={statTileClass('pending', 'stat-tile-warning')} onClick={() => toggleLift('pending')}>
            <div className="d-flex justify-content-between">
              <div><small>Pending</small><h3>{stats.pending}</h3></div>
              <i className="fas fa-clock"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className={statTileClass('approved', 'stat-tile-success')} onClick={() => toggleLift('approved')}>
            <div className="d-flex justify-content-between">
              <div><small>Approved Today</small><h3>{stats.approved_today}</h3></div>
              <i className="fas fa-check-circle"></i>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className={statTileClass('rejected', 'stat-tile-danger')} onClick={() => toggleLift('rejected')}>
            <div className="d-flex justify-content-between">
              <div><small>Rejected</small><h3>{stats.rejected}</h3></div>
              <i className="fas fa-times-circle"></i>
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
                  <tr key={r.id} style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
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