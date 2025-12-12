const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles, sessionStatus } = require("../config/config");
const {
  Session,
  TutorProfile,
  StudentProfile,
  Notification,
} = require("../model");
const { getVietnamTodayStart } = require("../utils/timezone");

// @desc    Get all sessions
// @route   GET /api/sessions
// @access  Private
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      tutorId,
      studentId,
    } = req.query;

    const query = {};

    // Filter by role
    if (req.user.role === roles.TUTOR) {
      const tutorProfile = await TutorProfile.findOne({ user: req.userId });
      if (tutorProfile) query.tutor = tutorProfile._id;
    } else if (req.user.role === roles.STUDENT) {
      const studentProfile = await StudentProfile.findOne({ user: req.userId });
      if (studentProfile) {
        // Student can see sessions where they are assigned OR registered
        query.$or = [
          { student: studentProfile._id },
          { "registeredStudents.student": studentProfile._id },
        ];
      }
    }

    // Admin/coordinator can filter by tutor/student
    if ([roles.ADMIN, roles.COORDINATOR].includes(req.user.role)) {
      if (tutorId) query.tutor = tutorId;
      if (studentId) query.student = studentId;
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const sessions = await Session.find(query)
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
      .populate({
        path: "registeredStudents.student",
        populate: {
          path: "user",
          select: "firstName lastName fullName avatar",
        },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ scheduledDate: -1 });

    const total = await Session.countDocuments(query);

    res.json({
      success: true,
      data: {
        sessions,
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
      message: "Failed to get sessions",
      error: error.message,
    });
  }
});

// @desc    Get available/open sessions (for students to register)
// @route   GET /api/sessions/available
// @access  Public (no auth required for browsing)
router.get("/available", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      subject,
      tutorId,
      excludeRegistered,
      userId,
    } = req.query;

    // Use Vietnam timezone to get today's start - shows all sessions for today and future
    const todayStart = getVietnamTodayStart();

    // Show sessions that are either open OR don't have a specific student assigned
    const query = {
      $or: [
        { isOpen: true },
        { student: { $exists: false } },
        { student: null },
      ],
      scheduledDate: { $gte: todayStart },
      status: { $in: [sessionStatus.PENDING, sessionStatus.CONFIRMED] },
    };

    if (subject) query.subject = subject;
    if (tutorId) query.tutor = tutorId;

    const sessions = await Session.find(query)
      .populate({
        path: "tutor",
        populate: {
          path: "user",
          select: "firstName lastName fullName avatar department faculty",
        },
      })
      .populate({
        path: "registeredStudents.student",
        populate: {
          path: "user",
          select: "firstName lastName fullName avatar",
        },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ scheduledDate: 1 });

    // Filter sessions that still have spots available
    // Also filter out sessions user already registered for
    let availableSessions = sessions.filter(
      (s) => (s.registeredStudents?.length || 0) < s.maxParticipants
    );

    // If userId provided, exclude sessions user already registered
    if (excludeRegistered === "true" && userId) {
      const studentProfile = await StudentProfile.findOne({ user: userId });

      if (studentProfile) {
        const studentProfileId = studentProfile._id.toString();

        availableSessions = availableSessions.filter((s) => {
          if (!s.registeredStudents || s.registeredStudents.length === 0) {
            return true; // No registrations, keep it
          }

          const isRegistered = s.registeredStudents.some((r) => {
            // Handle both populated and non-populated cases
            let rStudentId;
            if (r.student?._id) {
              // Populated case: r.student is a StudentProfile object
              rStudentId = r.student._id.toString();
            } else if (r.student) {
              // Non-populated case: r.student is just an ObjectId
              rStudentId = r.student.toString();
            }

            return rStudentId === studentProfileId;
          });

          return !isRegistered;
        });
      }
    }

    const total = await Session.countDocuments(query);

    res.json({
      success: true,
      data: {
        sessions: availableSessions,
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
      message: "Failed to get available sessions",
      error: error.message,
    });
  }
});

// @desc    Get session by ID
// @route   GET /api/sessions/:id
// @access  Private
router.get("/:id", authenticate, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate({
        path: "tutor",
        populate: {
          path: "user",
          select: "firstName lastName fullName email avatar phone",
        },
      })
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "firstName lastName fullName email avatar phone",
        },
      })
      .populate({
        path: "registeredStudents.student",
        populate: {
          path: "user",
          select: "firstName lastName fullName email avatar phone",
        },
      })
      .populate("materials.libraryResourceId");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get session",
      error: error.message,
    });
  }
});

