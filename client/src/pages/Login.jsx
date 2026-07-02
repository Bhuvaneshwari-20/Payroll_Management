
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import logo from "../assets/images/logo.png";
import car from "../assets/images/car.png";

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [validated, setValidated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formRef = useRef(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Already logged in? Skip the login page (same idea as PHP redirecting
  // straight to the dashboard when a session already exists).
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // Init particles.js background, same config as the original inline <script>.
  useEffect(() => {
    if (window.particlesJS) {
      window.particlesJS('particles-js', {
        particles: {
          number: { value: 80, density: { enable: true, value_area: 800 } },
          color: { value: '#EB0A1E' },
          opacity: { value: 0.1, random: false },
          size: { value: 3, random: true },
          line_linked: {
            enable: true,
            distance: 150,
            color: '#EB0A1E',
            opacity: 0.1,
            width: 1,
          },
          move: {
            enable: true,
            speed: 2,
            direction: 'none',
            random: false,
            straight: false,
            out_mode: 'out',
            bounce: false,
          },
        },
        interactivity: {
          detect_on: 'canvas',
          events: {
            onhover: { enable: true, mode: 'repulse' },
            onclick: { enable: true, mode: 'push' },
            resize: true,
          },
        },
        retina_detect: true,
      });
    }
  }, []);

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
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMsg(res.message || "Invalid Username or Password");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Login Failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page-body">
      {errorMsg && (
        <div className="alert alert-danger" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="split-container">
        <div className="login-side">
          <div id="particles-js"></div>
          <div className="login-container">
            <div className="text-center mb-5">
             <img src={logo} alt="Toyota Logo" className="toyota-logo" />
              <h4 className="text-dark mb-4">Payroll Management System</h4>
            </div>

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className={`needs-validation${validated ? ' was-validated' : ''}`}
              noValidate
            >
              <div className="mb-4">
                <input
                  type="text"
                  className="form-control"
                  id="employeeId"
                  name="employeeId"
                  placeholder="Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
                <div className="invalid-feedback">Please enter your employee ID</div>
              </div>

              <div className="mb-4">
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="invalid-feedback">Please enter your password</div>
              </div>

              <button type="submit" className="login-btn w-100" disabled={submitting}>
                {submitting ? 'Logging in...' : 'Login'}
              </button>

              <div className="text-center mt-3">
                <a href="#" className="text-muted text-decoration-none small">
                  Forgot Password?
                </a>
              </div>
            </form>

            <div className="copyright">
              Copyright © 2025{' '}
              <a
                href="https://tih.mkce.ac.in"
                style={{
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: 'rgb(252, 12, 44)',
                  padding: '4px 8px',
                }}
              >
                Technology Innovation Hub (TIH) - MKCE.
              </a>
              All rights reserved.
            </div>
          </div>
        </div>

        <div className="image-side">
          <div className="showroom-container"></div>
          <div className="wave-container">
            <div className="wave"></div>
            <div className="wave"></div>
          </div>
          <div className="image-content">
            <h1 className="image-title">Welcome to Krish Toyota</h1>
            <p className="image-subtitle">Drive Your Success</p>
          </div>
          <div className="car-container">
           <img src={car} alt="Toyota Vehicle" />
          </div>
        </div>
      </div>
    </div>
  );
}
