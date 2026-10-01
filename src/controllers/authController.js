const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { createOTP } = require("../services/otpService");
const { sendTestEmail } = require("../services/emailService");

async function register(req, res) {
  const { name, email, password } = req.body;

  // 1. Validate input
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required",
    });
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedName.length < 2 || normalizedName.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Name must be between 2 and 100 characters",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  //   const emailRegex = /^[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 72
  ) {
    return res.status(400).json({
      success: false,
      message: "Password must be between 8 and 72 characters",
    });
  }

  let client;
  let userId;

  try {
    // 2. Check if the email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 4. Generate OTP
    const { otp, otpHash, expiresAt } = createOTP();

    // 5. Create user inside a database transaction
    client = await pool.connect();

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO users
                (name, email, password_hash, is_verified, otp_hash, otp_expires_at)
             VALUES ($1, $2, $3, FALSE, $4, $5)
             RETURNING id`,
      [normalizedName, normalizedEmail, passwordHash, otpHash, expiresAt],
    );

    userId = result.rows[0].id;

    await client.query("COMMIT");

    // 6. Send OTP email
    try {
      await sendTestEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error("Registration email failed:", emailError.message);

      // Remove the unverified account if email delivery fails
      await pool.query(
        "DELETE FROM users WHERE id = $1 AND is_verified = FALSE",
        [userId],
      );

      return res.status(502).json({
        success: false,
        message: "Unable to send verification email. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email for the verification code.",
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Transaction rollback failed:", rollbackError.message);
      }
    }

    // Handle duplicate email race condition
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during registration",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function verifyOTP(req, res) {
  const { email, otp } = req.body;

  // 1. Validate input
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "OTP must be a 6-digit number",
    });
  }

  try {
    // 2. Find the user
    const result = await pool.query(
      `SELECT id, is_verified, otp_hash, otp_expires_at
             FROM users
             WHERE email = $1`,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result.rows[0];

    // 3. Check whether already verified
    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: "Account is already verified",
      });
    }

    // 4. Check whether OTP exists
    if (!user.otp_hash || !user.otp_expires_at) {
      return res.status(400).json({
        success: false,
        message: "No active OTP found. Please request a new one.",
      });
    }

    // 5. Check OTP expiry
    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // 6. Compare submitted OTP with stored hash
    const submittedHash = crypto.createHash("sha256").update(otp).digest("hex");

    const storedBuffer = Buffer.from(user.otp_hash, "hex");
    const submittedBuffer = Buffer.from(submittedHash, "hex");

    const isValidOTP =
      storedBuffer.length === submittedBuffer.length &&
      crypto.timingSafeEqual(storedBuffer, submittedBuffer);

    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // 7. Activate account and clear OTP
    await pool.query(
      `UPDATE users
             SET is_verified = TRUE,
                 otp_hash = NULL,
                 otp_expires_at = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
      [user.id],
    );

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Your account is now active.",
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during verification",
    });
  }
}

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "A valid email address is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find the user
    const result = await pool.query(
      `SELECT id, email, is_verified
       FROM users
       WHERE email = $1`,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        message: "Email is already verified. Please log in.",
      });
    }

    // Generate a fresh OTP
    const { otp, otpHash, expiresAt } = createOTP();

    // Save the new OTP hash and expiry
    await pool.query(
      `UPDATE users
       SET otp_hash = $1,
           otp_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [otpHash, expiresAt, user.id],
    );

    // Send the new OTP
    await sendTestEmail(user.email, otp);

    return res.status(200).json({
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);

    return res.status(500).json({
      message: "Unable to resend OTP. Please try again later.",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user in PostgreSQL
    const result = await pool.query(
      `SELECT id, name, email, password_hash, is_verified
       FROM users
       WHERE email = $1`,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Check whether email is verified
    if (!user.is_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    // Compare entered password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const tokenId = crypto.randomUUID();

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
        jwtid: tokenId,
      },
    );

    // Return successful response
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const logout = async (req, res) => {
  try {
    const { jti, exp } = req.user;

    if (!jti || !exp) {
      return res.status(400).json({
        success: false,
        message: "Invalid token information",
      });
    }

    await pool.query(
      `INSERT INTO revoked_tokens (jti, expires_at)
       VALUES ($1, to_timestamp($2))
       ON CONFLICT (jti) DO NOTHING`,
      [jti, exp],
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { register, verifyOTP, resendOTP, login, logout };
