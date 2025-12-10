const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Learning Needs
    learningNeeds: [
      {
        subject: {
          type: String,
          required: true,
        },
        currentLevel: {
          type: String,
          enum: ["beginner", "intermediate", "advanced"],
          default: "beginner",
        },
        targetLevel: {
          type: String,
          enum: ["intermediate", "advanced", "expert"],
        },
        description: String,
        priority: {
          type: String,
          enum: ["low", "medium", "high"],
          default: "medium",
        },
      },
    ],

    // Learning Preferences
    preferredSessionDuration: {
      type: Number, // in minutes
      default: 60,
    },
    preferredSessionTypes: [
      {
        type: String,
        enum: ["online", "offline", "hybrid"],
      },
    ],
    preferredSchedule: [
      {
        dayOfWeek: {
          type: Number,
          required: true,
        },
        startTime: String,
        endTime: String,
      },
    ],

    // Academic Performance
    currentGpa: {
      type: Number,
      min: 0,
      max: 4,
    },
    weakSubjects: [
      {
        type: String,
      },
    ],
    strongSubjects: [
      {
        type: String,
      },
    ],

    // Program Enrollment
    enrolledPrograms: [
      {
        type: String,
        enum: ["academic", "non_academic"],
      },
    ],
    enrolledAt: {
      type: Date,
      default: Date.now,
    },

    // Current Tutors
    currentTutors: [
      {
        tutor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TutorProfile",
        },
        matchedAt: Date,
        status: {
          type: String,
          enum: ["active", "completed", "cancelled"],
          default: "active",
        },
      },
    ],

    // Statistics
    totalSessions: {
      type: Number,
      default: 0,
    },
    completedSessions: {
      type: Number,
      default: 0,
    },

    // Training Points (Điểm rèn luyện)
    trainingPoints: {
      type: Number,
      default: 0,
    },
    trainingPointsHistory: [
      {
        points: Number,
        reason: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // Goals
    learningGoals: [
      {
        title: String,
        description: String,
        targetDate: Date,
        status: {
          type: String,
          enum: ["pending", "in_progress", "achieved"],
          default: "pending",
        },
      },
    ],

    // Notes from tutors
    tutorNotes: [
      {
        tutor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TutorProfile",
        },
        note: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index (user already indexed via unique: true)
studentProfileSchema.index({ "learningNeeds.subject": 1 });

const StudentProfile = mongoose.model("StudentProfile", studentProfileSchema);

module.exports = StudentProfile;
