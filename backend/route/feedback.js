const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware");
const { Feedback, Session, TutorProfile, StudentProfile } = require("../model");

// @desc    Get feedback for a session
// @route   GET /api/feedback/session/:sessionId
// @access  Private
router.get("/session/:sessionId", authenticate, async (req, res) => {
  try {
    const feedback = await Feedback.find({ session: req.params.sessionId })
      .populate("fromUser", "firstName lastName fullName avatar")
      .populate("toUser", "firstName lastName fullName avatar");

    res.json({
      success: true,
      data: { feedback },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get feedback",
      error: error.message,
    });
  }
});

// @desc    Get feedback for a user
// @route   GET /api/feedback/user/:userId
// @access  Private
router.get("/user/:userId", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const feedback = await Feedback.find({
      toUser: req.params.userId,
      isPublic: true,
    })
      .populate("fromUser", "firstName lastName fullName avatar")
      .populate("session", "title subject scheduledDate")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Feedback.countDocuments({
      toUser: req.params.userId,
      isPublic: true,
    });

    // Calculate average rating
    const avgRating = await Feedback.aggregate([
      { $match: { toUser: req.params.userId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$ratings.overall" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        feedback,
        statistics: avgRating[0] || { avgRating: 0, count: 0 },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get feedback",
      error: error.message,
    });
  }
});

// @desc    Submit feedback for a session
// @route   POST /api/feedback
// @access  Private
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      sessionId,
      ratings,
      comment,
      progressReport,
      isPublic,
      isAnonymous,
    } = req.body;

    // Get session
    const session = await Session.findById(sessionId)
      .populate({
        path: "tutor",
        populate: { path: "user" },
      })
      .populate({
        path: "student",
        populate: { path: "user" },
      })
      .populate({
        path: "registeredStudents.student",
        populate: { path: "user" },
      });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Check if session is completed
    if (session.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Can only give feedback for completed sessions",
      });
    }

    // Determine from/to based on current user
    let fromRole, toUser;

    // Check if user is a student (either in student field or registeredStudents)
    const isStudent = session.student?.user?._id?.equals(req.userId);
    const isRegisteredStudent = session.registeredStudents?.some((rs) =>
      rs.student?.user?._id?.equals(req.userId)
    );
    const isTutor = session.tutor?.user?._id?.equals(req.userId);

    if (isStudent || isRegisteredStudent) {
      fromRole = "student";
      toUser = session.tutor.user._id;
    } else if (isTutor) {
      fromRole = "tutor";
      // For open sessions with multiple students, tutor gives feedback to all registered students
      // For single student session, feedback goes to that student
      if (session.student?.user?._id) {
        toUser = session.student.user._id;
      } else if (session.registeredStudents?.length > 0) {
        // For simplicity, tutor feedback goes to the first registered student
        // In a more complex system, you might want separate feedback for each student
        toUser = session.registeredStudents[0].student.user._id;
      } else {
        return res.status(400).json({
          success: false,
          message: "No student found in this session",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Not authorized to give feedback for this session",
      });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({
      session: sessionId,
      fromUser: req.userId,
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this session",
      });
    }

    const feedback = await Feedback.create({
      session: sessionId,
      fromUser: req.userId,
      fromRole,
      toUser,
      ratings,
      comment,
      progressReport,
      isPublic: isPublic || false,
      isAnonymous: isAnonymous || false,
    });

    // Update session feedback flags
    if (fromRole === "tutor") {
      session.hasTutorFeedback = true;
    } else {
      session.hasStudentFeedback = true;
    }
    await session.save();

    // Update tutor rating if student gave feedback
    if (fromRole === "student") {
      const tutorFeedback = await Feedback.aggregate([
        { $match: { toUser: session.tutor.user._id } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$ratings.overall" },
            count: { $sum: 1 },
          },
        },
      ]);

      if (tutorFeedback[0]) {
        await TutorProfile.findByIdAndUpdate(session.tutor._id, {
          "rating.average": tutorFeedback[0].avgRating,
          "rating.count": tutorFeedback[0].count,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Feedback submitted",
      data: { feedback },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
      error: error.message,
    });
  }
});

// @desc    Get my given feedback
// @route   GET /api/feedback/my/given
// @access  Private
router.get("/my/given", authenticate, async (req, res) => {
  try {
    const feedback = await Feedback.find({ fromUser: req.userId })
      .populate("toUser", "firstName lastName fullName avatar")
      .populate("session", "title subject scheduledDate")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { feedback },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get feedback",
      error: error.message,
    });
  }
});

// @desc    Get my received feedback
// @route   GET /api/feedback/my/received
// @access  Private
router.get("/my/received", authenticate, async (req, res) => {
  try {
    const feedback = await Feedback.find({ toUser: req.userId })
      .populate("fromUser", "firstName lastName fullName avatar")
      .populate("session", "title subject scheduledDate")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { feedback },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get feedback",
      error: error.message,
    });
  }
});

module.exports = router;