// @desc    Create session (tutor opens a session)
// @route   POST /api/sessions
// @access  Private/Tutor
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      studentId,
      title,
      description,
      subject,
      scheduledDate,
      startTime,
      endTime,
      duration,
      sessionType,
      location,
      meetingLink,
      agenda,
      isOpen,
      maxParticipants,
    } = req.body;

    // Validate required fields
    if (!title || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Title, scheduled date, start time and end time are required",
      });
    }

    // Validate scheduledDate is not in the past
    const sessionDate = new Date(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (sessionDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot create session in the past",
      });
    }

    // Get tutor profile
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    if (!tutorProfile) {
      return res.status(400).json({
        success: false,
        message: "Tutor profile not found",
      });
    }

    // Bug #8 Fix: Check for overlapping sessions for tutor
    const overlappingSession = await Session.findOne({
      tutor: tutorProfile._id,
      scheduledDate: sessionDate,
      status: { $in: [sessionStatus.PENDING, sessionStatus.CONFIRMED] },
      // Check time overlap: existing.start < new.end AND existing.end > new.start
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (overlappingSession) {
      return res.status(400).json({
        success: false,
        message: "You already have another session scheduled at this time",
      });
    }

    const session = await Session.create({
      tutor: tutorProfile._id,
      student: studentId || undefined,
      title,
      description,
      subject,
      scheduledDate: sessionDate,
      startTime,
      endTime,
      duration,
      sessionType,
      location,
      meetingLink,
      agenda,
      isOpen: isOpen || !studentId,
      maxParticipants: maxParticipants || 1,
      status: studentId ? sessionStatus.PENDING : sessionStatus.PENDING,
    });

    // Get student for notification (if specified)
    if (studentId) {
      const studentProfile = await StudentProfile.findById(studentId).populate(
        "user"
      );
      if (studentProfile) {
        await Notification.create({
          user: studentProfile.user._id,
          type: "new_session",
          title: "New Session Scheduled",
          message: `A new tutoring session "${title}" has been scheduled for ${new Date(
            scheduledDate
          ).toLocaleDateString()}`,
          relatedSession: session._id,
          actionUrl: `/sessions/${session._id}`,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Session created",
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create session",
      error: error.message,
    });
  }
});

// @desc    Register for an open session (student joins)
// @route   POST /api/sessions/:id/register
// @access  Private/Student
router.post("/:id/register", authenticate, async (req, res) => {
  try {
    // Get student profile first
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (!studentProfile) {
      return res.status(400).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Get session info for overlap check
    const sessionToRegister = await Session.findById(req.params.id);
    if (!sessionToRegister) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    if (!sessionToRegister.isOpen) {
      return res.status(400).json({
        success: false,
        message: "This session is not open for registration",
      });
    }

    // Bug #9 Fix: Check for overlapping sessions for student
    const overlappingSession = await Session.findOne({
      _id: { $ne: req.params.id },
      scheduledDate: sessionToRegister.scheduledDate,
      status: { $in: [sessionStatus.PENDING, sessionStatus.CONFIRMED] },
      $or: [
        { student: studentProfile._id },
        { "registeredStudents.student": studentProfile._id },
      ],
      // Check time overlap: existing.start < new.end AND existing.end > new.start
      startTime: { $lt: sessionToRegister.endTime },
      endTime: { $gt: sessionToRegister.startTime },
    });

    if (overlappingSession) {
      return res.status(400).json({
        success: false,
        message: "You already have another session scheduled at this time",
      });
    }

    // Bug #7 Fix: Use atomic update with conditions to prevent race condition
    const result = await Session.findOneAndUpdate(
      {
        _id: req.params.id,
        isOpen: true,
        // Ensure not already registered
        "registeredStudents.student": { $ne: studentProfile._id },
        // Ensure capacity not exceeded (using $expr for array length check)
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$registeredStudents", []] } },
            "$maxParticipants",
          ],
        },
      },
      {
        $push: {
          registeredStudents: {
            student: studentProfile._id,
            registeredAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!result) {
      // Check why it failed
      const session = await Session.findById(req.params.id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }
      if (!session.isOpen) {
        return res.status(400).json({
          success: false,
          message: "This session is not open for registration",
        });
      }
      const alreadyRegistered = session.registeredStudents?.some(
        (r) => r.student.toString() === studentProfile._id.toString()
      );
      if (alreadyRegistered) {
        return res.status(400).json({
          success: false,
          message: "You are already registered for this session",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Session is full",
      });
    }

    // If single participant session, also set the student field and confirm
    if (result.maxParticipants === 1) {
      result.student = studentProfile._id;
      result.status = sessionStatus.CONFIRMED;
      await result.save();
    }

    const session = result;

    // Populate session before returning
    await session.populate([
      {
        path: "tutor",
        populate: {
          path: "user",
          select: "firstName lastName fullName email avatar",
        },
      },
      {
        path: "registeredStudents.student",
        populate: {
          path: "user",
          select: "firstName lastName fullName email avatar",
        },
      },
    ]);

    // Notify tutor (wrapped in try-catch to not fail the main request)
    try {
      const tutorProfile = await TutorProfile.findById(
        session.tutor._id || session.tutor
      ).populate("user");
      if (tutorProfile && tutorProfile.user) {
        await Notification.create({
          user: tutorProfile.user._id,
          type: "session_registration",
          title: "New Session Registration",
          message: `A student has registered for your session "${session.title}"`,
          relatedSession: session._id,
          actionUrl: `/sessions/${session._id}`,
        });
      }
    } catch (notifyError) {
      console.error("Failed to send notification:", notifyError);
      // Don't fail the registration just because notification failed
    }

    res.json({
      success: true,
      message: "Successfully registered for session",
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to register for session",
      error: error.message,
    });
  }
});

// @desc    Update session
// @route   PUT /api/sessions/:id
// @access  Private
router.put("/:id", authenticate, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Check authorization
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    const studentProfile = await StudentProfile.findOne({ user: req.userId });

    const isTutor = tutorProfile && session.tutor.equals(tutorProfile._id);
    // Bug #16 Fix: Null check for session.student
    const isStudent =
      studentProfile &&
      session.student &&
      session.student.equals(studentProfile._id);
    const isAdmin = req.user.role === roles.ADMIN;

    if (!isTutor && !isStudent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const allowedUpdates = [
      "title",
      "description",
      "scheduledDate",
      "startTime",
      "endTime",
      "duration",
      "sessionType",
      "location",
      "meetingLink",
      "agenda",
      "notes",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        session[field] = req.body[field];
      }
    });

    await session.save();

    res.json({
      success: true,
      message: "Session updated",
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update session",
      error: error.message,
    });
  }
});

// @desc    Cancel session
// @route   PUT /api/sessions/:id/cancel
// @access  Private (session owner only)
router.put("/:id/cancel", authenticate, async (req, res) => {
  try {
    const { reason } = req.body;

    const session = await Session.findById(req.params.id)
      .populate("tutor")
      .populate("student");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Authorization check - only tutor, student, or admin can cancel
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    const isAdmin = [roles.ADMIN, roles.COORDINATOR].includes(req.user.role);
    const isTutor = tutorProfile && session.tutor._id.equals(tutorProfile._id);
    const isStudent =
      studentProfile &&
      session.student &&
      session.student._id.equals(studentProfile._id);
    const isRegisteredStudent =
      studentProfile &&
      session.registeredStudents?.some(
        (r) => r.student.toString() === studentProfile._id.toString()
      );

    if (!isAdmin && !isTutor && !isStudent && !isRegisteredStudent) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this session",
      });
    }

    session.status = sessionStatus.CANCELLED;
    session.cancelledBy = req.userId;
    session.cancellationReason = reason;
    session.cancelledAt = new Date();

    await session.save();

    // Notify other party
    // TODO: Implement notification

    res.json({
      success: true,
      message: "Session cancelled",
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel session",
      error: error.message,
    });
  }
});

