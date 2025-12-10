const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles } = require("../config/config");
const {
  Session,
  Matching,
  Feedback,
  TutorProfile,
  StudentProfile,
  User,
} = require("../model");

// Helper function to calculate hours from startTime and endTime
const calculateSessionHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  const hours = endHour + endMin / 60 - (startHour + startMin / 60);
  return hours > 0 ? hours : 0;
};

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private
router.get("/dashboard", authenticate, async (req, res) => {
  try {
    const stats = {};

    if (req.user.role === roles.STUDENT) {
      const studentProfile = await StudentProfile.findOne({ user: req.userId });

      if (studentProfile) {
        stats.totalSessions = studentProfile.totalSessions;
        stats.completedSessions = studentProfile.completedSessions;
        stats.trainingPoints = studentProfile.trainingPoints;
        stats.activeTutors = studentProfile.currentTutors.filter(
          (t) => t.status === "active"
        ).length;
      }
    } else if (req.user.role === roles.TUTOR) {
      const tutorProfile = await TutorProfile.findOne({ user: req.userId });

      if (tutorProfile) {
        stats.totalSessions = tutorProfile.totalSessions;
        stats.completedSessions = tutorProfile.completedSessions;
        stats.currentStudents = tutorProfile.currentStudentCount;
        stats.rating = tutorProfile.rating;
      }
    } else if (
      [roles.ADMIN, roles.COORDINATOR, roles.DEPARTMENT_HEAD].includes(
        req.user.role
      )
    ) {
      // Admin/Coordinator dashboard
      stats.totalUsers = await User.countDocuments({ isActive: true });
      stats.totalStudents = await User.countDocuments({
        role: roles.STUDENT,
        isActive: true,
      });
      stats.totalTutors = await TutorProfile.countDocuments({
        isApproved: true,
      });
      stats.pendingTutors = await TutorProfile.countDocuments({
        isApproved: false,
      });
      stats.totalSessions = await Session.countDocuments();
      stats.completedSessions = await Session.countDocuments({
        status: "completed",
      });
      stats.activeMatchings = await Matching.countDocuments({ isActive: true });
      stats.pendingMatchings = await Matching.countDocuments({
        status: "pending",
      });

      // Calculate average rating across all tutors
      const tutorsWithRating = await TutorProfile.find({
        isApproved: true,
        "rating.average": { $gt: 0 },
      });
      if (tutorsWithRating.length > 0) {
        const avgRating =
          tutorsWithRating.reduce(
            (sum, t) => sum + (t.rating?.average || 0),
            0
          ) / tutorsWithRating.length;
        stats.avgRating = {
          average: avgRating.toFixed(1),
          count: tutorsWithRating.length,
        };
      } else {
        stats.avgRating = { average: 0, count: 0 };
      }
    }

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard stats",
      error: error.message,
    });
  }
});

// @desc    Get total hours statistics (accurate calculation)
// @route   GET /api/reports/total-hours
// @access  Private/Admin
router.get(
  "/total-hours",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR, roles.DEPARTMENT_HEAD),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const match = { status: "completed" };
      if (startDate || endDate) {
        match.scheduledDate = {};
        if (startDate) match.scheduledDate.$gte = new Date(startDate);
        if (endDate) match.scheduledDate.$lte = new Date(endDate);
      }

      const sessions = await Session.find(match);

      let totalHours = 0;
      sessions.forEach((session) => {
        totalHours += calculateSessionHours(session.startTime, session.endTime);
      });

      res.json({
        success: true,
        data: {
          totalHours: Math.round(totalHours * 10) / 10,
          sessionCount: sessions.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get total hours",
        error: error.message,
      });
    }
  }
);

// @desc    Get recent activity
// @route   GET /api/reports/recent-activity
// @access  Private/Admin
router.get(
  "/recent-activity",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR, roles.DEPARTMENT_HEAD),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      // Get recent sessions
      const recentSessions = await Session.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate({
          path: "tutor",
          populate: { path: "user", select: "firstName lastName fullName" },
        });

      // Get recent matchings
      const recentMatchings = await Matching.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate({
          path: "tutor",
          populate: { path: "user", select: "firstName lastName fullName" },
        })
        .populate({
          path: "student",
          populate: { path: "user", select: "firstName lastName fullName" },
        });

      // Get recent feedback
      const recentFeedback = await Feedback.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("fromUser", "firstName lastName fullName")
        .populate("toUser", "firstName lastName fullName");

      // Combine and format activities
      const activities = [];

      recentSessions.forEach((session) => {
        activities.push({
          type: "session",
          message: `Session "${session.title}" ${
            session.status === "completed"
              ? "completed"
              : session.status === "cancelled"
              ? "cancelled"
              : "created"
          } by ${session.tutor?.user?.fullName || "Tutor"}`,
          time: session.updatedAt || session.createdAt,
          status: session.status,
        });
      });

      recentMatchings.forEach((matching) => {
        activities.push({
          type: "matching",
          message: `Matching ${matching.status} - ${
            matching.student?.user?.fullName || "Student"
          } with ${matching.tutor?.user?.fullName || "Tutor"}`,
          time: matching.updatedAt || matching.createdAt,
          status: matching.status,
        });
      });

      recentFeedback.forEach((fb) => {
        activities.push({
          type: "feedback",
          message: `${fb.fromUser?.fullName || "User"} gave feedback to ${
            fb.toUser?.fullName || "User"
          }`,
          time: fb.createdAt,
          rating: fb.ratings?.overall,
        });
      });

      // Sort by time and limit
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));

      res.json({
        success: true,
        data: { activities: activities.slice(0, limit) },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get recent activity",
        error: error.message,
      });
    }
  }
);

