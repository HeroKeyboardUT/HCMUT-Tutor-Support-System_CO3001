require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const config = require("./config/config");
const { startSessionScheduler } = require("./utils/sessionScheduler");

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware (development only)
if (config.server.env === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "HCMUT Tutor API is running",
    timestamp: new Date().toISOString(),
    environment: config.server.env,
  });
});

// API Routes
app.use("/api/auth", require("./route/auth"));
app.use("/api/users", require("./route/user"));
app.use("/api/tutors", require("./route/tutor"));
app.use("/api/students", require("./route/student"));
app.use("/api/sessions", require("./route/session"));
app.use("/api/matchings", require("./route/matching"));
app.use("/api/feedback", require("./route/feedback"));
app.use("/api/library", require("./route/library"));
app.use("/api/notifications", require("./route/notification"));
app.use("/api/datacore", require("./route/datacore"));
app.use("/api/reports", require("./route/report"));
app.use("/api/community", require("./route/community"));
app.use("/api/programs", require("./route/program"));
app.use("/api/learning-paths", require("./route/learningPath"));
app.use("/api/chat", require("./route/chatRoutes"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(config.server.env === "development" && { stack: err.stack }),
  });
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`
🚀 HCMUT Tutor API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server running on port ${PORT}
🌍 Environment: ${config.server.env}
📅 Started at: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  // Start session scheduler to auto-complete expired sessions
  startSessionScheduler();
});

module.exports = app;
