const { register, login, logout } = require("../controllers/auth.controller");
const { protect, authorize } = require("../middleware/auth.middleware");
const rateLimit = require("express-rate-limit");

const express = require("express");
const router = express.Router();
const MINUTE = 60 * 1000;

const authRateLimit = rateLimit({
  windowMs: 15 * MINUTE,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
});

router.use(authRateLimit);

router.post("/register", register);
router.post("/logout", protect, logout);
router.post("/login", login);

module.exports = router;
