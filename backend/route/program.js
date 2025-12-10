const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles } = require("../config/config");
const {
  Program,
  ProgramEnrollment,
  StudentProfile,
  TutorProfile,
  Notification,
} = require("../model");

// ===========================================
// PROGRAM ROUTES
// ===========================================

// @desc    Get all programs
// @route   GET /api/programs
// @access  Private
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      type, // academic, non_academic
      category,
      status = "active",
      search,
      faculty,
      isFeatured,
      registrationOpen,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;
    if (faculty) query["targetAudience.faculties"] = { $in: [faculty, []] };
    if (isFeatured === "true") query.isFeatured = true;
    if (registrationOpen === "true") query.registrationOpen = true;

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [programs, total] = await Promise.all([
      Program.find(query)
        .populate("createdBy", "firstName lastName fullName")
        .populate("assignedTutors.tutor", "user")
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Program.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        programs,
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
      message: "Failed to get programs",
      error: error.message,
    });
  }
});

// @desc    Get my enrollments
// @route   GET /api/programs/enrollments/me
// @access  Private
// NOTE: This route MUST be before /:id routes to avoid "enrollments" being matched as an ID
router.get("/enrollments/me", authenticate, async (req, res) => {
  try {
    const { status, type } = req.query;

    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const query = { student: studentProfile._id };
    if (status) query.status = status;

    let enrollments = await ProgramEnrollment.find(query)
      .populate("program")
      .sort({ enrolledAt: -1 });

    // Filter by program type if specified
    if (type) {
      enrollments = enrollments.filter((e) => e.program?.type === type);
    }

    res.json({
      success: true,
      data: { enrollments },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get enrollments",
      error: error.message,
    });
  }
});

// @desc    Get academic program categories
// @route   GET /api/programs/categories/academic
// @access  Private
// NOTE: This route MUST be before /:id routes
router.get("/categories/academic", authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        categories: [
          {
            id: "course_support",
            name: "Hỗ trợ môn học",
            description: "Kèm cặp các môn học trong chương trình",
          },
          {
            id: "exam_prep",
            name: "Ôn thi",
            description: "Chuẩn bị cho các kỳ thi giữa kỳ, cuối kỳ",
          },
          {
            id: "thesis_guidance",
            name: "Hướng dẫn luận văn",
            description: "Hỗ trợ làm đồ án, luận văn",
          },
          {
            id: "research",
            name: "Nghiên cứu khoa học",
            description: "Hướng dẫn NCKH, viết báo cáo",
          },
          {
            id: "lab_practice",
            name: "Thực hành thí nghiệm",
            description: "Hỗ trợ các môn thực hành",
          },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get categories",
      error: error.message,
    });
  }
});

// @desc    Get non-academic program categories
// @route   GET /api/programs/categories/non-academic
// @access  Private
// NOTE: This route MUST be before /:id routes
router.get("/categories/non-academic", authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        categories: [
          {
            id: "soft_skills",
            name: "Kỹ năng mềm",
            description: "Giao tiếp, thuyết trình, làm việc nhóm",
          },
          {
            id: "career",
            name: "Hướng nghiệp",
            description: "CV, phỏng vấn, định hướng nghề nghiệp",
          },
          {
            id: "leadership",
            name: "Lãnh đạo",
            description: "Kỹ năng quản lý, lãnh đạo đội nhóm",
          },
          {
            id: "communication",
            name: "Giao tiếp",
            description: "Tiếng Anh, kỹ năng giao tiếp",
          },
          {
            id: "time_management",
            name: "Quản lý thời gian",
            description: "Lập kế hoạch, tổ chức công việc",
          },
          {
            id: "mental_health",
            name: "Sức khỏe tinh thần",
            description: "Quản lý stress, cân bằng cuộc sống",
          },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get categories",
      error: error.message,
    });
  }
});

// @desc    Get program by ID
// @route   GET /api/programs/:id
// @access  Private
router.get("/:id", authenticate, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate("createdBy", "firstName lastName fullName email")
      .populate({
        path: "assignedTutors.tutor",
        populate: {
          path: "user",
          select: "firstName lastName fullName email avatar",
        },
      })
      .populate("modules.resources");

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Check if user is enrolled
    let enrollment = null;
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (studentProfile) {
      enrollment = await ProgramEnrollment.findOne({
        program: program._id,
        student: studentProfile._id,
      });
    }

    res.json({
      success: true,
      data: {
        program,
        enrollment,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get program",
      error: error.message,
    });
  }
});

