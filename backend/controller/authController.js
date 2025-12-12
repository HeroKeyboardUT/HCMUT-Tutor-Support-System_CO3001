const {
  User,
  DataCoreRecord,
  TutorProfile,
  StudentProfile,
} = require("../model");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const config = require("../config/config");

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const {
      email,
      password,
      userId,
      firstName,
      lastName,
      role,
      faculty,
      department,
      major,
      academicYear,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { userId }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email.toLowerCase()
            ? "Email already registered"
            : "User ID already registered",
      });
    }

    // Validate role
    const allowedRoles = [config.roles.STUDENT, config.roles.TUTOR];
    const userRole = allowedRoles.includes(role) ? role : config.roles.STUDENT;

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      userId,
      firstName,
      lastName,
      role: userRole,
      faculty,
      department,
      major,
      academicYear,
    });

    // Create profile based on role
    try {
      if (userRole === config.roles.TUTOR) {
        await TutorProfile.create({
          user: user._id,
          tutorType: "senior_student", // Default type, can be updated later
          expertise: [],
          subjects: [],
          education: [],
          availableSlots: [],
          rating: 0,
          totalReviews: 0,
          completedSessions: 0,
          bio: "",
          isAvailable: true,
        });
      } else if (userRole === config.roles.STUDENT) {
        await StudentProfile.create({
          user: user._id,
          learningGoals: [],
          preferredSubjects: [],
          completedSessions: 0,
          trainingPoints: 0,
          trainingPointsHistory: [],
        });
      }
    } catch (profileError) {
      console.error("Error creating profile:", profileError);
      // Profile creation failed, but user was created - continue anyway
      // User can update profile later
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          faculty: user.faculty,
          department: user.department,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// @desc    Login user (SSO simulation)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, userId, password } = req.body;

    // Find user by email or userId
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() }).select(
        "+password"
      );
    } else if (userId) {
      user = await User.findOne({ userId }).select("+password");
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide email or user ID",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token and update last login
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    user.lastLogin = new Date();

    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          faculty: user.faculty,
          department: user.department,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const tokenExists = user.refreshTokens.find((rt) => rt.token === token);
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Check if token is expired
    if (new Date(tokenExists.expiresAt) < new Date()) {
      // Remove expired token
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== token
      );
      await user.save();

      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    const user = req.user;

    if (token) {
      // Remove specific refresh token
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== token
      );
    } else {
      // Remove all refresh tokens (logout from all devices)
      user.refreshTokens = [];
    }

    await user.save();

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          faculty: user.faculty,
          department: user.department,
          major: user.major,
          avatar: user.avatar,
          phone: user.phone,
          academicYear: user.academicYear,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Bug #17 Fix: Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(req.userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    // Invalidate all refresh tokens
    user.refreshTokens = [];
    await user.save();

    // Generate new tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
      data: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update password",
    });
  }
};

// @desc    SSO Login simulation (verify from DataCore)
// @route   POST /api/auth/sso
// @access  Public
const ssoLogin = async (req, res) => {
  try {
    const { userId, password } = req.body;

    // First check DataCore for user info
    const dataCoreRecord = await DataCoreRecord.findOne({ userId });

    if (!dataCoreRecord) {
      return res.status(401).json({
        success: false,
        message: "User not found in university system",
      });
    }

    // Check if user exists in our system
    let user = await User.findOne({ userId }).select("+password");

    if (user) {
      // Bug #18 Fix: Check if user is active before login
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated. Please contact support.",
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }
    } else {
      // Auto-create user from DataCore data (first time SSO login)
      user = await User.create({
        userId: dataCoreRecord.userId,
        email: dataCoreRecord.email,
        password, // Will be hashed by pre-save hook
        firstName: dataCoreRecord.firstName,
        lastName: dataCoreRecord.lastName,
        faculty: dataCoreRecord.faculty,
        department: dataCoreRecord.department,
        major: dataCoreRecord.major,
        academicYear: dataCoreRecord.academicYear,
        gender: dataCoreRecord.gender,
        phone: dataCoreRecord.phone,
        dateOfBirth: dataCoreRecord.dateOfBirth,
        role:
          dataCoreRecord.personType === "student"
            ? config.roles.STUDENT
            : config.roles.TUTOR,
        dataCoreId: dataCoreRecord.dataCoreId,
        lastSyncedAt: new Date(),
      });
    }

    // Sync data from DataCore
    user.faculty = dataCoreRecord.faculty;
    user.department = dataCoreRecord.department;
    user.academicStatus = dataCoreRecord.academicStatus;
    user.lastSyncedAt = new Date();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: "SSO Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          faculty: user.faculty,
          department: user.department,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("SSO Login error:", error);
    res.status(500).json({
      success: false,
      message: "SSO Login failed",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updatePassword,
  ssoLogin,
};
