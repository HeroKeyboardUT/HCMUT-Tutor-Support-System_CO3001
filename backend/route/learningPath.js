const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles } = require("../config/config");
const {
  LearningPath,
  StudentProfile,
  TutorProfile,
  Session,
  Notification,
  User,
} = require("../model");

// ===========================================
// AI MATCHING HELPER FUNCTIONS
// ===========================================

// Calculate AI-based match score for learning path recommendations
const calculateLearningMatchScore = (student, tutor, subject) => {
  let score = 0;
  let breakdown = {};

  // 1. Subject expertise matching (35 points)
  const subjectLower = subject.toLowerCase();
  const tutorExpertise = tutor.expertise || [];
  const tutorSubjects = tutor.subjects || [];

  const hasExactExpertise = tutorExpertise.some(
    (exp) => exp.toLowerCase() === subjectLower
  );
  const hasExactSubject = tutorSubjects.some(
    (subj) => subj.toLowerCase() === subjectLower
  );
  const hasRelatedExpertise = tutorExpertise.some(
    (exp) =>
      exp.toLowerCase().includes(subjectLower) ||
      subjectLower.includes(exp.toLowerCase())
  );

  if (hasExactExpertise || hasExactSubject) {
    breakdown.expertise = 35;
  } else if (hasRelatedExpertise) {
    breakdown.expertise = 25;
  } else {
    breakdown.expertise = 10;
  }
  score += breakdown.expertise;

  // 2. Rating score (20 points)
  const rating = tutor.averageRating || 0;
  breakdown.rating = Math.round((rating / 5) * 20);
  score += breakdown.rating;

  // 3. Experience score (15 points)
  const completedSessions = tutor.completedSessions || 0;
  if (completedSessions >= 100) {
    breakdown.experience = 15;
  } else if (completedSessions >= 50) {
    breakdown.experience = 12;
  } else if (completedSessions >= 20) {
    breakdown.experience = 8;
  } else {
    breakdown.experience = 5;
  }
  score += breakdown.experience;

  // 4. Department match (10 points)
  if (student.department && tutor.department) {
    if (student.department === tutor.department) {
      breakdown.department = 10;
    } else if (student.faculty && student.faculty === tutor.faculty) {
      breakdown.department = 5;
    } else {
      breakdown.department = 0;
    }
  } else {
    breakdown.department = 0;
  }
  score += breakdown.department;

  // 5. Availability overlap (10 points)
  if (tutor.schedulePreference && student.schedulePreference) {
    const tutorSlots = tutor.schedulePreference;
    const studentSlots = student.schedulePreference;

    let overlappingSlots = 0;
    for (const day in tutorSlots) {
      if (studentSlots[day]) {
        for (const tutorSlot of tutorSlots[day]) {
          for (const studentSlot of studentSlots[day]) {
            if (tutorSlot === studentSlot) {
              overlappingSlots++;
            }
          }
        }
      }
    }
    breakdown.availability = Math.min(overlappingSlots * 2, 10);
  } else {
    breakdown.availability = 5; // Neutral if no preference
  }
  score += breakdown.availability;

  // 6. Learning style compatibility (10 points)
  if (student.learningStyle && tutor.teachingStyle) {
    const compatibilityMap = {
      visual: ["visual", "practical", "interactive"],
      auditory: ["verbal", "lecture", "discussion"],
      reading_writing: ["reading", "written", "structured"],
      kinesthetic: ["practical", "hands_on", "interactive"],
    };

    const compatibleStyles = compatibilityMap[student.learningStyle] || [];
    const tutorStyleLower = tutor.teachingStyle?.toLowerCase() || "";

    if (compatibleStyles.some((style) => tutorStyleLower.includes(style))) {
      breakdown.learningStyle = 10;
    } else {
      breakdown.learningStyle = 3;
    }
  } else {
    breakdown.learningStyle = 5;
  }
  score += breakdown.learningStyle;

  return { score, breakdown };
};

