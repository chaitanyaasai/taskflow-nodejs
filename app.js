require("dotenv").config();

const express = require("express");
const path = require("path");

const pool = require("./src/config/db");

const { sendTestEmail } = require("./src/services/emailService");

const authRoutes = require("./src/routes/authRoutes");
const taskRoutes = require("./src/routes/taskRoutes");
const aiRoutes = require("./src/routes/aiRoutes");

const requestLogger = require("./src/middleware/logger");
const authenticateToken = require("./src/middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());
app.use(requestLogger);

// Serve frontend files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// API ROUTES
// ==========================================

// Authentication routes
app.use("/api/auth", authRoutes);

// Task management routes
app.use("/api/tasks", taskRoutes);

// AI task planning route — requires login
app.use("/api/ai", authenticateToken, aiRoutes);
// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "TaskFlow API is running!",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// PROTECTED ROUTE
// ==========================================

app.get("/api/protected", authenticateToken, (req, res) => {
  console.log("[API] Protected route accessed");

  return res.status(200).json({
    message: "You have accessed a protected route",
    user: req.user,
  });
});

// ==========================================
// TEMPORARY EMAIL TEST ENDPOINT
// ==========================================

app.post("/api/test-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const info = await sendTestEmail(email);

    return res.status(200).json({
      message: "Test email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Email error:", error.message);

    return res.status(500).json({
      message: "Failed to send test email",
    });
  }
});

// ==========================================
// DATABASE TEST ENDPOINT
// ==========================================

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    return res.status(200).json({
      success: true,
      message: "Database connected successfully!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TaskFlow server running on port ${PORT}`);
});
