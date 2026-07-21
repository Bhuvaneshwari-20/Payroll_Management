import { useCallback, useEffect, useState } from 'react';
import { fetchLeaveTypes } from '../services/leaveTypeService';
import { getEmployeeBalances } from '../services/leaveAllocationApi';

const BASE_STATUSES = [
  { code: 'P', name: 'Present' },
  { code: 'AB', name: 'Absent' },
];

// Single source of truth for every screen that shows attendance status
// codes — Daily/Date-wise dropdowns, Upload help text, Matrix legend,
// Detail modal labels. Add a leave type once on the Leave Types screen,
// it shows up everywhere this hook is used, no code change needed.
export function useAttendanceStatusOptions({ withBalances = false } = {}) {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState({}); // { [employee_id]: { [code]: balanceInfo } }

  useEffect(() => {
    fetchLeaveTypes(false).then((res) => {
      if (res.success) setLeaveTypes(res.data || []);
    }).catch(() => {});
  }, []);

  // Pulled out as its own function (instead of an inline .then() in the
  // effect below) so callers — e.g. Attendance.jsx after a successful
  // save — can call it directly to force a refresh. Before this, balances
  // were only ever fetched once on mount: the effect's dependency array
  // was [withBalances], and withBalances is a constant passed in by the
  // caller, so it never changed and the effect never ran a second time.
  // A save could update employee_leave_balance.used correctly in the DB
  // and the dropdown would still show the balance from page-load time.
  const refetchBalances = useCallback(() => {
    if (!withBalances) return Promise.resolve();
    return getEmployeeBalances().then((res) => {
      const rows = res.data.data || [];
      const map = {};
      rows.forEach((r) => {
        if (!map[r.employee_id]) map[r.employee_id] = {};
        map[r.employee_id][r.leave_type_code] = r;
      });
      setBalances(map);
    }).catch(() => {});
  }, [withBalances]);

  useEffect(() => {
    refetchBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withBalances]);

  const statusOptions = [...BASE_STATUSES, ...leaveTypes.map((lt) => ({ code: lt.code, name: lt.name }))];

  const codeLabelMap = statusOptions.reduce((acc, s) => ({ ...acc, [s.code]: s.name }), {});

  const codesHelpText =
    statusOptions.map((s) => `${s.code}${s.name === s.code ? '' : ` (${s.name})`}`).join(', ') +
    '. Add /S for half-day (e.g. OD/S).';

  // "CL — Casual Leave (5 left)" / "OD — On Duty (Unlimited)" / plain code
  // if this employee has no balance row for it (not in their policy at all).
  function optionLabel(code, employeeId) {
    const name = codeLabelMap[code] || code;
    if (!withBalances || code === 'P' || code === 'AB') return `${code} — ${name}`;
    const bal = balances[employeeId]?.[code];
    if (!bal) return `${code} — ${name}`;
    return `${code} — ${name} (${bal.balance} left)`;
  }

  return { statusOptions, leaveTypes, codesHelpText, balances, optionLabel, refetchBalances };
}