// Generate AI recommendations for a learning path
const generateAIRecommendations = async (learningPath, studentProfile) => {
  const recommendations = {
    nextSteps: [],
    suggestedTutors: [],
    suggestedResources: [],
    insights: [],
    studySchedule: [],
  };

  // 1. Generate next steps based on progress
  const completedMilestones = learningPath.milestones.filter(
    (m) => m.status === "completed"
  ).length;
  const totalMilestones = learningPath.milestones.length;
  const currentMilestone = learningPath.milestones.find(
    (m) => m.status === "in_progress"
  );
  const nextMilestone = learningPath.milestones.find(
    (m) => m.status === "not_started"
  );

  if (currentMilestone) {
    recommendations.nextSteps.push({
      priority: "high",
      action: `Hoàn thành milestone: ${currentMilestone.title}`,
      deadline: currentMilestone.targetDate,
      type: "milestone",
    });
  }

  if (nextMilestone) {
    recommendations.nextSteps.push({
      priority: "medium",
      action: `Chuẩn bị cho: ${nextMilestone.title}`,
      type: "preparation",
    });
  }

  // 2. Find suggested tutors
  const tutors = await TutorProfile.find({
    status: "approved",
    isAvailable: true,
    $or: [
      { subjects: { $regex: learningPath.subject, $options: "i" } },
      { expertise: { $regex: learningPath.subject, $options: "i" } },
    ],
  })
    .populate("user", "firstName lastName fullName avatar")
    .limit(10);

  const tutorScores = tutors.map((tutor) => ({
    tutor,
    ...calculateLearningMatchScore(studentProfile, tutor, learningPath.subject),
  }));

  tutorScores.sort((a, b) => b.score - a.score);

  recommendations.suggestedTutors = tutorScores.slice(0, 3).map((ts) => ({
    tutorId: ts.tutor._id,
    name: ts.tutor.user?.fullName || "Unknown",
    avatar: ts.tutor.user?.avatar,
    matchScore: ts.score,
    matchBreakdown: ts.breakdown,
    rating: ts.tutor.averageRating,
    completedSessions: ts.tutor.completedSessions,
    specializations: ts.tutor.expertise?.slice(0, 3),
  }));

  // 3. Generate suggested resources
  const levelResources = {
    beginner: [
      { type: "video", title: "Khóa học cơ bản", platform: "YouTube/Coursera" },
      { type: "book", title: "Sách giáo trình", platform: "Thư viện" },
      {
        type: "practice",
        title: "Bài tập cơ bản",
        platform: "LeetCode/HackerRank",
      },
    ],
    intermediate: [
      { type: "course", title: "Khóa học nâng cao", platform: "Udemy/edX" },
      { type: "project", title: "Dự án thực hành", platform: "GitHub" },
      {
        type: "article",
        title: "Tài liệu chuyên sâu",
        platform: "Medium/Dev.to",
      },
    ],
    advanced: [
      { type: "research", title: "Bài báo nghiên cứu", platform: "IEEE/ACM" },
      {
        type: "competition",
        title: "Cuộc thi lập trình",
        platform: "Kaggle/Codeforces",
      },
      {
        type: "mentorship",
        title: "Mentorship nâng cao",
        platform: "HCMUT Tutor",
      },
    ],
  };

  recommendations.suggestedResources =
    levelResources[learningPath.currentLevel] || levelResources.beginner;

  // 4. Generate insights
  if (completedMilestones > 0) {
    const progressPercent = Math.round(
      (completedMilestones / totalMilestones) * 100
    );
    recommendations.insights.push({
      type: "progress",
      message: `Bạn đã hoàn thành ${progressPercent}% lộ trình học tập`,
      icon: "📈",
    });
  }

  if (learningPath.currentStreak > 3) {
    recommendations.insights.push({
      type: "streak",
      message: `Tuyệt vời! Bạn đã học liên tục ${learningPath.currentStreak} ngày`,
      icon: "🔥",
    });
  }

  const hoursStudied = learningPath.totalStudyHours || 0;
  if (hoursStudied > 0) {
    recommendations.insights.push({
      type: "study_time",
      message: `Tổng thời gian học: ${hoursStudied} giờ`,
      icon: "⏰",
    });
  }

  // Add subject-specific insight
  recommendations.insights.push({
    type: "subject",
    message: `Môn học: ${learningPath.subject} - Mức độ: ${learningPath.currentLevel}`,
    icon: "📚",
  });

  // 5. Generate study schedule suggestions
  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const studyHoursPerWeek = learningPath.weeklyGoal?.studyHours || 10;
  const sessionsPerWeek = Math.min(studyHoursPerWeek / 2, 5);

  for (let i = 0; i < sessionsPerWeek; i++) {
    recommendations.studySchedule.push({
      day: daysOfWeek[i],
      suggestedTime: "19:00 - 21:00",
      focus: i % 2 === 0 ? "Theory" : "Practice",
    });
  }

  return recommendations;
};

