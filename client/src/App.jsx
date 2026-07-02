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
        <Route path="/attendance" element ={<Attendance/>}/>

        {/* Still pending conversion — Phase 2 */}
        <Route path="/admin-leave-management" element={<ComingSoon title="Leave Management" />} />
        <Route path="/attendance-report" element={<ComingSoon title="Attendance Report" />} />
        <Route path="/salary-report" element={<ComingSoon title="Salary Report" />} />
        <Route path="/leave-allocation" element={<ComingSoon title="Leave Allocation" />} />
        <Route path="/payslip-generator" element={<ComingSoon title="Payslip Generator" />} />
        <Route path="/employee-passwords" element={<ComingSoon title="Employee Password Management" />} />
        <Route path="/wallet" element={<ComingSoon title="HR Wallet" />} />
        <Route path="/payslip" element={<ComingSoon title="My Payslips" />} />
        <Route path="/head-leave-management" element={<ComingSoon title="Leave Management" />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}