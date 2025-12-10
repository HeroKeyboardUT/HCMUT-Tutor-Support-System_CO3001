const { Session, User, TutorProfile, Notification } = require("../model");

// Create a new session
exports.createSession = async (req, res) => {
  try {
    const {
      tutorId,
      title,
      description,
      type,
      scheduledAt,
      duration,
      subjects,
      location,
      meetingLink,
    } = req.body;

    // Verify tutor exists and is available
    const tutor = await User.findOne({
      _id: tutorId,
      role: "tutor",
      isActive: true,
    });
    if (!tutor) {
      return res
        .status(404)
        .json({ success: false, message: "Tutor not found" });
    }

    const tutorProfile = await TutorProfile.findOne({ user: tutorId });
    if (!tutorProfile?.isAvailable) {
      return res
        .status(400)
        .json({ success: false, message: "Tutor is not available" });
    }

    // Calculate end time
    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Check for conflicts
    const conflict = await Session.findOne({
      tutor: tutorId,
      status: { $in: ["scheduled", "confirmed", "in_progress"] },
      $or: [{ scheduledAt: { $lt: endTime }, endTime: { $gt: startTime } }],
    });

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: "Tutor has a conflicting session at this time",
      });
    }

    const session = new Session({
      tutor: tutorId,
      student: req.user.id,
      title,
      description,
      type,
      scheduledAt: startTime,
      endTime,
      duration,
      subjects,
      location: type !== "online" ? location : undefined,
      meetingLink: type !== "offline" ? meetingLink : undefined,
      status: "scheduled",
      createdBy: req.user.id,
    });

    await session.save();

    // Send notification to tutor
    await Notification.create({
      user: tutorId,
      type: "session_request",
      title: "New Session Request",
      message: `You have a new session request from ${
        req.user.fullName || "a student"
      }`,
      relatedSession: session._id,
    });

    res.status(201).json({
      success: true,
      message: "Session created successfully",
      session,
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all sessions (with filters)
exports.getAllSessions = async (req, res) => {
  try {
    const {
      status,
      type,
      tutorId,
      studentId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (tutorId) query.tutor = tutorId;
    if (studentId) query.student = studentId;
    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = new Date(startDate);
      if (endDate) query.scheduledAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate("tutor", "fullName email avatarUrl")
        .populate("student", "fullName email avatarUrl")
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Session.countDocuments(query),
    ]);

    res.json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all sessions error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get my sessions (for current user)
exports.getMySessions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const query = {};
    if (userRole === "tutor") {
      query.tutor = userId;
    } else if (userRole === "student") {
      query.student = userId;
    } else {
      // For coordinators/admins, return all or filter by params
      if (req.query.tutorId) query.tutor = req.query.tutorId;
      if (req.query.studentId) query.student = req.query.studentId;
    }

    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate("tutor", "fullName email avatarUrl department")
        .populate("student", "fullName email avatarUrl department")
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Session.countDocuments(query),
    ]);

    res.json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get my sessions error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get session by ID
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("tutor", "fullName email avatarUrl department phone")
      .populate("student", "fullName email avatarUrl department phone")
      .populate("createdBy", "fullName");

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Check access (only participants or admins can view)
    const isParticipant =
      session.tutor._id.toString() === req.user.id ||
      session.student._id.toString() === req.user.id;
    const isAdmin = ["admin", "coordinator", "department_head"].includes(
      req.user.role
    );

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Get session by ID error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update session
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      scheduledAt,
      duration,
      location,
      meetingLink,
      subjects,
      notes,
    } = req.body;

    const session = await Session.findById(id);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Check permission
    const isParticipant =
      session.tutor.toString() === req.user.id ||
      session.student.toString() === req.user.id;
    const isAdmin = ["admin", "coordinator"].includes(req.user.role);

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Only allow updates if session is not completed/cancelled
    if (["completed", "cancelled"].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot update a completed or cancelled session",
      });
    }

    // Update fields
    if (title) session.title = title;
    if (description) session.description = description;
    if (subjects) session.subjects = subjects;
    if (notes) session.notes = notes;
    if (location) session.location = location;
    if (meetingLink) session.meetingLink = meetingLink;

    if (scheduledAt) {
      session.scheduledAt = new Date(scheduledAt);
      session.endTime = new Date(
        session.scheduledAt.getTime() + (duration || session.duration) * 60000
      );
    }
    if (duration) {
      session.duration = duration;
      session.endTime = new Date(
        session.scheduledAt.getTime() + duration * 60000
      );
    }

    await session.save();

    res.json({
      success: true,
      message: "Session updated successfully",
      session,
    });
  } catch (error) {
    console.error("Update session error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update session status
exports.updateSessionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const session = await Session.findById(id);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Validate status transition
    const validTransitions = {
      scheduled: ["confirmed", "cancelled"],
      confirmed: ["in_progress", "cancelled", "no_show"],
      in_progress: ["completed", "cancelled"],
    };

    if (!validTransitions[session.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${session.status} to ${status}`,
      });
    }

    // Check permission based on action
    const isTutor = session.tutor.toString() === req.user.id;
    const isStudent = session.student.toString() === req.user.id;
    const isAdmin = ["admin", "coordinator"].includes(req.user.role);

    // Only tutor can confirm, start, complete
    if (
      ["confirmed", "in_progress", "completed"].includes(status) &&
      !isTutor &&
      !isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: "Only tutor can perform this action",
      });
    }

    session.status = status;
    if (status === "cancelled" && cancellationReason) {
      session.cancellationReason = cancellationReason;
      session.cancelledBy = req.user.id;
      session.cancelledAt = new Date();
    }
    if (status === "completed") {
      session.completedAt = new Date();

      // Update tutor stats
      await TutorProfile.findOneAndUpdate(
        { user: session.tutor },
        { $inc: { totalSessions: 1 } }
      );
    }

    await session.save();

    // Send notification
    const recipientId = isTutor ? session.student : session.tutor;
    await Notification.create({
      user: recipientId,
      type: "session_update",
      title: "Session Status Updated",
      message: `Session "${session.title}" has been ${status}`,
      relatedSession: session._id,
    });

    res.json({
      success: true,
      message: `Session ${status} successfully`,
      session,
    });
  } catch (error) {
    console.error("Update session status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Cancel session
exports.cancelSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const session = await Session.findById(id);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    if (["completed", "cancelled"].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: "Session is already completed or cancelled",
      });
    }

    // Check permission
    const isParticipant =
      session.tutor.toString() === req.user.id ||
      session.student.toString() === req.user.id;
    const isAdmin = ["admin", "coordinator"].includes(req.user.role);

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    session.status = "cancelled";
    session.cancellationReason = reason;
    session.cancelledBy = req.user.id;
    session.cancelledAt = new Date();
    await session.save();

    // Notify the other party
    const recipientId =
      session.tutor.toString() === req.user.id
        ? session.student
        : session.tutor;
    await Notification.create({
      user: recipientId,
      type: "session_cancelled",
      title: "Session Cancelled",
      message: `Session "${session.title}" has been cancelled. Reason: ${
        reason || "Not specified"
      }`,
      relatedSession: session._id,
    });

    res.json({
      success: true,
      message: "Session cancelled successfully",
      session,
    });
  } catch (error) {
    console.error("Cancel session error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get session stats
exports.getSessionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = {};
    if (Object.keys(dateFilter).length > 0) {
      query.scheduledAt = dateFilter;
    }

    const [total, scheduled, confirmed, inProgress, completed, cancelled] =
      await Promise.all([
        Session.countDocuments(query),
        Session.countDocuments({ ...query, status: "scheduled" }),
        Session.countDocuments({ ...query, status: "confirmed" }),
        Session.countDocuments({ ...query, status: "in_progress" }),
        Session.countDocuments({ ...query, status: "completed" }),
        Session.countDocuments({ ...query, status: "cancelled" }),
      ]);

    // Calculate completion rate
    const finishedSessions = completed + cancelled;
    const completionRate =
      finishedSessions > 0 ? (completed / finishedSessions) * 100 : 0;

    res.json({
      success: true,
      stats: {
        total,
        scheduled,
        confirmed,
        inProgress,
        completed,
        cancelled,
        completionRate: Math.round(completionRate * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Get session stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
