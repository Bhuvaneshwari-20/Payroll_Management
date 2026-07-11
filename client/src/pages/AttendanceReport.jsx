import { useRef, useState } from 'react';
import AttendanceFilter from '../components/attendance/AttendanceFilter';
import AttendanceSummary from '../components/attendance/AttendanceSummary';
import AttendanceTable from '../components/attendance/AttendanceTable';
import AttendanceDetailModal from '../components/attendance/AttendanceDetailModal';
import { generateAttendanceReport, exportAttendanceExcel } from '../services/attendanceReportApi';

// Same pattern as LeaveManagement.jsx / Attendance.jsx: Bootstrap's
// .card/.table/.form-control/.modal-content don't know about the
// --vb-* theme variables (defined once in Topbar.jsx), so without this
// override block they stay hardcoded light — including the detail
// modal, which is rendered as a plain nested div here (no portal), so
// it's still a descendant of .attendance-report-page and gets themed too.
const attendance_report_styles = `
  .attendance-report-page .card {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: none;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
  }

  .attendance-report-page .form-select,
  .attendance-report-page .form-control {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #ced4da);
  }
  .attendance-report-page .form-label { color: var(--vb-text, #1e293b); }

  .attendance-report-page .table {
    color: var(--vb-text, #1e293b);
  }
  .attendance-report-page .table.table-bordered {
    border-color: var(--vb-border, #dee2e6);
  }
  .attendance-report-page .table thead th {
    color: var(--vb-text-muted, #495057);
    border-color: var(--vb-border, #dee2e6);
    font-weight: 600;
  }
  .attendance-report-page .table td,
  .attendance-report-page .table th {
    border-color: var(--vb-border, #dee2e6);
    vertical-align: middle;
  }
  .attendance-report-page .table > :not(caption) > * > * {
    background-color: transparent;
    color: var(--vb-text, #1e293b);
  }
  .attendance-report-page .table-hover > tbody > tr:hover > * {
    background-color: var(--vb-bg-surface-2, #f8f9fc);
  }

  .attendance-report-page .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  .attendance-report-page .modal-content {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #dee2e6);
  }
  .attendance-report-page .modal-header,
  .attendance-report-page .modal-footer {
    border-color: var(--vb-border, #dee2e6);
  }

  .attendance-report-page .page-link {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border-color: var(--vb-border, #dee2e6);
  }
  .attendance-report-page .page-item.active .page-link {
    background: #a4133c;
    border-color: #a4133c;
    color: #fff;
  }
  .attendance-report-page .page-item.disabled .page-link {
    background: var(--vb-bg-surface-2, #f8f9fc);
    color: var(--vb-text-muted, #6c757d);
  }

  /* ---- merged from the former AttendanceReport.css ---- */
  @media print {
    body * {
      visibility: hidden;
    }

    .print-area,
    .print-area * {
      visibility: visible;
    }

    .print-area {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
    }

    /* Scrollable containers get clipped/blank when printed if left as
       overflow:auto -- force them to render fully. */
    .print-area .table-responsive {
      overflow: visible !important;
      max-height: none !important;
    }

    @page {
      size: landscape;
    }
  }
`;

export default function AttendanceReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [lastFilters, setLastFilters] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef(null);

  async function handleGenerate(filters) {
    setLoading(true);
    setError('');
    try {
      const res = await generateAttendanceReport(filters);
      if (res.data.success) {
        setData(res.data.data);
        setSummary(res.data.summary);
        setLastFilters(filters);
      } else {
        setError(res.data.message || 'Could not generate report');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportExcel() {
    if (!lastFilters) return;
    setExporting(true);
    try {
      const res = await exportAttendanceExcel(lastFilters);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${lastFilters.from_date}_to_${lastFilters.to_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Excel export failed.');
    } finally {
      setExporting(false);
    }
  }

  // PDF export via jspdf + html2canvas (client-side, per spec).
  // Requires: npm install jspdf html2canvas
  async function handleExportPdf() {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(printRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
      pdf.save(`attendance_report_${lastFilters?.from_date}_to_${lastFilters?.to_date}.pdf`);
    } catch {
      setError('PDF export failed. Make sure jspdf and html2canvas are installed.');
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="attendance-report-page">
      <style>{attendance_report_styles}</style>

      <div className="dashboard-header mb-3">
        <h1 className="dashboard-title">Attendance Report</h1>
        <p className="dashboard-subtitle">Generate, print, and export attendance for any period.</p>
      </div>

      <div className="no-print">
        <AttendanceFilter onGenerate={handleGenerate} loading={loading} />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {summary && (
        <>
          <div className="d-flex justify-content-end gap-2 mb-3 no-print">
            <button className="btn btn-outline-secondary" onClick={handlePrint}>Print</button>
            <button className="btn btn-outline-success" onClick={handleExportExcel} disabled={exporting}>
              {exporting ? 'Working...' : 'Export Excel'}
            </button>
            <button className="btn btn-outline-danger" onClick={handleExportPdf} disabled={exporting}>
              {exporting ? 'Working...' : 'Export PDF'}
            </button>
          </div>

          <div ref={printRef} className="print-area">
            <AttendanceSummary summary={summary} />
            <AttendanceTable data={data} onSelectEmployee={setSelectedEmployee} />
          </div>
        </>
      )}

      {selectedEmployee && lastFilters && (
        <AttendanceDetailModal
          employeeCode={selectedEmployee}
          fromDate={lastFilters.from_date}
          toDate={lastFilters.to_date}
          status={lastFilters.status}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}