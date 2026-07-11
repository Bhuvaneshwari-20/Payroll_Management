import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getBalances, assignAll, assignSpecific, resetAll } from '../services/leaveAllocationApi';
import HolidayCalendar from './HolidayCalendar';

// Same pattern as SalaryReport.jsx / ManagerLeaveManagement.jsx / Departments.jsx /
// Roles.jsx: Bootstrap's .card/.form-control/.form-select/.table and the
// `ha-btn-toggle` tab buttons don't know about the --vb-* theme variables
// (defined once in Topbar.jsx), so without this override block they stay
// hardcoded light and show up as a jarring white panel on a dark page.
const leave_allocation_styles = `
  .kr-page-container .ha-btn-toggle {
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13.5px;
    border: 1px solid var(--vb-border, #dee2e6);
    background: var(--vb-bg-surface-2, #f8f9fc);
    color: var(--vb-text-muted, #495057);
    transition: background .15s, color .15s, border-color .15s;
  }
  .kr-page-container .ha-btn-toggle:hover {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .ha-btn-toggle.active {
    background: #a4133c;
    border-color: #a4133c;
    color: #fff;
  }

  .kr-page-container .card {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: none;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
  }
  .kr-page-container .card-header {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border-bottom: 1px solid var(--vb-border, #dee2e6);
  }

  .kr-page-container .form-label { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-select,
  .kr-page-container .form-control {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #ced4da);
  }
  .kr-page-container .form-select:focus,
  .kr-page-container .form-control:focus {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
  }

  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  .kr-page-container .table {
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table thead th {
    color: var(--vb-text-muted, #495057);
    border-color: var(--vb-border, #dee2e6);
    font-weight: 600;
  }
  .kr-page-container .table td,
  .kr-page-container .table th {
    border-color: var(--vb-border, #dee2e6);
    vertical-align: middle;
  }
  .kr-page-container .table > :not(caption) > * > * {
    background-color: transparent;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table-striped > tbody > tr:nth-of-type(odd) > * {
    background-color: var(--vb-bg-surface-2, #f8f9fc);
  }
  .kr-page-container .table-hover > tbody > tr:hover > * {
    background-color: var(--vb-bg-surface-2, #f0f2f8);
  }
`;

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
    <div className="kr-page-container">
      <style>{leave_allocation_styles}</style>

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