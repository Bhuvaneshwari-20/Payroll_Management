import api from './api';

export const employeeService = {
  // Employees
  getEmployees: (params) => api.get('/employees', { params }).then((r) => r.data),
  getEmployee: (id) => api.get(`/employees/${id}`).then((r) => r.data),
  addEmployee: (formData) =>
    api.post('/employees', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  updateEmployee: (id, formData) =>
    api.put(`/employees/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  deleteEmployee: (id) => api.delete(`/employees/${id}`).then((r) => r.data),
  toggleStatus: (id, payload) => api.patch(`/employees/${id}/status`, payload).then((r) => r.data),
  getRolesByDepartment: (departmentId) =>
    api.get('/employees/roles-by-department', { params: { department_id: departmentId } }).then((r) => r.data),

  // Departments (same client + endpoint as departmentService.js's fetchDepartments)
  getDepartments: () => api.get('/departments').then((r) => r.data),

  // Managers
  getManagers: (departmentId) =>
    api.get('/employees/managers/list', { params: { department_id: departmentId } }).then((r) => r.data),
  addManager: (departmentId, employeeId) =>
    api.post('/employees/managers', { department_id: departmentId, employee_id: employeeId }).then((r) => r.data),
  deleteManager: (id) => api.delete(`/employees/managers/${id}`).then((r) => r.data),

  // Status history / changes
  getStatusHistory: () => api.get('/employees/status-history').then((r) => r.data),
  exportStatusHistory: () => api.get('/employees/status-history/export').then((r) => r.data),
  getStatusChangeHistory: () => api.get('/employees/status-changes').then((r) => r.data),

  // Master data export
  exportEmployees: (filter) => api.get('/employees/export', { params: { filter } }).then((r) => r.data),

  // Bulk upload — DEDUCTIONS ONLY (existing employees)
  downloadDeductionTemplate: () => `${api.defaults.baseURL}/employees/bulk/template`,
  uploadBulkDeductions: (file, onProgress) => {
    const formData = new FormData();
    formData.append('excel_file', file);
    return api
      .post('/employees/bulk/deductions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  // Bulk upload — NEW EMPLOYEES (full records, same fields as Add Employee)
  downloadEmployeeTemplate: () => `${api.defaults.baseURL}/employees/bulk/employee-template`,
  uploadBulkEmployees: (file, onProgress) => {
    const formData = new FormData();
    formData.append('excel_file', file);
    return api
      .post('/employees/bulk/employees', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  getUploadHistory: () => api.get('/employees/bulk/history').then((r) => r.data),
  clearUploadHistory: () => api.delete('/employees/bulk/history').then((r) => r.data),
};


export const FILE_BASE = api.defaults.baseURL.replace(/\/api\/?$/, '');

export default employeeService;