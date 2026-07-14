import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import employeeService from '../../services/employeeService';
import DataTable from '../common/DataTable';

export default function ManagersTab() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadManagers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeService.getManagers();
      if (res.success) setManagers(res.data || []);
      else Swal.fire('Error', res.message, 'error');
    } catch {
      Swal.fire('Error', 'Failed to load managers', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadManagers(); }, [loadManagers]);

  async function showAddManagerModal() {
    let departments = [];
    try {
      const deptRes = await employeeService.getDepartments();
      if (deptRes.success) departments = deptRes.data || [];
    } catch { /* noop */ }

    const deptOptions = departments.map((d) => `<option value="${d.id}">${d.name}</option>`).join('');

    const result = await Swal.fire({
      title: 'Add Manager',
      width: 'min(440px, 92vw)',
      padding: '1.5rem',
      scrollbarPadding: false,
      html: `
        <div style="text-align:left;">
          <label style="display:block;font-weight:500;margin-bottom:4px;font-size:0.9rem;">Department</label>
          <select id="managerDept" class="form-select" style="box-sizing:border-box;width:100%;padding:8px 10px;border:1px solid #ced4da;border-radius:6px;margin-bottom:14px;font-size:0.95rem;">
            <option value="">Select Department</option>
            ${deptOptions}
          </select>
          <label style="display:block;font-weight:500;margin-bottom:4px;font-size:0.9rem;">Employee</label>
          <select id="managerEmp" class="form-select" style="box-sizing:border-box;width:100%;padding:8px 10px;border:1px solid #ced4da;border-radius:6px;font-size:0.95rem;">
            <option value="">Select Employee</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'OK',
      confirmButtonColor: '#6f42c1',
      cancelButtonText: 'Cancel',
      didOpen: () => {
        const deptSelect = document.getElementById('managerDept');
        const empSelect = document.getElementById('managerEmp');
        deptSelect.addEventListener('change', async () => {
          const deptId = deptSelect.value;
          empSelect.innerHTML = '<option value="">Select Employee</option>';
          if (!deptId) return;
          try {
            const empRes = await employeeService.getEmployees({ department: deptId, status: 'active' });
            if (empRes.success) {
              empRes.data.forEach((e) => {
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.textContent = `${e.first_name} ${e.last_name}`;
                empSelect.appendChild(opt);
              });
            }
          } catch { /* noop */ }
        });
      },
      preConfirm: () => {
        const dept = document.getElementById('managerDept').value;
        const emp = document.getElementById('managerEmp').value;
        if (!dept || !emp) {
          Swal.showValidationMessage('Select both fields');
          return false;
        }
        return { dept, emp };
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await employeeService.addManager(result.value.dept, result.value.emp);
      if (res.success) { Swal.fire('Added!', res.message, 'success'); loadManagers(); }
      else Swal.fire('Error', res.message, 'error');
    } catch {
      Swal.fire('Error', 'Failed to add manager', 'error');
    }
  }

  async function removeManager(id) {
    const result = await Swal.fire({ title: 'Remove?', text: 'Remove this manager?', icon: 'warning', showCancelButton: true });
    if (!result.isConfirmed) return;
    try {
      const res = await employeeService.deleteManager(id);
      if (res.success) { Swal.fire('Removed!', res.message, 'success'); loadManagers(); }
      else Swal.fire('Error', res.message, 'error');
    } catch {
      Swal.fire('Error', 'Failed to remove manager', 'error');
    }
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0"><i className="fas fa-user-tie me-2"></i>Department Managers</h6>
        <button type="button" className="btn btn-sm btn-primary" onClick={showAddManagerModal}>
          <i className="fas fa-plus me-2"></i>Add Manager
        </button>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-3">Loading...</div>
        ) : (
          <div className="table-responsive">
            <DataTable
              data={managers}
              searchPlaceholder="Search managers..."
              emptyMessage="No managers found"
              columns={[
                { key: 'department_name', label: 'Department' },
                { key: 'employee_code', label: 'Employee Code' },
                { key: 'name', label: 'Manager Name' },
                {
                  key: 'actions', label: 'Actions', sortable: false,
                  render: (mgr) => (
                    <button className="btn btn-sm btn-danger" onClick={() => removeManager(mgr.id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}