const express = require("express");
const router = express.Router();
const role = require("../controllers/roleController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, role.getRoles);
router.get("/by-department/:department_id", protect, role.getRolesByDepartment);
router.get("/:id", protect, role.getRole);
router.post("/", protect, role.addRole);
router.put("/:id", protect, role.updateRole);
router.delete("/:id", protect, role.deleteRole);

module.exports = router;