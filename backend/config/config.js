module.exports = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || "default-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "default-refresh-secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || "development",
  },

  // SSO Configuration
  sso: {
    sessionTimeout: parseInt(process.env.SSO_SESSION_TIMEOUT) || 3600000,
  },

  // CORS Configuration
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },

  // User Roles
  roles: {
    STUDENT: "student",
    TUTOR: "tutor",
    COORDINATOR: "coordinator", // Điều phối viên
    DEPARTMENT_HEAD: "department_head", // Chủ nhiệm bộ môn
    ADMIN: "admin", // Ban quản lý
  },

  // Session Status
  sessionStatus: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    IN_PROGRESS: "in_progress",
    CANCELLED: "cancelled",
    COMPLETED: "completed",
    NO_SHOW: "no_show",
  },

  // Matching Status
  matchingStatus: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    ACTIVE: "active",
    COMPLETED: "completed",
  },

  // Notification Types
  notificationTypes: {
    SESSION_REMINDER: "session_reminder",
    SESSION_CANCELLED: "session_cancelled",
    SESSION_RESCHEDULED: "session_rescheduled",
    SESSION_COMPLETED: "session_completed",
    SESSION_NO_SHOW: "session_no_show",
    SESSION_REGISTRATION: "session_registration",
    SESSION_STARTED: "session_started",
    NEW_MATCHING: "new_matching",
    MATCHING_APPROVED: "matching_approved",
    FEEDBACK_REQUEST: "feedback_request",
    NEW_SESSION: "new_session",
    SESSION_UPDATE: "session_update",
    SYSTEM: "system",
  },
};