// @desc    Create program
// @route   POST /api/programs
// @access  Private/Admin/Coordinator/Tutor
router.post(
  "/",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR, roles.TUTOR),
  async (req, res) => {
    try {
      const {
        name,
        description,
        shortDescription,
        type,
        category,
        targetAudience,
        duration,
        totalSessions,
        sessionDuration,
        schedule,
        modules,
        learningObjectives,
        prerequisites,
        outcomes,
        trainingPoints,
        hasCertificate,
        minParticipants,
        maxParticipants,
        registrationDeadline,
        startDate,
        endDate,
        tags,
        thumbnailUrl,
      } = req.body;

      if (!name || !description || !type || !category || !totalSessions) {
        return res.status(400).json({
          success: false,
          message:
            "Name, description, type, category, and totalSessions are required",
        });
      }

      const program = new Program({
        name,
        description,
        shortDescription,
        type,
        category,
        targetAudience,
        duration: duration || { value: 4, unit: "weeks" },
        totalSessions,
        sessionDuration: sessionDuration || 90,
        schedule,
        modules: modules || [],
        learningObjectives: learningObjectives || [],
        prerequisites: prerequisites || [],
        outcomes: outcomes || [],
        trainingPoints: trainingPoints || 0,
        hasCertificate: hasCertificate || false,
        minParticipants: minParticipants || 1,
        maxParticipants: maxParticipants || 20,
        registrationDeadline,
        startDate,
        endDate,
        tags: tags || [],
        thumbnailUrl,
        createdBy: req.userId,
        status: "draft",
      });

      // If tutor creates, auto-assign as lead
      if (req.user.role === roles.TUTOR) {
        const tutorProfile = await TutorProfile.findOne({ user: req.userId });
        if (tutorProfile) {
          program.assignedTutors.push({
            tutor: tutorProfile._id,
            role: "lead",
          });
        }
      }

      await program.save();

      res.status(201).json({
        success: true,
        message: "Program created successfully",
        data: { program },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create program",
        error: error.message,
      });
    }
  }
);

// @desc    Update program
// @route   PUT /api/programs/:id
// @access  Private/Admin/Coordinator/Creator
router.put("/:id", authenticate, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Check authorization
    const isCreator = program.createdBy.toString() === req.userId;
    const isAdmin = [roles.ADMIN, roles.COORDINATOR].includes(req.user.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this program",
      });
    }

    const updateFields = [
      "name",
      "description",
      "shortDescription",
      "type",
      "category",
      "targetAudience",
      "duration",
      "totalSessions",
      "sessionDuration",
      "schedule",
      "modules",
      "learningObjectives",
      "prerequisites",
      "outcomes",
      "trainingPoints",
      "hasCertificate",
      "minParticipants",
      "maxParticipants",
      "registrationOpen",
      "registrationDeadline",
      "startDate",
      "endDate",
      "tags",
      "thumbnailUrl",
      "status",
      "isPublic",
      "isFeatured",
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        program[field] = req.body[field];
      }
    });

    await program.save();

    res.json({
      success: true,
      message: "Program updated successfully",
      data: { program },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update program",
      error: error.message,
    });
  }
});

// @desc    Delete program
// @route   DELETE /api/programs/:id
// @access  Private/Admin
router.delete(
  "/:id",
  authenticate,
  authorize(roles.ADMIN),
  async (req, res) => {
    try {
      const program = await Program.findById(req.params.id);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Program not found",
        });
      }

      // Check if there are active enrollments
      const activeEnrollments = await ProgramEnrollment.countDocuments({
        program: program._id,
        status: { $in: ["enrolled", "in_progress"] },
      });

      if (activeEnrollments > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete program with active enrollments",
        });
      }

      program.status = "archived";
      await program.save();

      res.json({
        success: true,
        message: "Program archived successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete program",
        error: error.message,
      });
    }
  }
);

