const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  console.log("\n----------------------------------------");
  console.log(`[${new Date().toISOString()}] Incoming Request`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log(`IP: ${req.ip}`);

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const status = res.statusCode;
    const statusType =
      status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "SUCCESS";

    console.log(`[${new Date().toISOString()}] Request Completed`);
    console.log(`Status: ${status} ${statusType}`);
    console.log(`Duration: ${duration}ms`);
    console.log("----------------------------------------\n");
  });

  next();
};

module.exports = requestLogger;
