const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");
const {
  authenticate,
  validateRegistration,
  validateLogin,
} = require("../middleware");
const {
  getSidebarItems,
  getDashboardCards,
  hasPermission,
} = require("../config/permissions");

// Public routes
router.post("/register", validateRegistration, authController.register);
router.post("/login", validateLogin, authController.login);
router.post("/sso", authController.ssoLogin);
router.post("/refresh", authController.refreshToken);

// Protected routes
router.get("/me", authenticate, authController.getMe);
router.post("/logout", authenticate, authController.logout);
router.put("/password", authenticate, authController.updatePassword);

// Get permissions for current user's role
router.get("/permissions", authenticate, (req, res) => {
  const role = req.user.role;
  res.json({
    success: true,
    data: {
      role,
      sidebarItems: getSidebarItems(role),
      dashboardCards: getDashboardCards(role),
      permissions: {
        canCreateSession: hasPermission(role, "sessions", "create"),
        canViewAllSessions: hasPermission(role, "sessions", "viewAll"),
        canRequestTutor: hasPermission(role, "matching", "requestTutor"),
        canApproveMatching: hasPermission(role, "matching", "approve"),
        canApproveTutors: hasPermission(role, "profiles", "approveTutors"),
        canViewReports: hasPermission(role, "reports", "viewSessionStats"),
        canExportReports: hasPermission(role, "reports", "exportReports"),
        canManageUsers: hasPermission(role, "users", "viewAllUsers"),
      },
    },
  });
});

module.exports = router;
