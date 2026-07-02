const db = require("../config/db");

// GET /api/departments  — replaces case 'get_departments'
exports.getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM departments ORDER BY name");
    res.json({ success: true, message: "Departments retrieved successfully", data: rows });
  } catch (err) {
    res.json({ success: false, message: "Failed to retrieve departments: " + err.message });
  }
};

// GET /api/departments/:id  — replaces case 'get_department'
exports.getDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM departments WHERE id = ?", [id]);
    if (rows.length) {
      res.json({ success: true, message: "Department retrieved successfully", data: rows[0] });
    } else {
      res.json({ success: false, message: "Department not found" });
    }
  } catch (err) {
    res.json({ success: false, message: "Failed to retrieve department: " + err.message });
  }
};

// POST /api/departments  — replaces case 'add_department'
exports.addDepartment = async (req, res) => {
  try {
    const { name, description = "", status = "active" } = req.body;

    if (!name) {
      return res.json({ success: false, message: "Department name is required" });
    }

    await db.query(
      "INSERT INTO departments (name, description, status) VALUES (?, ?, ?)",
      [name, description, status]
    );

    res.json({ success: true, message: "Department added successfully" });
  } catch (err) {
    res.json({ success: false, message: "Failed to add department: " + err.message });
  }
};

// PUT /api/departments/:id  — replaces case 'update_department'
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description = "", status = "active" } = req.body;

    if (!id || !name) {
      return res.json({ success: false, message: "Department ID and name are required" });
    }

    await db.query(
      "UPDATE departments SET name = ?, description = ?, status = ? WHERE id = ?",
      [name, description, status, id]
    );

    res.json({ success: true, message: "Department updated successfully" });
  } catch (err) {
    res.json({ success: false, message: "Failed to update department: " + err.message });
  }
};

// DELETE /api/departments/:id  — replaces case 'delete_department'
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.json({ success: false, message: "Department ID is required" });
    }

    // Same guard as PHP: block delete if employees still reference this department
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) as count FROM employees WHERE department_id = ?",
      [id]
    );

    if (count > 0) {
      return res.json({ success: false, message: "Cannot delete department with existing employees" });
    }

    await db.query("DELETE FROM departments WHERE id = ?", [id]);
    res.json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    res.json({ success: false, message: "Failed to delete department: " + err.message });
  }
};