const express = require("express");
const router = express.Router();
const dashboard = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

router.get("/stats", protect, dashboard.getAdminStats);   // HR
router.get("/profile", protect, dashboard.getMyProfile);  // Employee/Manager

module.exports = router;
