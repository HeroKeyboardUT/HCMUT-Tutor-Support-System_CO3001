/**
 * Centralized Role Permissions Configuration
 * Defines what each role can do in the system
 */

const { roles } = require("./config");

// Feature permissions by role
const permissions = {
  // Dashboard access - who can see what stats
  dashboard: {
    viewOwnStats: [
      roles.STUDENT,
      roles.TUTOR,
      roles.COORDINATOR,
      roles.DEPARTMENT_HEAD,
      roles.ADMIN,
    ],
    viewSystemStats: [roles.COORDINATOR, roles.DEPARTMENT_HEAD, roles.ADMIN],
    viewAllUsers: [roles.COORDINATOR, roles.ADMIN],
  },

  // Session management
  sessions: {
    create: [roles.TUTOR],
    viewOwn: [roles.STUDENT, roles.TUTOR],
    viewAll: [roles.COORDINATOR, roles.DEPARTMENT_HEAD, roles.ADMIN],
    update: [roles.TUTOR], // Tutor can update their own sessions
    cancel: [roles.TUTOR, roles.COORDINATOR, roles.ADMIN],
    register: [roles.STUDENT],
    complete: [roles.TUTOR],
    manageFeedback: [roles.STUDENT, roles.TUTOR],
  },

  // Matching management
  matching: {
    requestTutor: [roles.STUDENT],
    viewOwnRequests: [roles.STUDENT, roles.TUTOR],
    viewAllRequests: [roles.COORDINATOR, roles.DEPARTMENT_HEAD, roles.ADMIN],
    approve: [roles.COORDINATOR, roles.ADMIN],
    reject: [roles.TUTOR, roles.COORDINATOR, roles.ADMIN],
    complete: [roles.STUDENT, roles.TUTOR, roles.COORDINATOR, roles.ADMIN],
  },

  // Profile management
  profiles: {
    viewOwnProfile: [
      roles.STUDENT,
      roles.TUTOR,
      roles.COORDINATOR,
      roles.DEPARTMENT_HEAD,
      roles.ADMIN,
    ],
    updateOwnProfile: [
      roles.STUDENT,
      roles.TUTOR,
      roles.COORDINATOR,
      roles.DEPARTMENT_HEAD,
      roles.ADMIN,
    ],
    viewAllProfiles: [roles.COORDINATOR, roles.DEPARTMENT_HEAD, roles.ADMIN],
    viewTutorProfiles: [
      roles.STUDENT,
      roles.TUTOR,
      roles.COORDINATOR,
      roles.DEPARTMENT_HEAD,
      roles.ADMIN,
    ],
    approveTutors: [roles.COORDINATOR, roles.ADMIN],
  },

  // Reports & Analytics
  reports: {
    viewDashboard: [
      roles.STUDENT,
      roles.TUTOR,
      roles.COORDINATOR,
      roles.DEPARTMENT_HEAD,
      roles.ADMIN,
    ],
    viewSessionStats: [roles.COORDINATOR, roles.DEPARTMENT_HEAD, roles.ADMIN],
    viewTutorPerformance: [
      roles.COORDINATOR,
      roles.DEPARTMENT_HEAD,
      roles.ADMIN,
    ],
    viewFacultyReports: [roles.COORDINATOR, roles.DEPARTMENT_HEAD, roles.ADMIN],
    viewTrainingPoints: [roles.COORDINATOR, roles.DEPARTMENT_HEAD, roles.ADMIN],
    exportReports: [roles.COORDINATOR, roles.ADMIN],
  },

  // User management
  users: {
    viewOwnInfo: [
      roles.STUDENT,
      roles.TUTOR,
      roles.COORDINATOR,
      roles.DEPARTMENT_HEAD,
      roles.ADMIN,
    ],
    viewAllUsers: [roles.COORDINATOR, roles.ADMIN],
    createUsers: [roles.ADMIN],
    updateUsers: [roles.ADMIN],
    deleteUsers: [roles.ADMIN],
    manageRoles: [roles.ADMIN],
  },

  // Feedback
  feedback: {
    giveFeedback: [roles.STUDENT, roles.TUTOR],
    viewOwnFeedback: [roles.STUDENT, roles.TUTOR],
    viewAllFeedback: [roles.COORDINATOR, roles.DEPARTMENT_HEAD, roles.ADMIN],
  },

  // Notifications
  notifications: {
    viewOwn: [
      roles.STUDENT,
      roles.TUTOR,
      roles.COORDINATOR,
      roles.DEPARTMENT_HEAD,
      roles.ADMIN,
    ],
    sendSystem: [roles.COORDINATOR, roles.ADMIN],
  },
};