// ===========================================
// LEARNING PATH ROUTES
// ===========================================

// @desc    Get all learning paths for current user
// @route   GET /api/learning-paths
// @access  Private
router.get("/", authenticate, async (req, res) => {
  try {
    const { status, subject } = req.query;

    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const query = { student: studentProfile._id };
    if (status) query.status = status;
    if (subject) query.subject = { $regex: subject, $options: "i" };

    const learningPaths = await LearningPath.find(query)
      .populate("assignedTutor", "user expertise averageRating")
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: { learningPaths },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get learning paths",
      error: error.message,
    });
  }
});

// @desc    Get learning path statistics
// @route   GET /api/learning-paths/stats/me
// @access  Private
// NOTE: This route MUST be before /:id routes to avoid "stats" being matched as an ID
router.get("/stats/me", authenticate, async (req, res) => {
  try {
    const studentProfile = await StudentProfile.findOne({ user: req.userId });

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const paths = await LearningPath.find({ student: studentProfile._id });

    const stats = {
      totalPaths: paths.length,
      activePaths: paths.filter(
        (p) => p.status === "active" || p.status === "in_progress"
      ).length,
      completedPaths: paths.filter((p) => p.status === "completed").length,
      totalStudyHours: paths.reduce(
        (sum, p) => sum + (p.totalStudyHours || 0),
        0
      ),
      longestStreak: Math.max(...paths.map((p) => p.longestStreak || 0), 0),
      currentStreak: Math.max(...paths.map((p) => p.currentStreak || 0), 0),
      averageProgress:
        paths.length > 0
          ? Math.round(
              paths.reduce((sum, p) => sum + (p.progress || 0), 0) /
                paths.length
            )
          : 0,
      subjectsCovered: [...new Set(paths.map((p) => p.subject))],
    };

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get stats",
      error: error.message,
    });
  }
});

// @desc    Get AI matching suggestions for a subject
// @route   GET /api/learning-paths/suggest-tutors/:subject
// @access  Private
// NOTE: This route MUST be before /:id routes to avoid "suggest-tutors" being matched as an ID
router.get("/suggest-tutors/:subject", authenticate, async (req, res) => {
  try {
    const { subject } = req.params;
    const { limit = 5 } = req.query;

    const studentProfile = await StudentProfile.findOne({
      user: req.userId,
    }).populate("user");

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Find tutors matching the subject
    const tutors = await TutorProfile.find({
      status: "approved",
      isAvailable: true,
      $or: [
        { subjects: { $regex: subject, $options: "i" } },
        { expertise: { $regex: subject, $options: "i" } },
      ],
    })
      .populate("user", "firstName lastName fullName avatar email")
      .limit(20);

    // Calculate match scores
    const tutorScores = tutors.map((tutor) => ({
      tutor: {
        _id: tutor._id,
        user: tutor.user,
        expertise: tutor.expertise,
        subjects: tutor.subjects,
        averageRating: tutor.averageRating,
        completedSessions: tutor.completedSessions,
        department: tutor.department,
        teachingStyle: tutor.teachingStyle,
      },
      ...calculateLearningMatchScore(studentProfile, tutor, subject),
    }));

    // Sort by score and return top matches
    tutorScores.sort((a, b) => b.score - a.score);
    const topMatches = tutorScores.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        subject,
        suggestions: topMatches.map((match) => ({
          tutor: match.tutor,
          matchScore: match.score,
          matchBreakdown: match.breakdown,
          recommendation: getMatchRecommendation(match.score),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get tutor suggestions",
      error: error.message,
    });
  }
});

// Helper function for match recommendation text
function getMatchRecommendation(score) {
  if (score >= 85) return "Highly Recommended - Excellent match!";
  if (score >= 70) return "Recommended - Good compatibility";
  if (score >= 50) return "Suitable - Reasonable match";
  return "Available - Consider based on schedule";
}

// @desc    Get learning path by ID
// @route   GET /api/learning-paths/:id
// @access  Private
router.get("/:id", authenticate, async (req, res) => {
  try {
    const learningPath = await LearningPath.findById(req.params.id)
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "firstName lastName fullName email avatar",
        },
      })
      .populate({
        path: "assignedTutor",
        populate: {
          path: "user",
          select: "firstName lastName fullName email avatar",
        },
      })
      .populate("sessions.session");

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: "Learning path not found",
      });
    }

    // Check authorization
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    const isOwner =
      studentProfile?._id.toString() === learningPath.student._id.toString();
    const isTutor =
      tutorProfile?._id.toString() ===
      learningPath.assignedTutor?._id.toString();
    const isAdmin = [roles.ADMIN, roles.COORDINATOR].includes(req.user.role);

    if (!isOwner && !isTutor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this learning path",
      });
    }

    // Generate fresh AI recommendations
    const recommendations = await generateAIRecommendations(
      learningPath,
      studentProfile || learningPath.student
    );

    res.json({
      success: true,
      data: {
        learningPath,
        recommendations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get learning path",
      error: error.message,
    });
  }
});

