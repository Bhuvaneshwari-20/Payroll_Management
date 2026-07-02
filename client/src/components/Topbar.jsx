
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from "../assets/images/logo.png";

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const displayName = user?.role;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="kr-topbar">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <button className="kr-toggle-btn" onClick={onToggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <img
            src={logo}
            alt="KR Toyota"
            className="kr-mobile-logo ms-3"
          />
        </div>

        <div className="d-flex align-items-center">
          <div className="kr-notification-menu">
            <button className="kr-notification-btn">
              <i className="fas fa-bell"></i>
              <span className="kr-notification-badge">0</span>
            </button>
          </div>

          <div className="kr-user-menu">
            <button className="kr-user-btn" onClick={() => setMenuOpen((o) => !o)}>
              <i className="fas fa-user"></i>
              <span>{displayName}</span>
              <i className="fas fa-chevron-down ms-2"></i>
            </button>
            {menuOpen && (
              <div className="kr-dropdown-menu show">
                <div className="dropdown-divider"></div>
                <button className="kr-dropdown-item text-danger" onClick={handleLogout}>
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
