const express = require("express");
const router = express.Router();
const { authenticate, requireHR } = require("../middleware/auth");
const ctrl = require("../controllers/passwordController");

// ── HR / admin ───────────────────────────────────────────────────
router.get("/", authenticate, requireHR, ctrl.getEmployeePasswords);
router.post("/:id/reset", authenticate, requireHR, ctrl.resetEmployeePassword);

// ── Employee self-service ─────────────────────────────────────────
router.get("/check-security", authenticate, ctrl.checkPasswordSecurity);
router.post("/change", authenticate, ctrl.changePassword);

module.exports = router;