// @desc    Assign tutor to program
// @route   POST /api/programs/:id/tutors
// @access  Private/Admin/Coordinator
router.post(
  "/:id/tutors",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const { tutorId, role = "assistant" } = req.body;

      const program = await Program.findById(req.params.id);
      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Program not found",
        });
      }

      const tutorProfile = await TutorProfile.findById(tutorId).populate(
        "user"
      );
      if (!tutorProfile) {
        return res.status(404).json({
          success: false,
          message: "Tutor not found",
        });
      }

      // Check if already assigned
      const existingAssignment = program.assignedTutors.find(
        (t) => t.tutor.toString() === tutorId
      );
      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          message: "Tutor is already assigned to this program",
        });
      }

      program.assignedTutors.push({ tutor: tutorId, role });
      await program.save();

      // Notify tutor
      await Notification.create({
        user: tutorProfile.user._id,
        type: "program_assignment",
        title: "Assigned to Program",
        message: `You have been assigned as ${role} tutor for "${program.name}"`,
        actionUrl: `/programs/${program._id}`,
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
  }
);

// ===========================================
// ENROLLMENT ROUTES
// ===========================================

// @desc    Enroll in program
// @route   POST /api/programs/:id/enroll
// @access  Private/Student
router.post("/:id/enroll", authenticate, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    if (program.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Program is not open for enrollment",
      });
    }

    if (!program.registrationOpen) {
      return res.status(400).json({
        success: false,
        message: "Registration is closed for this program",
      });
    }

    if (
      program.registrationDeadline &&
      new Date() > program.registrationDeadline
    ) {
      return res.status(400).json({
        success: false,
        message: "Registration deadline has passed",
      });
    }

    // Get student profile
    const studentProfile = await StudentProfile.findOne({ user: req.userId });
    if (!studentProfile) {
      return res.status(400).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Check if already enrolled
    const existingEnrollment = await ProgramEnrollment.findOne({
      program: program._id,
      student: studentProfile._id,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this program",
      });
    }

    // Check capacity
    if (program.enrolledCount >= program.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: "Program is full",
      });
    }

    // Create enrollment
    const enrollment = new ProgramEnrollment({
      program: program._id,
      student: studentProfile._id,
      status: "enrolled",
    });

    await enrollment.save();

    // Update program count
    program.enrolledCount += 1;
    await program.save();

    // Add to student's enrolled programs (wrapped in try-catch)
    try {
      if (!studentProfile.enrolledPrograms) {
        studentProfile.enrolledPrograms = [];
      }
      if (!studentProfile.enrolledPrograms.includes(program.type)) {
        studentProfile.enrolledPrograms.push(program.type);
        await studentProfile.save();
      }
    } catch (updateError) {
      console.error("Failed to update student enrolled programs:", updateError);
      // Don't fail the enrollment
    }

    // Notify student (wrapped in try-catch)
    try {
      await Notification.create({
        user: req.userId,
        type: "program_enrolled",
        title: "Successfully Enrolled",
        message: `You have been enrolled in "${program.name}"`,
        actionUrl: `/programs/${program._id}`,
      });
    } catch (notifyError) {
      console.error("Failed to send enrollment notification:", notifyError);
      // Don't fail the enrollment
    }

    res.status(201).json({
      success: true,
      message: "Enrolled successfully",
      data: { enrollment },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to enroll",
      error: error.message,
    });
  }
});

