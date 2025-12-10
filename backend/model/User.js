const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { roles } = require("../config/config");

const userSchema = new mongoose.Schema(
  {
    // Basic Info (synced from HCMUT_DATACORE)
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // MSSV for students, Mã cán bộ for staff
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Don't return password by default
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    // Academic Info (synced from HCMUT_DATACORE)
    faculty: {
      type: String,
      trim: true,
      // Khoa
    },
    department: {
      type: String,
      trim: true,
      // Bộ môn
    },
    major: {
      type: String,
      trim: true,
      // Chuyên ngành
    },
    academicYear: {
      type: Number,
      // Năm học (K2020, K2021,...)
    },
    studentClass: {
      type: String,
      trim: true,
      // Lớp
    },

    // Role & Permissions
    role: {
      type: String,
      enum: Object.values(roles),
      default: roles.STUDENT,
    },
    permissions: [
      {
        type: String,
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    academicStatus: {
      type: String,
      enum: ["active", "inactive", "graduated", "suspended"],
      default: "active",
    },

    // SSO Related
    ssoToken: {
      type: String,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
    refreshTokens: [
      {
        token: String,
        expiresAt: Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Password Reset
    passwordResetToken: String,
    passwordResetExpires: Date,

    // DataCore sync info
    dataCoreId: {
      type: String,
      // ID from HCMUT_DATACORE for sync
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
userSchema.virtual("displayName").get(function () {
  return `${this.lastName} ${this.firstName}`;
});

// Pre-save middleware to hash password
userSchema.pre("save", async function () {
  // Update fullName
  this.fullName = `${this.lastName} ${this.firstName}`;

  // Only hash password if modified
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user has specific role
userSchema.methods.hasRole = function (role) {
  return this.role === role;
};

// Method to check if user has specific permission
userSchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission);
};

// Static method to find by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by userId (MSSV/Mã cán bộ)
userSchema.statics.findByUserId = function (userId) {
  return this.findOne({ userId });
};

// Index for better query performance (email and userId already indexed via unique: true)
userSchema.index({ role: 1 });
userSchema.index({ faculty: 1, department: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
