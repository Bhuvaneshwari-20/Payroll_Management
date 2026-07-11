import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logov from '../assets/images/logov.png';

// ---------------------------------------------------------------------------
// Vertex Bank — Sidebar
// Single-file component: markup, logic, and styles all live here.
// Uses the shared --vb-* theme variables (defined in Topbar.jsx) so the
// sidebar always matches the Topbar/Dashboard surface color exactly,
// in both light and dark mode.
// ---------------------------------------------------------------------------

const adminLinks = [
  { to: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
  { to: '/departments', icon: 'fa-building', label: 'Departments' },
  { to: '/roles', icon: 'fa-user-tag', label: 'Roles' },
  { to: '/employees', icon: 'fa-users', label: 'Employees' },
  { to: '/LeaveManagement', icon: 'fa-calendar', label: 'Leave Management' },
  { to: '/attendance', icon: 'fa-calendar-check', label: 'Attendance' },
  { to: '/attendance/report', icon: 'fa-clock', label: 'Attendance Report' },
  { to: '/salary-report', icon: 'fa-money-bill', label: 'Salary Report' },
  { to: '/leave-allocation', icon: 'fa-tasks', label: 'Leave Allocation' },
  { to: '/payslip-generator', icon: 'fa-file-invoice-dollar', label: 'Payslip Generator' },
  { to: '/employee-passwords', icon: 'fa-key', label: 'Employee Password Management' },
];

function employeeLinks(isManager) {
  const base = [
    { to: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    // Manager sees "HR Wallet" (their own leave apply); plain employee sees "My Wallet"
    { to: '/my-wallet', icon: 'fa-wallet', label: isManager ? 'HR Wallet' : 'My Wallet' },
    { to: '/payslip', icon: 'fa-file-invoice-dollar', label: 'My Payslips' },
  ];
  // Manager status comes from `managers` table via user.isManager
  // (set by backend on login/me) — NOT from user.role, since role
  // for employees is just a numeric role_id (their job title).
  if (isManager) {
    base.push({ to: '/manager-leave-management', icon: 'fa-calendar', label: 'Leave Management' });
  }
  return base;
}

export default function Sidebar() {
  const { user } = useAuth();
  const isHR = user?.role === 'HR';

  const links = isHR ? adminLinks : employeeLinks(!!user?.isManager);

  return (
    <div className="kr-sidebar">
      <style>{`
        .kr-sidebar {
          width: 250px;
          height: 100vh;
          background: var(--vb-bg-surface, #fff);
          border-right: 1px solid var(--vb-border, #e6e8ec);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        /* faint ledger-grid texture, echoes the login page — subtle in both themes */
        .kr-sidebar::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--vb-border, #e6e8ec) 1px, transparent 1px),
            linear-gradient(90deg, var(--vb-border, #e6e8ec) 1px, transparent 1px);
          background-size: 32px 32px;
          opacity: 0.35;
          pointer-events: none;
        }

        .kr-sidebar-header {
          position: relative;
          z-index: 1;
          padding: 1.6rem 1.4rem 1.4rem;
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--vb-border, #e6e8ec);
          animation: krFadeDown 0.5s ease both;
        }

        @keyframes krFadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .kr-sidebar-logo {
          height: 62px;
          width: auto;
          filter: drop-shadow(0 4px 10px rgba(232,98,44,0.25));
          transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }

        .kr-sidebar-logo:hover {
          transform: scale(1.05) rotate(-1deg);
        }

        .kr-nav {
          position: relative;
          z-index: 1;
          flex: 1;
          overflow-y: auto;
          padding: 1.1rem 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .kr-nav::-webkit-scrollbar { width: 5px; }
        .kr-nav::-webkit-scrollbar-thumb {
          background: var(--vb-border, #e6e8ec);
          border-radius: 10px;
        }

        .kr-nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.75rem 0.9rem;
          border-radius: 10px;
          color: var(--vb-text-muted, #64748b);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 500;
          overflow: hidden;
          transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
          animation: krItemIn 0.45s ease both;
          animation-delay: calc(var(--i, 0) * 0.045s);
        }

        @keyframes krItemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .kr-nav-item i {
          width: 18px;
          text-align: center;
          font-size: 0.95rem;
          flex-shrink: 0;
          transition: transform 0.25s ease;
        }

        /* animated fill sweeping in from the left on hover */
        .kr-nav-item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--vb-bg-surface-2, #f8f9fc);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s ease;
          border-radius: 10px;
          z-index: -1;
        }

        .kr-nav-item:hover {
          color: var(--vb-text, #1e293b);
          transform: translateX(3px);
        }

        .kr-nav-item:hover::before {
          transform: scaleX(1);
        }

        .kr-nav-item:hover i {
          transform: scale(1.12);
        }

        .kr-nav-item.active {
          color: var(--vb-text, #1e293b);
          background: linear-gradient(90deg, rgba(232,98,44,0.16), rgba(232,98,44,0.02));
          font-weight: 600;
        }

        .kr-nav-item.active::after {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3.5px;
          height: 60%;
          background: #e8622c;
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 10px rgba(232,98,44,0.6);
          animation: krBarGrow 0.3s ease both;
        }

        @keyframes krBarGrow {
          from { height: 0; }
          to { height: 60%; }
        }

        .kr-nav-item.active i {
          color: #e8622c;
        }
      `}</style>

      <div className="kr-sidebar-header">
        <img src={logov} alt="Vertex Bank" className="kr-sidebar-logo" />
      </div>

      <div className="kr-nav">
        {links.map((link, i) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={{ '--i': i }}
            className={({ isActive }) => 'kr-nav-item' + (isActive ? ' active' : '')}
          >
            <i className={`fas ${link.icon}`}></i>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}