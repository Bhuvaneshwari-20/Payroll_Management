import api from './api';

// Leave balance
export const getBalances = () => api.get('/leave-allocation/balances');
export const assignAll = (etype, days) => api.post('/leave-allocation/assign-all', { etype, days });
export const assignSpecific = (empid, days) => api.post('/leave-allocation/assign-specific', { empid, days });
export const resetAll = () => api.post('/leave-allocation/reset');

// Holiday assignment
export const getHolidays = () => api.get('/leave-allocation/holidays');
export const assignSundays = (dates) => api.post('/leave-allocation/holidays/assign-sundays', { dates });
export const assignLongLeave = (ltype, fromDate, toDate) =>
  api.post('/leave-allocation/holidays/assign-long', { ltype, fromDate, toDate });
export const assignDateLeave = (date, leaveType, dayOfWeek) =>
  api.post('/leave-allocation/holidays/assign-date', { date, leaveType, dayOfWeek });
export const deleteHoliday = (id, hdate) =>
  api.delete(`/leave-allocation/holidays/${id}`, { data: { hdate } });