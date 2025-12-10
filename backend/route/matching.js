const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles, matchingStatus } = require("../config/config");
const {
  Matching,
  TutorProfile,
  StudentProfile,
  Notification,
} = require("../model");

// @desc    Get all matchings
// @route   GET /api/matchings
// @access  Private
router.get("/", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, programType } = req.query;

    const query = {};

    // Filter by role
    if (req.user.role === roles.TUTOR) {
      const tutorProfile = await TutorProfile.findOne({ user: req.userId });
      if (tutorProfile) query.tutor = tutorProfile._id;
    } else if (req.user.role === roles.STUDENT) {
      const studentProfile = await StudentProfile.findOne({ user: req.userId });
      if (studentProfile) query.student = studentProfile._id;
    }

    if (status) query.status = status;
    if (programType) query.programType = programType;

    const matchings = await Matching.find(query)
      .populate({
        path: "tutor",
        populate: {
          path: "user",
          select: "firstName lastName fullName avatar",
        },
      })
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "firstName lastName fullName avatar",
        },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Matching.countDocuments(query);

    res.json({
      success: true,
      data: {
        matchings,
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
      message: "Failed to get matchings",
      error: error.message,
    });
  }
});

// @desc    Request matching (student requests tutor)
// @route   POST /api/matchings
// @access  Private/Student
router.post("/", authenticate, async (req, res) => {
  try {
    const { tutorId, subject, programType, requestMessage } = req.body;

    // Get student profile
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (!studentProfile) {
      return res.status(400).json({
        success: false,
        message: "Student profile not found. Please create a profile first.",
      });
    }

    // Check if tutor exists
    const tutorProfile = await TutorProfile.findById(tutorId);
    if (!tutorProfile) {
      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    // Check if matching already exists
    const existingMatching = await Matching.findOne({
      student: studentProfile._id,
      tutor: tutorId,
      subject,
      status: {
        $in: [
          matchingStatus.PENDING,
          matchingStatus.APPROVED,
          matchingStatus.ACTIVE,
        ],
      },
    });

    if (existingMatching) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending or active matching with this tutor for this subject",
      });
    }

    // Check tutor capacity
    if (tutorProfile.currentStudentCount >= tutorProfile.maxStudents) {
      return res.status(400).json({
        success: false,
        message: "Tutor has reached maximum student capacity",
      });
    }

    const matching = await Matching.create({
      student: studentProfile._id,
      tutor: tutorId,
      subject,
      programType,
      matchType: "student_choice",
      requestMessage,
      status: matchingStatus.PENDING,
    });

    // Notify tutor
    await Notification.create({
      user: tutorProfile.user,
      type: "new_matching",
      title: "New Matching Request",
      message: `A student has requested to be matched with you for ${subject}`,
      relatedMatching: matching._id,
      actionUrl: `/matchings/${matching._id}`,
    });

    res.status(201).json({
      success: true,
      message: "Matching request sent",
      data: { matching },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create matching request",
      error: error.message,
    });
  }
});

// @desc    AI Matching suggestion
// @route   POST /api/matchings/ai-suggest
// @access  Private/Student
router.post("/ai-suggest", authenticate, async (req, res) => {
  try {
    const { subject, programType } = req.body;

    const studentProfile = await StudentProfile.findOne({
      user: req.userId,
    }).populate("user", "faculty department");

    if (!studentProfile) {
      return res.status(400).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Simple AI matching logic (can be enhanced with ML)
    const tutors = await TutorProfile.find({
      isApproved: true,
      isAvailable: true,
      "expertise.subject": { $regex: subject, $options: "i" },
      programTypes: programType,
      $expr: { $lt: ["$currentStudentCount", "$maxStudents"] },
    }).populate(
      "user",
      "firstName lastName fullName faculty department avatar"
    );

    // Score tutors based on criteria
    const scoredTutors = tutors.map((tutor) => {
      let score = 0;

      // Same faculty bonus
      if (tutor.user.faculty === studentProfile.user.faculty) {
        score += 20;
      }

      // Same department bonus
      if (tutor.user.department === studentProfile.user.department) {
        score += 15;
      }

      // Rating score
      score += (tutor.rating.average || 0) * 10;

      // Experience score (completed sessions)
      score += Math.min(tutor.completedSessions, 50);

      // Expertise level score
      const expertise = tutor.expertise.find((e) =>
        e.subject.toLowerCase().includes(subject.toLowerCase())
      );
      if (expertise) {
        const levelScores = {
          beginner: 5,
          intermediate: 10,
          advanced: 15,
          expert: 20,
        };
        score += levelScores[expertise.level] || 0;
      }

      return {
        tutor,
        score,
        reasons: [
          tutor.user.faculty === studentProfile.user.faculty
            ? "Same faculty"
            : null,
          tutor.user.department === studentProfile.user.department
            ? "Same department"
            : null,
          tutor.rating.average >= 4 ? "Highly rated" : null,
          tutor.completedSessions >= 10 ? "Experienced tutor" : null,
        ].filter(Boolean),
      };
    });

    // Sort by score and return top 5
    const recommendations = scoredTutors
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        recommendations,
        subject,
        programType,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get AI suggestions",
      error: error.message,
    });
  }
});

