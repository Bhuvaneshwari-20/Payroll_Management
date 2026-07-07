import api from './api';

export const applyPermission = (payload) => api.post('/permission/apply', payload);
export const getMyPermissionHistory = () => api.get('/permission/my');
export const cancelPermission = (id) => api.delete(`/permission/${id}`);
export const getPermissionManagerQueue = () => api.get('/permission/manager-queue');
// Manager stage: action is 'forward' | 'reject'
export const permissionManagerAction = (id, action, comments) => api.put(`/permission/action/${id}`, { action, comments });
// NEW — HR stage: action is 'approve' | 'reject', only valid on a Forwarded request
export const permissionHrAction = (id, action, comments) => api.put(`/permission/hr-action/${id}`, { action, comments });
export const getAllPermissionsForAdmin = (status) => api.get('/permission/all', { params: { status } });
export const getPermissionOrgStats = () => api.get('/permission/org-stats');
export const getPermissionHRStats = () => api.get('/permission/hr-stats');