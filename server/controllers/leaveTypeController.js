const LeaveType = require('../models/LeaveType');

// GET /api/leave-types?includeInactive=1
exports.getLeaveTypes = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === '1' && req.user.role === 'HR';
    const data = await LeaveType.getAll(includeInactive);
    res.json({ success: true, message: 'Leave types retrieved successfully', data });
  } catch (err) {
    res.json({ success: false, message: 'Failed to retrieve leave types: ' + err.message });
  }
};

// GET /api/leave-types/:id
exports.getLeaveType = async (req, res) => {
  try {
    const type = await LeaveType.getById(req.params.id);
    if (!type) return res.json({ success: false, message: 'Leave type not found' });
    res.json({ success: true, message: 'Leave type retrieved successfully', data: type });
  } catch (err) {
    res.json({ success: false, message: 'Failed to retrieve leave type: ' + err.message });
  }
};

// POST /api/leave-types  (HR only)  { name, code, description, max_days_per_year }
exports.addLeaveType = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    const { name, code, description = '', max_days_per_year = null } = req.body;
    if (!name || !code) {
      return res.json({ success: false, message: 'Leave name and leave code are required' });
    }

    const existing = await LeaveType.getByCode(code.trim().toUpperCase());
    if (existing) {
      return res.json({ success: false, message: `Leave code "${code}" is already in use` });
    }

    await LeaveType.create({ name, code, description, max_days_per_year });
    res.json({ success: true, message: 'Leave type added successfully' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to add leave type: ' + err.message });
  }
};

// PUT /api/leave-types/:id  (HR only)
exports.updateLeaveType = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    const { id } = req.params;
    const { name, code, description = '', max_days_per_year = null, status = 'active' } = req.body;
    if (!name || !code) {
      return res.json({ success: false, message: 'Leave name and leave code are required' });
    }

    const existing = await LeaveType.getByCode(code.trim().toUpperCase());
    if (existing && String(existing.id) !== String(id)) {
      return res.json({ success: false, message: `Leave code "${code}" is already in use` });
    }

    const affected = await LeaveType.update(id, { name, code, description, max_days_per_year, status });
    if (!affected) return res.json({ success: false, message: 'Leave type not found' });
    res.json({ success: true, message: 'Leave type updated successfully' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to update leave type: ' + err.message });
  }
};

// PATCH /api/leave-types/:id/status  { status: 'active' | 'inactive' }  (HR only)
// Disable instead of delete — same pattern as Departments/Roles.
exports.setLeaveTypeStatus = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.json({ success: false, message: 'Status must be active or inactive' });
    }
    const affected = await LeaveType.setStatus(id, status);
    if (!affected) return res.json({ success: false, message: 'Leave type not found' });
    res.json({ success: true, message: `Leave type ${status === 'active' ? 'enabled' : 'disabled'} successfully` });
  } catch (err) {
    res.json({ success: false, message: 'Failed to update leave type status: ' + err.message });
  }
};

// DELETE /api/leave-types/:id  (HR only)
exports.deleteLeaveType = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    const { id } = req.params;
    const referenced = await LeaveType.isReferenced(id);
    if (referenced) {
      return res.json({
        success: false,
        message: 'Cannot delete a leave type with a policy or leave history — disable it instead',
      });
    }

    const affected = await LeaveType.remove(id);
    if (!affected) return res.json({ success: false, message: 'Leave type not found' });
    res.json({ success: true, message: 'Leave type deleted successfully' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to delete leave type: ' + err.message });
  }
};