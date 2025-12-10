const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles } = require("../config/config");
const { User } = require("../model");

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get(
  "/",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, role, faculty, search } = req.query;

      const query = {};
      if (role) query.role = role;
      if (faculty) query.faculty = faculty;
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { userId: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query)
        .select("-refreshTokens -ssoToken")
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        data: {
          users,
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
        message: "Failed to get users",
        error: error.message,
      });
    }
  }
);

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get("/:id", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-refreshTokens -ssoToken -password"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get user",
      error: error.message,
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
router.put("/:id", authenticate, async (req, res) => {
  try {
    // Users can only update their own profile unless admin
    if (
      req.params.id !== req.userId.toString() &&
      req.user.role !== roles.ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this profile",
      });
    }

    const allowedUpdates = [
      "firstName",
      "lastName",
      "phone",
      "avatar",
      "dateOfBirth",
      "gender",
    ];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-refreshTokens -ssoToken -password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
});

// @desc    Update user role (admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
router.put(
  "/:id/role",
  authenticate,
  authorize(roles.ADMIN),
  async (req, res) => {
    try {
      const { role } = req.body;

      if (!Object.values(roles).includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
      ).select("-refreshTokens -ssoToken -password");

      res.json({
        success: true,
        message: "User role updated",
        data: { user },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update role",
        error: error.message,
      });
    }
  }
);

// @desc    Deactivate user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete(
  "/:id",
  authenticate,
  authorize(roles.ADMIN),
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "User deactivated",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to deactivate user",
        error: error.message,
      });
    }
  }
);

module.exports = router;
