import { useState, useEffect } from 'react';
import { getLeaveTypes, applyLeave } from '../../services/leaveApi';

export default function LeaveApplyForm({ category, onApplied }) {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    leaveTypeId: '', startDate: '', endDate: '',
    startShift: 'Full day', endShift: 'Full day', reason: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getLeaveTypes().then((res) => setTypes(res.data.data)).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await applyLeave({ ...form, category });
      setForm({ leaveTypeId: '', startDate: '', endDate: '', startShift: 'Full day', endShift: 'Full day', reason: '' });
      onApplied?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4">
      <h5 className="mb-3">Apply {category === 'special' ? 'Special Leave' : 'Leave'}</h5>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <label className="form-label">Leave Type</label>
        <select name="leaveTypeId" className="form-select" value={form.leaveTypeId} onChange={handleChange} required>
          <option value="">Select Leave Type</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Start Date</label>
          <input type="date" name="startDate" className="form-control" value={form.startDate} onChange={handleChange} required />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">End Date</label>
          <input type="date" name="endDate" className="form-control" value={form.endDate} onChange={handleChange} required />
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Start Shift</label>
          <select name="startShift" className="form-select" value={form.startShift} onChange={handleChange}>
            <option>Full day</option>
            <option>Half day</option>
          </select>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">End Shift</label>
          <select name="endShift" className="form-select" value={form.endShift} onChange={handleChange}>
            <option>Full day</option>
            <option>Half day</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Reason</label>
        <textarea name="reason" className="form-control" rows="3" value={form.reason} onChange={handleChange} required />
      </div>

      <button className="btn btn-primary" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}