import api from './api';

export const getLeaveTypes = () => api.get('/leave/types');
export const applyLeave = (payload) => api.post('/leave/apply', payload);
export const getMyHistory = (category) => api.get('/leave/my', { params: { category } });
export const cancelLeave = (id) => api.put(`/leave/cancel/${id}`);

export const managerAction = (id, action, comments) => api.put(`/leave/manager-action/${id}`, { action, comments });

export const getHRQueue = (category) => api.get('/leave/hr-queue', { params: { category } });
export const hrAction = (id, action, comments) => api.put(`/leave/hr-action/${id}`, { action, comments });

export const getAllForHR = (category, status) =>
  api.get('/leave/hr-all', { params: { category, status } });

export const getRequestStats = () => api.get('/leave/stats');


export const getOrgStats = (category) => api.get('/leave/org-stats', { params: { category } });

export const getManagerQueue = (category) => api.get('/leave/manager/all', { params: { category } });
export const getHRStats = (category) => api.get('/leave/hr-stats', { params: { category } });