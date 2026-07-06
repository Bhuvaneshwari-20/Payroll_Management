import api from './api';
 
export const applyPermission = (payload) => api.post('/permission/apply', payload);
export const getMyPermissionHistory = () => api.get('/permission/my');
export const cancelPermission = (id) => api.delete(`/permission/${id}`);
export const getPermissionManagerQueue = () => api.get('/permission/manager-queue');
export const permissionManagerAction = (id, action, comments) => api.put(`/permission/action/${id}`, { action, comments });
export const getAllPermissionsForAdmin = (status) => api.get('/permission/all', { params: { status } });