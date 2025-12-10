const express = require("express");
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require("../middleware");
const { roles } = require("../config/config");
const { LibraryResource } = require("../model");

// @desc    Get all library resources
// @route   GET /api/library
// @access  Public (with optional auth for filtering)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      subject,
      courseCode,
      faculty,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = { isActive: true };

    // Filter by access level based on user role
    if (!req.user) {
      query.accessLevel = "public";
    } else if (req.user.role === roles.STUDENT) {
      query.accessLevel = { $in: ["public", "student"] };
    }
    // Staff and admin can access all

    if (type) query.type = type;
    if (subject) query.subjects = { $regex: subject, $options: "i" };
    if (courseCode) query.courseCode = courseCode;
    if (faculty) query.faculty = faculty;
    if (search) {
      query.$text = { $search: search };
    }

    const resources = await LibraryResource.find(query)
      .populate("uploadedBy", "firstName lastName fullName")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 });

    const total = await LibraryResource.countDocuments(query);

    res.json({
      success: true,
      data: {
        resources,
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
      message: "Failed to get resources",
      error: error.message,
    });
  }
});

// @desc    Get resources by course
// @route   GET /api/library/course/:courseCode
// @access  Private
// NOTE: This route MUST be before /:id routes to avoid "course" being matched as an ID
router.get("/course/:courseCode", authenticate, async (req, res) => {
  try {
    const resources = await LibraryResource.find({
      courseCode: req.params.courseCode,
      isActive: true,
    })
      .populate("uploadedBy", "firstName lastName fullName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { resources },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get resources",
      error: error.message,
    });
  }
});

// @desc    Get resource by ID
// @route   GET /api/library/:id
// @access  Public (with access control)
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const resource = await LibraryResource.findById(req.params.id).populate(
      "uploadedBy",
      "firstName lastName fullName"
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Check access
    if (resource.accessLevel !== "public" && !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access this resource",
      });
    }

    // Increment view count
    resource.viewCount += 1;
    await resource.save();

    res.json({
      success: true,
      data: { resource },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get resource",
      error: error.message,
    });
  }
});

// @desc    Create resource
// @route   POST /api/library
// @access  Private/Tutor/Admin
router.post(
  "/",
  authenticate,
  authorize(roles.TUTOR, roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const {
        title,
        description,
        type,
        subjects,
        faculty,
        department,
        course,
        courseCode,
        fileUrl,
        externalLink,
        fileSize,
        fileType,
        author,
        publisher,
        publishYear,
        accessLevel,
        tags,
      } = req.body;

      const resource = await LibraryResource.create({
        title,
        description,
        type,
        subjects,
        faculty,
        department,
        course,
        courseCode,
        fileUrl,
        externalLink,
        fileSize,
        fileType,
        author,
        publisher,
        publishYear,
        accessLevel: accessLevel || "student",
        tags,
        uploadedBy: req.userId,
      });

      res.status(201).json({
        success: true,
        message: "Resource created",
        data: { resource },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create resource",
        error: error.message,
      });
    }
  }
);

// @desc    Update resource
// @route   PUT /api/library/:id
// @access  Private
router.put("/:id", authenticate, async (req, res) => {
  try {
    const resource = await LibraryResource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Check ownership or admin
    if (
      !resource.uploadedBy.equals(req.userId) &&
      req.user.role !== roles.ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const allowedUpdates = [
      "title",
      "description",
      "type",
      "subjects",
      "faculty",
      "department",
      "course",
      "courseCode",
      "fileUrl",
      "externalLink",
      "author",
      "publisher",
      "publishYear",
      "accessLevel",
      "tags",
      "isActive",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        resource[field] = req.body[field];
      }
    });

    await resource.save();

    res.json({
      success: true,
      message: "Resource updated",
      data: { resource },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update resource",
      error: error.message,
    });
  }
});

// @desc    Delete resource
// @route   DELETE /api/library/:id
// @access  Private/Admin
router.delete(
  "/:id",
  authenticate,
  authorize(roles.ADMIN),
  async (req, res) => {
    try {
      const resource = await LibraryResource.findByIdAndDelete(req.params.id);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        });
      }

      res.json({
        success: true,
        message: "Resource deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete resource",
        error: error.message,
      });
    }
  }
);

// @desc    Record download
// @route   POST /api/library/:id/download
// @access  Private
router.post("/:id/download", authenticate, async (req, res) => {
  try {
    const resource = await LibraryResource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    res.json({
      success: true,
      data: {
        downloadUrl: resource.fileUrl || resource.externalLink,
        downloadCount: resource.downloadCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to record download",
      error: error.message,
    });
  }
});

module.exports = router;
