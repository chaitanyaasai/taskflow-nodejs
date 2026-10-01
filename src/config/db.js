const { Pool } = require("pg");

// Create a connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Log unexpected errors from idle clients
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err.message);
});

// Export the pool for use in controllers and services
module.exports = pool;
