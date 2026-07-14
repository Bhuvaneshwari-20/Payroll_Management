import { useState } from 'react';
import ManagerLeaveQueue from '../components/leave/ManagerLeaveQueue';
import ManagerPermissionQueue from '../components/permission/ManagerPermissionQueue';

// Same pattern as LeaveManagement.jsx / Departments.jsx / Roles.jsx /
// EmployeeManagement.jsx: Bootstrap's .nav-tabs/.card/.table don't know
// about the --vb-* theme variables (defined once in Topbar.jsx), so
// without this override block they stay hardcoded light and show up as
// a jarring white panel on a dark page. This was missing here, which is
// why the Manager view looked unstyled compared to the HR queue.
const manager_leave_styles = `
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

  .kr-page-container .page-heading {
    color: var(--vb-text, #1e293b);
    font-weight: 700;
    margin-bottom: 1rem;
  }

  @media (max-width: 768px) {
    .kr-page-container .nav-tabs .nav-link { padding: 0.5rem 0.65rem; font-size: 0.85rem; }
    .kr-page-container .table { font-size: 0.85rem; }
    .kr-page-container .page-heading { font-size: 1.2rem; }
  }
`;

export default function ManagerLeaveManagement() {
  const [tab, setTab] = useState('leave'); // 'leave' | 'special' | 'permission'

  return (
    <div className="kr-page-container">
      <style>{manager_leave_styles}</style>

      <h4 className="page-heading">Leave Management — Team Requests</h4>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'leave' ? 'active' : ''}`} onClick={() => setTab('leave')}>Leave Requests</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'special' ? 'active' : ''}`} onClick={() => setTab('special')}>Special Leave</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'permission' ? 'active' : ''}`} onClick={() => setTab('permission')}>Permission Requests</button></li>
      </ul>

      {tab === 'leave' && <ManagerLeaveQueue category="leave" />}
      {tab === 'special' && <ManagerLeaveQueue category="special" />}
      {tab === 'permission' && <ManagerPermissionQueue />}
    </div>
  );
}