// @desc    Confirm session
// @route   PUT /api/sessions/:id/confirm
// @access  Private (session owner only)
router.put("/:id/confirm", authenticate, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Authorization check - only tutor, student, or admin can confirm
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    const isAdmin = [roles.ADMIN, roles.COORDINATOR].includes(req.user.role);
    const isTutor = tutorProfile && session.tutor.equals(tutorProfile._id);
    const isStudent =
      studentProfile &&
      session.student &&
      session.student.equals(studentProfile._id);

    if (!isAdmin && !isTutor && !isStudent) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to confirm this session",
      });
    }

    session.status = sessionStatus.CONFIRMED;
    await session.save();

    res.json({
      success: true,
      message: "Session confirmed",
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to confirm session",
      error: error.message,
    });
  }
});

// @desc    Complete session manually (tutor can complete before end time)
// @route   PUT /api/sessions/:id/start
// @access  Private/Tutor only
// NOTE: This now directly completes the session instead of changing to in_progress
router.put("/:id/start", authenticate, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Check if tutor owns this session
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });

    if (!tutorProfile || !session.tutor.equals(tutorProfile._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the tutor can complete this session",
      });
    }

    if (session.status !== sessionStatus.CONFIRMED) {
      return res.status(400).json({
        success: false,
        message: "Session must be confirmed before completing",
      });
    }

    // Directly complete the session (no in_progress state)
    session.status = sessionStatus.COMPLETED;
    session.startedAt = new Date();
    session.completedAt = new Date();
    await session.save();

    res.json({
      success: true,
      message: "Session completed",
      data: { session },
    });
  } catch (error) {
    console.error("Complete session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete session",
      error: error.message,
    });
  }
});

