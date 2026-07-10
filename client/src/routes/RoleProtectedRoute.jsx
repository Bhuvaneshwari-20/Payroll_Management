import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

// Your system only has two real account types (see Sidebar.jsx):
//   - HR/Admin: user.role === 'HR' (exact string, from the `admin` table login)
//   - Employee: everything else — user.role is a numeric job role_id (e.g. 1 for
//     "ACCESSORIES COORDINATOR"), NEVER the string "employee". isManager is a
//     separate boolean flag on top of an employee account, not a role value.
//
// allowedRoles accepts: 'hr' / 'admin' (both mean isHR), 'employee' (any non-HR
// account), 'manager' (isManager === true). This mirrors Sidebar.jsx's isHR
// check exactly instead of comparing against role strings that don't exist.
export default function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;

  const allowed = allowedRoles.map((r) => r.toLowerCase());
  const isHR = user.role === 'HR';
  const isManager = !!user.isManager;
  const isEmployee = !isHR; // any logged-in non-HR account is "an employee"

  const permitted =
    ((allowed.includes('hr') || allowed.includes('admin')) && isHR) ||
    (allowed.includes('manager') && isManager) ||
    (allowed.includes('employee') && isEmployee);

  if (!permitted) return <Navigate to="/dashboard" replace />;

  return children;
}