// @desc    Get session statistics by subject
// @route   GET /api/reports/sessions-by-subject
// @access  Private/Admin
router.get(
  "/sessions-by-subject",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR, roles.DEPARTMENT_HEAD),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const match = {};
      if (startDate || endDate) {
        match.scheduledDate = {};
        if (startDate) match.scheduledDate.$gte = new Date(startDate);
        if (endDate) match.scheduledDate.$lte = new Date(endDate);
      }

      const stats = await Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$subject",
            totalSessions: { $sum: 1 },
            completedSessions: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            cancelledSessions: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
          },
        },
        { $sort: { totalSessions: -1 } },
      ]);

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get session statistics",
        error: error.message,
      });
    }
  }
);

// @desc    Get tutor performance report
// @route   GET /api/reports/tutor-performance
// @access  Private/Admin
router.get(
  "/tutor-performance",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR, roles.DEPARTMENT_HEAD),
  async (req, res) => {
    try {
      const tutors = await TutorProfile.find({ isApproved: true })
        .populate("user", "firstName lastName fullName faculty department")
        .sort({ "rating.average": -1 });

      const performance = tutors.map((tutor) => ({
        tutorId: tutor._id,
        name: tutor.user?.fullName,
        faculty: tutor.user?.faculty,
        department: tutor.user?.department,
        tutorType: tutor.tutorType,
        totalSessions: tutor.totalSessions,
        completedSessions: tutor.completedSessions,
        completionRate:
          tutor.totalSessions > 0
            ? ((tutor.completedSessions / tutor.totalSessions) * 100).toFixed(1)
            : 0,
        rating: tutor.rating,
        currentStudents: tutor.currentStudentCount,
        maxStudents: tutor.maxStudents,
      }));

      res.json({
        success: true,
        data: { performance },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get tutor performance",
        error: error.message,
      });
    }
  }
);

// @desc    Get faculty report
// @route   GET /api/reports/by-faculty
// @access  Private/Admin,Coordinator,DepartmentHead
router.get(
  "/by-faculty",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR, roles.DEPARTMENT_HEAD),
  async (req, res) => {
    try {
      // Get user counts by faculty
      const userStats = await User.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$faculty",
            totalUsers: { $sum: 1 },
            students: {
              $sum: { $cond: [{ $eq: ["$role", "student"] }, 1, 0] },
            },
            tutors: {
              $sum: { $cond: [{ $eq: ["$role", "tutor"] }, 1, 0] },
            },
          },
        },
        { $sort: { totalUsers: -1 } },
      ]);

      res.json({
        success: true,
        data: { facultyStats: userStats },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get faculty report",
        error: error.message,
      });
    }
  }
);

// @desc    Get training points report (for scholarship consideration)
// @route   GET /api/reports/training-points
// @access  Private/Admin,Coordinator,DepartmentHead
router.get(
  "/training-points",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR, roles.DEPARTMENT_HEAD),
  async (req, res) => {
    try {
      const { minPoints = 0, faculty } = req.query;

      const students = await StudentProfile.find({
        trainingPoints: { $gte: parseInt(minPoints) },
      })
        .populate(
          "user",
          "firstName lastName fullName userId faculty department"
        )
        .sort({ trainingPoints: -1 });

      let filteredStudents = students;
      if (faculty) {
        filteredStudents = students.filter((s) => s.user?.faculty === faculty);
      }

      const report = filteredStudents.map((student) => ({
        studentId: student.user?.userId,
        name: student.user?.fullName,
        faculty: student.user?.faculty,
        department: student.user?.department,
        trainingPoints: student.trainingPoints,
        completedSessions: student.completedSessions,
        history: student.trainingPointsHistory.slice(-5), // Last 5 entries
      }));

      res.json({
        success: true,
        data: { report },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get training points report",
        error: error.message,
      });
    }
  }
);

// @desc    Export report
// @route   GET /api/reports/export
// @access  Private/Admin,Coordinator
router.get(
  "/export",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const { type, format = "json", startDate, endDate } = req.query;

      let data;

      switch (type) {
        case "sessions":
          data = await Session.find()
            .populate({
              path: "tutor",
              populate: { path: "user", select: "firstName lastName fullName" },
            })
            .populate({
              path: "student",
              populate: { path: "user", select: "firstName lastName fullName" },
            });
          break;
        case "matchings":
          data = await Matching.find()
            .populate({
              path: "tutor",
              populate: { path: "user", select: "firstName lastName fullName" },
            })
            .populate({
              path: "student",
              populate: { path: "user", select: "firstName lastName fullName" },
            });
          break;
        case "feedback":
          data = await Feedback.find()
            .populate("fromUser", "firstName lastName fullName")
            .populate("toUser", "firstName lastName fullName");
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid report type",
          });
      }

      // For now, just return JSON
      res.json({
        success: true,
        data: {
          type,
          exportedAt: new Date(),
          count: data.length,
          records: data,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to export report",
        error: error.message,
      });
    }
  }
);

module.exports = router;
