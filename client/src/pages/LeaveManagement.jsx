import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LeaveApplyForm from '../components/leave/LeaveApplyForm';
import LeaveHistoryTable from '../components/leave/LeaveHistoryTable';
import ManagerLeaveQueue from '../components/leave/ManagerLeaveQueue';
import HRLeaveQueue from '../components/leave/HRLeaveQueue';
import PermissionApplyForm from '../components/permission/PermissionApplyForm';
import PermissionHistoryTable from '../components/permission/PermissionHistoryTable';
import ManagerPermissionQueue from '../components/permission/ManagerPermissionQueue';

// ---------------------------------------------------------------------------
// Vertex Bank — Leave Management
// This page and every tab it renders (LeaveApplyForm, LeaveHistoryTable,
// ManagerLeaveQueue, HRLeaveQueue, and their Permission counterparts) used
// plain Bootstrap classes (.table.table-bordered, .card, .nav-tabs,
// .form-select) with no dark-mode awareness, so table text and card
// backgrounds stayed light-mode-only. Styled here once, at the top of the
// tree, using the --vb-* variables (defined in Topbar.jsx) — same pattern as
// Departments.jsx / Roles.jsx / EmployeeManagement.jsx. None of the child
// components need their own edits since they only ever render inside this
// wrapper.
// ---------------------------------------------------------------------------
const leave_management_styles = `
  .kr-page-container .nav-tabs {
    border-bottom: 1px solid var(--vb-border, #dee2e6);
  }
  .kr-page-container .nav-tabs .nav-link {
    color: var(--vb-text-muted, #495057);
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
  }
  .kr-page-container .nav-tabs .nav-link:hover {
    color: var(--vb-text, #1e293b);
    border-color: transparent;
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
  .kr-page-container .form-select:focus,
  .kr-page-container .form-control:focus {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .form-label { color: var(--vb-text, #1e293b); }

  .kr-page-container .card {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: none;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
  }

  .kr-page-container .table {
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table.table-bordered {
    border-color: var(--vb-border, #dee2e6);
  }
  .kr-page-container .table thead th {
    color: var(--vb-text-muted, #495057);
    border-color: var(--vb-border, #dee2e6);
    font-weight: 600;
  }
  .kr-page-container .table td,
  .kr-page-container .table th {
    border-color: var(--vb-border, #dee2e6);
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
`;

export default function LeaveManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState('apply');
  const [category, setCategory] = useState('leave'); // 'leave' | 'special' | 'permission'
  const [refreshKey, setRefreshKey] = useState(0);


  const isManager = !!user?.isManager;
  const isHR = user?.role === 'HR';

  const isPermission = category === 'permission';

  
  const showHRTab = isHR && !isPermission;

  const handleCategoryChange = (next) => {
    setCategory(next);
    if (next === 'permission' && tab === 'hr') setTab('apply'); // that tab won't exist anymore
  };

  return (
    <div className="kr-page-container">
      <style>{leave_management_styles}</style>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <ul className="nav nav-tabs">
          <li className="nav-item"><button className={`nav-link ${tab === 'apply' ? 'active' : ''}`} onClick={() => setTab('apply')}>Apply</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Requests</button></li>
          {isManager && <li className="nav-item"><button className={`nav-link ${tab === 'manager' ? 'active' : ''}`} onClick={() => setTab('manager')}>Manager Queue</button></li>}
          {showHRTab && <li className="nav-item"><button className={`nav-link ${tab === 'hr' ? 'active' : ''}`} onClick={() => setTab('hr')}>HR Queue</button></li>}
        </ul>

        <select className="form-select w-auto" value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
          <option value="leave">Leave</option>
          <option value="special">Special Leave</option>
          <option value="permission">Permission</option>
        </select>
      </div>

      {isPermission ? (
        <>
          {tab === 'apply' && <PermissionApplyForm onApplied={() => setRefreshKey((k) => k + 1)} />}
          {tab === 'my' && <PermissionHistoryTable refreshKey={refreshKey} />}
          {tab === 'manager' && isManager && <ManagerPermissionQueue />}
        </>
      ) : (
        <>
          {tab === 'apply' && <LeaveApplyForm category={category} onApplied={() => setRefreshKey((k) => k + 1)} />}
          {tab === 'my' && <LeaveHistoryTable category={category} refreshKey={refreshKey} />}
          {tab === 'manager' && isManager && <ManagerLeaveQueue category={category} />}
          {tab === 'hr' && isHR && <HRLeaveQueue category={category} />}
        </>
      )}
    </div>
  );
}