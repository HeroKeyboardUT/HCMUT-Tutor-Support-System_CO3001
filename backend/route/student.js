const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles } = require("../config/config");
const { StudentProfile, User } = require("../model");

// @desc    Get all students (admin/coordinator)
// @route   GET /api/students
// @access  Private
router.get(
  "/",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR, roles.DEPARTMENT_HEAD),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, faculty, subject } = req.query;

      const query = {};
      if (subject)
        query["learningNeeds.subject"] = { $regex: subject, $options: "i" };

      // Bug #11 Fix: Use aggregation to properly filter by faculty and get accurate count
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
      ];

      // Add faculty filter if specified
      if (faculty) {
        pipeline.push({ $match: { "user.faculty": faculty } });
      }

      // Get total count first (before pagination)
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await StudentProfile.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      // Add sorting and pagination
      pipeline.push(
        { $sort: { createdAt: -1 } },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) },
        {
          $project: {
            _id: 1,
            learningNeeds: 1,
            preferredSessionDuration: 1,
            preferredSessionTypes: 1,
            currentGpa: 1,
            weakSubjects: 1,
            strongSubjects: 1,
            createdAt: 1,
            user: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              fullName: 1,
              email: 1,
              faculty: 1,
              department: 1,
              avatar: 1,
              userId: 1,
            },
          },
        }
      );

      const students = await StudentProfile.aggregate(pipeline);

      res.json({
        success: true,
        data: {
          students,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get students",
        error: error.message,
      });
    }
  }
);

// @desc    Get current student profile
// @route   GET /api/students/me
// @access  Private
router.get("/me", authenticate, async (req, res) => {
  try {
    const student = await StudentProfile.findOne({ user: req.userId })
      .populate(
        "user",
        "firstName lastName fullName email faculty department avatar phone userId"
      )
      .populate({
        path: "currentTutors.tutor",
        populate: {
          path: "user",
          select: "firstName lastName fullName avatar",
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    res.json({
      success: true,
      data: { student },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get student profile",
      error: error.message,
    });
  }
});

// @desc    Get my student profile (detailed)
// @route   GET /api/students/me/profile
// @access  Private
// NOTE: This route MUST be before /:id routes
router.get("/me/profile", authenticate, async (req, res) => {
  try {
    let student = await StudentProfile.findOne({ user: req.userId })
      .populate(
        "user",
        "firstName lastName fullName email faculty department avatar"
      )
      .populate("currentTutors.tutor");

    // If profile doesn't exist, create one
    if (!student) {
      const user = await User.findById(req.userId);
      if (!user || user.role !== "student") {
        return res.status(404).json({
          success: false,
          message: "Student profile not found. Please register as a student.",
        });
      }

      // Create default student profile
      student = await StudentProfile.create({
        user: req.userId,
        learningGoals: [],
        preferredSubjects: [],
        completedSessions: 0,
        trainingPoints: 0,
        trainingPointsHistory: [],
      });

      // Populate user data
      student = await StudentProfile.findById(student._id)
        .populate(
          "user",
          "firstName lastName fullName email faculty department avatar"
        )
        .populate("currentTutors.tutor");
    }

    res.json({
      success: true,
      data: { student },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get student profile",
      error: error.message,
    });
  }
});

// @desc    Update my student profile
// @route   PUT /api/students/me
// @access  Private
// NOTE: This route MUST be before /:id routes
router.put("/me", authenticate, async (req, res) => {
  try {
    const student = await StudentProfile.findOne({ user: req.userId });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const allowedUpdates = [
      "learningNeeds",
      "preferredSessionDuration",
      "preferredSessionTypes",
      "preferredSchedule",
      "currentGpa",
      "weakSubjects",
      "strongSubjects",
      "enrolledPrograms",
      "learningGoals",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
      }
    });

    await student.save();

    res.json({
      success: true,
      message: "Student profile updated",
      data: { student },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update student profile",
      error: error.message,
    });
  }
});

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private (admin/coordinator/department_head OR the student themselves)
router.get("/:id", authenticate, async (req, res) => {
  try {
    const student = await StudentProfile.findById(req.params.id)
      .populate(
        "user",
        "firstName lastName fullName email faculty department avatar phone"
      )
      .populate("currentTutors.tutor");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Bug #5 Fix: Privacy check - only admin, coordinator, department_head,
    // tutor assigned to this student, or the student themselves can view full profile
    const isPrivilegedRole = [
      roles.ADMIN,
      roles.COORDINATOR,
      roles.DEPARTMENT_HEAD,
    ].includes(req.user.role);
    const isOwnProfile = student.user._id.toString() === req.userId.toString();

    if (!isPrivilegedRole && !isOwnProfile) {
      // For tutors, check if they have sessions with this student
      if (req.user.role === roles.TUTOR) {
        const { TutorProfile, Session } = require("../model");
        const tutorProfile = await TutorProfile.findOne({ user: req.userId });
        if (tutorProfile) {
          const hasSessionWithStudent = await Session.exists({
            tutor: tutorProfile._id,
            $or: [
              { student: student._id },
              { "registeredStudents.student": student._id },
            ],
          });
          if (!hasSessionWithStudent) {
            return res.status(403).json({
              success: false,
              message: "Not authorized to view this student profile",
            });
          }
        } else {
          return res.status(403).json({
            success: false,
            message: "Not authorized to view this student profile",
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this student profile",
        });
      }
    }

    res.json({
      success: true,
      data: { student },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get student",
      error: error.message,
    });
  }
});

// @desc    Create/Register student profile
// @route   POST /api/students
// @access  Private
router.post("/", authenticate, async (req, res) => {
  try {
    // Check if already has profile
    const existingProfile = await StudentProfile.findOne({ user: req.userId });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: "Student profile already exists",
      });
    }

    const {
      learningNeeds,
      preferredSessionDuration,
      preferredSessionTypes,
      preferredSchedule,
      currentGpa,
      weakSubjects,
      strongSubjects,
      enrolledPrograms,
      learningGoals,
    } = req.body;

    const studentProfile = await StudentProfile.create({
      user: req.userId,
      learningNeeds,
      preferredSessionDuration,
      preferredSessionTypes,
      preferredSchedule,
      currentGpa,
      weakSubjects,
      strongSubjects,
      enrolledPrograms,
      learningGoals,
    });

    res.status(201).json({
      success: true,
      message: "Student profile created",
      data: { student: studentProfile },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create student profile",
      error: error.message,
    });
  }
});

