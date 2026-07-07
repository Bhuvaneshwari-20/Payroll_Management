import api from './api';

export const generateReport = (fromDate, toDate) =>
  api.post('/salary/generate-report', { from_date: fromDate, to_date: toDate });

export const getEmployeesForOE = () => api.post('/salary/other-earning/list');
export const saveOtherEarning = (employeeId, otherEarning) =>
  api.post('/salary/other-earning/save', { employee_id: employeeId, other_earning: otherEarning });

export const saveHoldStatus = (holdStatusMap) =>
  api.post('/salary/hold-status/save', { hold_status: holdStatusMap });

export const freezeReport = (reportName, fromDate, toDate, reportData) =>
  api.post('/salary/freeze', { report_name: reportName, from_date: fromDate, to_date: toDate, report_data: reportData });

export const getHistoryList = () => api.post('/salary/history/list');
export const getHistoryReport = (id) => api.post('/salary/history/report', { id });
export const deleteHistory = (id) => api.post('/salary/history/delete', { id });    