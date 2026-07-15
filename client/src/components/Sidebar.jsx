import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logov from '../assets/images/logov.png';

// ---------------------------------------------------------------------------
// Vertex Bank — Sidebar
// Single-file component: markup, logic, and styles all live here.
// Uses the shared --vb-* theme variables (defined in Topbar.jsx) so the
// sidebar always matches the Topbar/Dashboard surface color exactly,
// in both light and dark mode.
//
// Leave Types / Leave Policy / Leave Allocation were three separate
// top-level links; they're now nested under one expandable "Leave
// Allocation" parent, since they're really one workflow (define types ->
// bundle into policies -> assign to employees).
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
  {
    icon: 'fa-tasks',
    label: 'Leave Allocation',
    children: [
      { to: '/leave-types', icon: 'fa-calendar-alt', label: 'Leave Types' },
      { to: '/leave-policies', icon: 'fa-sliders-h', label: 'Leave Policies' },
      { to: '/leave-allocation', icon: 'fa-user-check', label: 'Employee Leave Allocation' },
    ],
  },
  { to: '/payslip-generator', icon: 'fa-file-invoice-dollar', label: 'Payslip Generator' },
  { to: '/employee-passwords', icon: 'fa-key', label: 'Employee Password Management' },
];

function employeeLinks(isManager) {
  const base = [
    { to: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { to: '/my-wallet', icon: 'fa-wallet', label: isManager ? 'HR Wallet' : 'My Wallet' },
    { to: '/payslip', icon: 'fa-file-invoice-dollar', label: 'My Payslips' },
  ];
  if (isManager) {
    base.push({ to: '/manager-leave-management', icon: 'fa-calendar', label: 'Leave Management' });
  }
  return base;
}

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isHR = user?.role === 'HR';

  const links = isHR ? adminLinks : employeeLinks(!!user?.isManager);

  // Auto-expand the Leave Allocation group if the current route is one of
  // its children, so a page refresh on /leave-types still shows it open.
  const [openGroup, setOpenGroup] = useState(() => {
    const group = adminLinks.find((l) => l.children?.some((c) => c.to === pathname));
    return group ? group.label : null;
  });

  const toggleGroup = (label) => setOpenGroup((prev) => (prev === label ? null : label));

  return (
    <>
      <div
        className={'kr-sidebar-backdrop' + (isOpen ? ' show' : '')}
        aria-hidden="true"
      />
      <div className={'kr-sidebar' + (isOpen ? ' kr-sidebar-open' : '')}>
      <style>{`
        .kr-sidebar {
          width: 250px;
          height: 100vh;
          background: var(--vb-bg-surface, #fff);
          border-right: 1px solid var(--vb-border, #e6e8ec);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          align-self: flex-start;
          overflow: hidden;
          transition: background 0.3s ease, border-color 0.3s ease;
        }

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
          justify-content: space-between;
          border-bottom: 1px solid var(--vb-border, #e6e8ec);
          animation: krFadeDown 0.5s ease both;
        }

        .kr-sidebar-close {
          display: none;
          background: var(--vb-bg-surface-2, #f8f9fc);
          border: 1px solid var(--vb-border, #e6e8ec);
          color: var(--vb-text, #1e293b);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
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
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
        }

        @keyframes krItemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .kr-nav-item i.kr-nav-icon {
          width: 18px;
          text-align: center;
          font-size: 0.95rem;
          flex-shrink: 0;
          transition: transform 0.25s ease;
        }

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

        .kr-nav-item:hover i.kr-nav-icon {
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

        .kr-nav-item.active i.kr-nav-icon {
          color: #e8622c;
        }

        .kr-nav-group-toggle {
          justify-content: space-between;
        }

        .kr-nav-group-label {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .kr-nav-chevron {
          font-size: 0.75rem;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .kr-nav-chevron.open {
          transform: rotate(90deg);
        }

        .kr-nav-group-toggle.has-active-child {
          color: var(--vb-text, #1e293b);
          font-weight: 600;
        }

        .kr-nav-group-toggle.has-active-child i.kr-nav-icon {
          color: #e8622c;
        }

        .kr-nav-submenu {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding-left: 1.7rem;
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.25s ease;
        }

        .kr-nav-submenu.open {
          max-height: 260px;
        }

        .kr-nav-subitem {
          font-size: 0.82rem;
          padding: 0.6rem 0.85rem;
        }

        .kr-nav-subitem i.kr-nav-icon {
          font-size: 0.82rem;
        }

        .kr-sidebar-backdrop {
          display: none;
        }

        @media (max-width: 992px) {
          .kr-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1000;
            width: 260px;
            max-width: 80vw;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: 0 0 24px rgba(0,0,0,0.18);
          }

          .kr-sidebar.kr-sidebar-open {
            transform: translateX(0);
          }

          .kr-sidebar-close {
            display: flex;
          }

          .kr-sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            z-index: 999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
          }

          .kr-sidebar-backdrop.show {
            opacity: 1;
            pointer-events: auto;
          }
        }
      `}</style>

      <div className="kr-sidebar-header">
        <img src={logov} alt="Vertex Bank" className="kr-sidebar-logo" />
        <button
          type="button"
          className="kr-sidebar-close"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="kr-nav">
        {links.map((link, i) => {
          if (link.children) {
            const isOpen = openGroup === link.label;
            const hasActiveChild = link.children.some((c) => c.to === pathname);
            return (
              <div key={link.label} style={{ '--i': i }}>
                <button
                  type="button"
                  className={
                    'kr-nav-item kr-nav-group-toggle' +
                    (hasActiveChild ? ' has-active-child' : '')
                  }
                  onClick={() => toggleGroup(link.label)}
                >
                  <span className="kr-nav-group-label">
                    <i className={`fas ${link.icon} kr-nav-icon`}></i>
                    <span>{link.label}</span>
                  </span>
                  <i className={`fas fa-chevron-right kr-nav-chevron${isOpen ? ' open' : ''}`}></i>
                </button>
                <div className={`kr-nav-submenu${isOpen ? ' open' : ''}`}>
                  {link.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        'kr-nav-item kr-nav-subitem' + (isActive ? ' active' : '')
                      }
                    >
                      <i className={`fas ${child.icon} kr-nav-icon`}></i>
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={link.to}
              to={link.to}
              style={{ '--i': i }}
              className={({ isActive }) => 'kr-nav-item' + (isActive ? ' active' : '')}
            >
              <i className={`fas ${link.icon} kr-nav-icon`}></i>
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>
      </div>
    </>
  );
}