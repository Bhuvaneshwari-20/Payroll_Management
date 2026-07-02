// components/AdminStatsCards.jsx
// Direct port of dash.php's stat cards + the jQuery $.ajax/animate logic,
// just using React state + useEffect instead of $(document).ready.

import { useEffect, useState } from 'react';
import { fetchAdminStats } from '../services/dashboardService';

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value <= 5) {
      setDisplay(value);
      return;
    }
    const duration = 1000;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [value]);

  return <>{display}</>;
}

export default function AdminStatsCards() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  async function load() {
    try {
      const data = await fetchAdminStats();
      if (data.status === 'success') {
        setStats(data);
        setLastUpdate(new Date());
        setError('');
      } else {
        setError(data.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to the server');
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 300000); // refresh every 5 minutes, same as PHP
    return () => clearInterval(interval);
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return <div className="text-muted">Loading dashboard…</div>;

  return (
    <div>
      <div className="dashboard-stats-grid">
        <div className="stat-card departments-card">
          <div className="stat-header">
            <div className="stat-icon">
              <i className="fas fa-building"></i>
            </div>
            <div className="stat-info">
              <div className="stat-title">Departments</div>
              <div className="stat-number">
                <AnimatedNumber value={stats.totalDepartments} />
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card employees-card">
          <div className="stat-header">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-info">
              <div className="stat-title">Total Employees</div>
              <div className="stat-number">
                <AnimatedNumber value={stats.totalEmployees} />
              </div>
            </div>
          </div>
          <div className="sub-stats">
            <div className="sub-stat">
              <div className="sub-stat-title">
                <i className="fas fa-male"></i> Male
              </div>
              <div className="sub-stat-number">
                <AnimatedNumber value={stats.maleEmployees} />
              </div>
            </div>
            <div className="sub-stat">
              <div className="sub-stat-title">
                <i className="fas fa-female"></i> Female
              </div>
              <div className="sub-stat-number">
                <AnimatedNumber value={stats.femaleEmployees} />
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card present-card">
          <div className="stat-header">
            <div className="stat-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <div className="stat-info">
              <div className="stat-title">Present Today</div>
              <div className="stat-number">
                <AnimatedNumber value={stats.presentToday} />
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card absent-card">
          <div className="stat-header">
            <div className="stat-icon">
              <i className="fas fa-user-times"></i>
            </div>
            <div className="stat-info">
              <div className="stat-title">Absent Today</div>
              <div className="stat-number">
                <AnimatedNumber value={stats.absentToday} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {lastUpdate && (
        <div className="update-time">Last updated: {lastUpdate.toLocaleTimeString()}</div>
      )}
    </div>
  );
}
