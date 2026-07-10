import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { changePassword } from '../services/passwordApi';

/**
 * Non-dismissible modal shown when useForcePasswordChange() reports
 * mustChange=true. Employee cannot close it or use the rest of the app
 * until they set a new password — matches the original PHP behavior
 * where the same check ran right after login.
 */
export default function ForcePasswordChangeModal({ employeeCode, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword === employeeCode) {
      setError('New password cannot be the same as your employee code');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await changePassword(newPassword);
      if (res.data.status === 'success') {
        // Close this modal FIRST. Swal was rendering behind this modal's
        // backdrop (z-index 19999) because Swal's default z-index is much
        // lower — the alert was invisible and unclickable, so `await
        // Swal.fire(...)` never resolved and the button spun forever.
        onSuccess?.();
        Swal.fire('Password Updated', 'Your new password has been saved.', 'success');
      } else {
        setError(res.data.message || 'Could not update password');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 20000 }} tabIndex="-1">
      <div className="modal-backdrop fade show" style={{ zIndex: 19999 }}></div>
      <div className="modal-dialog modal-dialog-centered" style={{ zIndex: 20001 }}>
        <div className="modal-content">
          <div className="modal-header custom-modal-header">
            <h5 className="modal-title fw-bold"><i className="fas fa-shield-alt me-2"></i>Set a New Password</h5>
            {/* intentionally no close button — matches the forced-change flow */}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p className="text-muted">
                Your password still matches your employee code. For security, please set a new password before continuing.
              </p>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <div className="mb-3">
                <label className="form-label fw-bold">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-2">
                <label className="form-label fw-bold">Confirm Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="fas fa-check me-1"></i>}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}