import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logov from "../assets/images/logov.png";

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
      <div className="kr-sidebar-header">
        <img src={logov} alt="vertex" height="40" className="kr-sidebar-logo" />
      </div>
      <div className="kr-nav mt-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
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