// @desc    Create learning path with AI generation
// @route   POST /api/learning-paths
// @access  Private
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      subject,
      currentLevel = "beginner",
      targetLevel = "advanced",
      goals,
      weeklyGoal,
      customMilestones,
    } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (!studentProfile) {
      return res.status(400).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Check for existing path with same subject
    const existingPath = await LearningPath.findOne({
      student: studentProfile._id,
      subject: { $regex: `^${subject}$`, $options: "i" },
      status: { $in: ["active", "in_progress"] },
    });

    if (existingPath) {
      return res.status(400).json({
        success: false,
        message: "You already have an active learning path for this subject",
      });
    }

    // Generate AI milestones based on subject and level
    const milestones =
      customMilestones ||
      generateDefaultMilestones(subject, currentLevel, targetLevel);

    const learningPath = new LearningPath({
      student: studentProfile._id,
      subject,
      currentLevel,
      targetLevel,
      goals: goals || [],
      weeklyGoal: weeklyGoal || { studyHours: 10, sessionsCount: 2 },
      milestones,
      status: "active",
    });

    await learningPath.save();

    // Generate initial recommendations
    const recommendations = await generateAIRecommendations(
      learningPath,
      studentProfile
    );

    // Update learning path with AI recommendations
    learningPath.aiRecommendations = recommendations;
    await learningPath.save();

    // Notify student
    await Notification.create({
      user: req.userId,
      type: "learning_path_created",
      title: "Lộ trình học tập mới",
      message: `Lộ trình học tập "${subject}" đã được tạo thành công`,
      actionUrl: `/learning-paths/${learningPath._id}`,
    });

    res.status(201).json({
      success: true,
      message: "Learning path created successfully",
      data: { learningPath, recommendations },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create learning path",
      error: error.message,
    });
  }
});

// Helper function to generate default milestones
function generateDefaultMilestones(subject, currentLevel, targetLevel) {
  const levelOrder = [
    "beginner",
    "elementary",
    "intermediate",
    "upper_intermediate",
    "advanced",
    "expert",
  ];
  const currentIndex = levelOrder.indexOf(currentLevel);
  const targetIndex = levelOrder.indexOf(targetLevel);

  const levels = levelOrder.slice(
    Math.max(0, currentIndex),
    Math.min(levelOrder.length, targetIndex + 1)
  );

  const milestones = [];
  let orderIndex = 0;

  levels.forEach((level, idx) => {
    // Foundation milestone
    milestones.push({
      title: `${subject} - Nền tảng ${level}`,
      description: `Nắm vững các khái niệm cơ bản ở mức ${level}`,
      order: orderIndex++,
      status: idx === 0 ? "in_progress" : "not_started",
      type: "learning",
      estimatedDuration: { value: 2, unit: "weeks" },
      skills: [`${subject} fundamentals`, "Problem solving"],
      resources: [
        { title: `Tài liệu ${subject} ${level}`, type: "document", url: "#" },
        { title: "Video hướng dẫn", type: "video", url: "#" },
      ],
    });

    // Practice milestone
    if (level !== "beginner") {
      milestones.push({
        title: `${subject} - Thực hành ${level}`,
        description: `Áp dụng kiến thức vào bài tập và dự án`,
        order: orderIndex++,
        status: "not_started",
        type: "practice",
        estimatedDuration: { value: 1, unit: "weeks" },
        skills: ["Practical application", "Debugging"],
        resources: [
          { title: "Bài tập thực hành", type: "exercise", url: "#" },
          { title: "Dự án mẫu", type: "project", url: "#" },
        ],
      });
    }

    // Assessment milestone
    if (
      idx === levels.length - 1 ||
      level === "intermediate" ||
      level === "advanced"
    ) {
      milestones.push({
        title: `${subject} - Đánh giá ${level}`,
        description: `Kiểm tra kiến thức và kỹ năng đạt được`,
        order: orderIndex++,
        status: "not_started",
        type: "assessment",
        estimatedDuration: { value: 3, unit: "days" },
        skills: ["Assessment", "Self-evaluation"],
        resources: [{ title: "Bài kiểm tra", type: "quiz", url: "#" }],
      });
    }
  });

  return milestones;
}