// @desc    Update enrollment progress
// @route   PUT /api/programs/enrollments/:enrollmentId/progress
// @access  Private/Tutor/Admin
router.put(
  "/enrollments/:enrollmentId/progress",
  authenticate,
  async (req, res) => {
    try {
      const { progress, completedModule, status } = req.body;

      const enrollment = await ProgramEnrollment.findById(
        req.params.enrollmentId
      ).populate("program");

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found",
        });
      }

      // Check authorization
      const isTutorAssigned = enrollment.program.assignedTutors.some(
        (t) => t.tutor.toString() === req.userId
      );
      const isAdmin = [roles.ADMIN, roles.COORDINATOR].includes(req.user.role);

      if (!isTutorAssigned && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      if (progress !== undefined) enrollment.progress = progress;
      if (status) enrollment.status = status;

      if (completedModule !== undefined) {
        enrollment.completedModules.push({
          moduleIndex: completedModule,
          completedAt: new Date(),
        });
        enrollment.currentModule = completedModule + 1;

        // Calculate progress based on modules
        const totalModules = enrollment.program.modules.length;
        if (totalModules > 0) {
          enrollment.progress = Math.round(
            (enrollment.completedModules.length / totalModules) * 100
          );
        }
      }

      // Handle completion
      if (enrollment.progress >= 100 || status === "completed") {
        enrollment.status = "completed";
        enrollment.completedAt = new Date();

        // Award training points
        const pointsToAward = enrollment.program.trainingPoints || 0;
        if (pointsToAward > 0) {
          enrollment.pointsAwarded = pointsToAward;

          // Update student profile
          await StudentProfile.findByIdAndUpdate(enrollment.student, {
            $inc: { trainingPoints: pointsToAward },
            $push: {
              trainingPointsHistory: {
                points: pointsToAward,
                reason: `Completed program: ${enrollment.program.name}`,
                addedAt: new Date(),
              },
            },
          });
        }

        // Update program stats
        await Program.findByIdAndUpdate(enrollment.program._id, {
          $inc: { completedCount: 1 },
        });
      }

      await enrollment.save();

      res.json({
        success: true,
        message: "Progress updated",
        data: { enrollment },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update progress",
        error: error.message,
      });
    }
  }
);

// @desc    Drop from program
// @route   PUT /api/programs/enrollments/:enrollmentId/drop
// @access  Private
router.put(
  "/enrollments/:enrollmentId/drop",
  authenticate,
  async (req, res) => {
    try {
      const enrollment = await ProgramEnrollment.findById(
        req.params.enrollmentId
      ).populate("program");

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found",
        });
      }

      const studentProfile = await StudentProfile.findOne({ user: req.userId });

      // Check authorization
      if (
        enrollment.student.toString() !== studentProfile?._id.toString() &&
        ![roles.ADMIN, roles.COORDINATOR].includes(req.user.role)
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      enrollment.status = "dropped";
      enrollment.droppedAt = new Date();
      await enrollment.save();

      // Update program count
      await Program.findByIdAndUpdate(enrollment.program._id, {
        $inc: { enrolledCount: -1 },
      });

      res.json({
        success: true,
        message: "Dropped from program",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to drop from program",
        error: error.message,
      });
    }
  }
);

// @desc    Submit program feedback
// @route   POST /api/programs/enrollments/:enrollmentId/feedback
// @access  Private
router.post(
  "/enrollments/:enrollmentId/feedback",
  authenticate,
  async (req, res) => {
    try {
      const { rating, comment } = req.body;

      const enrollment = await ProgramEnrollment.findById(
        req.params.enrollmentId
      ).populate("program");

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found",
        });
      }

      const studentProfile = await StudentProfile.findOne({ user: req.userId });

      if (enrollment.student.toString() !== studentProfile?._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      if (enrollment.status !== "completed") {
        return res.status(400).json({
          success: false,
          message: "Can only provide feedback for completed programs",
        });
      }

      if (enrollment.feedback?.rating) {
        return res.status(400).json({
          success: false,
          message: "Feedback already submitted",
        });
      }

      enrollment.feedback = {
        rating,
        comment,
        submittedAt: new Date(),
      };
      await enrollment.save();

      // Update program rating
      const program = await Program.findById(enrollment.program._id);
      const newCount = program.rating.count + 1;
      const newAverage =
        (program.rating.average * program.rating.count + rating) / newCount;

      program.rating = {
        average: Math.round(newAverage * 10) / 10,
        count: newCount,
      };
      await program.save();

      res.json({
        success: true,
        message: "Feedback submitted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to submit feedback",
        error: error.message,
      });
    }
  }
);

// @desc    Get program statistics
// @route   GET /api/programs/:id/stats
// @access  Private/Admin/Tutor
router.get("/:id/stats", authenticate, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    const enrollmentStats = await ProgramEnrollment.aggregate([
      { $match: { program: program._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgProgress: { $avg: "$progress" },
        },
      },
    ]);

    const completionRate =
      program.enrolledCount > 0
        ? Math.round((program.completedCount / program.enrolledCount) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        enrolledCount: program.enrolledCount,
        completedCount: program.completedCount,
        completionRate,
        rating: program.rating,
        enrollmentsByStatus: enrollmentStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get program stats",
      error: error.message,
    });
  }
});

module.exports = router;
