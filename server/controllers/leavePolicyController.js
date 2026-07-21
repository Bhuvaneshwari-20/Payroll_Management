const LeavePolicy = require('../models/LeavePolicy');
const LeaveType = require('../models/LeaveType');

const ALLOCATION_PERIODS = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'Unlimited'];
const UNITS = ['Days', 'Hours', 'Times'];
const RESET_CYCLES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'];

function validatePolicyBody(body) {
  if (!body.policy_name || !body.policy_name.trim()) return 'Policy name is required';
  if (!Array.isArray(body.details) || body.details.length === 0) {
    return 'At least one leave type must be added to the policy';
  }

  const seen = new Set();
  for (const d of body.details) {
    if (!d.leave_type_id) return 'Each policy line needs a leave type';
    if (seen.has(d.leave_type_id)) return 'The same leave type is added more than once';
    seen.add(d.leave_type_id);

    if (!ALLOCATION_PERIODS.includes(d.allocation_period)) return 'Invalid allocation period';
    if (d.allocation_period !== 'Unlimited') {
      const value = Number(d.allocation_value);
      if (Number.isNaN(value) || value < 0) return 'Allocation value must be a positive number';
    }
    if (d.unit && !UNITS.includes(d.unit)) return 'Invalid unit';
    if (d.reset_cycle && !RESET_CYCLES.includes(d.reset_cycle)) return 'Invalid reset cycle';
    if (d.carry_forward) {
      const maxCarry = Number(d.max_carry);
      if (Number.isNaN(maxCarry) || maxCarry < 0) return 'Maximum carry forward must be a positive number';
    }
  }
  return null;
}

// GET /api/leave-policies
exports.getLeavePolicies = async (req, res) => {
  try {
    const data = await LeavePolicy.getAll();
    res.json({ success: true, message: 'Leave policies retrieved successfully', data });
  } catch (err) {
    res.json({ success: false, message: 'Failed to retrieve leave policies: ' + err.message });
  }
};

// GET /api/leave-policies/:id
exports.getLeavePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.getById(req.params.id);
    if (!policy) return res.json({ success: false, message: 'Leave policy not found' });
    res.json({ success: true, message: 'Leave policy retrieved successfully', data: policy });
  } catch (err) {
    res.json({ success: false, message: 'Failed to retrieve leave policy: ' + err.message });
  }
};

// POST /api/leave-policies  (HR only)  { policy_name, description, status, details: [...] }
exports.addLeavePolicy = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    const error = validatePolicyBody(req.body);
    if (error) return res.json({ success: false, message: error });

    for (const d of req.body.details) {
      const type = await LeaveType.getById(d.leave_type_id);
      if (!type) return res.json({ success: false, message: `Leave type ${d.leave_type_id} not found` });
    }

    await LeavePolicy.create(req.body, req.body.details);
    res.json({ success: true, message: 'Leave policy saved successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'A policy with this name already exists' });
    }
    res.json({ success: false, message: 'Failed to save leave policy: ' + err.message });
  }
};

// PUT /api/leave-policies/:id  (HR only)
exports.updateLeavePolicy = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    const { id } = req.params;
    const error = validatePolicyBody(req.body);
    if (error) return res.json({ success: false, message: error });

    const affected = await LeavePolicy.update(id, req.body, req.body.details);
    if (!affected) return res.json({ success: false, message: 'Leave policy not found' });
    res.json({ success: true, message: 'Leave policy updated successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'A policy with this name already exists' });
    }
    res.json({ success: false, message: 'Failed to update leave policy: ' + err.message });
  }
};

// DELETE /api/leave-policies/:id  (HR only)
exports.deleteLeavePolicy = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    const inUse = await LeavePolicy.isAssignedToAnyEmployee(req.params.id);
    if (inUse) {
      return res.json({
        success: false,
        message: 'Cannot delete a policy currently assigned to employees — disable it instead',
      });
    }

    const affected = await LeavePolicy.remove(req.params.id);
    if (!affected) return res.json({ success: false, message: 'Leave policy not found' });
    res.json({ success: true, message: 'Leave policy deleted successfully' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to delete leave policy: ' + err.message });
  }
};

// PATCH /api/leave-policies/:id/status  { status: 'active' | 'inactive' }  (HR only)
exports.setLeavePolicyStatus = async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.json({ success: false, message: 'Status must be active or inactive' });
    }
    const affected = await LeavePolicy.setStatus(req.params.id, status);
    if (!affected) return res.json({ success: false, message: 'Leave policy not found' });
    res.json({ success: true, message: `Policy ${status === 'active' ? 'enabled' : 'disabled'} successfully` });
  } catch (err) {
    res.json({ success: false, message: 'Failed to update policy status: ' + err.message });
  }
};