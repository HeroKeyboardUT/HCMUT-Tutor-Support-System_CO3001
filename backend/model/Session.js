const mongoose = require("mongoose");
const { sessionStatus } = require("../config/config");

const sessionSchema = new mongoose.Schema(
  {
    // Participants
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TutorProfile",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      // Not required - allows tutor to create open sessions
    },

    // Open Session Settings (tutor creates, students register)
    isOpen: {
      type: Boolean,
      default: false,
    },
    maxParticipants: {
      type: Number,
      default: 1,
    },
    registeredStudents: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "StudentProfile",
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Session Details
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    subject: {
      type: String,
      required: true,
    },

    // Schedule
    scheduledDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String, // "14:00"
      required: true,
    },
    endTime: {
      type: String, // "15:00"
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },

    // Session Type
    sessionType: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    location: {
      type: String,
      // Physical location for offline, or video link for online
    },
    meetingLink: {
      type: String,
      // For online sessions
    },

    // Status
    status: {
      type: String,
      enum: Object.values(sessionStatus),
      default: sessionStatus.PENDING,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: String,
    cancelledAt: Date,
    completedAt: Date,
    autoCompleted: {
      type: Boolean,
      default: false,
    },

    // Rescheduling
    isRescheduled: {
      type: Boolean,
      default: false,
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    rescheduledTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    rescheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Session Notes & Minutes
    agenda: [
      {
        type: String,
      },
    ],
    notes: {
      type: String,
      // Notes during session
    },
    minutes: {
      summary: String,
      keyPoints: [String],
      actionItems: [
        {
          task: String,
          assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          dueDate: Date,
          completed: { type: Boolean, default: false },
        },
      ],
      createdAt: Date,
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Materials
    materials: [
      {
        title: String,
        type: { type: String }, // document, link, library_resource
        url: String,
        libraryResourceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "LibraryResource",
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // Attendance
    tutorAttendance: {
      attended: { type: Boolean, default: false },
      checkedInAt: Date,
      checkedOutAt: Date,
    },
    studentAttendance: {
      attended: { type: Boolean, default: false },
      checkedInAt: Date,
      checkedOutAt: Date,
    },

    // Feedback
    hasTutorFeedback: {
      type: Boolean,
      default: false,
    },
    hasStudentFeedback: {
      type: Boolean,
      default: false,
    },

    // Reminders sent
    remindersSent: [
      {
        type: { type: String }, // '24h', '1h', '15min'
        sentAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index
sessionSchema.index({ tutor: 1, scheduledDate: 1 });
sessionSchema.index({ student: 1, scheduledDate: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ scheduledDate: 1 });

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
