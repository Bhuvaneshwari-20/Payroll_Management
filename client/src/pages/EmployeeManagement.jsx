import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import employeeService, { FILE_BASE } from '../services/employeeService';
import EmployeeModal from '../components/employee/EmployeeModal';
import ManagersTab from '../components/employee/ManagersTab';
import StatusHistoryTab from '../components/employee/StatusHistoryTab';
import StatusChangeHistoryTab from '../components/employee/StatusChangeHistoryTab';
import BulkUploadTab from '../components/employee/BulkUploadTab';
import UploadHistoryTab from '../components/employee/UploadHistoryTab';
import defaultProfile from "../assets/images/default-profile.png";
import DataTable from '../components/common/DataTable';

// ---------------------------------------------------------------------------
// Styles were previously in a separate EmployeeManagement.css with hardcoded
// light-mode colors (white step circles, #fff inputs, #f8fafc panels, etc.),
// so the stepper/form/modal all stayed light even in dark mode and text lost
// contrast. Merged here as an embedded, theme-aware style string (same
// pattern as Departments.jsx/Roles.jsx), using the --vb-* variables defined
// in Topbar.jsx. EmployeeModal.jsx uses these same class names but is only
// ever rendered while this component is mounted, so one shared style block
// here covers both.
// ---------------------------------------------------------------------------
const emp_management_styles = `
  /* ===== STEPPER ===== */
  .emp-stepper-wrap {
    background: var(--vb-bg-surface-2, #f8fafc);
    border-bottom: 1px solid var(--vb-border, #e5e7eb);
    padding: 24px 40px 20px;
  }
  .emp-stepper-track { display: flex; align-items: flex-start; position: relative; }
  .emp-stepper-line {
    position: absolute; top: 20px; left: 10%; right: 10%; height: 3px;
    background: var(--vb-border, #e5e7eb); border-radius: 99px; z-index: 0;
  }
  .emp-stepper-fill {
    height: 100%; width: 0%;
    background: linear-gradient(90deg, #2563eb, #3b82f6);
    border-radius: 99px; transition: width 0.4s ease;
  }
  .emp-step-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; }
  .emp-step-circle {
    width: 42px; height: 42px; border-radius: 50%;
    background: var(--vb-bg-surface, #fff);
    border: 3px solid var(--vb-border, #d1d5db);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem; color: var(--vb-text-muted, #9ca3af); font-weight: 700;
    transition: all 0.3s; box-shadow: 0 2px 8px var(--vb-shadow, rgba(0,0,0,0.07));
  }
  .emp-step-item.active .emp-step-circle {
    background: #2563eb; border-color: #2563eb; color: #fff;
    box-shadow: 0 4px 14px rgba(37,99,235,0.4); transform: scale(1.1);
  }
  .emp-step-item.completed .emp-step-circle { background: #10b981; border-color: #10b981; color: #fff; }
  .emp-step-item.completed .emp-step-circle i { display: none; }
  .emp-step-item.completed .emp-step-circle::before {
    content: '\\f00c'; font-family: 'Font Awesome 6 Free'; font-weight: 900;
  }
  .emp-step-label {
    font-size: 0.72rem; font-weight: 600; color: var(--vb-text-muted, #9ca3af);
    margin-top: 8px; text-align: center; text-transform: uppercase; letter-spacing: 0.04em;
    transition: color 0.3s;
  }
  .emp-step-item.active .emp-step-label { color: #2563eb; }
  .emp-step-item.completed .emp-step-label { color: #10b981; }

  /* ===== FORM FIELDS ===== */
  .emp-section-title {
    font-size: 1rem; font-weight: 700; color: var(--vb-text, #1e40af);
    margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid var(--vb-border, #dbeafe);
  }
  .emp-sub-label { font-size: 0.85rem; font-weight: 700; color: var(--vb-text, #374151); text-transform: uppercase; letter-spacing: 0.05em; }
  .emp-label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--vb-text, #374151); margin-bottom: 5px; }
  .emp-input {
    width: 100%; padding: 9px 12px; font-size: 0.875rem;
    border: 1.5px solid var(--vb-border, #e5e7eb); border-radius: 8px; outline: none;
    background: var(--vb-bg-surface-2, #fff); color: var(--vb-text, #111827);
    font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .emp-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  .emp-input.is-invalid { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important; }
  .emp-input.is-valid { border-color: #10b981 !important; }
  .emp-err { font-size: 0.75rem; color: #ef4444; margin-top: 4px; min-height: 16px; }

  /* Avatar */
  .emp-avatar-wrap { position: relative; display: inline-block; }
  .emp-avatar-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--vb-border, #dbeafe); }
  .emp-avatar-btn {
    position: absolute; bottom: 0; right: 0;
    background: #2563eb; color: #fff; width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 0.7rem;
    cursor: pointer; box-shadow: 0 2px 6px rgba(37,99,235,0.4);
  }

  .emp-divider-label {
    font-size: 0.8rem; font-weight: 700; color: var(--vb-text, #1e40af);
    background: var(--vb-bg-surface-2, #eff6ff);
    padding: 8px 14px; border-radius: 8px; border-left: 3px solid #2563eb;
  }

  .emp-currency-wrap { position: relative; }
  .emp-currency-sym {
    position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
    color: var(--vb-text-muted, #6b7280); font-size: 0.85rem; font-weight: 600; pointer-events: none;
  }
  .emp-currency-input { padding-left: 26px !important; }

  .emp-eye-toggle {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    color: var(--vb-text-muted, #9ca3af); cursor: pointer; font-size: 0.85rem; z-index: 2;
  }

  .emp-toggle { position: relative; display: inline-flex; width: 46px; height: 24px; flex-shrink: 0; cursor: pointer; }
  .emp-toggle input { display: none; }
  .emp-toggle-slider { position: absolute; inset: 0; background: var(--vb-border, #d1d5db); border-radius: 99px; transition: background 0.3s; }
  .emp-toggle-slider::before {
    content: ''; position: absolute; width: 18px; height: 18px; background: #fff; border-radius: 50%;
    top: 3px; left: 3px; transition: transform 0.3s; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }
  .emp-toggle input:checked + .emp-toggle-slider { background: #10b981; }
  .emp-toggle input:checked + .emp-toggle-slider::before { transform: translateX(22px); }

  .emp-toggle-card { border: 1.5px solid var(--vb-border, #e5e7eb); border-radius: 10px; padding: 14px 16px; background: var(--vb-bg-surface-2, #fafafa); }

  .emp-btn-primary { background: #2563eb; color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 0.875rem; }
  .emp-btn-primary:hover { background: #1d4ed8; color: #fff; }
  .emp-btn-outline { background: var(--vb-bg-surface, #fff); color: #2563eb; border: 1.5px solid #2563eb; border-radius: 8px; font-weight: 600; font-size: 0.875rem; }
  .emp-btn-outline:hover { background: var(--vb-bg-surface-2, #eff6ff); }
  .emp-btn-success { background: #10b981; color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 0.875rem; }
  .emp-btn-success:hover { background: #059669; color: #fff; }

  .upload-area {
    border: 2px dashed #4158d0; border-radius: 10px; padding: 30px; text-align: center;
    cursor: pointer; transition: all 0.3s; min-height: 200px;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    color: var(--vb-text, inherit);
  }
  .upload-area:hover { background-color: var(--vb-bg-surface-2, #f8f9fa); }
  .upload-area.dragover { background-color: var(--vb-bg-surface-2, #e3f2fd); border-color: #2196f3; }

  /* ===== CUSTOM MODAL (replaces bootstrap JS modal control) ===== */
  .emp-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: flex-start; justify-content: center;
    z-index: 1050; overflow-y: auto; padding: 30px 15px;
  }
  .emp-modal-dialog { width: 100%; max-width: 1100px; margin: auto; }
  .emp-modal-content {
    border-radius: 16px; border: none; overflow: hidden;
    background: var(--vb-bg-surface, #fff); color: var(--vb-text, #1e293b);
  }
  .emp-modal-header {
    background-color: rgb(145, 23, 68);
    padding: 20px 28px; border: none;
    display: flex; align-items: center; justify-content: space-between;
  }
  .emp-modal-footer {
    border-top: 1px solid var(--vb-border, #e5e7eb);
    padding: 16px 28px; display: flex; justify-content: flex-end; gap: 10px;
  }
  .emp-modal-content .modal-header,
  .emp-modal-content .modal-title { color: var(--vb-text, #1e293b); }

  /* Master Data dropdown (Bootstrap defaults) + misc muted text, kept theme-aware */
  .kr-page-container .dropdown-menu {
    background: var(--vb-bg-surface, #fff);
    border-color: var(--vb-border, #e6e8ec);
    box-shadow: 0 14px 34px var(--vb-shadow, rgba(0,0,0,0.1));
  }
  .kr-page-container .dropdown-item {
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .dropdown-item:hover,
  .kr-page-container .dropdown-item:focus {
    background: var(--vb-bg-surface-2, #f8f9fc);
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  /* ===== Card / table (same dark-mode treatment as Departments & Roles) ===== */
  .kr-page-container .card,
  .kr-page-container .kr-card {
    border: none;
    border-radius: 14px;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
    background: var(--vb-bg-surface, #fff);
    transition: background 0.3s ease;
  }
  .kr-page-container .card-header {
    background: linear-gradient(90deg, var(--vb-bg-surface-2, #fdf2f4), var(--vb-bg-surface, #ffffff));
    border-bottom: 1px solid var(--vb-border, #f1f1f1);
    border-radius: 14px 14px 0 0 !important;
    font-weight: 600;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .card-body,
  .kr-page-container .kr-card-body {
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table {
    color: var(--vb-text, #1e293b);
    margin-bottom: 0;
  }
  .kr-page-container .table thead th {
    color: var(--vb-text-muted, #64748b);
    border-bottom: 2px solid var(--vb-border, #e6e8ec);
    font-weight: 600;
  }
  .kr-page-container .table td {
    border-color: var(--vb-border, #e6e8ec);
    vertical-align: middle;
  }
  .kr-page-container .table > :not(caption) > * > * {
    background-color: transparent;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table-hover > tbody > tr:hover > * {
    background-color: var(--vb-bg-surface-2, #f8f9fc);
  }

  /* Form controls used in the filter row (Department/Role/Status selects) */
  .kr-page-container .form-label { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-control,
  .kr-page-container .form-select {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #ced4da);
  }
  .kr-page-container .form-control:focus,
  .kr-page-container .form-select:focus {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
  }

  /* Nav tabs (Employees / Managers / Bulk Upload / ...) */
  .kr-page-container .kr-tabs .nav-link {
    color: var(--vb-text-muted, #64748b);
    border: none;
    border-bottom: 2px solid transparent;
  }
  .kr-page-container .kr-tabs .nav-link.active {
    color: var(--vb-text, #1e293b);
    background: transparent;
    border-bottom: 2px solid #a4133c;
  }
`;

