const mongoose = require("mongoose");
const { matchingStatus } = require("../config/config");

const matchingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TutorProfile",
      required: true,
    },

    // Matching Details
    subject: {
      type: String,
      required: true,
    },
    programType: {
      type: String,
      enum: ["academic", "non_academic"],
      required: true,
    },

    // How matched
    matchType: {
      type: String,
      enum: [
        "student_choice",
        "tutor_choice",
        "ai_recommended",
        "admin_assigned",
      ],
      required: true,
    },

    // AI Matching Score (if AI recommended)
    aiMatchScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    aiMatchReasons: [
      {
        type: String,
      },
    ],

    // Request message
    requestMessage: {
      type: String,
      maxlength: 500,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(matchingStatus),
      default: matchingStatus.PENDING,
    },

    // Approval
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: Date,
    rejectionReason: String,

    // Period
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: false,
    },

    // Statistics
    totalSessions: {
      type: Number,
      default: 0,
    },
    completedSessions: {
      type: Number,
      default: 0,
    },

    // Completion
    completedAt: Date,
    completionReason: {
      type: String,
      enum: [
        "goal_achieved",
        "semester_end",
        "student_request",
        "tutor_request",
        "admin_decision",
        "other",
      ],
    },
    completionNotes: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for unique active matching
matchingSchema.index({ student: 1, tutor: 1, subject: 1 });
matchingSchema.index({ status: 1 });
matchingSchema.index({ student: 1, isActive: 1 });
matchingSchema.index({ tutor: 1, isActive: 1 });

const Matching = mongoose.model("Matching", matchingSchema);

module.exports = Matching;
