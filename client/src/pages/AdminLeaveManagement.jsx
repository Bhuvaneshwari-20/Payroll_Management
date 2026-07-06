import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import {
  getAllForHR, getOrgStats, hrAction
} from '../services/leaveApi';
import { getAllPermissionsForAdmin, permissionManagerAction } from '../services/permissionApi';
import LeaveStatusBadge from '../components/leave/LeaveStatusBadge';

export default function AdminLeaveManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState('leave'); // 'leave' | 'permission' | 'special'
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, rejected: 0, approved_today: 0 });
  const [rows, setRows] = useState([]);

  const category = tab === 'special' ? 'special' : 'leave';

  const loadStats = useCallback(() => {
    getOrgStats().then((res) => setStats(res.data.data)).catch(() => {});
  }, []);

  const loadRows = useCallback(() => {
    if (tab === 'permission') {
      getAllPermissionsForAdmin(statusFilter || null).then((res) => setRows(res.data.data)).catch(() => {});
    } else {
      // FIX: HR must never see/action a 'Pending' request — that stage
      // belongs to the Manager only. Even though the backend now filters
      // this out too, we defensively strip it here as well in case an
      // older/cached response ever includes one.
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
        await permissionManagerAction(row.id, action, comments);
      } else {
        // FIX: HR can only ever call hrAction (approve/reject a Forwarded
        // request). managerAction (forward/reject a Pending one) has been
        // removed from this page entirely — that belongs on the Manager's
        // own Leave Management page.
        await hrAction(row.id, action, comments);
      }
      loadRows();
      loadStats();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const renderActions = (row) => {
    if (tab === 'permission') {
      if (row.status !== 'Pending') return <span className="text-muted">—</span>;
      return (
        <>
          <button className="btn btn-sm btn-success me-2" onClick={() => act(row, 'approve')}>Approve</button>
          <button className="btn btn-sm btn-danger" onClick={() => act(row, 'reject')}>Reject</button>
        </>
      );
    }

    // FIX: Leave/Special tabs only ever show HR-stage actions on a
    // Forwarded request. A Pending row (if it ever appears) shows a
    // status message instead of buttons — HR has no action to take on it.
    if (row.status === 'Forwarded') {
      return (
        <>
          <button className="btn btn-sm btn-success me-2" onClick={() => act(row, 'approve')}>Approve</button>
          <button className="btn btn-sm btn-danger" onClick={() => act(row, 'reject')}>Reject (LOP)</button>
        </>
      );
    }
    if (row.status === 'Pending') {
      return <span className="text-muted small">Awaiting manager review</span>;
    }
    return <span className="text-muted">—</span>;
  };

  return (
    <div>
      <div className="row mb-4 g-3">
        <div className="col-md-3">
          <div className="card p-3 bg-primary bg-opacity-10">
            <div className="d-flex justify-content-between">
              <div><small>Total Requests</small><h3>{stats.total}</h3></div>
              <i className="fas fa-clipboard-list fs-2 text-primary"></i>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3 bg-warning bg-opacity-10">
            <div className="d-flex justify-content-between">
              <div><small>Pending</small><h3>{stats.pending}</h3></div>
              <i className="fas fa-clock fs-2 text-warning"></i>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3 bg-success bg-opacity-10">
            <div className="d-flex justify-content-between">
              <div><small>Approved Today</small><h3>{stats.approved_today}</h3></div>
              <i className="fas fa-check-circle fs-2 text-success"></i>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3 bg-danger bg-opacity-10">
            <div className="d-flex justify-content-between">
              <div><small>Rejected</small><h3>{stats.rejected}</h3></div>
              <i className="fas fa-times-circle fs-2 text-danger"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Request Management</h5>
          <select className="form-select w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {/* FIX: 'Pending' removed — HR never filters to a stage it can't act on */}
            {tab !== 'permission' && <option value="Forwarded">Forwarded</option>}
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="card-body">
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item"><button className={`nav-link ${tab === 'leave' ? 'active' : ''}`} onClick={() => setTab('leave')}><i className="fas fa-calendar me-1"></i>Leave Requests</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === 'permission' ? 'active' : ''}`} onClick={() => setTab('permission')}><i className="fas fa-clock me-1"></i>Permission Requests</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === 'special' ? 'active' : ''}`} onClick={() => setTab('special')}><i className="fas fa-star me-1"></i>Special Leave Requests</button></li>
          </ul>

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
  );
}