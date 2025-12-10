const { User, TutorProfile, StudentProfile } = require("../model");

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const {
      role,
      isActive,
      isVerified,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (isVerified !== undefined) query.isVerified = isVerified === "true";
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { staffId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -refreshToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password -refreshToken");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get role-specific profile
    let profile = null;
    if (user.role === "tutor") {
      profile = await TutorProfile.findOne({ user: id });
    } else if (user.role === "student") {
      profile = await StudentProfile.findOne({ user: id });
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        profile,
      },
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -refreshToken"
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get role-specific profile
    let profile = null;
    if (user.role === "tutor") {
      profile = await TutorProfile.findOne({ user: req.user.id });
    } else if (user.role === "student") {
      profile = await StudentProfile.findOne({ user: req.user.id });
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        profile,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update current user profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      department,
      bio,
      avatarUrl,
      tutorProfile,
      studentProfile,
    } = req.body;

    // Update user basic info
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (bio) updateData.bio = bio;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select("-password -refreshToken");

    // Update role-specific profile
    if (user.role === "tutor" && tutorProfile) {
      await TutorProfile.findOneAndUpdate(
        { user: req.user.id },
        { $set: tutorProfile },
        { upsert: true, new: true }
      );
    } else if (user.role === "student" && studentProfile) {
      await StudentProfile.findOneAndUpdate(
        { user: req.user.id },
        { $set: studentProfile },
        { upsert: true, new: true }
      );
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update user by ID (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, department, role, isActive, isVerified } =
      req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete user (admin only) - soft delete
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get user stats (for dashboard)
exports.getUserStats = async (req, res) => {
  try {
    const [
      totalUsers,
      students,
      tutors,
      coordinators,
      departmentHeads,
      admins,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: "student", isActive: true }),
      User.countDocuments({ role: "tutor", isActive: true }),
      User.countDocuments({ role: "coordinator", isActive: true }),
      User.countDocuments({ role: "department_head", isActive: true }),
      User.countDocuments({ role: "admin", isActive: true }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        students,
        tutors,
        coordinators,
        departmentHeads,
        admins,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