// @desc    Update student profile
// @route   PUT /api/students/:id
// @access  Private
router.put("/:id", authenticate, async (req, res) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check ownership or admin
    if (
      student.user.toString() !== req.userId.toString() &&
      req.user.role !== roles.ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const allowedUpdates = [
      "learningNeeds",
      "preferredSessionDuration",
      "preferredSessionTypes",
      "preferredSchedule",
      "currentGpa",
      "weakSubjects",
      "strongSubjects",
      "enrolledPrograms",
      "learningGoals",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
      }
    });

    await student.save();

    res.json({
      success: true,
      message: "Student profile updated",
      data: { student },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update student profile",
      error: error.message,
    });
  }
});

// @desc    Add training points (admin/coordinator)
// @route   POST /api/students/:id/training-points
// @access  Private/Admin
router.post(
  "/:id/training-points",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const { points, reason } = req.body;

      // Bug #19 Fix: Validate points input
      const numPoints = Number(points);
      if (isNaN(numPoints) || !Number.isInteger(numPoints)) {
        return res.status(400).json({
          success: false,
          message: "Points must be a valid integer",
        });
      }

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Reason is required for adding training points",
        });
      }

      const student = await StudentProfile.findById(req.params.id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      student.trainingPoints = (student.trainingPoints || 0) + numPoints;
      student.trainingPointsHistory = student.trainingPointsHistory || [];
      student.trainingPointsHistory.push({
        points: numPoints,
        reason: reason.trim(),
        addedBy: req.userId,
        addedAt: new Date(),
      });

      await student.save();

      res.json({
        success: true,
        message: "Training points added",
        data: {
          totalPoints: student.trainingPoints,
          history: student.trainingPointsHistory,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add training points",
        error: error.message,
      });
    }
  }
);

module.exports = router;
