import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import employeeService from '../../services/employeeService';

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
    // Preload departments before the dialog opens
    let departments = [];
    try {
      const deptRes = await employeeService.getDepartments();
      if (deptRes.success) departments = deptRes.data || [];
    } catch {
      /* dropdown just stays empty on failure, same as PHP */
    }

    const deptOptions = departments.map((d) => `<option value="${d.id}">${d.name}</option>`).join('');

    const result = await Swal.fire({
      title: 'Add Manager',
      html: `
        <select id="managerDept" class="swal2-select" style="width:100%;display:block;margin-bottom:10px;">
          <option value="">Select Department</option>
          ${deptOptions}
        </select>
        <select id="managerEmp" class="swal2-select" style="width:100%;display:block;">
          <option value="">Select Employee</option>
        </select>
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
          } catch {
            /* leave dropdown empty on failure */
          }
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
      if (res.success) {
        Swal.fire('Added!', res.message, 'success');
        loadManagers();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch {
      Swal.fire('Error', 'Failed to add manager', 'error');
    }
  }

  async function removeManager(id) {
    const result = await Swal.fire({
      title: 'Remove?',
      text: 'Remove this manager?',
      icon: 'warning',
      showCancelButton: true,
    });
    if (!result.isConfirmed) return;

    try {
      const res = await employeeService.deleteManager(id);
      if (res.success) {
        Swal.fire('Removed!', res.message, 'success');
        loadManagers();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
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
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Department</th>
              <th>Employee Code</th>
              <th>Manager Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="4" className="text-center py-3">Loading...</td></tr>
            )}
            {!loading && managers.length === 0 && (
              <tr><td colSpan="4" className="text-center py-3">No managers found</td></tr>
            )}
            {!loading && managers.map((mgr) => (
              <tr key={mgr.id}>
                <td>{mgr.department_name}</td>
                <td>{mgr.employee_code}</td>
                <td>{mgr.name}</td>
                <td>
                  <button className="btn btn-sm btn-danger" onClick={() => removeManager(mgr.id)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}