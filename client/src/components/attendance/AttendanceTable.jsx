import { useMemo } from 'react';
import DataTable from '../common/DataTable';

export default function AttendanceTable({ data, onSelectEmployee }) {
  const rows = useMemo(
    () => data.map((e) => ({ ...e, name: `${e.first_name} ${e.last_name}` })),
    [data]
  );

  const columns = [
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'half_day', label: 'Half Day' },
    { key: 'leave', label: 'Leave' },
    { key: 'holiday', label: 'Holiday' },
    { key: 'week_off', label: 'Week Off' },
    { key: 'lop', label: 'LOP' },
    { key: 'working_days', label: 'Working Days' },
    {
      key: 'attendance_percent',
      label: 'Attendance %',
      accessor: (r) => r.attendance_percent,
      render: (r) => `${r.attendance_percent}%`,
    },
  ];

  return (
    <div className="card p-3">
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.employee_code}
        pageSizeOptions={[10, 25, 50]}
        defaultPageSize={25}
        searchPlaceholder="Search employee..."
        emptyMessage="No data for the selected filters."
        onRowClick={(r) => onSelectEmployee(r.employee_code)}
      />
    </div>
  );
}