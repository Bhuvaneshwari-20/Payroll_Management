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

// FIX: was missing — employees previously had no way to cancel a
// still-Pending permission request (mirrors leave's cancelLeave).
exports.cancelPermission = async (req, res) => {
  try {
    await permissionModel.cancelPermission(req.user.id, req.params.id);
    res.json({ success: true, message: 'Permission request cancelled' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// FIX: previously called getPendingForManager, so an approved/rejected
// request disappeared from the manager's queue immediately. Now returns
// full history (any status) — same fix already applied on the Leave side.
exports.getManagerQueue = async (req, res) => {
  try {
    const status = req.query.status || null;
    const rows = await permissionModel.getAllForManager(req.user.id, status);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.managerAction = async (req, res) => {
  try {
    const { action, comments } = req.body;
    await permissionModel.managerRespond(req.params.id, action, comments || '', req.user.id);
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