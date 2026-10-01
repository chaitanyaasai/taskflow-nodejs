const express = require("express");
const router = express.Router();

const {
  register,
  verifyOTP,
  resendOTP,
  login,
  logout,
} = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");

// Register a new user
router.post("/register", register);

// Verify user's email OTP
router.post("/verify-otp", verifyOTP);

router.post("/resend-otp", resendOTP);

router.post("/login", login);

// Logout (requires authentication)
router.post("/logout", authenticateToken, logout);

module.exports = router;
