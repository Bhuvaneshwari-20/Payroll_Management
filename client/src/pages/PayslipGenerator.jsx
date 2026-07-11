import React, { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';
import PayslipPreview from '../components/PayslipPreview';
import { fn } from '../utils/payslipFormat';
import {
  getEmployeesSalary,
  generateSingle,
  savePayslip,
  getApprovalStatus,
} from '../services/payslipApi';

function firstLastOfMonth(d = new Date()) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [first.toISOString().split('T')[0], last.toISOString().split('T')[0]];
}

// Everything that used to live in PayslipGenerator.css, now inlined so there's
// one file to maintain. The original rules hardcoded light-mode colors
// (#fff backgrounds, #212529 text, etc.) which is why the filter box, the
// employee multi-select, and the table header stayed a bright white/pink
// panel on the dark theme. Backgrounds/text/borders that should follow the
// theme now read from the --vb-* variables (defined once in Topbar.jsx);
// the semantic badge/tag colors (pending/approved/row-approved) are left as
// intentional accent colors since they're small pastel chips, not full panels.
const payslip_generator_styles = `
  .kr-page-container #empTable thead th.sorting,
  .kr-page-container #empTable thead th.sorting_asc,
  .kr-page-container #empTable thead th.sorting_desc {
      background-color: #ffc6cd !important;
      color: #1e1e1e;
  }
  .kr-page-container #empTable thead th { background-color: #ffc6cd; color: #1e1e1e; cursor: pointer; user-select: none; }

  .kr-page-container .card {
      background: var(--vb-bg-surface, #fff);
      color: var(--vb-text, #1e293b);
      border: none;
      box-shadow: 0 4px 16px var(--vb-shadow, rgba(0,0,0,0.06));
  }

  .kr-page-container .filter-section {
      background: var(--vb-bg-surface-2, #f8f9fa);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
  }

  .kr-page-container .form-label { color: var(--vb-text, #1e293b); }
  .kr-page-container .form-select,
  .kr-page-container .form-control {
      background: var(--vb-bg-surface-2, #fff);
      color: var(--vb-text, #1e293b);
      border: 1px solid var(--vb-border, #ced4da);
  }
  .kr-page-container .form-control.bg-light {
      background: var(--vb-bg-surface-2, #f8f9fa) !important;
      color: var(--vb-text, #1e293b);
  }

  .kr-page-container .text-muted { color: var(--vb-text-muted, #6c757d) !important; }

  .kr-page-container .table {
      color: var(--vb-text, #1e293b);
  }
  .kr-page-container .table.table-bordered {
      border-color: var(--vb-border, #dee2e6);
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

  .kr-page-container .status-badge-pending {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background-color: #fef9c3;
      color: #854d0e;
      border: 1px solid #fde047;
  }

  .kr-page-container .status-badge-approved {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background-color: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
  }

  .kr-page-container tr.row-approved td { background-color: #d1f0dd !important; }
  .kr-page-container .row-approved { background-color: #f0fdf4 !important; }
  .kr-page-container .row-approved td { color: #374151; }

  .kr-page-container #empTable .btn-success:disabled {
      background-color: #86efac;
      border-color: #86efac;
      color: #14532d;
      opacity: 1;
  }

  /* ── Multi-Select Dropdown ── */
  .kr-page-container .emp-selector-wrapper { position: relative; }

  .kr-page-container .emp-selector-box {
      border: 1.5px solid var(--vb-border, #ced4da);
      border-radius: 8px;
      padding: 5px 10px;
      min-height: 42px;
      cursor: text;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      align-items: center;
      background: var(--vb-bg-surface-2, #fff);
      transition: border-color .2s, box-shadow .2s;
      max-height: 80px;
      overflow-y: auto;
      overflow-x: hidden;
  }

  .kr-page-container .emp-selector-box:focus-within {
      border-color: #198754;
      box-shadow: 0 0 0 3px rgba(25,135,84,.15);
  }

  .kr-page-container .emp-selector-box input {
      border: none;
      outline: none;
      font-size: 14px;
      flex: 1;
      min-width: 140px;
      background: transparent;
      color: var(--vb-text, #212529);
      padding: 2px 0;
  }

  .kr-page-container .emp-selector-box::-webkit-scrollbar { width: 4px; }
  .kr-page-container .emp-selector-box::-webkit-scrollbar-track { background: var(--vb-bg-surface-2, #f1f1f1); border-radius: 4px; }
  .kr-page-container .emp-selector-box::-webkit-scrollbar-thumb { background: #adb5bd; border-radius: 4px; }
  .kr-page-container .emp-selector-box::-webkit-scrollbar-thumb:hover { background: #6c757d; }

  .kr-page-container .emp-selector-box input::placeholder { color: var(--vb-text-muted, #adb5bd); }

  .kr-page-container .emp-tag {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      max-width: 160px;
  }

  .kr-page-container .emp-tag span { overflow: hidden; text-overflow: ellipsis; }

  .kr-page-container .emp-tag-remove { cursor: pointer; color: #065f46; font-size: 11px; flex-shrink: 0; line-height: 1; }
  .kr-page-container .emp-tag-remove:hover { color: #dc3545; }

  .kr-page-container .emp-tag-all { background: #198754; color: #fff; border-color: #146c43; }
  .kr-page-container .emp-tag-all .emp-tag-remove { color: rgba(255,255,255,.8); }
  .kr-page-container .emp-tag-all .emp-tag-remove:hover { color: #fff; }

  .kr-page-container .emp-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0; right: 0;
      background: var(--vb-bg-surface, #fff);
      border: 1.5px solid var(--vb-border, #dee2e6);
      border-radius: 10px;
      box-shadow: 0 8px 28px var(--vb-shadow, rgba(0,0,0,0.13));
      z-index: 1055;
      display: none;
      flex-direction: column;
      max-height: 320px;
      overflow: hidden;
  }

  .kr-page-container .emp-dropdown.open { display: flex; }

  .kr-page-container .emp-dd-selectall {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      font-size: 13.5px;
      font-weight: 600;
      color: #198754;
      border-bottom: 1px solid var(--vb-border, #f0f2f5);
      cursor: pointer;
      background: var(--vb-bg-surface-2, #f8fffe);
      transition: background .15s;
      user-select: none;
  }

  .kr-page-container .emp-dd-selectall:hover { background: var(--vb-bg-surface-2, #ecfdf5); }
  .kr-page-container .emp-dd-selectall input[type=checkbox] { accent-color: #198754; width: 15px; height: 15px; }

  .kr-page-container .emp-dd-list { overflow-y: auto; flex: 1; }

  .kr-page-container .emp-dd-item {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 9px 14px;
      cursor: pointer;
      border-bottom: 1px solid var(--vb-border, #f8f9fa);
      transition: background .12s;
      user-select: none;
  }

  .kr-page-container .emp-dd-item:last-child { border-bottom: none; }
  .kr-page-container .emp-dd-item:hover { background: var(--vb-bg-surface-2, #f8fffe); }
  .kr-page-container .emp-dd-item.is-selected { background: var(--vb-bg-surface-2, #ecfdf5); }
  .kr-page-container .emp-dd-item input[type=checkbox] { accent-color: #198754; width: 15px; height: 15px; flex-shrink: 0; }

  .kr-page-container .emp-dd-avatar {
      width: 34px; height: 34px;
      border-radius: 50%;
      background: var(--vb-bg-surface-2, #e9ecef);
      display: flex; align-items: center; justify-content: center;
      color: var(--vb-text-muted, #6c757d);
      font-size: 14px;
      flex-shrink: 0;
  }

  .kr-page-container .emp-dd-info { flex: 1; overflow: hidden; }

  .kr-page-container .emp-dd-name {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--vb-text, #212529);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
  }

  .kr-page-container .emp-dd-code { font-size: 11.5px; color: var(--vb-text-muted, #6c757d); margin-top: 1px; }

  .kr-page-container .emp-dd-status { font-size: 11px; padding: 2px 7px; border-radius: 20px; font-weight: 600; flex-shrink: 0; }
  .kr-page-container .emp-dd-status.approved { background: #d1fae5; color: #065f46; }
  .kr-page-container .emp-dd-status.pending { background: #fef9c3; color: #92400e; }

  .kr-page-container .emp-dd-empty { padding: 24px; text-align: center; color: var(--vb-text-muted, #adb5bd); font-size: 13.5px; }
  .kr-page-container .emp-dd-empty i { display: block; font-size: 22px; margin-bottom: 8px; }

  .kr-page-container #approveSelectedBtn { white-space: nowrap; }

  .kr-page-container .modal-content {
      background: var(--vb-bg-surface, #fff);
      color: var(--vb-text, #1e293b);
      border: none;
  }
  .kr-page-container .modal-header.custom-modal-header {
      background: var(--vb-bg-surface-2, #f8f9fc);
      color: var(--vb-text, #1e293b);
      border-bottom: 1px solid var(--vb-border, #dee2e6);
  }
  .kr-page-container .modal-footer {
      border-top: 1px solid var(--vb-border, #dee2e6);
  }
`;

