// pages/Dashboard.jsx
// Replaces dash.php: HR sees the stat cards, Employee/Manager see their
// profile info card. Same "Dashboard" route, content branches on role
// (same as the PHP app using different includes per role).
//
// Single-file component: styles are embedded below instead of a
// separate Dashboard.css. Delete Dashboard.css if it still exists.

import { useAuth } from '../context/AuthContext';
import AdminStatsCards from '../components/AdminStatsCards.jsx';
import EmployeeProfileCard from '../components/EmployeeProfileCard';

export default function Dashboard() {
  const { user } = useAuth();
  const isHR = user?.role === 'HR';

  return (
    <div className="dashboard">
      <style>{`
        /* ---------- Page wrapper ---------- */
        .dashboard {
          background: var(--vb-bg-page, #f4f5f7);
          min-height: 100%;
          padding: 1.5rem;
          transition: background 0.3s ease;
        }

        /* ---------- Shared dashboard header ---------- */
        .dashboard-header {
          margin-bottom: 2rem;
          animation: dashFadeUp 0.5s ease both;
        }

        .dashboard-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--vb-text, #1e293b);
          margin-bottom: 0.25rem;
        }

        .dashboard-subtitle {
          color: var(--vb-text-muted, #64748b);
        }

        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ---------- Admin stat cards (dash.php) ---------- */
        .dashboard-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          position: relative;
          padding: 1.75rem;
          border-radius: 20px;
          overflow: hidden;
          color: #fff;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          animation: dashCardIn 0.5s cubic-bezier(0.2,0.7,0.3,1) both;
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
        }

        /* stagger each card's entrance by its position in the grid */
        .dashboard-stats-grid .stat-card:nth-child(1) { animation-delay: 0.05s; }
        .dashboard-stats-grid .stat-card:nth-child(2) { animation-delay: 0.12s; }
        .dashboard-stats-grid .stat-card:nth-child(3) { animation-delay: 0.19s; }
        .dashboard-stats-grid .stat-card:nth-child(4) { animation-delay: 0.26s; }

        @keyframes dashCardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .stat-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 18px 34px rgba(0,0,0,0.16);
        }

        /* subtle sheen sweep on hover */
        .stat-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: -60%;
          width: 40%;
          height: 100%;
          background: linear-gradient(115deg, transparent, rgba(255,255,255,0.16), transparent);
          transform: skewX(-20deg);
          transition: left 0.6s ease;
          pointer-events: none;
        }

        .stat-card:hover::after {
          left: 130%;
        }

        .departments-card {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
        }
        .employees-card {
          background: linear-gradient(135deg, #0ea5e9, #38bdf8);
        }
        .present-card {
          background: linear-gradient(135deg, #10b981, #34d399);
        }
        .absent-card {
          background: linear-gradient(135deg, #ef4444, #f87171);
        }

        .stat-header {
          display: flex;
          align-items: flex-start;
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1.25rem;
          font-size: 1.4rem;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }

        .stat-card:hover .stat-icon {
          transform: scale(1.1) rotate(-6deg);
        }

        .stat-title {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
          margin-bottom: 0.25rem;
        }

        .stat-number {
          font-size: 2.2rem;
          font-weight: 700;
        }

        .sub-stats {
          display: flex;
          justify-content: space-between;
          margin-top: 1.25rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .sub-stat {
          text-align: center;
          flex: 1;
        }

        .sub-stat-title {
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
          opacity: 0.9;
        }

        .sub-stat-number {
          font-size: 1.5rem;
          font-weight: 600;
        }

        .update-time {
          text-align: right;
          color: var(--vb-text-muted, #64748b);
          font-size: 0.85rem;
          animation: dashFadeUp 0.5s ease 0.3s both;
        }

        /* ---------- Employee/Manager profile card ---------- */
        .employee-profile-card {
          display: flex;
          flex-wrap: wrap;
          background: var(--vb-bg-surface, #fff);
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          animation: dashCardIn 0.5s cubic-bezier(0.2,0.7,0.3,1) both;
        }

        .profile-sidebar {
          flex: 0 0 320px;
          background: linear-gradient(135deg, #e8622c 0%, #b8471d 100%);
          color: #fff;
          padding: 2rem;
          text-align: center;
          position: relative;
        }

        .profile-img {
          width: 130px;
          height: 130px;
          object-fit: cover;
          border-radius: 50%;
          border: 4px solid rgba(255, 255, 255, 0.3);
          margin-bottom: 1rem;
          transition: transform 0.3s ease;
        }

        .profile-img:hover {
          transform: scale(1.04);
        }

        .status-badge {
          display: inline-block;
          background: #1cc88a;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 0.75rem;
        }

        .status-badge.inactive {
          background: #e74a3b;
        }

        .employee-name {
          font-weight: 700;
          font-size: 20px;
          margin-bottom: 0.25rem;
        }

        .employee-role {
          opacity: 0.85;
          margin-bottom: 1rem;
        }

        .employee-code-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          padding: 6px 16px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 13px;
        }

        .employee-info {
          flex: 1;
          min-width: 280px;
          padding: 2rem;
          background: var(--vb-bg-surface, #fff);
        }

        .employee-info .section-title {
          position: relative;
          padding-left: 14px;
          margin-bottom: 1.5rem;
          font-weight: 600;
          color: var(--vb-text, #1e293b);
        }

        .employee-info .section-title::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 4px;
          background: #e8622c;
          border-radius: 2px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .info-card {
          display: flex;
          align-items: center;
          background: var(--vb-bg-surface-2, #f8f9fc);
          padding: 1rem;
          border-radius: 10px;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .info-card:hover {
          transform: translateY(-3px);
        }

        .info-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          margin-right: 1rem;
          flex-shrink: 0;
        }

        .department-icon {
          background: linear-gradient(135deg, #e8622c 0%, #b8471d 100%);
        }
        .role-icon {
          background: linear-gradient(135deg, #1cc88a 0%, #13855c 100%);
        }
        .manager-icon {
          background: linear-gradient(135deg, #36b9cc 0%, #258391 100%);
        }
        .id-icon {
          background: linear-gradient(135deg, #f6c23e 0%, #dda20a 100%);
        }

        .info-content h6 {
          font-size: 12px;
          color: var(--vb-text-muted, #858796);
          margin-bottom: 4px;
        }

        .info-content p {
          font-size: 15px;
          font-weight: 600;
          color: var(--vb-text, #5a5c69);
          margin: 0;
        }
      `}</style>

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