// Sidebar/Navigation visibility by role
const sidebarConfig = {
  [roles.STUDENT]: [
    "dashboard",
    "sessions",
    "my-sessions",
    "matching-tutors",
    "find-tutors",
    "feedback",
    "notifications",
    "profile",
  ],
  [roles.TUTOR]: [
    "dashboard",
    "sessions",
    "my-sessions",
    "create-session",
    "my-students",
    "feedback",
    "notifications",
    "profile",
  ],
  [roles.COORDINATOR]: [
    "dashboard",
    "sessions",
    "matchings",
    "students",
    "tutors",
    "pending-tutors",
    "reports",
    "notifications",
    "profile",
  ],
  [roles.DEPARTMENT_HEAD]: [
    "dashboard",
    "sessions",
    "tutors",
    "reports",
    "notifications",
    "profile",
  ],
  [roles.ADMIN]: [
    "dashboard",
    "sessions",
    "matchings",
    "students",
    "tutors",
    "pending-tutors",
    "users",
    "reports",
    "settings",
    "notifications",
    "profile",
  ],
};

// Dashboard cards visibility by role
const dashboardCards = {
  [roles.STUDENT]: [
    "completedSessions",
    "upcomingSessions",
    "trainingPoints",
    "currentTutors",
    "pendingFeedback",
  ],
  [roles.TUTOR]: [
    "completedSessions",
    "upcomingSessions",
    "currentStudents",
    "rating",
    "pendingFeedback",
  ],
  [roles.COORDINATOR]: [
    "totalStudents",
    "totalTutors",
    "pendingTutors",
    "totalSessions",
    "completedSessions",
    "pendingMatchings",
    "activeMatchings",
  ],
  [roles.DEPARTMENT_HEAD]: [
    "totalStudents",
    "totalTutors",
    "totalSessions",
    "completedSessions",
    "averageRating",
  ],
  [roles.ADMIN]: [
    "totalUsers",
    "totalStudents",
    "totalTutors",
    "pendingTutors",
    "totalSessions",
    "completedSessions",
    "pendingMatchings",
    "activeMatchings",
  ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User's role
 * @param {string} feature - Feature name (e.g., 'sessions')
 * @param {string} action - Action name (e.g., 'create')
 * @returns {boolean}
 */
const hasPermission = (role, feature, action) => {
  if (!permissions[feature] || !permissions[feature][action]) {
    return false;
  }
  return permissions[feature][action].includes(role);
};

/**
 * Get sidebar items for a role
 * @param {string} role - User's role
 * @returns {string[]} Array of sidebar item keys
 */
const getSidebarItems = (role) => {
  return sidebarConfig[role] || [];
};

/**
 * Get dashboard cards for a role
 * @param {string} role - User's role
 * @returns {string[]} Array of dashboard card keys
 */
const getDashboardCards = (role) => {
  return dashboardCards[role] || [];
};

/**
 * Check if user is an admin-level role
 * @param {string} role - User's role
 * @returns {boolean}
 */
const isAdminRole = (role) => {
  return [roles.ADMIN, roles.COORDINATOR, roles.DEPARTMENT_HEAD].includes(role);
};

/**
 * Check if user is management (can manage tutors, matchings)
 * @param {string} role - User's role
 * @returns {boolean}
 */
const isManagementRole = (role) => {
  return [roles.ADMIN, roles.COORDINATOR].includes(role);
};

module.exports = {
  permissions,
  sidebarConfig,
  dashboardCards,
  hasPermission,
  getSidebarItems,
  getDashboardCards,
  isAdminRole,
  isManagementRole,
};
