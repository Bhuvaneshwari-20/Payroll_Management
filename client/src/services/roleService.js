import api from './api';

export async function fetchRoles() {
  const { data } = await api.get('/roles');
  return data;
}

export async function fetchRole(id) {
  const { data } = await api.get(`/roles/${id}`);
  return data;
}

export async function fetchRolesByDepartment(departmentId) {
  const { data } = await api.get(`/roles/by-department/${departmentId}`);
  return data;
}

export async function createRole(payload) {
  const { data } = await api.post('/roles', payload);
  return data;
}

export async function updateRole(id, payload) {
  const { data } = await api.put(`/roles/${id}`, payload);
  return data;
}

export async function deleteRole(id) {
  const { data } = await api.delete(`/roles/${id}`);
  return data;
}