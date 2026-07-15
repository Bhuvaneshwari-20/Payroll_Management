import api from "./api";

export const fetchLeavePolicies = async () => {
  const res = await api.get('/leave-policies');
  return res.data;
};

export const fetchLeavePolicy = async (id) => {
  const res = await api.get(`/leave-policies/${id}`);
  return res.data;
};

export const createLeavePolicy = async (payload) => {
  const res = await api.post('/leave-policies', payload);
  return res.data;
};

export const updateLeavePolicy = async (id, payload) => {
  const res = await api.put(`/leave-policies/${id}`, payload);
  return res.data;
};

export const setLeavePolicyStatus = async (id, status) => {
  const res = await api.patch(`/leave-policies/${id}/status`, { status });
  return res.data;
};

export const deleteLeavePolicy = async (id) => {
  const res = await api.delete(`/leave-policies/${id}`);
  return res.data;
};