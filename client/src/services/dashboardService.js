import api from './api';

export async function fetchAdminStats() {
  const { data } = await api.get('/dashboard/stats');
  return data;
}

export async function fetchMyProfile() {
  const { data } = await api.get('/dashboard/profile');
  return data;
}
