import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/images/logo.png';

// ---------------------------------------------------------------------------
// Vertex Bank — Topbar
// Single-file component. Also defines the app-wide light/dark CSS variables
// (--vb-bg-page, --vb-bg-surface, --vb-text, etc.) so every other page can
// use them once this component has mounted once (it lives in the shared
// layout, so it always has).
// ---------------------------------------------------------------------------

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const userMenuRef = useRef(null);

  const displayName =
  user?.name ||
  user?.first_name ||
  user?.employee_code ||
  (typeof user?.role === 'string' ? user.role : 'User');
const initials = String(displayName || 'U').slice(0, 2).toUpperCase();

  // Close the dropdown on outside click / Escape, and confirm this handler
  // is actually reachable — if the console never logs "user menu toggled"
  // when you click, something above this component (an overlay, a stray
  // full-screen modal, etc.) is intercepting the click before it gets here.
  useEffect(() => {
    function handleOutsideClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="kr-topbar">
      <style>{`
        /* -------------------------------------------------------------
           Global theme variables — control the whole app's light/dark
           surfaces. Other pages/components can use these var(...) too.
        ------------------------------------------------------------- */
        :root {
          --vb-orange: #e8622c;
          --vb-orange-dark: #cf5323;
          --vb-bg-page: #f2f3f5;
          --vb-bg-surface: #ffffff;
          --vb-bg-surface-2: #f8f9fc;
          --vb-text: #1e293b;
          --vb-text-muted: #64748b;
          --vb-border: #e6e8ec;
          --vb-shadow: rgba(20,20,20,0.06);
        }

        :root[data-theme='dark'] {
          --vb-bg-page: #0e1621;
          --vb-bg-surface: #16202c;
          --vb-bg-surface-2: #1c2836;
          --vb-text: #eef2f6;
          --vb-text-muted: #93a0b3;
          --vb-border: #263241;
          --vb-shadow: rgba(0,0,0,0.35);
        }

        body {
          background: var(--vb-bg-page);
          color: var(--vb-text);
          transition: background 0.3s ease, color 0.3s ease;
        }

        /* -------------------------------------------------------------
           Topbar
        ------------------------------------------------------------- */
        .kr-topbar {
          background: var(--vb-bg-surface);
          border-bottom: 1px solid var(--vb-border);
          padding: 0.9rem 1.5rem;
          position: sticky;
          top: 0;
          z-index: 50;
          transition: background 0.3s ease, border-color 0.3s ease;
          animation: vbTopIn 0.5s ease both;
        }

        @keyframes vbTopIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .kr-toggle-btn {
          background: var(--vb-bg-surface-2);
          border: 1px solid var(--vb-border);
          color: var(--vb-text);
          width: 38px;
          height: 38px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
        }

        .kr-toggle-btn:hover {
          background: var(--vb-border);
          transform: translateY(-1px);
        }

        .kr-mobile-logo {
          height: 34px;
          width: auto;
        }

        .kr-topbar-right {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        /* Theme toggle switch */
        .kr-theme-btn {
          position: relative;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid var(--vb-border);
          background: var(--vb-bg-surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--vb-text);
          overflow: hidden;
          transition: background 0.2s ease, transform 0.15s ease;
        }

        .kr-theme-btn:hover {
          transform: translateY(-1px) rotate(-8deg);
          background: var(--vb-border);
        }

        .kr-theme-btn svg {
          position: absolute;
          transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }

        .kr-theme-btn .kr-sun {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
        .kr-theme-btn .kr-moon {
          opacity: 0;
          transform: scale(0.4) rotate(-60deg);
        }

        :root[data-theme='dark'] .kr-theme-btn .kr-sun {
          opacity: 0;
          transform: scale(0.4) rotate(60deg);
        }
        :root[data-theme='dark'] .kr-theme-btn .kr-moon {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }

        /* Notification bell */
        .kr-notification-btn {
          position: relative;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid var(--vb-border);
          background: var(--vb-bg-surface-2);
          color: var(--vb-text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
        }

        .kr-notification-btn:hover {
          background: var(--vb-border);
          transform: translateY(-1px);
        }

        .kr-notification-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          background: var(--vb-orange);
          color: #fff;
          font-size: 0.62rem;
          font-weight: 700;
          min-width: 17px;
          height: 17px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--vb-bg-surface);
          animation: vbPulse 2.2s ease-in-out infinite;
        }

        @keyframes vbPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,98,44,0.4); }
          50% { box-shadow: 0 0 0 4px rgba(232,98,44,0); }
        }

        /* User menu */
        .vb-user-menu {
          position: relative;
          z-index: 60;
        }

        .vb-user-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: var(--vb-bg-surface-2);
          border: 1px solid var(--vb-border);
          padding: 0.35rem 0.7rem 0.35rem 0.35rem;
          border-radius: 999px;
          cursor: pointer;
          color: var(--vb-text);
          font-size: 0.86rem;
          font-weight: 600;
          transition: background 0.2s ease, transform 0.15s ease;
        }

        .vb-user-btn:hover {
          background: var(--vb-border);
          transform: translateY(-1px);
        }

        .kr-user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--vb-orange), var(--vb-orange-dark));
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .vb-user-btn i.fa-chevron-down {
          font-size: 0.7rem;
          color: var(--vb-text-muted);
          transition: transform 0.2s ease;
        }

        .vb-user-btn[aria-expanded='true'] i.fa-chevron-down {
          transform: rotate(180deg);
        }

        .vb-user-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 10px);
          background: var(--vb-bg-surface);
          border: 1px solid var(--vb-border);
          border-radius: 12px;
          min-width: 180px;
          box-shadow: 0 14px 34px var(--vb-shadow);
          padding: 0.4rem;
          animation: vbDropIn 0.18s ease both;
          transform-origin: top right;
          display: block !important;
          visibility: visible !important;
          opacity: 1;
        }

        @keyframes vbDropIn {
          from { opacity: 0; transform: scale(0.94) translateY(-6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .vb-user-dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          background: none;
          border: none;
          text-align: left;
          padding: 0.6rem 0.7rem;
          border-radius: 8px;
          font-size: 0.86rem;
          font-weight: 600;
          cursor: pointer;
          color: #d64545;
          transition: background 0.15s ease;
        }

        .vb-user-dropdown-item:hover {
          background: rgba(214,69,69,0.1);
        }
      `}</style>

      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <button type="button" className="kr-toggle-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
            <i className="fas fa-bars"></i>
          </button>
          <img src={logo} alt="Vertex Bank" className="kr-mobile-logo ms-3" />
        </div>

        <div className="kr-topbar-right">
          <button
            type="button"
            className="kr-theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            <svg className="kr-sun" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3.4" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9 1.5v2M9 14.5v2M16.5 9h-2M3.5 9h-2M14.4 3.6l-1.4 1.4M4.99 13.01 3.6 14.4M14.4 14.4l-1.4-1.4M4.99 4.99 3.6 3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <svg className="kr-moon" width="17" height="17" viewBox="0 0 18 18" fill="none">
              <path d="M15 10.2A6.4 6.4 0 0 1 7.8 3 6.6 6.6 0 1 0 15 10.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="kr-notification-menu">
            <button type="button" className="kr-notification-btn" aria-label="Notifications">
              <i className="fas fa-bell"></i>
              <span className="kr-notification-badge">0</span>
            </button>
          </div>

          <div className="vb-user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="vb-user-btn"
              onClick={() => {
                console.log('[Topbar] user menu button clicked'); // TEMP: remove once confirmed working
                setMenuOpen((o) => !o);
              }}
              aria-expanded={menuOpen}
            >
              <span className="kr-user-avatar">{initials}</span>
              <span>{displayName}</span>
              <i className="fas fa-chevron-down"></i>
            </button>
            {menuOpen && (
              <div className="vb-user-dropdown">
                <button type="button" className="vb-user-dropdown-item" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt me-2"></i>Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}