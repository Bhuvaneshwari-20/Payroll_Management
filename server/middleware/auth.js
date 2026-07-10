const jwt = require("jsonwebtoken");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

function authenticate(req, res, next) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.token || bearer;

  if (!token) {
    return res.status(401).json({ status: "error", message: "Not authenticated. Please log in again." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET); // { id, employee_code, role }
    next();
  } catch (err) {
    return res.status(401).json({ status: "error", message: "Session expired. Please log in again." });
  }
}

/**
 * Restricts a route to HR/admin roles. Case-insensitive on purpose — your
 * actual stored role value is 'HR' (uppercase, per Sidebar.jsx), but this
 * checked against lowercase "admin"/"hr" only, causing every legitimate HR
 * user to get a 403. Same root cause as the RoleProtectedRoute.jsx fix on
 * the frontend — just needed here too since the backend never got it.
 */
function requireHR(req, res, next) {
  const role = (req.user?.role || "").toLowerCase();
  if (!req.user || !["admin", "hr"].includes(role)) {
    return res.status(403).json({ status: "error", message: "Not authorized" });
  }
  next();
}

async function resolveEmpCode(req) {
  if (req.user?.employee_code) return req.user.employee_code;

  if (req.user?.id) {
    const [rows] = await db.query("SELECT employee_code FROM employees WHERE id = ? LIMIT 1", [req.user.id]);
    return rows[0]?.employee_code || "";
  }

  return "";
}

module.exports = { authenticate, requireHR, resolveEmpCode, JWT_SECRET };