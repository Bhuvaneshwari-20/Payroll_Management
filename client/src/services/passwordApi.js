import api from "./api";
// ── HR / admin ───────────────────────────────────────────────────
export const getEmployeePasswords = () => api.get('/passwords');
export const resetEmployeePassword = (employeeId) => api.post(`/passwords/${employeeId}/reset`);

// ── Employee self-service ────────────────────────────────────────
export const checkPasswordSecurity = () => api.get('/passwords/check-security');
export const changePassword = (newPassword) => api.post('/passwords/change', { new_password: newPassword });

export default api;