// @desc    Complete session with notes
// @route   PUT /api/sessions/:id/complete
// @access  Private/Tutor only
router.put("/:id/complete", authenticate, async (req, res) => {
  try {
    const { notes, minutes } = req.body;

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Authorization check - only tutor or admin can complete
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    const isAdmin = [roles.ADMIN, roles.COORDINATOR].includes(req.user.role);
    const isTutor = tutorProfile && session.tutor.equals(tutorProfile._id);

    if (!isAdmin && !isTutor) {
      return res.status(403).json({
        success: false,
        message: "Only the session tutor can complete this session",
      });
    }

    session.status = sessionStatus.COMPLETED;
    if (notes) session.notes = notes;
    if (minutes) {
      session.minutes = {
        ...minutes,
        createdAt: new Date(),
        createdBy: req.userId,
      };
    }

    await session.save();

    // Update statistics
    await TutorProfile.findByIdAndUpdate(session.tutor, {
      $inc: { completedSessions: 1 },
    });

    // Training points to award for completing a session
    const TRAINING_POINTS_PER_SESSION = 5;

    // Bug #16 Fix: Only update student stats if session has a student assigned
    if (session.student) {
      await StudentProfile.findByIdAndUpdate(session.student, {
        $inc: {
          completedSessions: 1,
          trainingPoints: TRAINING_POINTS_PER_SESSION,
        },
        $push: {
          trainingPointsHistory: {
            points: TRAINING_POINTS_PER_SESSION,
            reason: `Completed session: ${session.title}`,
            sessionId: session._id,
            awardedAt: new Date(),
          },
        },
      });
    }
    // Also update stats for registered students in open sessions
    if (session.registeredStudents?.length > 0) {
      const studentIds = session.registeredStudents.map((r) => r.student);
      await StudentProfile.updateMany(
        { _id: { $in: studentIds } },
        {
          $inc: {
            completedSessions: 1,
            trainingPoints: TRAINING_POINTS_PER_SESSION,
          },
          $push: {
            trainingPointsHistory: {
              points: TRAINING_POINTS_PER_SESSION,
              reason: `Completed session: ${session.title}`,
              sessionId: session._id,
              awardedAt: new Date(),
            },
          },
        }
      );
    }

    res.json({
      success: true,
      message: "Session completed",
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to complete session",
      error: error.message,
    });
  }
});

// @desc    Add material to session
// @route   POST /api/sessions/:id/materials
// @access  Private (session participants only)
router.post("/:id/materials", authenticate, async (req, res) => {
  try {
    const { title, type, url, libraryResourceId } = req.body;

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Authorization check - only tutor, student, or admin can add materials
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    const isAdmin = [roles.ADMIN, roles.COORDINATOR].includes(req.user.role);
    const isTutor = tutorProfile && session.tutor.equals(tutorProfile._id);
    const isStudent =
      studentProfile &&
      session.student &&
      session.student.equals(studentProfile._id);
    const isRegisteredStudent =
      studentProfile &&
      session.registeredStudents?.some(
        (r) => r.student.toString() === studentProfile._id.toString()
      );

    if (!isAdmin && !isTutor && !isStudent && !isRegisteredStudent) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add materials to this session",
      });
    }

    session.materials.push({
      title,
      type,
      url,
      libraryResourceId,
    });

    await session.save();

    res.json({
      success: true,
      message: "Material added",
      data: { session },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add material",
      error: error.message,
    });
  }
});

module.exports = router;
