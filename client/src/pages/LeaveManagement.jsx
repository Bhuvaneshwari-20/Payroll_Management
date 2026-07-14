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
//
// UI pass: added entrance animation, motion on tabs/buttons/rows, and
// stronger visible contrast on cards/inputs/tables/badges — the previous
// version was readable but visually flat (borders barely registered
// against the dark surface, no hover/press feedback anywhere).
//
// Fix: native <input type="date"> renders its calendar-picker icon in a
// dark tone by default, so on a dark surface it was effectively invisible
// (only a tooltip appeared on hover, no visible glyph). `color-scheme: dark`
// tells the browser this control sits on a dark background so it swaps in
// its light-on-dark native chrome, and we add a subtle hover state so the
// icon reads as an interactive target.
// ---------------------------------------------------------------------------
const leave_management_styles = `
  @keyframes lmFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes lmFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .kr-page-container {
    animation: lmFadeUp 0.35s ease both;
  }

  /* ---------- Tabs ---------- */
  .kr-page-container .nav-tabs {
    border-bottom: 1px solid var(--vb-border, #dee2e6);
    flex-wrap: wrap !important;
    overflow-x: visible !important;
    row-gap: 0.35rem;
    gap: 0.25rem;
  }
  .kr-page-container .nav-tabs .nav-link {
    color: var(--vb-text-muted, #495057);
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    white-space: nowrap;
    font-weight: 600;
    letter-spacing: 0.01em;
    border-radius: 8px 8px 0 0;
    padding: 0.6rem 1rem;
    transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  }
  .kr-page-container .nav-tabs .nav-link:hover {
    color: var(--vb-text, #1e293b);
    background: var(--vb-bg-surface-2, #f8f9fc);
    border-color: transparent;
  }
  .kr-page-container .nav-tabs .nav-link.active {
    color: var(--vb-orange, #e8622c);
    background: var(--vb-bg-surface-2, transparent);
    border-bottom: 2px solid var(--vb-orange, #a4133c);
    animation: lmFadeIn 0.25s ease both;
  }

  .kr-page-container .leave-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  /* ---------- Form controls ---------- */
  .kr-page-container .form-select,
  .kr-page-container .form-control {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border: 1.5px solid var(--vb-border, #ced4da);
    border-radius: 8px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  }
  .kr-page-container .form-select:hover,
  .kr-page-container .form-control:hover {
    border-color: var(--vb-orange, #e8622c);
  }
  .kr-page-container .form-select:focus,
  .kr-page-container .form-control:focus {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border-color: var(--vb-orange, #e8622c);
    box-shadow: 0 0 0 3px rgba(232, 98, 44, 0.18);
  }
  .kr-page-container .form-control::placeholder {
    color: var(--vb-text-muted, #9ca3af);
    opacity: 0.75;
  }
  .kr-page-container .form-label {
    color: var(--vb-text, #1e293b);
    font-weight: 600;
    font-size: 0.85rem;
    letter-spacing: 0.01em;
  }

  /* ---------- Date inputs ----------
     Native date controls render a dark calendar-picker glyph by default,
     which disappears against a dark surface. color-scheme tells the
     browser to use its light-on-dark native chrome instead, and we style
     the icon target directly so it's visibly clickable. */
  .kr-page-container input[type="date"] {
    color-scheme: dark;
    padding-right: 0.5rem;
  }
  .kr-page-container input[type="date"]::-webkit-calendar-picker-indicator {
    opacity: 1;
    cursor: pointer;
    padding: 6px;
    margin-right: -2px;
    border-radius: 6px;
    background-color: var(--vb-orange, #e8622c);
    transition: background-color 0.2s ease, transform 0.15s ease;
  }
  .kr-page-container input[type="date"]::-webkit-calendar-picker-indicator:hover {
    background-color: var(--vb-orange-dark, #cf5323);
    transform: scale(1.05);
  }
  .kr-page-container input[type="date"]::-webkit-datetime-edit-fields-wrapper,
  .kr-page-container input[type="date"]::-webkit-datetime-edit-text,
  .kr-page-container input[type="date"]::-webkit-datetime-edit-month-field,
  .kr-page-container input[type="date"]::-webkit-datetime-edit-day-field,
  .kr-page-container input[type="date"]::-webkit-datetime-edit-year-field {
    color: var(--vb-text, #1e293b);
  }

  /* ---------- Card (Apply form) ---------- */
  .kr-page-container .card {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, transparent);
    border-radius: 14px;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
    animation: lmFadeUp 0.4s ease both;
    transition: box-shadow 0.25s ease, transform 0.25s ease;
  }
  .kr-page-container .card h5 {
    font-weight: 700;
    color: var(--vb-text, #1e293b);
    position: relative;
    padding-left: 14px;
  }
  .kr-page-container .card h5::before {
    content: '';
    position: absolute;
    left: 0;
    top: 2px;
    bottom: 2px;
    width: 4px;
    border-radius: 3px;
    background: var(--vb-orange, #e8622c);
  }

  /* ---------- Tables (Manager/HR queues, My Requests) ----------
     These render as bare <table> elements with no wrapping .card, which
     is why they read as "flat" against the page background. Giving the
     table itself card-like chrome (surface color, radius, shadow) fixes
     that without touching the child components. */
  .kr-page-container .table.table-bordered {
    background: var(--vb-bg-surface, #fff);
    border-color: var(--vb-border, #dee2e6);
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
    animation: lmFadeUp 0.4s ease both;
  }
  .kr-page-container .table {
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table thead th {
    color: var(--vb-text-muted, #495057);
    border-color: var(--vb-border, #dee2e6);
    background: var(--vb-bg-surface-2, #f8f9fc);
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.85rem 0.9rem;
  }
  .kr-page-container .table td,
  .kr-page-container .table th {
    border-color: var(--vb-border, #dee2e6);
    vertical-align: middle;
    padding: 0.75rem 0.9rem;
  }
  .kr-page-container .table > :not(caption) > * > * {
    background-color: transparent;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table-hover > tbody > tr {
    transition: background 0.15s ease;
  }
  .kr-page-container .table-hover > tbody > tr:hover > * {
    background-color: var(--vb-bg-surface-2, #f8f9fc);
  }

  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  /* ---------- Buttons ---------- */
  .kr-page-container .btn {
    border-radius: 8px;
    font-weight: 600;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, opacity 0.15s ease;
  }
  .kr-page-container .btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px var(--vb-shadow, rgba(0,0,0,0.18));
  }
  .kr-page-container .btn:active:not(:disabled) {
    transform: translateY(0);
  }
  .kr-page-container .btn-primary {
    background: linear-gradient(135deg, var(--vb-orange, #e8622c), var(--vb-orange-dark, #cf5323));
    border-color: transparent;
  }
  .kr-page-container .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--vb-orange-dark, #cf5323), var(--vb-orange-dark, #cf5323));
  }

  /* ---------- Status badges ---------- */
  .kr-page-container .badge {
    font-weight: 700;
    font-size: 0.72rem;
    letter-spacing: 0.03em;
    padding: 0.42em 0.75em;
    border-radius: 999px;
    transition: transform 0.15s ease;
  }

  /* ---------- Responsive ---------- */
  @media (max-width: 768px) {
    .kr-page-container .leave-header-row { flex-direction: column; align-items: stretch; }
    .kr-page-container .leave-header-row select { width: 100%; }
    .kr-page-container .nav-tabs .nav-link { padding: 0.5rem 0.65rem; font-size: 0.85rem; }
    .kr-page-container .table { font-size: 0.85rem; }
  }
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

      <div className="leave-header-row mb-3">
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