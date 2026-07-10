const CARDS = [
  { key: 'working_days', label: 'Working Days', color: '#4c4cff' },
  { key: 'present', label: 'Present', color: '#28a745' },
  { key: 'absent', label: 'Absent', color: '#dc3545' },
  { key: 'half_day', label: 'Half Day', color: '#ffc107' },
  { key: 'leave', label: 'Leave', color: '#17a2b8' },
  { key: 'holiday', label: 'Holiday', color: '#6f42c1' },
];

export default function AttendanceSummary({ summary }) {
  if (!summary) return null;

  return (
    <div className="row g-3 mb-3">
      {CARDS.map((c) => (
        <div className="col-6 col-md-2" key={c.key}>
          <div className="card text-center p-3" style={{ borderTop: `3px solid ${c.color}` }}>
            <div className="fs-4 fw-bold">{summary[c.key] ?? 0}</div>
            <div className="text-muted small">{c.label}</div>
          </div>
        </div>
      ))}
      <div className="col-6 col-md-2">
        <div className="card text-center p-3" style={{ borderTop: '3px solid #EB0A1E' }}>
          <div className="fs-4 fw-bold">{summary.attendance_percent ?? 0}%</div>
          <div className="text-muted small">Attendance %</div>
        </div>
      </div>
    </div>
  );
}