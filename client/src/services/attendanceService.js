// Reuses the SAME shared axios client (`./api`) that departmentService.js uses —
// this is the pattern that fixed the earlier Employees auth bug, so every
// attendance call gets identical auth/proxy behavior for free.
import api from './api';

// NOTE: 'Half-day' is intentionally NOT in this list. In this design, half-day
// is a separate boolean flag (is_half_day) with its own checkbox in the UI,
// combined with whichever base status applies (e.g. OD + half-day = "OD/S").
// Matches attendanceController.js's STATUS_VALUES exactly — keep these two in sync.
export const STATUS_OPTIONS = ['Present', 'Absent', 'CL', 'SL', 'OD', 'Holiday'];

export const attendanceService = {
  // ---- Employees (for Daily / Date-wise tabs) ----
  getEmployees: () => api.get('/attendance/employees').then((r) => r.data),

  // ---- Daily / Date-wise marking ----
  getByDate: (date) => api.get('/attendance', { params: { date } }).then((r) => r.data),
  markAttendance: (date, records) =>
    api.post('/attendance/mark', { date, records }).then((r) => r.data),

  // ---- Monthly report ----
  getMonthlyReport: (month, year) =>
    api.get('/attendance/report', { params: { month, year } }).then((r) => r.data),

  // ---- Template download ----
  // <a href="..."> can't carry the Authorization header — it's a plain browser
  // navigation, not an axios request. Fetch as a blob (with the token attached
  // by the shared interceptor) and trigger the save manually instead.
  downloadTemplate: async (month, year) => {
    const response = await api.get('/attendance/template', {
      params: { month, year },
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${year}_${month}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ---- Bulk upload: single-shot import (matches attendanceController.js's
  // POST /attendance/upload — reads day-code columns, ignores summary formula
  // columns as untrusted input, upserts server-side). ----
  uploadAttendance: (file, month, year, onProgress) => {
    const formData = new FormData();
    formData.append('excel_file', file);
    formData.append('month', month);
    formData.append('year', year);
    return api
      .post('/attendance/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      })
      .then((r) => r.data);
  },
};

export default attendanceService;
