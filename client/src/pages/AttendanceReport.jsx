import { useRef, useState } from 'react';
import AttendanceFilter from '../components/attendance/AttendanceFilter';
import AttendanceSummary from '../components/attendance/AttendanceSummary';
import AttendanceTable from '../components/attendance/AttendanceTable';
import AttendanceDetailModal from '../components/attendance/AttendanceDetailModal';
import { generateAttendanceReport, exportAttendanceExcel } from '../services/attendanceReportApi';
import './AttendanceReport.css';

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