const mongoose = require("mongoose");

// Program Schema - Academic and Non-academic Programs
const programSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    shortDescription: {
      type: String,
      maxlength: 500,
    },

    // Program Type
    type: {
      type: String,
      enum: ["academic", "non_academic"],
      required: true,
    },

    // Category (based on type)
    category: {
      type: String,
      required: true,
    },
    // Academic categories: "course_support", "exam_prep", "thesis_guidance", "research", "lab_practice"
    // Non-academic categories: "soft_skills", "career", "leadership", "communication", "time_management", "mental_health"

    // Target Audience
    targetAudience: {
      faculties: [String], // Empty means all faculties
      departments: [String],
      academicYears: [Number], // 1, 2, 3, 4, 5
      minGpa: Number,
      maxGpa: Number,
    },

    // Program Structure
    duration: {
      value: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        enum: ["days", "weeks", "months"],
        default: "weeks",
      },
    },
    totalSessions: {
      type: Number,
      required: true,
    },
    sessionDuration: {
      type: Number, // minutes
      default: 90,
    },

    // Schedule
    schedule: {
      type: {
        type: String,
        enum: ["fixed", "flexible"],
        default: "flexible",
      },
      sessionsPerWeek: Number,
      preferredDays: [Number], // 0-6 for Sunday-Saturday
      preferredTimeSlots: [
        {
          start: String, // "09:00"
          end: String, // "11:00"
        },
      ],
    },

    // Content/Curriculum
    modules: [
      {
        order: Number,
        title: {
          type: String,
          required: true,
        },
        description: String,
        objectives: [String],
        duration: Number, // minutes
        resources: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LibraryResource",
          },
        ],
      },
    ],

    // Learning Objectives
    learningObjectives: [
      {
        type: String,
      },
    ],

    // Prerequisites
    prerequisites: [
      {
        type: String,
      },
    ],

    // Outcomes
    outcomes: [
      {
        type: String,
      },
    ],

    // Training Points
    trainingPoints: {
      type: Number,
      default: 0,
    },

    // Certificate
    hasCertificate: {
      type: Boolean,
      default: false,
    },
    certificateTemplate: String,

    // Capacity
    minParticipants: {
      type: Number,
      default: 1,
    },
    maxParticipants: {
      type: Number,
      default: 20,
    },

    // Tutors
    assignedTutors: [
      {
        tutor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TutorProfile",
        },
        role: {
          type: String,
          enum: ["lead", "assistant"],
          default: "lead",
        },
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["draft", "active", "paused", "completed", "archived"],
      default: "draft",
    },

    // Visibility
    isPublic: {
      type: Boolean,
      default: true,
    },

    // Featured
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // Registration
    registrationOpen: {
      type: Boolean,
      default: true,
    },
    registrationDeadline: Date,
    startDate: Date,
    endDate: Date,

    // Statistics
    enrolledCount: {
      type: Number,
      default: 0,
    },
    completedCount: {
      type: Number,
      default: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },

    // Created By
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Tags
    tags: [String],

    // Thumbnail
    thumbnailUrl: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
programSchema.index({ type: 1, status: 1 });
programSchema.index({ category: 1 });
programSchema.index({ status: 1, isFeatured: -1 });
programSchema.index({ "targetAudience.faculties": 1 });
programSchema.index({ name: "text", description: "text", tags: "text" });

const Program = mongoose.model("Program", programSchema);

// Program Enrollment Schema
const enrollmentSchema = new mongoose.Schema(
  {
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: ["enrolled", "in_progress", "completed", "dropped", "failed"],
      default: "enrolled",
    },

    // Progress
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedModules: [
      {
        moduleIndex: Number,
        completedAt: Date,
        score: Number,
      },
    ],
    currentModule: {
      type: Number,
      default: 0,
    },

    // Sessions
    attendedSessions: {
      type: Number,
      default: 0,
    },
    missedSessions: {
      type: Number,
      default: 0,
    },

    // Dates
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: Date,
    completedAt: Date,
    droppedAt: Date,

    // Assessment
    finalScore: Number,
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      submittedAt: Date,
    },

    // Certificate
    certificateIssued: {
      type: Boolean,
      default: false,
    },
    certificateUrl: String,
    certificateIssuedAt: Date,

    // Training Points
    pointsAwarded: {
      type: Number,
      default: 0,
    },

    // Notes
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate enrollment
enrollmentSchema.index({ program: 1, student: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, status: 1 });
enrollmentSchema.index({ program: 1, status: 1 });

const ProgramEnrollment = mongoose.model("ProgramEnrollment", enrollmentSchema);

module.exports = { Program, ProgramEnrollment };
