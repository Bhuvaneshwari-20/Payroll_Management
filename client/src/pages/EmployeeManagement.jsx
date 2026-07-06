import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import employeeService, { FILE_BASE } from '../services/employeeService';
import EmployeeModal from '../components/employee/EmployeeModal';
import ManagersTab from '../components/employee/ManagersTab';
import StatusHistoryTab from '../components/employee/StatusHistoryTab';
import StatusChangeHistoryTab from '../components/employee/StatusChangeHistoryTab';
import BulkUploadTab from '../components/employee/BulkUploadTab';
import UploadHistoryTab from '../components/employee/UploadHistoryTab';
import './EmployeeManagement.css';
import defaultProfile from "../assets/images/default-profile.png";

const TABS = [
    { key: 'employees', label: 'Employees', icon: 'fa-users' },
    { key: 'managers', label: 'Managers', icon: 'fa-user-tie' },
    // { key: 'statusHistory', label: 'Status History', icon: 'fa-history' },
    { key: 'bulkUpload', label: 'Bulk Upload', icon: 'fa-upload' },
    { key: 'uploadHistory', label: 'Upload History', icon: 'fa-history' },
    { key: 'statusChanges', label: 'Status Changes', icon: 'fa-exchange-alt' },
];

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
                <nav aria-label="breadcrumb" className="kr-breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><a href="/dashboard"><i className="fas fa-home"></i></a></li>
                        <li className="breadcrumb-item active">Employee Management</li>
                    </ol>
                </nav>

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
                                    <div className="col-md-3 mb-3">
                                        <label className="form-label">Search</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Search..."
                                            value={filters.search}
                                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0"><i className="fas fa-users me-2"></i>Employees List</h5>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table" width="100%">
                                        <thead>
                                            <tr>
                                                <th>ID</th><th>Image</th><th>Name</th><th>Department</th><th>Role</th>
                                                <th>Email</th><th>Phone</th><th>Status</th><th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading && (
                                                <tr><td colSpan="9" className="text-center py-4">Loading...</td></tr>
                                            )}
                                            {!loading && employees.length === 0 && (
                                                <tr><td colSpan="9" className="text-center py-4">No employees found</td></tr>
                                            )}
                                            {!loading && employees.map((emp) => (
                                                <tr key={emp.id}>
                                                    <td>{emp.employee_code || '-'}</td>
                                                    <td>
                                                        <img
                                                            src={`${FILE_BASE}/uploads/profiles/${emp.profile_image || "default.png"}`}
                                                            className="rounded-circle"
                                                            style={{ width: 40, height: 40, objectFit: "cover" }}
                                                            alt=""
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;   // prevent infinite loop
                                                                e.currentTarget.src = defaultProfile;
                                                            }}
                                                        />
                                                    </td>
                                                    <td>{emp.first_name} {emp.last_name}</td>
                                                    <td>{emp.department_name}</td>
                                                    <td>{emp.role_name}</td>
                                                    <td>{emp.email}</td>
                                                    <td>{emp.phone}</td>
                                                    <td>
                                                        {emp.status === 'active'
                                                            ? <span className="badge bg-success">Active</span>
                                                            : <span className="badge bg-danger">Inactive</span>}
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-sm btn-primary me-1" onClick={() => openEditModal(emp.id)}><i className="fas fa-edit"></i></button>
                                                        {emp.status === 'active' ? (
                                                            <button className="btn btn-sm btn-warning me-1" title="Deactivate" onClick={() => handleToggleStatus(emp.id, emp.status)}><i className="fas fa-user-slash"></i></button>
                                                        ) : (
                                                            <button className="btn btn-sm btn-success me-1" title="Activate" onClick={() => handleToggleStatus(emp.id, emp.status)}><i className="fas fa-user-check"></i></button>
                                                        )}
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(emp.id)}><i className="fas fa-trash"></i></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
