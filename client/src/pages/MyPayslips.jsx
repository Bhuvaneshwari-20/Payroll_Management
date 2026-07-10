import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import Swal from 'sweetalert2';
import PayslipPreview from '../components/PayslipPreview';
import { getMyPayslips, getMyPayslipDetail } from '../services/payslipApi';
import { fn } from '../utils/payslipFormat';

function monthLabel(payslipMonth, fromDate) {
  const src = payslipMonth ? payslipMonth + '-01' : fromDate;
  if (!src) return { month: '', year: '' };
  const d = new Date(src);
  return {
    month: d.toLocaleDateString('en-IN', { month: 'long' }),
    year: d.toLocaleDateString('en-IN', { year: 'numeric' }),
  };
}

export default function MyPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [previewData, setPreviewData] = useState(null);
  const [previewMonth, setPreviewMonth] = useState('');
  const [showModal, setShowModal] = useState(false);
  // When set, the modal opens invisibly (no backdrop shown) purely to get a
  // real committed DOM node to export from, then auto-closes after download.
  const [downloadOnly, setDownloadOnly] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await getMyPayslips();
      if (res.data.status === 'success') {
        setPayslips(res.data.data);
      } else {
        setError(res.data.message || 'Could not load payslips');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAndSetPreview(id) {
    const res = await getMyPayslipDetail(id);
    if (res.data.status !== 'success') {
      Swal.fire('Error', res.data.message, 'error');
      return false;
    }
    const row = res.data.data;
    const decoded = JSON.parse(row.payslip_data);
    setPreviewData(decoded);
    setPreviewMonth(row.payslip_month || '');
    return true;
  }

  async function viewPayslip(id) {
    try {
      const ok = await fetchAndSetPreview(id);
      if (ok) { setDownloadOnly(false); setShowModal(true); }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }

  async function downloadPayslip(id) {
    try {
      const ok = await fetchAndSetPreview(id);
      if (ok) { setDownloadOnly(true); setShowModal(true); }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }

  // Runs AFTER the modal (and printRef's DOM node) has actually committed —
  // this is what root.render() + setTimeout was trying to approximate with
  // a guess. useEffect guarantees the DOM is painted before we touch it.
  useEffect(() => {
    if (!showModal || !downloadOnly || !printRef.current) return;

    exportPdf(printRef.current, previewMonth).finally(() => {
      setDownloadOnly(false);
      setShowModal(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, downloadOnly]);

  function exportPdf(node, filenameHint) {
    return html2pdf().set({
      margin: 5,
      filename: `Payslip_${filenameHint || 'download'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(node).save();
  }

  function downloadFromModal() {
    if (!printRef.current) return;
    exportPdf(printRef.current, previewMonth);
  }

  return (
    <div className="p-4">
      <nav aria-label="breadcrumb" className="kr-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="#"><i className="fas fa-home"></i></a></li>
          <li className="breadcrumb-item active">My Payslips</li>
        </ol>
      </nav>

      <div className="kr-page-header mb-3">
        <h1 className="kr-page-title"><i className="fas fa-file-invoice-dollar me-2"></i>My Payslips</h1>
        <p className="kr-page-subtitle">View and download your approved payslips</p>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary"></div>
        </div>
      )}

      {!loading && error && <p className="text-danger">{error}</p>}

      {!loading && !error && payslips.length === 0 && (
        <p className="text-muted text-center py-4">No approved payslips yet.</p>
      )}

      <div className="row g-3">
        {payslips.map((p) => {
          const { month, year } = monthLabel(p.payslip_month, p.from_date);
          return (
            <div className="col-md-4" key={p.id}>
              <div className="card shadow-sm h-100">
                <div
                  className="card-header text-white text-center py-3"
                  style={{ background: 'linear-gradient(135deg,#2196f3,#1565c0)' }}
                >
                  <div className="fw-bold fs-5">{month}</div>
                  <div>{year}</div>
                </div>
                <div className="card-body">
                  <span className="status-badge-approved mb-2 d-inline-flex">
                    <i className="fas fa-check-circle me-1"></i> Approved
                  </span>
                  <div className="fs-4 fw-bold text-success mt-2">₹ {fn(p.net_salary)}</div>
                  <div className="text-muted small mb-2">Net Pay</div>
                  <div className="text-muted small">
                    <i className="fas fa-calendar me-1"></i>{p.from_date} to {p.to_date}
                  </div>
                </div>
                <div className="card-footer bg-white d-flex gap-2">
                  <button className="btn btn-outline-primary flex-fill" onClick={() => viewPayslip(p.id)}>
                    <i className="fas fa-eye me-1"></i> View
                  </button>
                  <button className="btn btn-danger flex-fill" onClick={() => downloadPayslip(p.id)}>
                    <i className="fas fa-download me-1"></i> Download
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', zIndex: 9999, ...(downloadOnly ? { opacity: 0, pointerEvents: 'none' } : {}) }}
          tabIndex="-1"
        >
          {!downloadOnly && (
            <div className="modal-backdrop fade show" onClick={() => setShowModal(false)}></div>
          )}
          <div className="modal-dialog modal-lg modal-dialog-centered" style={{ zIndex: 10000 }}>
            <div className="modal-content">
              <div className="modal-header custom-modal-header">
                <h5 className="modal-title fw-bold"><i className="fas fa-file-invoice me-2"></i> Payslip</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body p-0">
                <PayslipPreview data={previewData} selectedMonth={previewMonth} ref={printRef} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={downloadFromModal}>
                  <i className="fas fa-download me-1"></i> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}