const TABS = [
    { key: 'employees', label: 'Employees', icon: 'fa-users' },
    { key: 'managers', label: 'Managers', icon: 'fa-user-tie' },
    // { key: 'statusHistory', label: 'Status History', icon: 'fa-history' },
    { key: 'bulkUpload', label: 'Bulk Upload', icon: 'fa-upload' },
    { key: 'uploadHistory', label: 'Upload History', icon: 'fa-history' },
    { key: 'statusChanges', label: 'Status Changes', icon: 'fa-exchange-alt' },
];

// Clickable column header with a stacked ▲▼ indicator. The active
// direction is highlighted; the inactive arrow stays muted.
function SortableTh({ label, sortKey, sortConfig, onSort }) {
    const isActive = sortConfig.key === sortKey;
    const isAsc = isActive && sortConfig.direction === 'asc';
    const isDesc = isActive && sortConfig.direction === 'desc';
    return (
        <th
            onClick={() => onSort(sortKey)}
            style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
            title="Click to sort"
        >
            {label}
            <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 6, verticalAlign: 'middle', lineHeight: '0.7' }}>
                <span style={{ fontSize: '0.6rem', color: isAsc ? '#0d6efd' : '#adb5bd' }}>▲</span>
                <span style={{ fontSize: '0.6rem', color: isDesc ? '#0d6efd' : '#adb5bd' }}>▼</span>
            </span>
        </th>
    );
}

