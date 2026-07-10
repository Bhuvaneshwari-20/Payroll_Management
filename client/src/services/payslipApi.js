import api from "./api";

// ── HR / admin ───────────────────────────────────────────────────
export const getEmployeesSalary   = (from_date, to_date) => api.post('/payslips/employees-salary', { from_date, to_date });
export const generateSingle       = (employee_code, from_date, to_date) => api.post('/payslips/generate-single', { employee_code, from_date, to_date });
export const savePayslip          = (payload) => api.post('/payslips/save', payload);
export const getApprovalStatus    = (from_date, to_date) => api.post('/payslips/approval-status', { from_date, to_date });
export const getPayslipHistory    = () => api.get('/payslips/history');
export const getPayslipById       = (id) => api.get(`/payslips/${id}`);
export const updatePayslipStatus  = (id, status) => api.patch(`/payslips/${id}/status`, { status });
export const deletePayslip        = (id) => api.delete(`/payslips/${id}`);

// ── Employee self-service ────────────────────────────────────────
export const getMyPayslips        = () => api.get('/payslips/my/list');
export const getMyPayslipDetail   = (id) => api.get(`/payslips/my/${id}`);

export default api;