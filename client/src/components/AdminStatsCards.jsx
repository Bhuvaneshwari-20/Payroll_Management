

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

function DonutChart({ present, absent }) {
  const [animated, setAnimated] = useState(false);
  const total = present + absent;
  const presentPct = total ? Math.round((present / total) * 100) : 0;

  const size = 168;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const presentLength = total ? (present / total) * circumference : 0;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, [present, absent]);

  return (
    <div className="vb-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--vb-bg-surface-2, #f8f9fc)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#ef4444"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference - circumference : circumference}
          opacity={total ? 1 : 0}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <circle
          className="vb-donut-present"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference - presentLength : circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="vb-donut-center">
        <div className="vb-donut-pct">{presentPct}%</div>
        <div className="vb-donut-label">Present</div>
      </div>
    </div>
  );
}

function GenderBar({ male, female }) {
  const [animated, setAnimated] = useState(false);
  const total = male + female || 1;
  const malePct = Math.round((male / total) * 100);
  const femalePct = 100 - malePct;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, [male, female]);

  return (
    <div className="vb-gender">
      <div className="vb-gender-bar">
        <div
          className="vb-gender-seg vb-gender-male"
          style={{ width: animated ? `${malePct}%` : '0%' }}
        />
        <div
          className="vb-gender-seg vb-gender-female"
          style={{ width: animated ? `${femalePct}%` : '0%' }}
        />
      </div>
      <div className="vb-gender-legend">
        <div className="vb-gender-legend-item">
          <span className="vb-dot vb-dot-male" />
          <i className="fas fa-male"></i> Male
          <strong><AnimatedNumber value={male} /></strong>
        </div>
        <div className="vb-gender-legend-item">
          <span className="vb-dot vb-dot-female" />
          <i className="fas fa-female"></i> Female
          <strong><AnimatedNumber value={female} /></strong>
        </div>
      </div>
    </div>
  );
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
    const interval = setInterval(load, 300000); 
    return () => clearInterval(interval);
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return <div className="text-muted">Loading dashboard…</div>;

  return (
    <div>
      <style>{`
        .vb-overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .vb-chart-card {
          background: var(--vb-bg-surface, #fff);
          border: 1px solid var(--vb-border, #e6e8ec);
          border-radius: 18px;
          padding: 1.5rem;
          animation: vbChartIn 0.5s cubic-bezier(0.2,0.7,0.3,1) both;
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        .vb-overview-grid .vb-chart-card:nth-child(1) { animation-delay: 0.32s; }
        .vb-overview-grid .vb-chart-card:nth-child(2) { animation-delay: 0.4s; }

        @keyframes vbChartIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .vb-chart-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--vb-text, #1e293b);
          margin-bottom: 1.2rem;
        }

        /* Donut */
        .vb-donut-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0;
        }

        .vb-donut-present {
          transition: stroke-dashoffset 1.1s cubic-bezier(0.2,0.7,0.3,1);
        }

        .vb-donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .vb-donut-pct {
          font-size: 1.7rem;
          font-weight: 700;
          color: var(--vb-text, #1e293b);
        }

        .vb-donut-label {
          font-size: 0.75rem;
          color: var(--vb-text-muted, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Gender bar */
        .vb-gender {
          padding: 1.3rem 0 0.4rem;
        }

        .vb-gender-bar {
          height: 14px;
          border-radius: 999px;
          overflow: hidden;
          display: flex;
          background: var(--vb-bg-surface-2, #f8f9fc);
        }

        .vb-gender-seg {
          height: 100%;
          transition: width 1.1s cubic-bezier(0.2,0.7,0.3,1);
        }

        .vb-gender-male {
          background: linear-gradient(90deg, #0ea5e9, #38bdf8);
        }

        .vb-gender-female {
          background: linear-gradient(90deg, #e8622c, #f4a26c);
        }

        .vb-gender-legend {
          display: flex;
          justify-content: space-between;
          margin-top: 1.4rem;
          flex-wrap: wrap;
          gap: 0.8rem;
        }

        .vb-gender-legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--vb-text-muted, #64748b);
        }

        .vb-gender-legend-item strong {
          color: var(--vb-text, #1e293b);
          font-size: 0.95rem;
          margin-left: 0.2rem;
        }

        .vb-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }

        .vb-dot-male { background: #38bdf8; }
        .vb-dot-female { background: #e8622c; }

        /* ── Stat card gradients ──────────────────────────────────────
           Each card gets its own 3-stop diagonal gradient, sized larger
           than the box (220% 220%) so shifting background-position on
           hover/touch reads as the gradient actually MOVING rather than
           just swapping to a flat color. Adds a matching glow + lift for
           tactile feedback. :active covers touch devices that have no
           hover state. */
        .stat-card {
          background-size: 220% 220%;
          background-position: 0% 50%;
          transition: background-position 0.7s ease, transform 0.25s ease, box-shadow 0.25s ease;
          cursor: pointer;
        }
        .stat-card:hover,
        .stat-card:active,
        .stat-card:focus-visible {
          background-position: 100% 50%;
          transform: translateY(-5px) scale(1.015);
        }

        .departments-card {
          background-image: linear-gradient(135deg, #6d5df8 0%, #8a63f2 35%, #4f46e5 70%, #7c3aed 100%);
        }
        .departments-card:hover,
        .departments-card:active {
          box-shadow: 0 14px 34px rgba(109, 93, 248, 0.4);
        }

        .employees-card {
          background-image: linear-gradient(135deg, #22b8f0 0%, #38bdf8 35%, #2563eb 70%, #0ea5e9 100%);
        }
        .employees-card:hover,
        .employees-card:active {
          box-shadow: 0 14px 34px rgba(34, 184, 240, 0.4);
        }

        .present-card {
          background-image: linear-gradient(135deg, #22d68f 0%, #10b981 35%, #059669 70%, #34d399 100%);
        }
        .present-card:hover,
        .present-card:active {
          box-shadow: 0 14px 34px rgba(16, 185, 129, 0.4);
        }

        .absent-card {
          background-image: linear-gradient(135deg, #f97066 0%, #ef4444 35%, #dc2626 70%, #fb7185 100%);
        }
        .absent-card:hover,
        .absent-card:active {
          box-shadow: 0 14px 34px rgba(239, 68, 68, 0.4);
        }
      `}</style>

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

      <div className="vb-overview-grid">
        <div className="vb-chart-card">
          <div className="vb-chart-title">Today's Attendance</div>
          <DonutChart present={stats.presentToday} absent={stats.absentToday} />
        </div>

        <div className="vb-chart-card">
          <div className="vb-chart-title">Workforce Gender Split</div>
          <GenderBar male={stats.maleEmployees} female={stats.femaleEmployees} />
        </div>
      </div>

      {lastUpdate && (
        <div className="update-time">Last updated: {lastUpdate.toLocaleTimeString()}</div>
      )}
    </div>
  );
}