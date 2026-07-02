const express = require("express");
const router = express.Router();
const dept = require("../controllers/departmentController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, dept.getDepartments);
router.get("/:id", protect, dept.getDepartment);
router.post("/", protect, dept.addDepartment);
router.put("/:id", protect, dept.updateDepartment);
router.delete("/:id", protect, dept.deleteDepartment);

module.exports = router;