const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    // Who gave feedback
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromRole: {
      type: String,
      enum: ["student", "tutor"],
      required: true,
    },

    // Who received feedback
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Ratings (1-5)
    ratings: {
      overall: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      // For student giving feedback to tutor
      knowledge: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      punctuality: {
        type: Number,
        min: 1,
        max: 5,
      },
      helpfulness: {
        type: Number,
        min: 1,
        max: 5,
      },
      // For tutor giving feedback to student
      engagement: {
        type: Number,
        min: 1,
        max: 5,
      },
      preparation: {
        type: Number,
        min: 1,
        max: 5,
      },
      progress: {
        type: Number,
        min: 1,
        max: 5,
      },
    },

    // Written Feedback
    comment: {
      type: String,
      maxlength: 2000,
    },

    // Progress Tracking (for tutor to student)
    progressReport: {
      currentLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
      },
      improvements: [String],
      areasToImprove: [String],
      recommendations: [String],
    },

    // Visibility
    isPublic: {
      type: Boolean,
      default: false,
      // Public feedback can be seen by others
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "submitted", "reviewed"],
      default: "submitted",
    },

    // Admin review (for inappropriate content)
    isReviewed: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index
feedbackSchema.index({ session: 1 });
feedbackSchema.index({ fromUser: 1 });
feedbackSchema.index({ toUser: 1 });
feedbackSchema.index({ "ratings.overall": -1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
