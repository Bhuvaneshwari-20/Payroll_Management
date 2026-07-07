const salaryModel = require('../models/salaryModel');

exports.generateReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.body;
    if (!from_date || !to_date) return res.status(400).json({ status: 'error', message: 'Dates required' });
    const data = await salaryModel.calculateSalary(from_date, to_date);
    res.json({ status: 'success', data, from_date, to_date });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getEmployeesForOE = async (req, res) => {
  try {
    const data = await salaryModel.getEmployeesForOE();
    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.saveOtherEarning = async (req, res) => {
  try {
    const { employee_id, other_earning } = req.body;
    if (Number(other_earning) < 0) return res.status(400).json({ status: 'error', message: 'Amount cannot be negative' });
    const data = await salaryModel.saveOtherEarning(employee_id, other_earning);
    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.saveHoldStatus = async (req, res) => {
  try {
    const updated = await salaryModel.saveHoldStatus(req.body.hold_status || {});
    res.json({ status: 'success', updated, message: 'Hold status saved' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.freezeReport = async (req, res) => {
  try {
    const { report_name, from_date, to_date, report_data } = req.body;
    const id = await salaryModel.freezeReport(report_name, from_date, to_date, report_data);
    res.json({ status: 'success', message: 'Frozen', id });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

exports.getHistoryList = async (req, res) => {
  try {
    const data = await salaryModel.getHistoryList();
    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getHistoryReport = async (req, res) => {
  try {
    const row = await salaryModel.getHistoryReport(req.body.id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Report not found' });
    res.json({ status: 'success', data: row });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.deleteHistory = async (req, res) => {
  try {
    await salaryModel.deleteHistory(req.body.id);
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};