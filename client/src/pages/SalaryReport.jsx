import { useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { generateReport, getHistoryList, getHistoryReport, deleteHistory } from '../services/salaryApi';
import { downloadSalaryExcel } from '../utils/salaryExcelExport';
import SalaryTable from '../components/salary/SalaryTable';
import HoldSalaryModal from '../components/salary/HoldSalaryModal';
import OtherEarningsModal from '../components/salary/OtherEarningsModal';
import FreezeReportModal from '../components/salary/FreezeReportModal';

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

// Same pattern as ManagerLeaveManagement.jsx / LeaveManagement.jsx / Departments.jsx /
// Roles.jsx / EmployeeManagement.jsx: Bootstrap's .nav-tabs/.card/.table/.form-control/
// .dropdown-menu and the ad-hoc `bg-light`/`bg-white` panels don't know about the
// --vb-* theme variables (defined once in Topbar.jsx), so without this override block
// they stay hardcoded light and show up as jarring white panels with near-invisible
// labels on a dark page — which is exactly what's happening in the screenshot
// (the "From Date" / "To Date" labels and stat boxes are dark text on dark bg).
const salary_report_styles = `
  .kr-page-container .nav-tabs {
    border-bottom: 1px solid var(--vb-border, #dee2e6);
  }
  .kr-page-container .nav-tabs .nav-link {
    color: var(--vb-text-muted, #495057);
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
  }
  .kr-page-container .nav-tabs .nav-link:hover {
    color: var(--vb-text, #1e293b);
    border-color: transparent;
  }
  .kr-page-container .nav-tabs .nav-link.active {
    color: var(--vb-text, #1e293b);
    background: transparent;
    border-bottom: 2px solid #a4133c;
  }

  .kr-page-container .bg-light {
    background: var(--vb-bg-surface-2, #f8f9fc) !important;
  }
  .kr-page-container .bg-white {
    background: var(--vb-bg-surface, #fff) !important;
  }
  .kr-page-container .shadow-sm {
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06)) !important;
  }

  .kr-page-container .form-label { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-select,
  .kr-page-container .form-control {
    background: var(--vb-bg-surface-2, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #ced4da);
  }
  .kr-page-container .form-control::-webkit-calendar-picker-indicator {
    filter: var(--vb-icon-invert, none);
  }

  .kr-page-container .card {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: none;
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
  }

  .kr-page-container h1,
  .kr-page-container h5,
  .kr-page-container h6 { color: var(--vb-text, #1e293b); }

  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  .kr-page-container .border,
  .kr-page-container .border.rounded {
    border-color: var(--vb-border, #dee2e6) !important;
    color: var(--vb-text, #1e293b);
  }

  .kr-page-container .table {
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table.table-bordered {
    border-color: var(--vb-border, #dee2e6);
  }
  .kr-page-container .table thead th {
    color: var(--vb-text-muted, #495057);
    border-color: var(--vb-border, #dee2e6);
    font-weight: 600;
  }
  .kr-page-container .table td,
  .kr-page-container .table th {
    border-color: var(--vb-border, #dee2e6);
    vertical-align: middle;
  }
  .kr-page-container .table > :not(caption) > * > * {
    background-color: transparent;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table-hover > tbody > tr:hover > * {
    background-color: var(--vb-bg-surface-2, #f8f9fc);
  }

  .kr-page-container .dropdown-menu {
    background: var(--vb-bg-surface, #fff);
    color: var(--vb-text, #1e293b);
    border: 1px solid var(--vb-border, #dee2e6);
    box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.12));
  }
  .kr-page-container .dropdown-item {
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .dropdown-item:hover,
  .kr-page-container .dropdown-item:focus {
    background: var(--vb-bg-surface-2, #f8f9fc);
    color: var(--vb-text, #1e293b);
  }

  .kr-page-container .history-item {
    background: var(--vb-bg-surface, #fff);
    border-color: var(--vb-border, #dee2e6) !important;
    color: var(--vb-text, #1e293b);
  }
  .kr-page-container .history-item.active {
    background: var(--vb-bg-surface-2, #e7f1ff) !important;
    border-color: #0d6efd !important;
  }
`;

export default function SalaryReport() {
    const [tab, setTab] = useState('generate');
    const [fromDate, setFromDate] = useState(firstDay);
    const [toDate, setToDate] = useState(lastDay);
    const [reportData, setReportData] = useState(null);
    const [holdStatusMap, setHoldStatusMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [showHold, setShowHold] = useState(false);
    const [showOE, setShowOE] = useState(false);
    const [showFreeze, setShowFreeze] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const [historyList, setHistoryList] = useState([]);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [historyHoldMap, setHistoryHoldMap] = useState({});

    const handleGenerate = async () => {
        if (!fromDate || !toDate) { Swal.fire('Error', 'Please select both dates', 'error'); return; }
        if (new Date(fromDate) > new Date(toDate)) { Swal.fire('Error', 'From Date cannot be greater than To Date', 'error'); return; }

        setLoading(true);
        setReportData(null);
        try {
            const res = await generateReport(fromDate, toDate);
            if (res.data.status === 'success') {
                const data = res.data.data;
                const map = {};
                data.forEach((row) => { map[row.employee_id] = row.payment_mode || 'neft'; });
                setHoldStatusMap(map);
                setReportData(data);
            } else {
                Swal.fire('Info', 'No data found', 'info');
            }
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to generate report', 'error');
        } finally {
            setLoading(false);
        }
    };

    const total = reportData?.length || 0;
    const cashCount = reportData ? reportData.filter((r) => (holdStatusMap[r.employee_id] || 'neft') === 'cash').length : 0;
    const neftCount = total - cashCount;

    const handleDownload = (filter) => {
        if (!reportData) { Swal.fire('Error', 'No report data', 'error'); return; }
        try {
            const result = downloadSalaryExcel(reportData, holdStatusMap, fromDate, toDate, filter);

            if (result.ok) {
                Swal.fire({ icon: 'success', title: 'Downloaded!', text: `${result.count} employee(s) exported.`, timer: 2000, showConfirmButton: false });
            } else {
                Swal.fire('Info', result.message, 'info');
            }
        } catch (err) {
            console.error('Excel export failed:', err);
            Swal.fire('Error', `Export failed: ${err.message}`, 'error');
        }
    };

    const loadHistory = useCallback(() => {
        getHistoryList().then((res) => setHistoryList(res.data.data || [])).catch(() => { });
    }, []);

    const viewHistoryReport = async (id) => {
        setSelectedHistory(id);
        try {
            const res = await getHistoryReport(id);
            const report = res.data.data;
            const parsed = JSON.parse(report.report_data);
            const map = {};
            parsed.data.forEach((row) => { map[row.employee_id] = row.payment_mode || 'neft'; });
            setHistoryHoldMap(map);
            setHistoryData({ ...report, parsedData: parsed.data });
        } catch {
            Swal.fire('Error', 'Failed to load report', 'error');
        }
    };

    const handleDeleteHistory = async () => {
        if (!selectedHistory) return;
        const result = await Swal.fire({
            title: 'Delete Report?', text: 'This action cannot be undone!', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, delete it!',
        });
        if (result.isConfirmed) {
            await deleteHistory(selectedHistory);
            Swal.fire('Deleted!', '', 'success');
            setSelectedHistory(null);
            setHistoryData(null);
            loadHistory();
        }
    };

    const reportPayload = reportData ? {
        data: reportData.map((row) => ({ ...row, payment_mode: holdStatusMap[row.employee_id] || 'neft' })),
    } : null;

    return (
        <div className="kr-page-container">
            <style>{salary_report_styles}</style>

            <h1 className="mb-1">Salary Report</h1>
            <p className="text-muted mb-4">Generate and manage salary reports</p>

            <ul className="nav nav-tabs mb-3">
                <li className="nav-item"><button className={`nav-link ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}><i className="fas fa-calculator me-2"></i>Generate Report</button></li>
                <li className="nav-item"><button className={`nav-link ${tab === 'history' ? 'active' : ''}`} onClick={() => { setTab('history'); loadHistory(); }}><i className="fas fa-history me-2"></i>Salary History</button></li>
            </ul>

            {tab === 'generate' && (
                <>
                    <div className="bg-light p-4 rounded mb-4">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-2">
                                <label className="form-label">From Date</label>
                                <input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">To Date</label>
                                <input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                            </div>
                            <div className="col-md-2">
                                <button className="btn btn-primary w-100" disabled={loading} onClick={handleGenerate}>
                                    <i className="fas fa-sync-alt me-1"></i>{loading ? 'Generating...' : 'Generate'}
                                </button>
                            </div>
                            <div className="col-md-3">
                                <button
                                    className="btn w-100 fw-semibold" onClick={() => setShowOE(true)}
                                    style={{ background: 'linear-gradient(135deg,#00c89b,#00a882)', color: '#fff', border: 'none' }}
                                >
                                    <i className="fas fa-plus-circle me-1"></i>Other Earnings
                                </button>
                            </div>
                            {reportData && (
                                <div className="col-md-2">
                                    <button className="btn w-100 fw-semibold" onClick={() => setShowHold(true)} style={{ background: '#1a2a4a', color: '#fff', border: 'none' }}>
                                        <i className="fas fa-hand-paper me-1"></i>Hold
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded shadow-sm">
                        {reportData && (
                            <div className="d-flex gap-3 align-items-center flex-wrap bg-white border rounded p-3 mb-3">
                                <span className="fw-bold me-2"><i className="fas fa-chart-bar me-1"></i>Salary Status</span>
                                <div className="border rounded px-3 py-2" style={{ fontSize: 13, fontWeight: 600 }}>Total: {total}</div>
                                <div className="border rounded px-3 py-2" style={{ fontSize: 13, fontWeight: 600 }}>NEFT/Transfer: {neftCount}</div>
                                <div className="border rounded px-3 py-2" style={{ fontSize: 13, fontWeight: 600 }}>Cash/Hold: {cashCount}</div>
                                <div className="ms-auto position-relative">
                                    <button
                                        className="btn btn-success"
                                        onClick={() => setShowDropdown((s) => !s)}
                                    >
                                        <i className="fas fa-file-excel me-1"></i>Download Excel
                                    </button>

                                    {showDropdown && (
                                        <>
                                            {/* invisible overlay to close dropdown when clicking outside */}
                                            <div
                                                style={{ position: 'fixed', inset: 0, zIndex: 1040 }}
                                                onClick={() => setShowDropdown(false)}
                                            />
                                            <ul
                                                className="dropdown-menu shadow show"
                                                style={{ position: 'absolute', right: 0, top: '100%', zIndex: 1050, display: 'block' }}
                                            >
                                                <li>
                                                    <button className="dropdown-item" onClick={() => { handleDownload('all'); setShowDropdown(false); }}>
                                                        <i className="fas fa-download text-success me-2"></i>All Employees Report
                                                    </button>
                                                </li>
                                                <li>
                                                    <button className="dropdown-item" onClick={() => { handleDownload('neft'); setShowDropdown(false); }}>
                                                        <i className="fas fa-university text-success me-2"></i>NEFT / Transfer Only <span className="badge bg-success ms-1">{neftCount}</span>
                                                    </button>
                                                </li>
                                                <li>
                                                    <button className="dropdown-item" onClick={() => { handleDownload('cash'); setShowDropdown(false); }}>
                                                        <i className="fas fa-hand-holding-usd text-warning me-2"></i>Cash / Hold Only <span className="badge bg-warning text-dark ms-1">{cashCount}</span>
                                                    </button>
                                                </li>
                                            </ul>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></div>
                                <p className="mt-3 text-muted fw-semibold">Generating salary report, please wait…</p>
                            </div>
                        )}

                        {!loading && reportData && <SalaryTable data={reportData} holdStatusMap={holdStatusMap} />}
                    </div>

                    {reportData && reportData.length > 0 && (
                        <button
                            className="btn btn-success btn-lg position-fixed"
                            style={{ bottom: 30, right: 30, zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
                            onClick={() => setShowFreeze(true)}
                        >
                            <i className="fas fa-lock me-2"></i>Freeze Report
                        </button>
                    )}
                </>
            )}

            {tab === 'history' && (
                <div className="row">
                    <div className="col-md-4">
                        <div className="card">
                            <div className="card-header bg-primary text-white"><h5 className="mb-0"><i className="fas fa-list me-2"></i>Saved Reports</h5></div>
                            <div className="card-body" style={{ maxHeight: 600, overflowY: 'auto' }}>
                                {historyList.length === 0 && <p className="text-muted">No saved reports</p>}
                                {historyList.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => viewHistoryReport(item.id)}
                                        className={`history-item p-3 border rounded mb-2 ${selectedHistory === item.id ? 'active' : ''}`}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <h6 className="mb-1"><i className="fas fa-file-alt me-2"></i>{item.report_name}</h6>
                                        <small className="text-muted">
                                            <i className="fas fa-calendar me-1"></i>{item.from_date} to {item.to_date}<br />
                                            <i className="fas fa-clock me-1"></i>{new Date(item.created_at).toLocaleString()}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-8">
                        <div className="card">
                            <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                                <h5 className="mb-0"><i className="fas fa-eye me-2"></i>Report Preview</h5>
                                {historyData && (
                                    <div>
                                        <a className="btn btn-sm btn-light me-2" href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/salary/download-excel?id=${selectedHistory}`}>
                                            <i className="fas fa-file-excel me-1"></i>Excel
                                        </a>
                                        <button className="btn btn-sm btn-danger" onClick={handleDeleteHistory}><i className="fas fa-trash me-1"></i>Delete</button>
                                    </div>
                                )}
                            </div>
                            <div className="card-body">
                                {!historyData && <p className="text-muted text-center">Select a report to view</p>}
                                {historyData && (
                                    <>
                                        <h5>{historyData.report_name}</h5>
                                        <p className="text-muted mb-1"><strong>Period:</strong> {historyData.from_date} to {historyData.to_date}</p>
                                        <p className="text-muted"><strong>Generated:</strong> {new Date(historyData.created_at).toLocaleString()}</p>
                                        <SalaryTable data={historyData.parsedData} holdStatusMap={historyHoldMap} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <HoldSalaryModal
                show={showHold} onClose={() => setShowHold(false)}
                reportData={reportData} holdStatusMap={holdStatusMap} setHoldStatusMap={setHoldStatusMap}
            />
            <OtherEarningsModal show={showOE} onClose={() => setShowOE(false)} />
            {reportData && (
                <FreezeReportModal
                    show={showFreeze} onClose={() => setShowFreeze(false)}
                    fromDate={fromDate} toDate={toDate} employeeCount={reportData.length}
                    reportPayload={reportPayload}
                    onFrozen={() => { setShowFreeze(false); }}
                />
            )}
        </div>
    );
}