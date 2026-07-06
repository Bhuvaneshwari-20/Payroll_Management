export default function LeaveStatusBadge({ status, isLop }) {
  const map = {
    Pending: 'bg-warning text-dark',
    Forwarded: 'bg-info text-dark',
    Approved: 'bg-success',
    Rejected: isLop ? 'bg-danger' : 'bg-secondary',
    Cancelled: 'bg-secondary',
  };
  const label = status === 'Rejected' && isLop ? 'Rejected (LOP)' : status;
  return <span className={`badge ${map[status] || 'bg-secondary'}`}>{label}</span>;
}