import api from './api';

export const getLeaveTypes = () => api.get('/leave/types');
export const applyLeave = (payload) => api.post('/leave/apply', payload);
export const getMyHistory = (category) => api.get('/leave/my', { params: { category } });
export const cancelLeave = (id) => api.put(`/leave/cancel/${id}`);

// export const getManagerQueue = (category) => api.get('/leave/manager-queue', { params: { category } });
export const managerAction = (id, action, comments) => api.put(`/leave/manager-action/${id}`, { action, comments });

export const getHRQueue = (category) => api.get('/leave/hr-queue', { params: { category } });
export const hrAction = (id, action, comments) => api.put(`/leave/hr-action/${id}`, { action, comments });

export const getAllForHR = (category, status) =>
  api.get('/leave/hr-all', { params: { category, status } });   // ✅ this was missing

export const getRequestStats = () => api.get('/leave/stats');
export const getOrgStats = () => api.get('/leave/org-stats');
export const getManagerQueue = (category) => api.get('/leave/manager/all', { params: { category } });