// @desc    Update learning path
// @route   PUT /api/learning-paths/:id
// @access  Private
router.put("/:id", authenticate, async (req, res) => {
  try {
    const learningPath = await LearningPath.findById(req.params.id);

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: "Learning path not found",
      });
    }

    // Check authorization
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (learningPath.student.toString() !== studentProfile?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const updateFields = ["goals", "weeklyGoal", "status", "notes"];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        learningPath[field] = req.body[field];
      }
    });

    await learningPath.save();

    res.json({
      success: true,
      message: "Learning path updated",
      data: { learningPath },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update learning path",
      error: error.message,
    });
  }
});

// @desc    Update milestone status
// @route   PUT /api/learning-paths/:id/milestones/:milestoneId
// @access  Private
router.put("/:id/milestones/:milestoneId", authenticate, async (req, res) => {
  try {
    const { status, notes, actualDuration, assessmentScore } = req.body;

    const learningPath = await LearningPath.findById(req.params.id);

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: "Learning path not found",
      });
    }

    // Check authorization
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    const isOwner =
      learningPath.student.toString() === studentProfile?._id.toString();
    const isTutor =
      learningPath.assignedTutor?.toString() === tutorProfile?._id.toString();

    if (!isOwner && !isTutor) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const milestone = learningPath.milestones.id(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found",
      });
    }

    if (status) {
      milestone.status = status;
      if (status === "completed") {
        milestone.completedAt = new Date();
        milestone.completedBy = req.userId;

        // Update next milestone to in_progress
        const currentIndex = learningPath.milestones.findIndex(
          (m) => m._id.toString() === req.params.milestoneId
        );
        const nextMilestone = learningPath.milestones[currentIndex + 1];
        if (nextMilestone && nextMilestone.status === "not_started") {
          nextMilestone.status = "in_progress";
        }

        // Update overall progress
        const completedCount = learningPath.milestones.filter(
          (m) => m.status === "completed"
        ).length;
        learningPath.progress = Math.round(
          (completedCount / learningPath.milestones.length) * 100
        );

        // Update streak
        learningPath.currentStreak = (learningPath.currentStreak || 0) + 1;
        learningPath.longestStreak = Math.max(
          learningPath.longestStreak || 0,
          learningPath.currentStreak
        );
        learningPath.lastActivityAt = new Date();

        // Check if path is completed
        if (learningPath.progress === 100) {
          learningPath.status = "completed";
          learningPath.completedAt = new Date();

          // Award bonus training points
          await StudentProfile.findByIdAndUpdate(studentProfile._id, {
            $inc: { trainingPoints: 20 },
            $push: {
              trainingPointsHistory: {
                points: 20,
                reason: `Hoàn thành lộ trình học tập: ${learningPath.subject}`,
                addedAt: new Date(),
              },
            },
          });

          // Notify student
          await Notification.create({
            user: req.userId,
            type: "learning_path_completed",
            title: "Hoàn thành lộ trình!",
            message: `Chúc mừng! Bạn đã hoàn thành lộ trình "${learningPath.subject}"`,
            actionUrl: `/learning-paths/${learningPath._id}`,
          });
        }
      }
    }

    if (notes) milestone.notes = notes;
    if (actualDuration) milestone.actualDuration = actualDuration;
    if (assessmentScore !== undefined)
      milestone.assessmentScore = assessmentScore;

    await learningPath.save();

    res.json({
      success: true,
      message: "Milestone updated",
      data: { learningPath },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update milestone",
      error: error.message,
    });
  }
});

