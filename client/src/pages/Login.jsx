import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import back from '../assets/images/back.png';

// ---------------------------------------------------------------------------
// Vertex Bank — Login
// Single-file component: markup, logic, and styles all live here.
// The right-side scene uses assets/images/back.png as a full-bleed background.
// ---------------------------------------------------------------------------

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const formRef = useRef(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (formRef.current && !formRef.current.checkValidity()) {
      setValidated(true);
      return;
    }

    setValidated(true);
    setSubmitting(true);

    try {
      const res = await login(employeeId, password);

      if (res.success) {
        setUnlocked(true);
        setTimeout(() => navigate('/dashboard', { replace: true }), 500);
      } else {
        setErrorMsg(res.message || 'Invalid employee ID or password');
        setSubmitting(false);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="vb-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');

        :root {
          --vb-orange: #e8622c;
          --vb-orange-dark: #cf5323;
          --vb-ink: #24272d;
          --vb-gray: #8a919c;
          --vb-line: #e7e5e1;
          --vb-panel: #fbfaf8;
        }

        * { box-sizing: border-box; }

        .vb-page {
          min-height: 100vh;
          width: 100%;
          background: #eceae6;
          font-family: 'Inter', sans-serif;
          color: var(--vb-ink);
        }

        .vb-card {
          width: 100%;
          min-height: 100vh;
          background: #fff;
          display: flex;
          overflow: hidden;
          animation: vbCardIn 0.6s cubic-bezier(0.2,0.7,0.3,1) both;
        }

        @keyframes vbCardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ---------------- Left: form ---------------- */
        .vb-form-side {
          flex: 0 0 44%;
          background: var(--vb-panel);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2.6rem 4rem;
          position: relative;
        }

        .vb-mark {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          margin-bottom: 3.2rem;
          animation: vbFadeDown 0.6s ease 0.1s both;
        }

        @keyframes vbFadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .vb-wordmark {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.15;
          color: var(--vb-ink);
        }

        .vb-panel-inner {
          max-width: 400px;
          width: 100%;
        }

        .vb-heading {
          font-size: 2.4rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          animation: vbFadeUp 0.6s ease 0.15s both;
        }

        .vb-sub {
          font-size: 1.05rem;
          color: var(--vb-gray);
          margin: 0 0 2.4rem 0;
          animation: vbFadeUp 0.6s ease 0.2s both;
        }

        @keyframes vbFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .vb-field {
          margin-bottom: 1.3rem;
          animation: vbFadeUp 0.6s ease 0.25s both;
        }

        .vb-field label {
          display: block;
          font-size: 0.92rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--vb-ink);
        }

        .vb-input-wrap {
          position: relative;
        }

        .vb-input-wrap svg.vb-icon {
          position: absolute;
          left: 0.9rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--vb-gray);
          pointer-events: none;
        }

        .vb-input-wrap input {
          width: 100%;
          padding: 0.9rem 0.9rem 0.9rem 2.7rem;
          font-size: 1rem;
          font-family: 'Inter', sans-serif;
          color: var(--vb-ink);
          background: #fff;
          border: 1.5px solid var(--vb-line);
          border-radius: 10px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .vb-input-wrap input:focus {
          border-color: var(--vb-orange);
          box-shadow: 0 0 0 3px rgba(232,98,44,0.12);
        }

        .vb-input-wrap.vb-has-toggle input {
          padding-right: 2.5rem;
        }

        .vb-eye-btn {
          position: absolute;
          right: 0.8rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--vb-gray);
          padding: 0.2rem;
          display: flex;
        }

        .vb-eye-btn:hover { color: var(--vb-ink); }

        .vb-invalid {
          display: none;
          font-size: 0.76rem;
          color: #c0392b;
          margin-top: 0.35rem;
        }

        .vb-page form.was-validated .vb-field input:invalid ~ .vb-invalid {
          display: block;
        }

        .vb-page form.was-validated .vb-input-wrap input:invalid {
          border-color: #c0392b;
        }

        .vb-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.8rem;
          font-size: 0.95rem;
          animation: vbFadeUp 0.6s ease 0.3s both;
        }

        .vb-check {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--vb-ink);
          cursor: pointer;
          user-select: none;
        }

        .vb-check input {
          width: 16px;
          height: 16px;
          accent-color: var(--vb-orange);
          cursor: pointer;
        }

        .vb-btn {
          width: 100%;
          padding: 1rem;
          border: none;
          border-radius: 10px;
          background: var(--vb-orange);
          color: #fff;
          font-size: 1.02rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          cursor: pointer;
          transition: background 0.22s ease, transform 0.15s ease, box-shadow 0.22s ease;
          animation: vbFadeUp 0.6s ease 0.35s both;
        }

        .vb-btn:hover:not(:disabled) {
          background: var(--vb-orange-dark);
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(232,98,44,0.25);
        }

        .vb-btn:disabled { opacity: 0.75; cursor: not-allowed; }

        .vb-btn.vb-unlocked { background: #1f9d63; }

        .vb-lock {
          width: 15px;
          height: 15px;
          position: relative;
        }

        .vb-lock svg {
          position: absolute;
          inset: 0;
          transition: opacity 0.2s ease, transform 0.3s ease;
        }

        .vb-lock .vb-closed { opacity: 1; transform: rotate(0deg); }
        .vb-lock .vb-check-icon { opacity: 0; transform: scale(0.5); }
        .vb-btn.vb-unlocked .vb-closed { opacity: 0; transform: rotate(-25deg); }
        .vb-btn.vb-unlocked .vb-check-icon { opacity: 1; transform: scale(1); }

        .vb-alert {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          background: #fdeceb;
          border: 1px solid #f3b9b4;
          color: #8c221b;
          padding: 0.7rem 1.1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          animation: vbSlideIn 0.3s ease both;
        }

        @keyframes vbSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* ---------------- Right: illustrated scene ---------------- */
        .vb-scene-side {
          flex: 0 0 56%;
          position: relative;
          overflow: hidden;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          animation: vbSceneZoom 12s ease-out both;
        }

        @keyframes vbSceneZoom {
          from { background-size: 112%; }
          to { background-size: 100%; }
        }

        .vb-scene-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(150deg, rgba(30,20,12,0.75) 0%, rgba(40,26,14,0.35) 45%, rgba(20,14,8,0.55) 100%);
        }

        .vb-scene-content {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem 2.8rem;
        }

        .vb-scene-text {
          max-width: 380px;
          animation: vbFadeUp 0.7s ease 0.3s both;
        }

        .vb-scene-title {
          font-size: 2.3rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.15;
          margin: 0 0 0.9rem 0;
        }

        .vb-scene-sub {
          font-size: 0.98rem;
          color: rgba(255,255,255,0.75);
          line-height: 1.5;
          margin: 0;
        }

        /* Floating info cards, echoing a live dashboard */
        .vb-float-stage {
          position: relative;
          flex: 1;
          margin: 1.5rem 0;
        }

        .vb-float-card {
          position: absolute;
          background: rgba(255,255,255,0.94);
          backdrop-filter: blur(6px);
          border-radius: 12px;
          padding: 0.8rem 1rem;
          box-shadow: 0 14px 30px rgba(0,0,0,0.18);
          animation: vbCardFloat 6s ease-in-out infinite;
        }

        .vb-float-card.vb-c1 {
          top: 4%;
          left: 4%;
          animation-delay: 0s;
        }

        .vb-float-card.vb-c2 {
          top: 40%;
          right: 2%;
          animation-delay: 1.5s;
        }

        .vb-float-card.vb-c3 {
          bottom: 2%;
          left: 12%;
          animation-delay: 3s;
        }

        @keyframes vbCardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .vb-fcard-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--vb-ink);
          margin-bottom: 0.15rem;
        }

        .vb-fcard-sub {
          font-size: 0.72rem;
          color: var(--vb-gray);
        }

        .vb-avatars {
          display: flex;
          margin-top: 0.5rem;
        }

        .vb-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #fff;
          margin-left: -7px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 700;
          color: #fff;
        }

        .vb-avatar:first-child { margin-left: 0; }

        .vb-badges {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          background: rgba(20,15,10,0.35);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 1.1rem 1.4rem;
          animation: vbFadeUp 0.7s ease 0.55s both;
        }

        .vb-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          text-align: center;
        }

        .vb-badge-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,0.14);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }

        .vb-badge-label {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.85);
          font-weight: 500;
          line-height: 1.3;
        }

        @media (max-width: 900px) {
          .vb-card { flex-direction: column; min-height: auto; }
          .vb-form-side, .vb-scene-side { flex: 0 0 auto; }
          .vb-scene-side { min-height: 420px; }
          .vb-form-side { padding: 2.2rem 1.6rem; }
        }
      `}</style>

      {errorMsg && (
        <div className="vb-alert" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="vb-card">
        {/* -------- Left: form -------- */}
        <div className="vb-form-side">
          <div className="vb-mark">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect x="2" y="12" width="16" height="16" rx="2" stroke="#e8622c" strokeWidth="2.4"/>
              <rect x="14" y="2" width="18" height="18" rx="2" stroke="#3a3f47" strokeWidth="2.4"/>
              <circle cx="17" cy="17" r="2.6" fill="#e8622c"/>
            </svg>
            <span className="vb-wordmark">Vertex<br/>Bank</span>
          </div>

          <div className="vb-panel-inner">
            <h1 className="vb-heading">Welcome back</h1>
            <p className="vb-sub">Sign in to your account</p>

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className={validated ? 'was-validated' : ''}
              noValidate
            >
              <div className="vb-field">
                <label htmlFor="employeeId">Employee ID</label>
                <div className="vb-input-wrap">
                  <svg className="vb-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5.2" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M2.5 14c0-2.9 2.5-5 5.5-5s5.5 2.1 5.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    id="employeeId"
                    name="employeeId"
                    placeholder="Enter your employee ID"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  />
                </div>
                <div className="vb-invalid">Please enter your employee ID</div>
              </div>

              <div className="vb-field">
                <label htmlFor="password">Password</label>
                <div className="vb-input-wrap vb-has-toggle">
                  <svg className="vb-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="vb-eye-btn"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.3"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <div className="vb-invalid">Please enter your password</div>
              </div>

              <div className="vb-row">
                <label className="vb-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                className={`vb-btn${unlocked ? ' vb-unlocked' : ''}`}
                disabled={submitting}
              >
                <span className="vb-lock">
                  <svg className="vb-closed" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="white" strokeWidth="1.4"/>
                    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="white" strokeWidth="1.4"/>
                  </svg>
                  <svg className="vb-check-icon" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5L6.5 12L13 4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {unlocked ? 'Access Granted' : submitting ? 'Signing In…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        {/* -------- Right: full-bleed image scene -------- */}
        <div className="vb-scene-side" style={{ backgroundImage: `url(${back})` }}>
          <div className="vb-scene-overlay" />

          <div className="vb-scene-content">
            <div className="vb-scene-text">
              <h2 className="vb-scene-title">Banking built around you.</h2>
              <p className="vb-scene-sub">
                Simple. Secure. Personal. Everything you need to manage your finances with confidence.
              </p>
            </div>

            <div className="vb-float-stage">
              <div className="vb-float-card vb-c1">
                <div className="vb-fcard-title">Fund Transfer Approved</div>
                <div className="vb-fcard-sub">09:30am – 10:00am</div>
              </div>

              <div className="vb-float-card vb-c2">
                <div className="vb-fcard-title">Payroll Review</div>
                <div className="vb-fcard-sub">12 members</div>
                <div className="vb-avatars">
                  <div className="vb-avatar" style={{ background: '#e8622c' }}>A</div>
                  <div className="vb-avatar" style={{ background: '#3a3f47' }}>M</div>
                  <div className="vb-avatar" style={{ background: '#b47b45' }}>R</div>
                </div>
              </div>

              <div className="vb-float-card vb-c3">
                <div className="vb-fcard-title">Statement Ready</div>
                <div className="vb-fcard-sub">Q2 · Auto-generated</div>
              </div>
            </div>

            <div className="vb-badges">
              <div className="vb-badge">
                <div className="vb-badge-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 1.5 15 4v4.5c0 4.2-2.6 6.9-6 8-3.4-1.1-6-3.8-6-8V4l6-2.5Z" stroke="white" strokeWidth="1.4"/>
                    <path d="M6.3 9l1.8 1.8 3.6-3.6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="vb-badge-label">Secure<br/>Banking</div>
              </div>
              <div className="vb-badge">
                <div className="vb-badge-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.4"/>
                    <path d="M9 5v4l3 2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="vb-badge-label">24/7<br/>Access</div>
              </div>
              <div className="vb-badge">
                <div className="vb-badge-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 10V9a6 6 0 0 1 12 0v1" stroke="white" strokeWidth="1.4"/>
                    <rect x="2" y="10" width="3.2" height="4.2" rx="1" stroke="white" strokeWidth="1.4"/>
                    <rect x="12.8" y="10" width="3.2" height="4.2" rx="1" stroke="white" strokeWidth="1.4"/>
                  </svg>
                </div>
                <div className="vb-badge-label">Dedicated<br/>Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}