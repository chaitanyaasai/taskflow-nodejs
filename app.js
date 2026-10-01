require("dotenv").config();
const pool = require("./src/config/db");
const express = require("express");
const { sendTestEmail } = require("./src/services/emailService");
const authRoutes = require("./src/routes/authRoutes");
const requestLogger = require("./src/middleware/logger");
const authenticateToken = require("./src/middleware/authMiddleware");
const taskRoutes = require("./src/routes/taskRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(requestLogger);

// Authentication routes
app.use("/api/auth", authRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).send("TaskFlow API is running!");
});

app.get("/api/protected", authenticateToken, (req, res) => {
  console.log("[API] Protected route accessed");

  return res.status(200).json({
    message: "You have accessed a protected route",
    user: req.user,
  });
});

// Temporary email test endpoint
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

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.status(200).json({
      success: true,
      message: "Database connected successfully!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