export default function PayslipGenerator() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [totalDays, setTotalDays] = useState('');

  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);       // raw list from API
  const [approvedMap, setApprovedMap] = useState({});   // { employee_code: true }
  const [loaded, setLoaded] = useState(false);

  // table search / sort (replaces jQuery DataTables)
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('employee_code');
  const [sortDir, setSortDir] = useState('asc');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  // multi-select employee dropdown
  const [ddOpen, setDdOpen] = useState(false);
  const [ddQuery, setDdQuery] = useState('');
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [approving, setApproving] = useState(false);
  const wrapperRef = useRef(null);

  // preview modal
  const [previewData, setPreviewData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    const [f, t] = firstLastOfMonth();
    setFromDate(f);
    setToDate(t);
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setDdOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    autoCalcDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  function autoCalcDays() {
    if (fromDate && toDate) {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      const diff = Math.floor((d2 - d1) / 86400000) + 1;
      setTotalDays(diff > 0 ? diff : 0);
      const ym = fromDate.slice(0, 7);
      setSelectedMonth((prev) => (prev !== ym ? ym : prev));
    } else {
      setTotalDays('');
    }
  }

  function applyMonthToRange() {
    if (!selectedMonth) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    setFromDate(first.toISOString().split('T')[0]);
    setToDate(last.toISOString().split('T')[0]);
  }

  // ── STEP 1: Load employees ──────────────────────────────────────
  async function loadEmployees() {
    if (!fromDate || !toDate) {
      Swal.fire('Missing dates', 'Select both dates', 'warning');
      return;
    }
    setLoading(true);
    setSelectedCodes(new Set());

    try {
      const res = await getEmployeesSalary(fromDate, toDate);
      if (res.data.status !== 'success') {
        Swal.fire('Error', res.data.message, 'error');
        setLoading(false);
        return;
      }

      const statusRes = await getApprovalStatus(fromDate, toDate);
      const approved = {};
      if (statusRes.data.status === 'success') {
        statusRes.data.data.forEach((row) => {
          if (row.status === 'approved') approved[row.employee_code] = true;
        });
      }

      setEmployees(res.data.data);
      setApprovedMap(approved);
      setLoaded(true);
      setPage(1);
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Direct approve (single row) ──────────────────────────────────
  async function directApprove(empCode) {
    const emp = employees.find((e) => e.employee_code === empCode);
    if (!emp) {
      Swal.fire('Error', 'Employee data not found. Please reload.', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Approve Payslip?',
      html: `<b>${emp.name}</b> (${empCode})<br>Net Salary: <b>₹${fn(emp.net_salary)}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: '<i class="fas fa-paper-plane me-1"></i> Approve & Send',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await savePayslip({
        employee_code: empCode,
        from_date: fromDate,
        to_date: toDate,
        selected_month: selectedMonth,
        payslip_data: JSON.stringify({ ...emp, from_date: fromDate, to_date: toDate }),
        status: 'approved',
      });
      if (res.data.status === 'success') {
        setApprovedMap((prev) => ({ ...prev, [empCode]: true }));
        Swal.fire({ title: 'Approved!', text: `Payslip for ${emp.name} sent.`, icon: 'success', timer: 1800, showConfirmButton: false });
      } else {
        Swal.fire('Error', res.data.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }

  // ── Preview ───────────────────────────────────────────────────────
  async function previewPayslip(empCode) {
    try {
      const res = await generateSingle(empCode, fromDate, toDate);
      if (res.data.status !== 'success') {
        Swal.fire('Error', res.data.message, 'error');
        return;
      }
      setPreviewData({ ...res.data.data, from_date: fromDate, to_date: toDate, _empCode: empCode });
      setShowModal(true);
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }

  async function approveFromModal() {
    if (!previewData) return;
    setShowModal(false);
    setTimeout(() => directApprove(previewData._empCode), 300);
  }

  function downloadPDF() {
    if (!printRef.current) {
      Swal.fire('No payslip loaded!', '', 'warning');
      return;
    }
    html2pdf()
      .set({
        margin: 5,
        filename: 'Payslip.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(printRef.current)
      .save();
  }

  // ── Multi-select dropdown data ───────────────────────────────────
  const ddList = employees.map((e) => ({
    code: e.employee_code,
    name: e.name,
    status: approvedMap[e.employee_code] ? 'approved' : 'pending',
  }));
  const filteredDdList = ddList.filter(
    (e) => e.name.toLowerCase().includes(ddQuery.toLowerCase()) || e.code.toLowerCase().includes(ddQuery.toLowerCase())
  );
  const pendingCodes = ddList.filter((e) => e.status !== 'approved').map((e) => e.code);
  const allSelected = pendingCodes.length > 0 && pendingCodes.every((c) => selectedCodes.has(c));

  function toggleEmpItem(code) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (allSelected) pendingCodes.forEach((c) => next.delete(c));
      else pendingCodes.forEach((c) => next.add(c));
      return next;
    });
  }

  function removeTag(code) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  }

  function clearAllTags() {
    setSelectedCodes(new Set());
  }

  async function approveSelected() {
    if (!selectedCodes.size) {
      Swal.fire('No Selection', 'Please select at least one employee.', 'warning');
      return;
    }
    const pending = [...selectedCodes].filter((code) => {
      const item = ddList.find((e) => e.code === code);
      return item && item.status !== 'approved';
    });
    if (!pending.length) {
      Swal.fire('All Done!', 'All selected employees are already approved.', 'info');
      return;
    }

    const result = await Swal.fire({
      title: 'Approve Selected Payslips?',
      html: `Approve and send payslips for <b>${pending.length} employee(s)</b>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: 'Yes, Approve',
    });
    if (!result.isConfirmed) return;

    setApproving(true);
    const newlyApproved = {};

    await Promise.all(
      pending.map(async (code) => {
        const emp = employees.find((e) => e.employee_code === code);
        if (!emp) return;
        try {
          const res = await savePayslip({
            employee_code: code,
            from_date: fromDate,
            to_date: toDate,
            selected_month: selectedMonth,
            payslip_data: JSON.stringify({ ...emp, from_date: fromDate, to_date: toDate }),
            status: 'approved',
          });
          if (res.data.status === 'success') newlyApproved[code] = true;
        } catch {
          /* individual failure ignored, matches original best-effort loop */
        }
      })
    );

    setApprovedMap((prev) => ({ ...prev, ...newlyApproved }));
    setSelectedCodes(new Set());
    setApproving(false);
    Swal.fire('Done!', `${pending.length} payslip(s) approved and sent.`, 'success');
  }

  // ── Table: filter / sort / paginate (replaces DataTables) ────────
  const filteredRows = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.employee_code.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    );
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    const cmp = typeof va === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="p-4 kr-page-container" id="kr-content">
      <style>{payslip_generator_styles}</style>

      <div className="kr-page-container">
        <nav aria-label="breadcrumb" className="kr-breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="#"><i className="fas fa-home"></i></a></li>
            <li className="breadcrumb-item active">Payslip Generator</li>
          </ol>
        </nav>
        <div className="kr-page-header">
          <h1 className="kr-page-title">Payslip Generator</h1>
          <p className="kr-page-subtitle">Generate and approve employee payslips</p>
        </div>

        {/* Filter */}
        <div className="row g-3 align-items-end">
          <div className="col-md-2">
            <label className="form-label fw-bold">From Date</label>
            <input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label fw-bold">To Date</label>
            <input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div className="col-md-2">
            <label className="form-label fw-bold">Select Month</label>
            <div className="input-group">
              <input type="month" className="form-control" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
              <button className="btn btn-outline-secondary" onClick={applyMonthToRange} title="Apply Month">
                <i className="fas fa-calendar-check"></i>
              </button>
            </div>
          </div>

          <div className="col-md-1">
            <label className="form-label fw-bold">Total Days</label>
            <input type="text" className="form-control bg-light fw-bold text-center text-success" readOnly value={totalDays} placeholder="0" />
          </div>

          <div className="col-md-2">
            <label className="form-label fw-bold d-block">&nbsp;</label>
            <button className="btn btn-primary w-100" onClick={loadEmployees} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="fas fa-search me-1"></i>}
              Load Employees
            </button>
          </div>

          {loaded && (
            <div className="col-md-4" ref={wrapperRef}>
              <label className="form-label fw-bold">Select Employees to Approve</label>
              <div className="emp-selector-wrapper">
                <div className="emp-selector-box">
                  <div>
                    {selectedCodes.size > 0 &&
                      (allSelected ? (
                        <div className="emp-tag emp-tag-all">
                          <span>All Pending ({selectedCodes.size})</span>
                          <span className="emp-tag-remove" onClick={clearAllTags}>✕</span>
                        </div>
                      ) : (
                        [...selectedCodes].map((code) => {
                          const e = ddList.find((x) => x.code === code);
                          if (!e) return null;
                          return (
                            <div className="emp-tag" key={code}>
                              <span title={e.name}>#{e.code}</span>
                              <span className="emp-tag-remove" onClick={() => removeTag(code)}>✕</span>
                            </div>
                          );
                        })
                      ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Search name or code…"
                    autoComplete="off"
                    value={ddQuery}
                    onChange={(e) => { setDdQuery(e.target.value); setDdOpen(true); }}
                    onFocus={() => setDdOpen(true)}
                  />
                </div>
                <div className={`emp-dropdown${ddOpen ? ' open' : ''}`}>
                  <div className="emp-dd-selectall" onClick={toggleSelectAll}>
                    <input type="checkbox" checked={allSelected} readOnly onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }} />
                    <span>Select All Pending</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6c757d', fontWeight: 500 }}>{ddList.length} total</span>
                  </div>
                  <div className="emp-dd-list">
                    {filteredDdList.length === 0 ? (
                      <div className="emp-dd-empty"><i className="fas fa-search"></i>No employees found</div>
                    ) : (
                      filteredDdList.map((e) => (
                        <div key={e.code} className={`emp-dd-item${selectedCodes.has(e.code) ? ' is-selected' : ''}`} onClick={() => toggleEmpItem(e.code)}>
                          <input type="checkbox" checked={selectedCodes.has(e.code)} readOnly onClick={(ev) => { ev.stopPropagation(); toggleEmpItem(e.code); }} />
                          <div className="emp-dd-avatar"><i className="fas fa-user"></i></div>
                          <div className="emp-dd-info">
                            <div className="emp-dd-name">{e.name}</div>
                            <div className="emp-dd-code">#{e.code}</div>
                          </div>
                          <span className={`emp-dd-status ${e.status}`}>{e.status === 'approved' ? '✓ Approved' : '⏳ Pending'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {loaded && (
            <div className="col-md-2">
              <label className="form-label fw-bold d-block">&nbsp;</label>
              <button className="btn btn-success w-100" onClick={approveSelected} disabled={!selectedCodes.size || approving}>
                {approving ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="fas fa-check-double me-1"></i>}
                Approve {selectedCodes.size > 0 && `(${selectedCodes.size})`}
              </button>
            </div>
          )}
        </div>

        <div className="card shadow-sm mt-3">
          <div className="card-body">
            {!loaded ? (
              <p className="text-muted text-center py-4">Select date range and click "Load Employees"</p>
            ) : loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary"></div>
                <p className="mt-2">Loading…</p>
              </div>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0">Found {employees.length} employees</h6>
                  <small className="text-muted">Period: {fromDate} → {toDate}</small>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    Show
                    <select className="form-select form-select-sm d-inline-block w-auto mx-2" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                      {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    entries
                  </div>
                  <div>
                    Search: <input className="form-control form-control-sm d-inline-block w-auto" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                  </div>
                </div>

                <table className="table table-bordered table-hover align-middle" id="empTable">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th onClick={() => toggleSort('employee_code')}>Emp Code {sortKey === 'employee_code' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                      <th onClick={() => toggleSort('name')}>Name {sortKey === 'name' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                      <th onClick={() => toggleSort('department')}>Department {sortKey === 'department' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                      <th onClick={() => toggleSort('gross_fixed')}>Gross Salary</th>
                      <th onClick={() => toggleSort('payable_days')}>Payable Days</th>
                      <th onClick={() => toggleSort('net_salary')}>Net Salary</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((emp, i) => {
                      const approved = !!approvedMap[emp.employee_code];
                      return (
                        <tr key={emp.employee_code} className={approved ? 'row-approved' : ''}>
                          <td>{(page - 1) * pageSize + i + 1}</td>
                          <td><strong>{emp.employee_code}</strong></td>
                          <td>{emp.name}</td>
                          <td>{emp.department}</td>
                          <td>₹{fn(emp.gross_fixed)}</td>
                          <td>{emp.payable_days}</td>
                          <td className="fw-bold text-success">₹{fn(emp.net_salary)}</td>
                          <td>
                            {approved ? (
                              <span className="status-badge-approved"><i className="fas fa-check-circle me-1"></i>Approved</span>
                            ) : (
                              <span className="status-badge-pending">Pending</span>
                            )}
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary me-1" onClick={() => previewPayslip(emp.employee_code)} title="Preview">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-sm btn-success" disabled={approved} onClick={() => directApprove(emp.employee_code)}>
                              {approved ? <><i className="fas fa-check me-1"></i>Sent</> : <><i className="fas fa-paper-plane me-1"></i>Approve</>}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">
                    Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length}
                  </span>
                  <div className="btn-group">
                    <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                    <button className="btn btn-sm btn-outline-secondary disabled">{page} / {totalPages}</button>
                    <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payslip Preview Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', zIndex: 9999 }} tabIndex="-1">
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)}></div>
          <div className="modal-dialog modal-lg modal-dialog-centered" style={{ zIndex: 10000 }}>
            <div className="modal-content">
              <div className="modal-header custom-modal-header">
                <h5 className="modal-title fw-bold"><i className="fas fa-file-invoice me-2"></i> Payslip Preview</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body p-0" id="payslipPrintArea">
                <PayslipPreview data={previewData} selectedMonth={selectedMonth} ref={printRef} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                <button
                  className="btn btn-warning"
                  disabled={previewData && approvedMap[previewData._empCode]}
                  onClick={approveFromModal}
                >
                  <i className="fas fa-check me-1"></i>
                  {previewData && approvedMap[previewData._empCode] ? 'Already Approved' : 'Approve & Send'}
                </button>
                <button className="btn btn-primary" onClick={downloadPDF}>
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