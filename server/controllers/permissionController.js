const permissionModel = require('../models/permissionModel');

exports.applyPermission = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { requestDate, fromTime, toTime, reason } = req.body;
    const id = await permissionModel.applyPermission({ employeeId, requestDate, fromTime, toTime, reason });
    res.json({ success: true, id, message: 'Permission request submitted' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getMyHistory = async (req, res) => {
  try {
    const rows = await permissionModel.getMyHistory(req.user.id);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelPermission = async (req, res) => {
  try {
    await permissionModel.cancelPermission(req.user.id, req.params.id);
    res.json({ success: true, message: 'Permission request cancelled' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getManagerQueue = async (req, res) => {
  try {
    const status = req.query.status || null;
    const rows = await permissionModel.getAllForManager(req.user.id, status);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Manager stage: action is 'forward' or 'reject' ONLY (never 'approve').
exports.managerAction = async (req, res) => {
  try {
    const { action, comments } = req.body;
    await permissionModel.managerRespond(req.params.id, action, comments || '', req.user.id);
    res.json({ success: true, message: `Permission ${action === 'forward' ? 'forwarded to HR' : 'rejected'}` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// NEW: HR stage — action is 'approve' or 'reject', only valid on a Forwarded request.
exports.hrAction = async (req, res) => {
  try {
    const { action, comments } = req.body;
    await permissionModel.hrRespond(req.params.id, action, comments || '', req.user.id);
    res.json({ success: true, message: `Permission ${action === 'approve' ? 'approved' : 'rejected'}` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllForAdmin = async (req, res) => {
  try {
    const status = req.query.status || null;
    const rows = await permissionModel.getAllForAdmin(status);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrgStats = async (req, res) => {
  try {
    const stats = await permissionModel.getOrgRequestStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getHRStats = async (req, res) => {
  try {
    const stats = await permissionModel.getHRStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};