export default function EmployeeManagement() {
    const [activeTab, setActiveTab] = useState('employees');

    // Employees list state
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [filters, setFilters] = useState({ department: '', role: '', status: '', search: '' });
    const [loading, setLoading] = useState(false);
    const [masterDropdownOpen, setMasterDropdownOpen] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmployeeId, setEditingEmployeeId] = useState(null);

    // Column sorting — click a header to sort asc, click again for desc,
    // click a third time to clear back to the server's default order.
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const handleSort = (key) => {
        setSortConfig((prev) => {
            if (prev.key !== key) return { key, direction: 'asc' };
            if (prev.direction === 'asc') return { key, direction: 'desc' };
            return { key: null, direction: 'asc' };
        });
    };

    const sortedEmployees = useMemo(() => {
        if (!sortConfig.key) return employees;
        const getValue = (emp) => {
            switch (sortConfig.key) {
                case 'employee_code': return (emp.employee_code || '').toLowerCase();
                case 'name': return `${emp.first_name || ''} ${emp.last_name || ''}`.trim().toLowerCase();
                case 'department_name': return (emp.department_name || '').toLowerCase();
                case 'role_name': return (emp.role_name || '').toLowerCase();
                case 'status': return (emp.status || '').toLowerCase();
                default: return '';
            }
        };
        return [...employees].sort((a, b) => {
            const aVal = getValue(a);
            const bVal = getValue(b);
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [employees, sortConfig]);

    const loadDepartments = useCallback(async () => {
        try {
            const res = await employeeService.getDepartments();
            if (res.success) setDepartments(res.data);
        } catch (e) { /* noop */ }
    }, []);

    const loadRolesForFilter = useCallback(async (deptId) => {
        if (!deptId) { setRoles([]); return; }
        try {
            const res = await employeeService.getRolesByDepartment(deptId);
            if (res.success) setRoles(res.data);
        } catch (e) { /* noop */ }
    }, []);

    const loadEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const res = await employeeService.getEmployees(filters);
            if (res.success) setEmployees(res.data);
        } catch (e) {
            Swal.fire('Error', 'Failed to load employees', 'error');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { loadDepartments(); }, [loadDepartments]);
    useEffect(() => { loadEmployees(); }, [loadEmployees]);
    useEffect(() => { loadRolesForFilter(filters.department); }, [filters.department, loadRolesForFilter]);

    const openAddModal = () => { setEditingEmployeeId(null); setModalOpen(true); };
    const openEditModal = (id) => { setEditingEmployeeId(id); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setEditingEmployeeId(null); };

    const handleSaved = () => { closeModal(); loadEmployees(); };

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Delete?', text: 'Are you sure?', icon: 'warning', showCancelButton: true });
        if (!result.isConfirmed) return;
        try {
            const res = await employeeService.deleteEmployee(id);
            if (res.success) { Swal.fire('Deleted!', res.message, 'success'); loadEmployees(); }
            else Swal.fire('Error', res.message, 'error');
        } catch (e) {
            Swal.fire('Error', 'Failed to delete employee', 'error');
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const title = newStatus === 'inactive' ? 'Deactivate Employee?' : 'Activate Employee?';
        const confirmText = newStatus === 'inactive' ? 'Yes, deactivate!' : 'Yes, activate!';

        const result = await Swal.fire({
            title, icon: 'warning', showCancelButton: true, confirmButtonText: confirmText,
            html: `
        <div class="mb-3"><label class="form-label">Last Working Date:</label><input type="date" id="lastWorkingDate" class="form-control" required></div>
        <div class="mb-3"><label class="form-label">Inactive Date:</label><input type="date" id="inactiveDate" class="form-control" value="${new Date().toISOString().split('T')[0]}" required></div>
        <div class="mb-3"><label class="form-label">Reason:</label><textarea id="statusChangeReason" class="form-control" rows="3" placeholder="Enter reason" required></textarea></div>
      `,
            preConfirm: () => {
                const reason = document.getElementById('statusChangeReason').value;
                const lastWorkingDate = document.getElementById('lastWorkingDate').value;
                const inactiveDate = document.getElementById('inactiveDate').value;
                if (!reason.trim()) { Swal.showValidationMessage('Please enter a reason'); return false; }
                if (!lastWorkingDate) { Swal.showValidationMessage('Please select last working date'); return false; }
                if (!inactiveDate) { Swal.showValidationMessage('Please select inactive date'); return false; }
                return { reason, lastWorkingDate, inactiveDate };
            },
        });

        if (!result.isConfirmed) return;
        try {
            const res = await employeeService.toggleStatus(id, {
                new_status: newStatus,
                reason: result.value.reason,
                last_working_date: result.value.lastWorkingDate,
                inactive_date: result.value.inactiveDate,
            });
            if (res.success) { Swal.fire('Success!', res.message, 'success'); loadEmployees(); }
            else Swal.fire('Error', res.message, 'error');
        } catch (e) {
            Swal.fire('Error', 'Failed to change status', 'error');
        }
    };

    const downloadMasterData = async (filterType) => {
        setMasterDropdownOpen(false);
        try {
            const res = await employeeService.exportEmployees(filterType);
            if (res.success && res.data.filepath) {
                const link = document.createElement('a');
                link.href = `${FILE_BASE}/${res.data.filepath}`;
                link.download = res.data.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                Swal.fire('Success', 'File downloaded successfully!', 'success');
            } else {
                Swal.fire('Error', res.message || 'Failed to generate file', 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Failed to download file', 'error');
        }
    };

    const search = useMemo(() => filters.search, [filters.search]);
    useEffect(() => {
        const t = setTimeout(() => loadEmployees(), 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <div className="p-4" id="kr-content">
            <div className="kr-page-container">
                <style>{emp_management_styles}</style>
                {/* <nav aria-label="breadcrumb" className="kr-breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><a href="/dashboard"><i className="fas fa-home"></i></a></li>
                        <li className="breadcrumb-item active">Employee Management</li>
                    </ol>
                </nav> */}

                <div className="kr-page-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h1 className="kr-page-title">Employee Management</h1>
                            <p className="kr-page-subtitle">Manage your organization's employees</p>
                        </div>
                        <div className="btn-group">
                            <button type="button" className="btn-primary" onClick={openAddModal}>
                                <i className="fas fa-plus-circle me-2"></i>Add Employee
                            </button>
                            <div className="btn-group ms-2 position-relative">
                                <button type="button" className="btn btn-success dropdown-toggle" onClick={() => setMasterDropdownOpen((v) => !v)}>
                                    <i className="fas fa-file-excel me-2"></i>Master Data
                                </button>
                                {masterDropdownOpen && (
                                    <ul className="dropdown-menu show" style={{ position: 'absolute', top: '100%', right: 0 }}>
                                        <li><a className="dropdown-item" href="#!" onClick={() => downloadMasterData('all')}><i className="fas fa-users me-2"></i>All Employees</a></li>
                                        <li><a className="dropdown-item" href="#!" onClick={() => downloadMasterData('active')}><i className="fas fa-user-check me-2 text-success"></i>Active Only</a></li>
                                        <li><a className="dropdown-item" href="#!" onClick={() => downloadMasterData('inactive')}><i className="fas fa-user-times me-2 text-danger"></i>Inactive Only</a></li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <ul className="nav nav-tabs kr-tabs mb-4">
                    {TABS.map((t) => (
                        <li className="nav-item" key={t.key}>
                            <a
                                className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                                href="#!"
                                onClick={(e) => { e.preventDefault(); setActiveTab(t.key); }}
                            >
                                <i className={`fas ${t.icon} me-2`}></i>{t.label}
                            </a>
                        </li>
                    ))}
                </ul>

            


{activeTab === 'employees' && (
  <div>
    <div className="kr-card mb-4">
      <div className="kr-card-body">
        <div className="row">
          <div className="col-md-3 mb-3">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={filters.department}
              onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value, role: '' }))}
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="col-md-3 mb-3">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="">All Roles</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="col-md-3 mb-3">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-header">
        <h5 className="mb-0"><i className="fas fa-users me-2"></i>Employees List</h5>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <DataTable
            data={employees}
            searchPlaceholder="Search by ID, Name, or Phone..."
            emptyMessage="No employees found"
            columns={[
              { key: 'employee_code', label: 'ID' },
              {
                key: 'image', label: 'Image', sortable: false,
                render: (emp) => (
                  <img
                    src={`${FILE_BASE}/uploads/profiles/${emp.profile_image || 'default.png'}`}
                    className="rounded-circle"
                    style={{ width: 40, height: 40, objectFit: 'cover' }}
                    alt=""
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = defaultProfile; }}
                  />
                ),
              },
              {
                key: 'name', label: 'Name',
                accessor: (emp) => `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
              },
              { key: 'department_name', label: 'Department' },
              { key: 'role_name', label: 'Role' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              {
                key: 'status', label: 'Status',
                render: (emp) => emp.status === 'active'
                  ? <span className="badge bg-success">Active</span>
                  : <span className="badge bg-danger">Inactive</span>,
              },
              {
                key: 'actions', label: 'Actions', sortable: false,
                render: (emp) => (
                  <>
                    <button className="btn btn-sm btn-primary me-1" onClick={() => openEditModal(emp.id)}><i className="fas fa-edit"></i></button>
                    {emp.status === 'active' ? (
                      <button className="btn btn-sm btn-warning me-1" title="Deactivate" onClick={() => handleToggleStatus(emp.id, emp.status)}><i className="fas fa-user-slash"></i></button>
                    ) : (
                      <button className="btn btn-sm btn-success me-1" title="Activate" onClick={() => handleToggleStatus(emp.id, emp.status)}><i className="fas fa-user-check"></i></button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(emp.id)}><i className="fas fa-trash"></i></button>
                  </>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  </div>
)}

                {activeTab === 'managers' && <ManagersTab />}
                {activeTab === 'statusHistory' && <StatusHistoryTab />}
                {activeTab === 'bulkUpload' && <BulkUploadTab onUploaded={() => setActiveTab('uploadHistory')} />}
                {activeTab === 'uploadHistory' && <UploadHistoryTab />}
                {activeTab === 'statusChanges' && <StatusChangeHistoryTab />}
            </div>

            {modalOpen && (
                <EmployeeModal
                    employeeId={editingEmployeeId}
                    departments={departments}
                    onClose={closeModal}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}