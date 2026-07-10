import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getBalances, assignAll, assignSpecific, resetAll } from '../services/leaveAllocationApi';
import HolidayCalendar from './HolidayCalendar';
import './HolidayCalendar.css';

export default function LeaveAllocation() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'specific' | 'holiday'
  const [allForm, setAllForm] = useState({ etype: '', days: '' });
  const [specForm, setSpecForm] = useState({ empid: '', days: '' });
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadBalances = useCallback(() => {
    getBalances().then((res) => setBalances(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => { loadBalances(); }, [loadBalances]);

  const notify = (icon, title) => {
    Swal.fire({ icon, title, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
  };

  const handleAllSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await assignAll(allForm.etype, allForm.days);
      notify('success', res.data.message);
      setAllForm({ etype: '', days: '' });
      loadBalances();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to assign');
    } finally {
      setLoading(false);
    }
  };

  const handleSpecSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await assignSpecific(specForm.empid, specForm.days);
      notify('success', res.data.message);
      setSpecForm({ empid: '', days: '' });
      loadBalances();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to assign');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will reset leave balance to 0 for all active employees!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, reset it!',
    });
    if (result.isConfirmed) {
      try {
        const res = await resetAll();
        notify('success', res.data.message);
        loadBalances();
      } catch (err) {
        notify('error', err.response?.data?.message || 'Failed to reset');
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-center mb-4 flex-wrap gap-2">
        <button
          className={`ha-btn-toggle ${activeTab === 'all' ? 'active' : 'inactive'}`}
          onClick={() => setActiveTab('all')}
        >
          Enable Leave for All Employees
        </button>
        <button
          className={`ha-btn-toggle ${activeTab === 'specific' ? 'active' : 'inactive'}`}
          onClick={() => setActiveTab('specific')}
        >
          Enable Leave for Specific Employee
        </button>
        <button
          className={`ha-btn-toggle ${activeTab === 'holiday' ? 'active' : 'inactive'}`}
          onClick={() => setActiveTab('holiday')}
        >
          Holiday Assignment
        </button>
      </div>

      {activeTab === 'all' && (
        <form onSubmit={handleAllSubmit} className="card p-4 mb-4">
          <div className="mb-3">
            <label className="form-label">Employee Type</label>
            <select
              className="form-select"
              value={allForm.etype}
              onChange={(e) => setAllForm({ ...allForm, etype: e.target.value })}
              required
            >
              <option value="">Select Type</option>
              <option value="Permanent">Permanent</option>
              <option value="Temporary">Temporary</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Number of Days:</label>
            <input
              type="number"
              className="form-control"
              value={allForm.days}
              onChange={(e) => setAllForm({ ...allForm, days: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-success" disabled={loading}>Assign to All Employees</button>
        </form>
      )}

      {activeTab === 'specific' && (
        <form onSubmit={handleSpecSubmit} className="card p-4 mb-4">
          <div className="mb-3">
            <label className="form-label">Employee Code:</label>
            <input
              type="text"
              className="form-control"
              value={specForm.empid}
              onChange={(e) => setSpecForm({ ...specForm, empid: e.target.value })}
              placeholder="e.g. KRCB001"
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Number of Days:</label>
            <input
              type="number"
              className="form-control"
              value={specForm.days}
              onChange={(e) => setSpecForm({ ...specForm, days: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-success" disabled={loading}>Assign to Employee</button>
        </form>
      )}

      {activeTab === 'holiday' && <HolidayCalendar />}

      {/* Leave Balances table is hidden on the Holiday Assignment tab,
          same as your PHP (#leaveBalanceTable hidden for option3). */}
      {activeTab !== 'holiday' && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Leave Balances</h5>
            <button className="btn btn-danger" onClick={handleReset}>Reset All</button>
          </div>
          <div className="card-body">
            <table className="table table-striped table-hover">
              <thead>
                <tr><th>S.No</th><th>Code</th><th>Name</th><th>Type</th><th>Leave Balance</th></tr>
              </thead>
              <tbody>
                {balances.map((emp, i) => (
                  <tr key={emp.id}>
                    <td>{i + 1}</td>
                    <td>{emp.employee_code}</td>
                    <td>{emp.first_name} {emp.last_name}</td>
                    <td>{emp.jtype}</td>
                    <td>{emp.leave_balance}</td>
                  </tr>
                ))}
                {balances.length === 0 && <tr><td colSpan="5" className="text-center">No employees found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}