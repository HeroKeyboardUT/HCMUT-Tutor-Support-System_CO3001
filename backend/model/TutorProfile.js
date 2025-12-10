const mongoose = require("mongoose");

const tutorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Tutor Type
    tutorType: {
      type: String,
      enum: ["lecturer", "researcher", "senior_student"],
      // giảng viên, nghiên cứu sinh, sinh viên năm trên
      required: true,
    },

    // Academic Expertise
    expertise: [
      {
        subject: {
          type: String,
          required: true,
        },
        level: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "expert"],
          default: "intermediate",
        },
        description: String,
      },
    ],

    // For senior students
    gpa: {
      type: Number,
      min: 0,
      max: 4,
    },
    completedCredits: {
      type: Number,
      min: 0,
    },

    // Availability Schedule
    availability: [
      {
        dayOfWeek: {
          type: Number, // 0 = Sunday, 1 = Monday, ...
          required: true,
        },
        startTime: {
          type: String, // "08:00"
          required: true,
        },
        endTime: {
          type: String, // "12:00"
          required: true,
        },
        isRecurring: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Tutoring Preferences
    maxStudents: {
      type: Number,
      default: 5,
      min: 1,
      max: 20,
    },
    currentStudentCount: {
      type: Number,
      default: 0,
    },
    preferredSessionDuration: {
      type: Number, // in minutes
      default: 60,
    },
    sessionTypes: [
      {
        type: String,
        enum: ["online", "offline", "hybrid"],
      },
    ],
    preferredLocation: {
      type: String,
      // e.g., "Thư viện", "Phòng học A1", etc.
    },

    // Program Types
    programTypes: [
      {
        type: String,
        enum: ["academic", "non_academic"],
        // học thuật và phi học thuật
      },
    ],

    // Bio & Introduction
    bio: {
      type: String,
      maxlength: 1000,
    },
    introduction: {
      type: String,
      maxlength: 500,
    },

    // Rating & Statistics
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    completedSessions: {
      type: Number,
      default: 0,
    },

    // Status
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },

    // Verification documents (for senior students)
    verificationDocuments: [
      {
        type: { type: String }, // transcript, certificate, etc.
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for search
tutorProfileSchema.index({ "expertise.subject": 1 });
tutorProfileSchema.index({ tutorType: 1 });
tutorProfileSchema.index({ isAvailable: 1, isApproved: 1 });
tutorProfileSchema.index({ "rating.average": -1 });

const TutorProfile = mongoose.model("TutorProfile", tutorProfileSchema);

module.exports = TutorProfile;
