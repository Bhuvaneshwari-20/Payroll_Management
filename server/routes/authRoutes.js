const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", auth.login);
router.get("/me", protect, auth.me);

module.exports = router;