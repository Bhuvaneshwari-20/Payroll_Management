import api from './api';

export const getBalances = () => api.get('/leave-allocation/balances');
export const assignAll = (etype, days) => api.post('/leave-allocation/assign-all', { etype, days });
export const assignSpecific = (empid, days) => api.post('/leave-allocation/assign-specific', { empid, days });
export const resetAll = () => api.post('/leave-allocation/reset');