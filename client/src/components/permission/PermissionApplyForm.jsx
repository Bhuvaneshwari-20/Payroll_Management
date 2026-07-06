import { useState } from 'react';
import { applyPermission } from '../../services/permissionApi';

export default function PermissionApplyForm({ onApplied }) {
  const [form, setForm] = useState({ requestDate: '', fromTime: '', toTime: '', reason: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await applyPermission(form);
      setForm({ requestDate: '', fromTime: '', toTime: '', reason: '' });
      onApplied?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit permission request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4">
      <h5 className="mb-3">Apply Permission</h5>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="mb-3">
        <label className="form-label">Date</label>
        <input type="date" name="requestDate" className="form-control" value={form.requestDate} onChange={handleChange} required />
      </div>
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">From Time</label>
          <input type="time" name="fromTime" className="form-control" value={form.fromTime} onChange={handleChange} required />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">To Time</label>
          <input type="time" name="toTime" className="form-control" value={form.toTime} onChange={handleChange} required />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Reason</label>
        <textarea name="reason" className="form-control" rows="3" value={form.reason} onChange={handleChange} required />
      </div>
      <button className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit Request'}</button>
    </form>
  );
}