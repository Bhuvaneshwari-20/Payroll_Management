import api from './api';

export async function fetchLeaveTypes(includeInactive = false) {
  const { data } = await api.get('/leave-types', {
    params: includeInactive ? { includeInactive: '1' } : {},
  });
  return data;
}

export async function fetchLeaveType(id) {
  const { data } = await api.get(`/leave-types/${id}`);
  return data;
}

export async function createLeaveType(payload) {
  const { data } = await api.post('/leave-types', payload);
  return data;
}

export async function updateLeaveType(id, payload) {
  const { data } = await api.put(`/leave-types/${id}`, payload);
  return data;
}

export async function setLeaveTypeStatus(id, status) {
  const { data } = await api.patch(`/leave-types/${id}/status`, { status });
  return data;
}

export async function deleteLeaveType(id) {
  const { data } = await api.delete(`/leave-types/${id}`);
  return data;
}