// @desc    Approve matching (tutor or admin)
// @route   PUT /api/matchings/:id/approve
// @access  Private
router.put("/:id/approve", authenticate, async (req, res) => {
  try {
    const matching = await Matching.findById(req.params.id);

    if (!matching) {
      return res.status(404).json({
        success: false,
        message: "Matching not found",
      });
    }

    // Check authorization
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    const isTutor = tutorProfile && matching.tutor.equals(tutorProfile._id);
    const isAdmin =
      req.user.role === roles.ADMIN || req.user.role === roles.COORDINATOR;

    if (!isTutor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    matching.status = matchingStatus.ACTIVE;
    matching.approvedBy = req.userId;
    matching.approvedAt = new Date();
    matching.startDate = new Date();
    matching.isActive = true;

    await matching.save();

    // Update tutor's student count
    await TutorProfile.findByIdAndUpdate(matching.tutor, {
      $inc: { currentStudentCount: 1 },
    });

    // Add tutor to student's currentTutors
    await StudentProfile.findByIdAndUpdate(matching.student, {
      $push: {
        currentTutors: {
          tutor: matching.tutor,
          matchedAt: new Date(),
          status: "active",
        },
      },
    });

    // Notify student
    const studentProfile = await StudentProfile.findById(
      matching.student
    ).populate("user");
    await Notification.create({
      user: studentProfile.user._id,
      type: "matching_approved",
      title: "Matching Approved",
      message: `Your tutoring request for ${matching.subject} has been approved!`,
      relatedMatching: matching._id,
      actionUrl: `/matchings/${matching._id}`,
    });

    res.json({
      success: true,
      message: "Matching approved",
      data: { matching },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to approve matching",
      error: error.message,
    });
  }
});

// @desc    Reject matching
// @route   PUT /api/matchings/:id/reject
// @access  Private (Tutor who received the request, Admin, Coordinator)
router.put("/:id/reject", authenticate, async (req, res) => {
  try {
    const { reason } = req.body;

    const matching = await Matching.findById(req.params.id)
      .populate("tutor")
      .populate("student");

    if (!matching) {
      return res.status(404).json({
        success: false,
        message: "Matching not found",
      });
    }

    // Authorization check: only tutor, admin, or coordinator can reject
    const isMatchingTutor = matching.tutor?.user?.toString() === req.userId;
    const isAdmin = [roles.ADMIN, roles.COORDINATOR].includes(req.user.role);

    if (!isMatchingTutor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reject this matching",
      });
    }

    matching.status = matchingStatus.REJECTED;
    matching.rejectedBy = req.userId;
    matching.rejectedAt = new Date();
    matching.rejectionReason = reason;

    await matching.save();

    res.json({
      success: true,
      message: "Matching rejected",
      data: { matching },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reject matching",
      error: error.message,
    });
  }
});

// @desc    Complete matching
// @route   PUT /api/matchings/:id/complete
// @access  Private (Tutor, Student in matching, Admin, Coordinator)
router.put("/:id/complete", authenticate, async (req, res) => {
  try {
    const { reason, notes } = req.body;

    const matching = await Matching.findById(req.params.id)
      .populate("tutor")
      .populate("student");

    if (!matching) {
      return res.status(404).json({
        success: false,
        message: "Matching not found",
      });
    }

    // Authorization check: only tutor, student, admin, or coordinator can complete
    const isMatchingTutor = matching.tutor?.user?.toString() === req.userId;
    const isMatchingStudent = matching.student?.user?.toString() === req.userId;
    const isAdmin = [roles.ADMIN, roles.COORDINATOR].includes(req.user.role);

    if (!isMatchingTutor && !isMatchingStudent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to complete this matching",
      });
    }

    matching.status = matchingStatus.COMPLETED;
    matching.completedAt = new Date();
    matching.endDate = new Date();
    matching.completionReason = reason;
    matching.completionNotes = notes;
    matching.isActive = false;

    await matching.save();

    // Update tutor's student count
    await TutorProfile.findByIdAndUpdate(matching.tutor, {
      $inc: { currentStudentCount: -1 },
    });

    // Update student's currentTutors
    await StudentProfile.findByIdAndUpdate(
      matching.student,
      {
        $set: {
          "currentTutors.$[elem].status": "completed",
        },
      },
      {
        arrayFilters: [{ "elem.tutor": matching.tutor }],
      }
    );

    res.json({
      success: true,
      message: "Matching completed",
      data: { matching },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to complete matching",
      error: error.message,
    });
  }
});

module.exports = router;
