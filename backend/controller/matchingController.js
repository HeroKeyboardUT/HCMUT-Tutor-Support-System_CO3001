const {
  Matching,
  User,
  TutorProfile,
  StudentProfile,
  Notification,
} = require("../model");

// Request a match with a tutor
exports.requestMatch = async (req, res) => {
  try {
    const { tutorId, message, subjects, learningGoals, preferredSchedule } =
      req.body;

    // Verify tutor exists
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

    // Check if already has pending/accepted match
    const existingMatch = await Matching.findOne({
      student: req.user.id,
      tutor: tutorId,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingMatch) {
      return res.status(400).json({
        success: false,
        message: "You already have an active match request with this tutor",
      });
    }

    // Calculate match score
    const studentProfile = await StudentProfile.findOne({ user: req.user.id });
    const tutorProfile = await TutorProfile.findOne({ user: tutorId });
    const matchScore = calculateMatchScore(
      studentProfile,
      tutorProfile,
      subjects
    );

    const match = new Matching({
      student: req.user.id,
      tutor: tutorId,
      status: "pending",
      requestMessage: message,
      subjects,
      learningGoals,
      preferredSchedule,
      matchScore: matchScore.total,
      matchDetails: matchScore.details,
      requestedAt: new Date(),
    });

    await match.save();

    // Notify tutor
    await Notification.create({
      user: tutorId,
      type: "match_request",
      title: "New Tutoring Request",
      message: `${req.user.fullName || "A student"} wants to be tutored by you`,
      relatedMatching: match._id,
    });

    res.status(201).json({
      success: true,
      message: "Match request sent successfully",
      match,
    });
  } catch (error) {
    console.error("Request match error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get AI suggestions for tutors
exports.getSuggestions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get student profile
    const studentProfile = await StudentProfile.findOne({ user: req.user.id });
    const studentUser = await User.findById(req.user.id);

    // Get all available tutors
    const tutorProfiles = await TutorProfile.find({ isAvailable: true })
      .populate("user", "fullName email department avatarUrl")
      .limit(50);

    // Calculate match scores and sort
    const suggestions = tutorProfiles
      .map((tutorProfile) => {
        const score = calculateMatchScore(
          studentProfile,
          tutorProfile,
          studentProfile?.supportNeeds || []
        );

        return {
          tutor: {
            _id: tutorProfile.user._id,
            fullName: tutorProfile.user.fullName,
            email: tutorProfile.user.email,
            department: tutorProfile.user.department,
            avatarUrl: tutorProfile.user.avatarUrl,
            expertise: tutorProfile.expertise,
            rating: tutorProfile.averageRating,
            totalSessions: tutorProfile.totalSessions,
            hourlyRate: tutorProfile.hourlyRate,
          },
          matchScore: score.total,
          reasons: score.reasons,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("Get suggestions error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get my matches
exports.getMyMatches = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const query = {};
    if (userRole === "tutor") {
      query.tutor = userId;
    } else if (userRole === "student") {
      query.student = userId;
    }
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [matches, total] = await Promise.all([
      Matching.find(query)
        .populate("student", "fullName email avatarUrl department")
        .populate("tutor", "fullName email avatarUrl department")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Matching.countDocuments(query),
    ]);

    res.json({
      success: true,
      matches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get my matches error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get match by ID
exports.getMatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Matching.findById(id)
      .populate("student", "fullName email avatarUrl department phone")
      .populate("tutor", "fullName email avatarUrl department phone");

    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    // Check access
    const isParticipant =
      match.student._id.toString() === req.user.id ||
      match.tutor._id.toString() === req.user.id;
    const isAdmin = ["admin", "coordinator", "department_head"].includes(
      req.user.role
    );

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({
      success: true,
      match,
    });
  } catch (error) {
    console.error("Get match by ID error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update match status (accept/reject)
exports.updateMatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, responseMessage } = req.body;

    const match = await Matching.findById(id);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    // Only tutor can accept/reject
    if (match.tutor.toString() !== req.user.id) {
      const isAdmin = ["admin", "coordinator"].includes(req.user.role);
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only the tutor can respond to this request",
        });
      }
    }

    // Validate status transition
    if (match.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${match.status}`,
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected",
      });
    }

    match.status = status;
    match.responseMessage = responseMessage;
    match.respondedAt = new Date();
    await match.save();

    // Update tutor stats if accepted
    if (status === "accepted") {
      await TutorProfile.findOneAndUpdate(
        { user: match.tutor },
        { $inc: { totalStudents: 1 } }
      );
    }

    // Notify student
    await Notification.create({
      user: match.student,
      type: status === "accepted" ? "match_accepted" : "match_rejected",
      title:
        status === "accepted"
          ? "Match Request Accepted!"
          : "Match Request Declined",
      message:
        status === "accepted"
          ? "Your tutoring request has been accepted. You can now book sessions!"
          : `Your tutoring request was declined. ${responseMessage || ""}`,
      relatedMatching: match._id,
    });

    res.json({
      success: true,
      message: `Match ${status} successfully`,
      match,
    });
  } catch (error) {
    console.error("Update match status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Cancel match
exports.cancelMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const match = await Matching.findById(id);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    // Only participants can cancel
    const isStudent = match.student.toString() === req.user.id;
    const isTutor = match.tutor.toString() === req.user.id;
    const isAdmin = ["admin", "coordinator"].includes(req.user.role);

    if (!isStudent && !isTutor && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (["cancelled", "completed"].includes(match.status)) {
      return res.status(400).json({
        success: false,
        message: "Match is already cancelled or completed",
      });
    }

    match.status = "cancelled";
    match.cancellationReason = reason;
    match.cancelledBy = req.user.id;
    match.cancelledAt = new Date();
    await match.save();

    // Notify other party
    const recipientId = isStudent ? match.tutor : match.student;
    await Notification.create({
      user: recipientId,
      type: "match_cancelled",
      title: "Match Cancelled",
      message: `The tutoring match has been cancelled. ${reason || ""}`,
      relatedMatching: match._id,
    });

    res.json({
      success: true,
      message: "Match cancelled successfully",
      match,
    });
  } catch (error) {
    console.error("Cancel match error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all matches (admin)
exports.getAllMatches = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [matches, total] = await Promise.all([
      Matching.find(query)
        .populate("student", "fullName email avatarUrl department")
        .populate("tutor", "fullName email avatarUrl department")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Matching.countDocuments(query),
    ]);

    res.json({
      success: true,
      matches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all matches error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Helper function to calculate match score
function calculateMatchScore(
  studentProfile,
  tutorProfile,
  requestedSubjects = []
) {
  let total = 0;
  const details = {};
  const reasons = [];

  if (!tutorProfile) {
    return { total: 0, details: {}, reasons: [] };
  }

  // 1. Expertise match (0-35 points)
  let expertiseMatch = 0;
  if (requestedSubjects.length > 0 && tutorProfile.expertise?.length > 0) {
    const tutorExpertiseLower = tutorProfile.expertise.map((e) =>
      e.toLowerCase()
    );
    const subjectsLower = requestedSubjects.map((s) => s.toLowerCase());

    // Exact matches
    const exactMatches = subjectsLower.filter((s) =>
      tutorExpertiseLower.includes(s)
    ).length;

    // Partial matches (subject contains expertise or vice versa)
    const partialMatches = subjectsLower.filter((s) =>
      tutorExpertiseLower.some((exp) => exp.includes(s) || s.includes(exp))
    ).length;

    expertiseMatch =
      (exactMatches + partialMatches * 0.5) / requestedSubjects.length;
  } else if (
    tutorProfile.subjects?.length > 0 &&
    requestedSubjects.length > 0
  ) {
    // Fall back to subjects field if expertise is empty
    const tutorSubjectsLower = tutorProfile.subjects.map((s) =>
      s.toLowerCase()
    );
    const subjectsLower = requestedSubjects.map((s) => s.toLowerCase());

    expertiseMatch =
      subjectsLower.filter((s) =>
        tutorSubjectsLower.some((ts) => ts.includes(s) || s.includes(ts))
      ).length / requestedSubjects.length;
  } else {
    expertiseMatch = 0.3; // Default if no specific match criteria
  }
  details.expertiseScore = Math.round(Math.min(1, expertiseMatch) * 35);
  total += details.expertiseScore;
  if (expertiseMatch > 0.7) {
    reasons.push("🎯 Chuyên môn phù hợp cao với nhu cầu của bạn");
  } else if (expertiseMatch > 0.4) {
    reasons.push("✓ Có chuyên môn liên quan");
  }

  // 2. Rating score (0-20 points)
  const rating = tutorProfile.averageRating || 0;
  details.ratingScore = Math.round((rating / 5) * 20);
  total += details.ratingScore;
  if (rating >= 4.5) {
    reasons.push("⭐ Đánh giá rất cao từ sinh viên khác");
  } else if (rating >= 4.0) {
    reasons.push("⭐ Đánh giá tốt");
  }

  // 3. Experience score (0-15 points)
  const sessions =
    tutorProfile.completedSessions || tutorProfile.totalSessions || 0;
  if (sessions >= 100) {
    details.experienceScore = 15;
    reasons.push("🏆 Gia sư rất có kinh nghiệm (100+ buổi)");
  } else if (sessions >= 50) {
    details.experienceScore = 12;
    reasons.push("📚 Nhiều kinh nghiệm giảng dạy");
  } else if (sessions >= 20) {
    details.experienceScore = 8;
  } else {
    details.experienceScore = Math.min(5, sessions);
  }
  total += details.experienceScore;

  // 4. Department/Faculty match (0-10 points)
  if (studentProfile?.department && tutorProfile.department) {
    if (tutorProfile.department === studentProfile.department) {
      details.departmentScore = 10;
      reasons.push("🏫 Cùng khoa - Hiểu rõ chương trình học");
    } else if (
      studentProfile.faculty &&
      tutorProfile.faculty === studentProfile.faculty
    ) {
      details.departmentScore = 5;
      reasons.push("🏢 Cùng phân hiệu");
    } else {
      details.departmentScore = 0;
    }
  } else {
    details.departmentScore = 0;
  }
  total += details.departmentScore;

  // 5. Learning Style Compatibility (0-10 points)
  if (studentProfile?.learningStyle && tutorProfile.teachingStyle) {
    const compatibilityMap = {
      visual: ["visual", "practical", "interactive", "demonstration"],
      auditory: ["verbal", "lecture", "discussion", "explanation"],
      reading_writing: ["reading", "written", "structured", "note_based"],
      kinesthetic: ["practical", "hands_on", "interactive", "project_based"],
    };

    const compatibleStyles =
      compatibilityMap[studentProfile.learningStyle] || [];
    const tutorStyleLower = tutorProfile.teachingStyle?.toLowerCase() || "";

    if (compatibleStyles.some((style) => tutorStyleLower.includes(style))) {
      details.learningStyleScore = 10;
      reasons.push("💡 Phong cách dạy phù hợp với cách học của bạn");
    } else {
      details.learningStyleScore = 3;
    }
  } else {
    details.learningStyleScore = 5; // Neutral if not specified
  }
  total += details.learningStyleScore;

  // 6. Availability/Schedule overlap (0-10 points)
  if (studentProfile?.schedulePreference && tutorProfile.availability) {
    let overlappingSlots = 0;
    const studentPref = studentProfile.schedulePreference;
    const tutorAvail = tutorProfile.availability;

    // Check for overlapping time slots
    if (Array.isArray(tutorAvail)) {
      overlappingSlots = Math.min(tutorAvail.length, 5);
    } else if (typeof tutorAvail === "object") {
      for (const day in tutorAvail) {
        if (studentPref[day]) {
          const studentSlots = studentPref[day];
          const tutorSlots = tutorAvail[day];
          if (Array.isArray(studentSlots) && Array.isArray(tutorSlots)) {
            for (const ts of tutorSlots) {
              for (const ss of studentSlots) {
                if (
                  ts === ss ||
                  (ts.start && ss.start && ts.start === ss.start)
                ) {
                  overlappingSlots++;
                }
              }
            }
          }
        }
      }
    }

    details.availabilityScore = Math.min(10, overlappingSlots * 2);
    if (overlappingSlots >= 3) {
      reasons.push("📅 Lịch trình linh hoạt, nhiều khung giờ phù hợp");
    }
  } else {
    details.availabilityScore = 5; // Neutral if not specified
  }
  total += details.availabilityScore;

  // Cap at 100
  total = Math.min(100, total);

  // Ensure at least one reason
  if (reasons.length === 0 && total > 30) {
    reasons.push("✓ Gia sư khả dụng để hỗ trợ bạn");
  }

  return {
    total,
    details,
    reasons,
  };
}
