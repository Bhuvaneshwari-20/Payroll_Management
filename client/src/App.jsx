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
import LeaveManagement from './pages/LeaveManagement';
import ManagerLeaveManagement from './pages/ManagerLeaveManagement';
import AdminLeaveManagement from './pages/AdminLeaveManagement';
import LeaveAllocation from './pages/LeaveAllocation';

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

        {/* Employee + Manager — apply own leave, see own requests */}
        <Route path="/my-wallet" element={<LeaveManagement />} />

        {/* Manager only — approve/forward/reject their team's requests */}
        <Route path="/manager-leave-management" element={<ManagerLeaveManagement />} />

        {/* HR/Admin only — org-wide view, final approve/reject */}
        <Route path="/LeaveManagement" element={<AdminLeaveManagement />} />
        <Route path="/leave-allocation" element={<LeaveAllocation />} />

        {/* Still pending conversion — Phase 2 */}
        <Route path="/attendance-report" element={<ComingSoon title="Attendance Report" />} />
        <Route path="/salary-report" element={<ComingSoon title="Salary Report" />} />
        <Route path="/payslip-generator" element={<ComingSoon title="Payslip Generator" />} />
        <Route path="/employee-passwords" element={<ComingSoon title="Employee Password Management" />} />
        <Route path="/payslip" element={<ComingSoon title="My Payslips" />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}