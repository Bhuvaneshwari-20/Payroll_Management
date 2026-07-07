const leaveModel = require('../models/leaveModel');

exports.getLeaveTypes = async (req, res) => {
  try {
    const types = await leaveModel.getLeaveTypes();
    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.applyLeave = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { category, leaveTypeId, startDate, endDate, startShift, endShift, reason } = req.body;
    const id = await leaveModel.applyLeave({
      employeeId, category: category || 'leave', leaveTypeId, startDate, endDate,
      startShift, endShift, reason
    });
    res.json({ success: true, id, message: 'Leave request submitted' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getMyHistory = async (req, res) => {
  try {
    const category = req.query.category || 'leave';
    const rows = await leaveModel.getMyHistory(req.user.id, category);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    await leaveModel.cancelLeave(req.user.id, req.params.id);
    res.json({ success: true, message: 'Leave cancelled' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getManagerQueue = async (req, res) => {
  try {
    const category = req.query.category || 'leave';
    const rows = await leaveModel.getPendingForManager(req.user.id, category);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.managerAction = async (req, res) => {
  try {
    const { action, comments } = req.body; // action: 'forward' | 'reject'
    await leaveModel.managerRespond(req.params.id, action, comments || '', req.user.id);
    res.json({ success: true, message: `Leave ${action === 'forward' ? 'forwarded to HR' : 'rejected'}` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getHRQueue = async (req, res) => {
  try {
    const category = req.query.category || 'leave';
    const rows = await leaveModel.getForwardedForHR(category);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllForHR = async (req, res) => {
  try {
    const category = req.query.category || 'leave';
    const status = req.query.status || null;
    const rows = await leaveModel.getAllForHR(category, status);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.hrAction = async (req, res) => {
  try {
    const { action, comments } = req.body; // action: 'approve' | 'reject'
    await leaveModel.hrRespond(req.params.id, action, comments || '', req.user.id);
    res.json({ success: true, message: `Leave ${action === 'approve' ? 'approved' : 'rejected (LOP)'}` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getRequestStats = async (req, res) => {
  try {
    const stats = await leaveModel.getRequestStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrgStats = async (req, res) => {
  try {
    const leaveStats = await leaveModel.getOrgRequestStats();
    const permissionModel = require('../models/permissionModel');
    const permStats = await permissionModel.getOrgRequestStats();
    res.json({
      success: true,
      data: {
        total: (leaveStats.total || 0) + (permStats.total || 0),
        pending: (leaveStats.pending || 0) + (permStats.pending || 0),
        rejected: (leaveStats.rejected || 0) + (permStats.rejected || 0),
        approved_today: (leaveStats.approved_today || 0) + (permStats.approved_today || 0),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getManagerAllRequests = async (req, res) => {
  try {
    const managerEmployeeId = req.user.id;
    const category = req.query.category || 'leave';
    const status = req.query.status || null;
    const data = await leaveModel.getAllForManager(managerEmployeeId, category, status);
    res.json({ success: true, message: 'ok', data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getHRStats = async (req, res) => {
  try {
    const category = req.query.category || 'leave';
    const stats = await leaveModel.getHRStats(category);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};