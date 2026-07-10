import { useState, useEffect, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import DataTable from '../components/common/DataTable';
import {
  getHolidays,
  assignSundays,
  assignLongLeave,
  assignDateLeave,
  deleteHoliday,
} from '../services/leaveAllocationApi';
import './HolidayCalendar.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function notify(icon, title) {
  Swal.fire({
    icon, title, toast: true, position: 'top-end',
    showConfirmButton: false, timer: 3000, timerProgressBar: true,
  });
}

export default function HolidayCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHolidays();
      if (res.data.success) setHolidays(res.data.data || []);
    } catch {
      notify('error', 'Error fetching holidays');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  const holidayByDate = useMemo(() => {
    const map = {};
    holidays.forEach((h) => { map[h.hdate] = h; });
    return map;
  }, [holidays]);

  const goPrevMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingBlanks = firstDay.getDay();

  // ---- Day click -> Swal modal to pick leave type (matches PHP #leaveModal) ----
  async function handleDayClick(date) {
    const isoDate = toISODate(date);
    const dayName = FULL_DAY_NAMES[date.getDay()];

    if (holidayByDate[isoDate]) {
      notify('error', 'This date is already assigned as a holiday');
      return;
    }

    const result = await Swal.fire({
      title: 'Set Leave',
      html: `
        <p>Selected Date: ${date.toLocaleDateString('en-GB')}</p>
        <p>Day of the Week: ${dayName}</p>
        <select id="leaveTypeSelect" class="swal2-select" style="width:100%;display:block;">
          <option value="" disabled selected>Select type</option>
          <option value="Week-Off">Week-Off</option>
          <option value="TN Govt Holidays">TN Govt Holidays</option>
          <option value="Special Leave">Special Leave</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Close',
      preConfirm: () => {
        const val = document.getElementById('leaveTypeSelect').value;
        if (!val) {
          Swal.showValidationMessage('Please select a leave type');
          return false;
        }
        return val;
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await assignDateLeave(isoDate, result.value, dayName);
      if (res.data.success) {
        notify('success', 'Leave assigned successfully');
        loadHolidays();
      } else {
        notify('error', res.data.message || 'Error assigning leave');
      }
    } catch (err) {
      notify('error', err.response?.data?.message || 'Error assigning leave');
    }
  }

  // ---- Assign All Sundays for the visible month ----
  async function handleAssignSundays() {
    const dates = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      if (date.getDay() === 0) dates.push(toISODate(date));
    }
    if (dates.length === 0) {
      notify('error', 'No Sundays found in this month');
      return;
    }
    try {
      const res = await assignSundays(dates);
      if (res.data.success) {
        notify('success', 'Sundays assigned successfully');
        loadHolidays();
      } else {
        notify('error', res.data.message || 'Error assigning Sundays');
      }
    } catch (err) {
      notify('error', err.response?.data?.message || 'Error assigning Sunday leaves');
    }
  }

  // ---- Assign Long Leave (date range) -> Swal modal ----
  async function handleAssignLongLeave() {
    const result = await Swal.fire({
      title: 'Assign Long Leave',
      html: `
        <select id="ltypeSelect" class="swal2-select" style="width:100%;display:block;margin-bottom:10px;">
          <option value="" disabled selected>Select type</option>
          <option value="Vacation Leave">Vacation Leave</option>
          <option value="TN Govt Holidays">TN Govt Holidays</option>
          <option value="Special Leave">Special Leave</option>
        </select>
        <label style="display:block;text-align:left;font-size:0.85rem;margin-bottom:4px;">From Date:</label>
        <input type="date" id="fromDateInput" class="swal2-input" style="margin:0 0 10px;">
        <label style="display:block;text-align:left;font-size:0.85rem;margin-bottom:4px;">To Date:</label>
        <input type="date" id="toDateInput" class="swal2-input" style="margin:0;">
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Close',
      preConfirm: () => {
        const ltype = document.getElementById('ltypeSelect').value;
        const fromDate = document.getElementById('fromDateInput').value;
        const toDate = document.getElementById('toDateInput').value;
        if (!ltype || !fromDate || !toDate) {
          Swal.showValidationMessage('All fields are required');
          return false;
        }
        if (fromDate > toDate) {
          Swal.showValidationMessage('From Date cannot be after To Date');
          return false;
        }
        return { ltype, fromDate, toDate };
      },
    });

    if (!result.isConfirmed) return;

    try {
      const { ltype, fromDate, toDate } = result.value;
      const res = await assignLongLeave(ltype, fromDate, toDate);
      if (res.data.success) {
        notify('success', res.data.message);
        loadHolidays();
      } else {
        notify('error', res.data.message || 'Error assigning long leave');
      }
    } catch (err) {
      notify('error', err.response?.data?.message || 'Error assigning long leave');
    }
  }

  async function handleDelete(holiday) {
    const result = await Swal.fire({
      title: 'Delete this holiday?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await deleteHoliday(holiday.id, holiday.hdate);
      if (res.data.success) {
        notify('success', res.data.message);
        loadHolidays();
      } else {
        notify('error', res.data.message || 'Error deleting holiday');
      }
    } catch (err) {
      notify('error', err.response?.data?.message || 'Error deleting holiday');
    }
  }

  const holidayColumns = [
    { key: 'sno', label: 'S.No', sortable: false, accessor: (row, i) => i, render: (row) => holidays.indexOf(row) + 1 },
    { key: 'hdate', label: 'Date' },
    { key: 'days', label: 'Day' },
    { key: 'type', label: 'Type' },
    {
      key: 'action',
      label: 'Action',
      sortable: false,
      render: (row) => (
        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(row)}>
          Delete
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <button className="ha-btn-custom ha-btn-custom-success" onClick={handleAssignSundays}>
          <i className="fas fa-calendar-check me-1"></i> Assign All Sundays
        </button>
        <button className="ha-btn-custom ha-btn-custom-primary" onClick={handleAssignLongLeave}>
          <i className="fas fa-calendar-plus me-1"></i> Assign Long Leaves
        </button>
      </div>

      <div className="ha-calendar-container">
        <div className="ha-calendar-header">
          <button className="btn btn-sm btn-outline-light" onClick={goPrevMonth}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <h3 className="m-0">{MONTH_NAMES[month]} {year}</h3>
          <button className="btn btn-sm btn-outline-light" onClick={goNextMonth}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <div className="ha-calendar-grid">
          {DAY_NAMES.map((d) => (
            <div key={d} className="ha-calendar-day ha-day-header">{d}</div>
          ))}

          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="ha-calendar-day empty"></div>
          ))}

          {Array.from({ length: lastDay.getDate() }, (_, i) => i + 1).map((day) => {
            const date = new Date(year, month, day);
            const isoDate = toISODate(date);
            const holiday = holidayByDate[isoDate];
            return (
              <div
                key={day}
                className={`ha-calendar-day ${holiday ? 'ha-holiday' : ''}`}
                onClick={() => handleDayClick(date)}
              >
                {day}
                {holiday && <span className="ha-holiday-text">{holiday.type}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h4 className="card-title mb-4">Holiday Details</h4>
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : (
            <DataTable
              columns={holidayColumns}
              data={holidays}
              emptyMessage="No holidays found"
              rowKey={(row) => row.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}