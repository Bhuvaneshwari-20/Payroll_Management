import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Roles from './pages/Roles';
import EmployeeManagement from './pages/EmployeeManagement';
import Attendance from './pages/Attendance';
import ComingSoon from './pages/ComingSoon';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleProtectedRoute from './routes/RoleProtectedRoute';
import LeaveManagement from './pages/LeaveManagement';
import ManagerLeaveManagement from './pages/ManagerLeaveManagement';
import AdminLeaveManagement from './pages/AdminLeaveManagement';
import LeaveAllocation from './pages/LeaveAllocation';
import SalaryReport from './pages/SalaryReport';
import PayslipGenerator from './pages/PayslipGenerator';
import MyPayslips from './pages/MyPayslips';
import PasswordReset from './pages/PasswordReset';
import AttendanceReport from './pages/AttendanceReport';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/employees" element={<EmployeeManagement />} />
        <Route path="/attendance" element={<Attendance />} />

        {/* Employee + Manager -- apply own leave, see own requests */}
        <Route path="/my-wallet" element={<LeaveManagement />} />

        {/* Manager only -- approve/forward/reject their team's requests */}
        <Route path="/manager-leave-management" element={<ManagerLeaveManagement />} />

        {/* HR/Admin only -- org-wide view, final approve/reject */}
        <Route path="/LeaveManagement" element={<AdminLeaveManagement />} />
        <Route path="/leave-allocation" element={<LeaveAllocation />} />

        {/* Still pending conversion -- Phase 2 */}
      <Route path="attendance/report" element={<RoleProtectedRoute allowedRoles={['hr','manager','employee']}><AttendanceReport /></RoleProtectedRoute>} />
        <Route path="/salary-report" element={<SalaryReport />} />

        <Route
          path="/payslip-generator"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'hr']}>
              <PayslipGenerator />
            </RoleProtectedRoute>
          }
        />

        {/* Path fixed to match Sidebar.jsx's actual link ('/employee-passwords',
            not '/passwordReset' -- that mismatch was sending everyone to the
            catch-all '*' route, which redirects to /dashboard). Also now
            gated to HR/admin only, matching every other HR-only page. */}
        <Route
          path="/employee-passwords"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'hr']}>
              <PasswordReset />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/payslip"
          element={
            <RoleProtectedRoute allowedRoles={['employee', 'manager']}>
              <MyPayslips />
            </RoleProtectedRoute>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}