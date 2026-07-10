import React, { forwardRef } from 'react';
import './PayslipPreview.css';
import { fn, fDate, formatMonthYear, numberToWords } from '../utils/payslipFormat';

/**
 * Ported 1:1 from the original buildPayslipHTML() JS function.
 * `selectedMonth` (YYYY-MM string) overrides the derived month/year label,
 * matching the original's `$('#selectedMonth').val()` behaviour.
 */
const PayslipPreview = forwardRef(function PayslipPreview({ data: d, selectedMonth }, ref) {
  if (!d) return null;

  const monthYear = selectedMonth
    ? new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : formatMonthYear(d.from_date);

  const earnings = [
    { label: 'BASIC', master: d.basic_fixed, earned: d.basic_earned },
    { label: 'HRA', master: d.hra_fixed, earned: d.hra_earned },
    { label: 'CONVEYANCE', master: d.conv_fixed, earned: d.conv_earned },
    { label: 'MEDICAL ALLOWANCE', master: d.medi_fixed, earned: d.medi_earned },
    { label: 'SPECIAL ALLOWANCE', master: d.spec_fixed, earned: d.spec_earned },
    { label: 'DA', master: d.da_fixed, earned: d.da_earned },
    { label: 'OTHER EARNING', master: d.other_ear_fixed ?? 0, earned: d.other_ear_earned ?? 0 },
  ].filter((e) => parseFloat(e.earned) > 0 || parseFloat(e.master) > 0);

  const deductions = [
    { label: 'PF', amt: d.pf },
    { label: 'ESI', amt: d.esi },
    { label: 'PROF TAX', amt: d.p_tax },
    { label: 'IT TAX', amt: d.it_tax },
    { label: 'Advance', amt: d.advance },
    { label: 'Food', amt: d.food },
    { label: 'Uniform', amt: d.uniform },
    { label: 'House Rent', amt: d.house_rent },
    { label: 'Other', amt: d.other_deduction },
  ].filter((x) => parseFloat(x.amt) > 0);

  const maxRows = Math.max(earnings.length, deductions.length, 1);
  const rows = Array.from({ length: maxRows }, (_, i) => ({
    e: earnings[i] || null,
    ded: deductions[i] || null,
  }));

  const now = new Date();
  const printDt =
    now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="ps-wrap" ref={ref}>
      <div className="ps-header">
        <div className="ps-logo">
          <div><img src="/assets/images/logo.png" alt="KR" style={{ height: 30 }} /></div>
          <div>
            <span className="brand-text">KRISH <span style={{ color: '#d10000' }}>TOYOTA</span></span>
            <span className="tagline">YOUR TRUST, OUR COMMITMENT</span>
          </div>
        </div>
        <div className="ps-company">
          <div className="cname">K Ramakrishnan Motorss Pvt Ltd.</div>
          <div className="caddr">SF No 191/1 &amp; 191/2, Iyer Hospital Bus stop, Trichy Road, Coimbatore 641005</div>
        </div>
      </div>

      <div className="ps-title">Payslip for the month of &nbsp;{monthYear}</div>

      <div className="ps-info">
        <div className="ps-info-col">
          <div className="ps-info-row"><span className="ps-lbl">Name:</span><span className="ps-val">{d.name || ''}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">Joining Date:</span><span className="ps-val">{fDate(d.joining_date)}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">Designation:</span><span className="ps-val">{d.designation || '-'}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">Department:</span><span className="ps-val">{d.department || '-'}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">Location:</span><span className="ps-val">Coimbatore</span></div>
          <div className="ps-info-row"><span className="ps-lbl">Effective Work Days:</span><span className="ps-val">{d.payable_days || d.days || 0}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">LOP:</span><span className="ps-val">{d.lop || 0}</span></div>
        </div>
        <div className="ps-info-col">
          <div className="ps-info-row"><span className="ps-lbl">Employee No:</span><span className="ps-val">{d.employee_code || ''}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">Bank Name:</span><span className="ps-val">{d.bank_name || ''}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">Bank Account No:</span><span className="ps-val">{d.bank_account || ''}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">PAN Number:</span><span className="ps-val">{d.pan_number || ''}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">PF No:</span><span className="ps-val">{d.pf_no || ''}</span></div>
          <div className="ps-info-row"><span className="ps-lbl">PF UAN:</span><span className="ps-val">{d.pf_uan || ''}</span></div>
        </div>
      </div>

      <table className="ps-table">
        <thead>
          <tr>
            <th style={{ width: '28%' }}>Earnings</th>
            <th className="r" style={{ width: '12%' }}>Gross</th>
            <th className="r" style={{ width: '12%' }}>Amount</th>
            <th style={{ width: '30%' }}>Deductions</th>
            <th className="r" style={{ width: '12%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.e ? row.e.label : ''}</td>
              <td className="r">{row.e ? (parseFloat(row.e.master) > 0 ? fn(row.e.master) : '—') : ''}</td>
              <td className="r">{row.e ? fn(row.e.earned) : ''}</td>
              <td>{row.ded ? row.ded.label : ''}</td>
              <td className="r">{row.ded ? fn(row.ded.amt) : ''}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td>Total Earnings</td>
            <td className="r">{fn(d.gross_fixed)}</td>
            <td className="r">{fn(d.gross_earned)}</td>
            <td>Total Deductions</td>
            <td className="r">{fn(d.total_deduction)}</td>
          </tr>
        </tbody>
      </table>

      <div className="ps-net">
        <span className="ps-net-label">Net Pay for the Month</span>
        <span className="ps-net-amount">₹ {fn(d.net_salary)}</span>
      </div>

      <div className="ps-words">({numberToWords(d.net_salary)})</div>
      <div className="ps-footer">This is a system generated payslip and does not require signature.</div>
      <div className="ps-printdate">Print Date: {printDt}</div>
    </div>
  );
});

export default PayslipPreview;