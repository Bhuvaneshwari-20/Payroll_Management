// pages/Dashboard.jsx
// Replaces dash.php: HR sees the stat cards, Employee/Manager see their
// profile info card. Same "Dashboard" route, content branches on role
// (same as the PHP app using different includes per role).

import { useAuth } from '../context/AuthContext';
import AdminStatsCards from '../components/AdminStatsCards.jsx';
import EmployeeProfileCard from '../components/EmployeeProfileCard';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const isHR = user?.role === 'HR';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">
          {isHR ? 'Real-time overview of your organization' : 'Your profile overview'}
        </p>
      </div>

      {isHR ? <AdminStatsCards /> : <EmployeeProfileCard />}
    </div>
  );
}