// @desc    Add milestone to learning path
// @route   POST /api/learning-paths/:id/milestones
// @access  Private
router.post("/:id/milestones", authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      type = "learning",
      estimatedDuration,
      skills,
      resources,
      insertAfter, // milestone ID to insert after
    } = req.body;

    const learningPath = await LearningPath.findById(req.params.id);

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: "Learning path not found",
      });
    }

    // Check authorization
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    const tutorProfile = await TutorProfile.findOne({ user: req.userId });
    const isOwner =
      learningPath.student.toString() === studentProfile?._id.toString();
    const isTutor =
      learningPath.assignedTutor?.toString() === tutorProfile?._id.toString();

    if (!isOwner && !isTutor) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Determine order
    let order = learningPath.milestones.length;
    if (insertAfter) {
      const afterIndex = learningPath.milestones.findIndex(
        (m) => m._id.toString() === insertAfter
      );
      if (afterIndex >= 0) {
        order = afterIndex + 1;
        // Update order of subsequent milestones
        learningPath.milestones.forEach((m) => {
          if (m.order >= order) m.order += 1;
        });
      }
    }

    const newMilestone = {
      title,
      description,
      type,
      order,
      estimatedDuration: estimatedDuration || { value: 1, unit: "weeks" },
      skills: skills || [],
      resources: resources || [],
      status: "not_started",
    };

    learningPath.milestones.push(newMilestone);
    learningPath.milestones.sort((a, b) => a.order - b.order);

    await learningPath.save();

    res.status(201).json({
      success: true,
      message: "Milestone added",
      data: { learningPath },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add milestone",
      error: error.message,
    });
  }
});

// @desc    Assign tutor to learning path
// @route   POST /api/learning-paths/:id/assign-tutor
// @access  Private
router.post("/:id/assign-tutor", authenticate, async (req, res) => {
  try {
    const { tutorId } = req.body;

    const learningPath = await LearningPath.findById(req.params.id);

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: "Learning path not found",
      });
    }

    // Check authorization
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (learningPath.student.toString() !== studentProfile?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const tutorProfile = await TutorProfile.findById(tutorId).populate("user");
    if (!tutorProfile) {
      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    learningPath.assignedTutor = tutorId;
    await learningPath.save();

    // Notify tutor
    await Notification.create({
      user: tutorProfile.user._id,
      type: "learning_path_assigned",
      title: "Được giao hướng dẫn lộ trình",
      message: `Bạn được giao hướng dẫn lộ trình "${learningPath.subject}"`,
      actionUrl: `/learning-paths/${learningPath._id}`,
    });

    res.json({
      success: true,
      message: "Tutor assigned successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to assign tutor",
      error: error.message,
    });
  }
});

// @desc    Get AI recommendations for learning path
// @route   GET /api/learning-paths/:id/recommendations
// @access  Private
router.get("/:id/recommendations", authenticate, async (req, res) => {
  try {
    const learningPath = await LearningPath.findById(req.params.id);

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: "Learning path not found",
      });
    }

    const studentProfile = await StudentProfile.findOne({ user: req.userId });

    // Generate fresh recommendations
    const recommendations = await generateAIRecommendations(
      learningPath,
      studentProfile
    );

    // Update stored recommendations
    learningPath.aiRecommendations = recommendations;
    await learningPath.save();

    res.json({
      success: true,
      data: { recommendations },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get recommendations",
      error: error.message,
    });
  }
});

// @desc    Log study session
// @route   POST /api/learning-paths/:id/study-log
// @access  Private
router.post("/:id/study-log", authenticate, async (req, res) => {
  try {
    const { duration, notes, milestoneId, sessionId } = req.body;

    const learningPath = await LearningPath.findById(req.params.id);

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: "Learning path not found",
      });
    }

    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (learningPath.student.toString() !== studentProfile?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Update total study hours
    learningPath.totalStudyHours =
      (learningPath.totalStudyHours || 0) + duration / 60;

    // Update streak
    const today = new Date().toDateString();
    const lastActivity = learningPath.lastActivityAt
      ? new Date(learningPath.lastActivityAt).toDateString()
      : null;

    if (lastActivity !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastActivity === yesterday.toDateString()) {
        learningPath.currentStreak = (learningPath.currentStreak || 0) + 1;
      } else if (lastActivity !== today) {
        learningPath.currentStreak = 1;
      }

      learningPath.longestStreak = Math.max(
        learningPath.longestStreak || 0,
        learningPath.currentStreak
      );
    }

    learningPath.lastActivityAt = new Date();

    // Link session if provided
    if (sessionId) {
      learningPath.sessions.push({
        session: sessionId,
        milestone: milestoneId,
        notes,
        loggedAt: new Date(),
      });
    }

    await learningPath.save();

    res.json({
      success: true,
      message: "Study session logged",
      data: {
        totalStudyHours: learningPath.totalStudyHours,
        currentStreak: learningPath.currentStreak,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to log study session",
      error: error.message,
    });
  }
});

module.exports = router;
