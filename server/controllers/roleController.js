const db = require("../config/db");

// GET /api/roles  — replaces case 'get_roles'
exports.getRoles = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, d.name as department_name
       FROM roles r
       LEFT JOIN departments d ON r.department_id = d.id
       ORDER BY r.name`
    );
    res.json({ success: true, message: "Roles retrieved successfully", data: rows });
  } catch (err) {
    res.json({ success: false, message: "Failed to retrieve roles: " + err.message });
  }
};

// GET /api/roles/:id  — replaces case 'get_role'
exports.getRole = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM roles WHERE id = ?", [id]);
    if (rows.length) {
      res.json({ success: true, message: "Role retrieved successfully", data: rows[0] });
    } else {
      res.json({ success: false, message: "Role not found" });
    }
  } catch (err) {
    res.json({ success: false, message: "Failed to retrieve role: " + err.message });
  }
};

// GET /api/roles/by-department/:department_id  — replaces case 'get_roles_by_department'
exports.getRolesByDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    if (!department_id) {
      return res.json({ success: false, message: "Department ID is required" });
    }
    const [rows] = await db.query(
      `SELECT id, name FROM roles WHERE department_id = ? AND status = 'active' ORDER BY name`,
      [department_id]
    );
    res.json({ success: true, message: "Roles retrieved successfully", data: rows });
  } catch (err) {
    res.json({ success: false, message: "Failed to retrieve roles: " + err.message });
  }
};

// POST /api/roles  — replaces case 'add_role'
exports.addRole = async (req, res) => {
  try {
    const { name, department_id, description = "", status = "active" } = req.body;

    if (!name || !department_id) {
      return res.json({ success: false, message: "Role name and department are required" });
    }

    await db.query(
      "INSERT INTO roles (name, department_id, description, status) VALUES (?, ?, ?, ?)",
      [name, department_id, description, status]
    );

    res.json({ success: true, message: "Role added successfully" });
  } catch (err) {
    res.json({ success: false, message: "Failed to add role: " + err.message });
  }
};

// PUT /api/roles/:id  — replaces case 'update_role'
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department_id, description = "", status = "active" } = req.body;

    if (!id || !name || !department_id) {
      return res.json({ success: false, message: "Role ID, name and department are required" });
    }

    await db.query(
      "UPDATE roles SET name = ?, department_id = ?, description = ?, status = ? WHERE id = ?",
      [name, department_id, description, status, id]
    );

    res.json({ success: true, message: "Role updated successfully" });
  } catch (err) {
    res.json({ success: false, message: "Failed to update role: " + err.message });
  }
};

// DELETE /api/roles/:id  — replaces case 'delete_role'
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.json({ success: false, message: "Role ID is required" });
    }

    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) as count FROM employees WHERE role_id = ?",
      [id]
    );

    if (count > 0) {
      return res.json({ success: false, message: "Cannot delete role with existing employees" });
    }

    await db.query("DELETE FROM roles WHERE id = ?", [id]);
    res.json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    res.json({ success: false, message: "Failed to delete role: " + err.message });
  }
};