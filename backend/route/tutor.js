const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles } = require("../config/config");
const { TutorProfile, User } = require("../model");

// @desc    Get pending tutor approvals (admin/coordinator only)
// @route   GET /api/tutors/pending
// @access  Private/Admin
router.get(
  "/pending",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const tutors = await TutorProfile.find({ isApproved: false })
        .populate(
          "user",
          "firstName lastName fullName email faculty department"
        )
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: { tutors },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get pending tutors",
        error: error.message,
      });
    }
  }
);

// @desc    Get all tutors
// @route   GET /api/tutors
// @access  Public
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      subject,
      tutorType,
      isAvailable,
      faculty,
      sortBy = "rating.average",
      order = "desc",
    } = req.query;

    const query = { isApproved: true };
    if (subject)
      query["expertise.subject"] = { $regex: subject, $options: "i" };
    if (tutorType) query.tutorType = tutorType;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";

    // Bug #10 Fix: Use aggregation to properly filter by faculty and get accurate count
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
    const countResult = await TutorProfile.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add sorting and pagination
    pipeline.push(
      { $sort: { [sortBy]: order === "desc" ? -1 : 1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          tutorType: 1,
          expertise: 1,
          rating: 1,
          availability: 1,
          maxStudents: 1,
          currentStudentCount: 1,
          isAvailable: 1,
          isApproved: 1,
          bio: 1,
          introduction: 1,
          user: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            fullName: 1,
            email: 1,
            faculty: 1,
            department: 1,
            avatar: 1,
          },
        },
      }
    );

    const tutors = await TutorProfile.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        tutors,
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
      message: "Failed to get tutors",
      error: error.message,
    });
  }
});

// @desc    Get my tutor profile
// @route   GET /api/tutors/me/profile
// @access  Private
// NOTE: This route MUST be before /:id routes to avoid "me" being matched as an ID
router.get("/me/profile", authenticate, async (req, res) => {
  try {
    let tutor = await TutorProfile.findOne({ user: req.userId }).populate(
      "user",
      "firstName lastName fullName email faculty department avatar"
    );

    // If profile doesn't exist, create one
    if (!tutor) {
      const user = await User.findById(req.userId);
      if (!user || user.role !== "tutor") {
        return res.status(404).json({
          success: false,
          message: "Tutor profile not found. Please register as a tutor.",
        });
      }

      // Create default tutor profile
      tutor = await TutorProfile.create({
        user: req.userId,
        tutorType: "senior_student",
        expertise: [],
        rating: 0,
        totalReviews: 0,
        completedSessions: 0,
        bio: "",
        isAvailable: true,
      });

      // Populate user data
      tutor = await TutorProfile.findById(tutor._id).populate(
        "user",
        "firstName lastName fullName email faculty department avatar"
      );
    }

    res.json({
      success: true,
      data: { tutor },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get tutor profile",
      error: error.message,
    });
  }
});

// @desc    Get tutor by ID
// @route   GET /api/tutors/:id
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const tutor = await TutorProfile.findById(req.params.id).populate(
      "user",
      "firstName lastName fullName email faculty department avatar phone"
    );

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    res.json({
      success: true,
      data: { tutor },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get tutor",
      error: error.message,
    });
  }
});

// @desc    Create/Register as tutor
// @route   POST /api/tutors
// @access  Private
router.post("/", authenticate, async (req, res) => {
  try {
    // Check if already a tutor
    const existingProfile = await TutorProfile.findOne({ user: req.userId });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: "Tutor profile already exists",
      });
    }

    const {
      tutorType,
      expertise,
      availability,
      maxStudents,
      preferredSessionDuration,
      sessionTypes,
      preferredLocation,
      programTypes,
      bio,
      introduction,
      gpa,
      completedCredits,
    } = req.body;

    const tutorProfile = await TutorProfile.create({
      user: req.userId,
      tutorType,
      expertise,
      availability,
      maxStudents,
      preferredSessionDuration,
      sessionTypes,
      preferredLocation,
      programTypes,
      bio,
      introduction,
      gpa,
      completedCredits,
      isApproved: false, // Needs admin approval
    });

    // Bug #6 Fix: Don't set role to TUTOR until approved
    // The role change should happen in the approve tutor endpoint instead

    res.status(201).json({
      success: true,
      message: "Tutor profile created. Pending approval.",
      data: { tutor: tutorProfile },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create tutor profile",
      error: error.message,
    });
  }
});

// @desc    Update tutor profile
// @route   PUT /api/tutors/:id
// @access  Private
router.put("/:id", authenticate, async (req, res) => {
  try {
    const tutor = await TutorProfile.findById(req.params.id);

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: "Tutor not found",
      });
    }

    // Check ownership or admin
    if (
      tutor.user.toString() !== req.userId.toString() &&
      req.user.role !== roles.ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const allowedUpdates = [
      "expertise",
      "availability",
      "maxStudents",
      "preferredSessionDuration",
      "sessionTypes",
      "preferredLocation",
      "programTypes",
      "bio",
      "introduction",
      "isAvailable",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        tutor[field] = req.body[field];
      }
    });

    await tutor.save();

    res.json({
      success: true,
      message: "Tutor profile updated",
      data: { tutor },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update tutor profile",
      error: error.message,
    });
  }
});

// @desc    Approve tutor (admin/coordinator only)
// @route   PUT /api/tutors/:id/approve
// @access  Private/Admin
router.put(
  "/:id/approve",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const tutor = await TutorProfile.findByIdAndUpdate(
        req.params.id,
        {
          isApproved: true,
          approvedBy: req.userId,
          approvedAt: new Date(),
        },
        { new: true }
      );

      if (!tutor) {
        return res.status(404).json({
          success: false,
          message: "Tutor not found",
        });
      }

      // Bug #6 Fix: Set role to TUTOR only after approval
      await User.findByIdAndUpdate(tutor.user, { role: roles.TUTOR });

      res.json({
        success: true,
        message: "Tutor approved",
        data: { tutor },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to approve tutor",
        error: error.message,
      });
    }
  }
);

// @desc    Reject tutor application (admin/coordinator only)
// @route   DELETE /api/tutors/:id
// @access  Private/Admin
router.delete(
  "/:id",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const tutor = await TutorProfile.findById(req.params.id);

      if (!tutor) {
        return res.status(404).json({
          success: false,
          message: "Tutor not found",
        });
      }

      // Only allow deletion of unapproved tutors
      if (tutor.isApproved) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete an approved tutor. Deactivate instead.",
        });
      }

      await TutorProfile.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Tutor application rejected and deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to reject tutor",
        error: error.message,
      });
    }
  }
);

module.exports = router;
