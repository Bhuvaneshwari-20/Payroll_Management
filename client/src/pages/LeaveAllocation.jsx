import { useState, useEffect, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import { getEmployeeBalances, assignPolicy, assignPolicyToAll, resetUsed, runMonthlyAccrual } from '../services/leaveAllocationApi';
import employeeService from '../services/employeeService';
import { fetchLeavePolicies } from '../services/leavePolicyService';
import HolidayCalendar from './HolidayCalendar';
import DataTable from '../components/common/DataTable';

const leave_allocation_styles = `
  .kr-page-container .ha-btn-toggle {
    padding: 0.55rem 1.1rem; border-radius: 8px; font-weight: 600; font-size: 13.5px;
    border: 1px solid var(--vb-border, #dee2e6);
    background: var(--vb-bg-surface-2, #f8f9fc);
    color: var(--vb-text-muted, #495057);
    transition: background .15s, color .15s, border-color .15s;
  }
  .kr-page-container .ha-btn-toggle:hover { background: var(--vb-bg-surface, #fff); color: var(--vb-text, #1e293b); }
  .kr-page-container .ha-btn-toggle.active { background: #a4133c; border-color: #a4133c; color: #fff; }

  .kr-page-container .ha-btn-toggle-sm {
    padding: 0.4rem 0.9rem; border-radius: 7px; font-weight: 600; font-size: 12.5px;
    border: 1px solid var(--vb-border, #dee2e6);
    background: var(--vb-bg-surface-2, #f8f9fc);
    color: var(--vb-text-muted, #495057);
  }
  .kr-page-container .ha-btn-toggle-sm.active { background: #4338ca; border-color: #4338ca; color: #fff; }

  .kr-page-container .card {
    background: var(--vb-bg-surface, #fff); color: var(--vb-text, #1e293b);
    border: none; box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
  }
  .kr-page-container .card-header {
    background: var(--vb-bg-surface, #fff); color: var(--vb-text, #1e293b);
    border-bottom: 1px solid var(--vb-border, #dee2e6);
  }

  .kr-page-container .form-label { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-select, .kr-page-container .form-control {
    background: var(--vb-bg-surface-2, #fff); color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #ced4da);
  }

  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  .kr-page-container .table { color: var(--vb-text, #1e293b); }
  .kr-page-container .table thead th {
    color: var(--vb-text-muted, #495057); border-color: var(--vb-border, #dee2e6); font-weight: 600;
  }
  .kr-page-container .table td, .kr-page-container .table th {
    border-color: var(--vb-border, #dee2e6); vertical-align: middle;
  }
  .kr-page-container .table > :not(caption) > * > * { background-color: transparent; color: var(--vb-text, #1e293b); }
  .kr-page-container .table-striped > tbody > tr:nth-of-type(odd) > * { background-color: var(--vb-bg-surface-2, #f8f9fc); }
  .kr-page-container .table-hover > tbody > tr:hover > * { background-color: var(--vb-bg-surface-2, #f0f2f8); }

  .kr-policy-pill {
    display: inline-block; background: #eef1ff; color: #4338ca; border-radius: 6px;
    padding: 2px 9px; font-size: 11.5px; font-weight: 600;
  }
`;

const EMPTY_ASSIGN_FORM = { employee_id: '', policy_id: '', effective_from: new Date().toISOString().slice(0, 10) };
const EMPTY_BULK_FORM = { policy_id: '', jtype: '', effective_from: new Date().toISOString().slice(0, 10) };

export default function LeaveAllocation() {
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' | 'holiday'
  const [assignMode, setAssignMode] = useState('specific'); // 'specific' | 'all'
  const [employees, setEmployees] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN_FORM);
  const [bulkForm, setBulkForm] = useState(EMPTY_BULK_FORM);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadBalances = useCallback(() => {
    getEmployeeBalances().then((res) => setRows(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadBalances();
    employeeService.getEmployees({ status: 'active' }).then((res) => {
      setEmployees(res.data || res || []);
    }).catch(() => {});
    fetchLeavePolicies().then((res) => {
      if (res.success) setPolicies((res.data || []).filter((p) => p.status === 'active'));
    }).catch(() => {});
  }, [loadBalances]);

  const notify = (icon, title) => {
    Swal.fire({ icon, title, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
  };

  // Pivot the long-format rows (employee, leave_type) into one row per
  // employee with a dynamic column per leave type code — so a new leave
  // type shows up as a new column automatically, no code change.
  const { leaveTypeCodes, pivoted } = useMemo(() => {
    const codes = [...new Set(rows.map((r) => r.leave_type_code))].sort();
    const byEmployee = new Map();
    rows.forEach((r) => {
      if (!byEmployee.has(r.employee_id)) {
        byEmployee.set(r.employee_id, {
          employee_id: r.employee_id,
          employee_code: r.employee_code,
          name: `${r.first_name} ${r.last_name}`,
          jtype: r.jtype,
          policy_name: r.policy_name,
          balances: {},
        });
      }
      byEmployee.get(r.employee_id).balances[r.leave_type_code] = r.balance;
    });
    return { leaveTypeCodes: codes, pivoted: [...byEmployee.values()] };
  }, [rows]);

  const balanceColumns = useMemo(() => [
    { key: 'employee_code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'jtype', label: 'Type' },
    {
      key: 'policy_name',
      label: 'Policy',
      render: (row) => (
        row.policy_name
          ? <span className="kr-policy-pill">{row.policy_name}</span>
          : <span className="text-muted">Not assigned</span>
      ),
    },
    ...leaveTypeCodes.map((code) => ({
      key: code,
      label: code,
      accessor: (row) => row.balances[code] ?? '',
      render: (row) => row.balances[code] ?? '-',
    })),
  ], [leaveTypeCodes]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.employee_id || !assignForm.policy_id || !assignForm.effective_from) {
      notify('error', 'Employee, policy, and effective date are required');
      return;
    }
    setLoading(true);
    try {
      const res = await assignPolicy(assignForm);
      notify('success', res.data.message);
      setAssignForm((f) => ({ ...EMPTY_ASSIGN_FORM, effective_from: f.effective_from }));
      loadBalances();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to assign policy');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkForm.policy_id || !bulkForm.effective_from) {
      notify('error', 'Policy and effective date are required');
      return;
    }

    const policyName = policies.find((p) => String(p.id) === String(bulkForm.policy_id))?.policy_name || 'this policy';
    const scopeText = bulkForm.jtype ? `all ${bulkForm.jtype} employees` : 'ALL active employees';
    const result = await Swal.fire({
      title: 'Assign to all?',
      text: `This assigns "${policyName}" to ${scopeText}. Anyone already on a different active policy gets switched over.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, assign to all',
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const res = await assignPolicyToAll({
        policy_id: bulkForm.policy_id,
        effective_from: bulkForm.effective_from,
        jtype: bulkForm.jtype || undefined,
      });
      notify(res.data.data?.failures?.length ? 'warning' : 'success', res.data.message);
      setBulkForm((f) => ({ ...EMPTY_BULK_FORM, effective_from: f.effective_from }));
      loadBalances();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to assign policy to all');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This resets USED leave (not the allocation) to 0 for all active employees!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, reset it!',
    });
    if (result.isConfirmed) {
      try {
        const res = await resetUsed();
        notify('success', res.data.message);
        loadBalances();
      } catch (err) {
        notify('error', err.response?.data?.message || 'Failed to reset');
      }
    }
  };

  // Manual trigger for the same job jobs/monthlyLeaveAccrual.js runs
  // automatically on the 1st of the month — lets HR credit this month's
  // allocation on demand (testing, or catching up a missed cron instant)
  // instead of waiting for the scheduler.
  const handleRunAccrual = async () => {
    const result = await Swal.fire({
      title: 'Run monthly accrual now?',
      text: "Credits this month's allocation (e.g. +1 CL, +1 SL) onto every eligible employee's balance. Safe to run more than once — already-credited employees this month are skipped automatically.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, run it',
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const res = await runMonthlyAccrual();
      notify('success', res.data.message);
      loadBalances();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to run monthly accrual');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kr-page-container">
      <style>{leave_allocation_styles}</style>

      <div className="d-flex justify-content-center mb-4 flex-wrap gap-2">
        <button className={`ha-btn-toggle ${activeTab === 'assign' ? 'active' : 'inactive'}`} onClick={() => setActiveTab('assign')}>
          Employee Leave Allocation
        </button>
        <button className={`ha-btn-toggle ${activeTab === 'holiday' ? 'active' : 'inactive'}`} onClick={() => setActiveTab('holiday')}>
          Holiday Assignment
        </button>
      </div>

      {activeTab === 'assign' && (
        <div className="card p-4 mb-4">
          <div className="d-flex gap-2 mb-4">
            <button
              type="button"
              className={`ha-btn-toggle-sm ${assignMode === 'specific' ? 'active' : ''}`}
              onClick={() => setAssignMode('specific')}
            >
              Specific Employee
            </button>
            <button
              type="button"
              className={`ha-btn-toggle-sm ${assignMode === 'all' ? 'active' : ''}`}
              onClick={() => setAssignMode('all')}
            >
              All Employees
            </button>
          </div>

          {assignMode === 'specific' ? (
            <form onSubmit={handleAssignSubmit}>
              <div className="mb-3">
                <label className="form-label">Employee</label>
                <select
                  className="form-select"
                  value={assignForm.employee_id}
                  onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} — {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Leave Policy</label>
                <select
                  className="form-select"
                  value={assignForm.policy_id}
                  onChange={(e) => setAssignForm({ ...assignForm, policy_id: e.target.value })}
                  required
                >
                  <option value="">Select Policy</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>{p.policy_name}</option>
                  ))}
                </select>
                <div className="form-text">
                  Only active policies show here — configure them on the Leave Policies screen.
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Effective From</label>
                <input
                  type="date"
                  className="form-control"
                  value={assignForm.effective_from}
                  onChange={(e) => setAssignForm({ ...assignForm, effective_from: e.target.value })}
                  required
                />
                <div className="form-text">
                  Any earlier active policy for this employee ends the day before this date.
                </div>
              </div>
              <button className="btn btn-success" disabled={loading}>
                {loading ? 'Assigning...' : 'Assign Policy'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleBulkSubmit}>
              <div className="mb-3">
                <label className="form-label">Leave Policy</label>
                <select
                  className="form-select"
                  value={bulkForm.policy_id}
                  onChange={(e) => setBulkForm({ ...bulkForm, policy_id: e.target.value })}
                  required
                >
                  <option value="">Select Policy</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>{p.policy_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Employee Type (optional filter)</label>
                <select
                  className="form-select"
                  value={bulkForm.jtype}
                  onChange={(e) => setBulkForm({ ...bulkForm, jtype: e.target.value })}
                >
                  <option value="">All Employees</option>
                  <option value="Permanent">Permanent only</option>
                  <option value="Temporary">Temporary only</option>
                </select>
                <div className="form-text">
                  Leave as "All Employees" to assign this policy to every active employee regardless of type.
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Effective From</label>
                <input
                  type="date"
                  className="form-control"
                  value={bulkForm.effective_from}
                  onChange={(e) => setBulkForm({ ...bulkForm, effective_from: e.target.value })}
                  required
                />
              </div>
              <button className="btn btn-success" disabled={loading}>
                {loading ? 'Assigning...' : 'Assign to All Matching Employees'}
              </button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'holiday' && <HolidayCalendar />}

      {activeTab !== 'holiday' && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Leave Balances</h5>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-primary" disabled={loading} onClick={handleRunAccrual}>
                Run Monthly Accrual
              </button>
              <button className="btn btn-danger" onClick={handleReset}>Reset Used (All)</button>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <DataTable
                data={pivoted}
                columns={balanceColumns}
                rowKey={(row) => row.employee_id}
                searchPlaceholder="Search by code, name, or type..."
                emptyMessage="No employees with an assigned policy yet"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}