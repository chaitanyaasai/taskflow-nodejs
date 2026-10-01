const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[AUTH] Missing or invalid authorization header");

      return res.status(401).json({
        message: "Authentication token is required",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check whether token has a unique identifier
    if (!decoded.jti) {
      console.warn("[AUTH] Token does not contain a jti");

      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    // Check whether token has been revoked
    const result = await pool.query(
      `SELECT id
       FROM revoked_tokens
       WHERE jti = $1`,
      [decoded.jti],
    );

    if (result.rows.length > 0) {
      console.warn(`[AUTH] Revoked token rejected for user: ${decoded.userId}`);

      return res.status(401).json({
        message: "Session expired. Please log in again.",
      });
    }

    // Attach authenticated user information
    req.user = decoded;

    console.log(`[AUTH] Token verified for user ID: ${decoded.userId}`);

    next();
  } catch (error) {
    console.warn(`[AUTH] Token verification failed: ${error.name}`);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authenticateToken;
