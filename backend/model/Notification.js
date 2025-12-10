const mongoose = require("mongoose");
const { notificationTypes } = require("../config/config");

const notificationSchema = new mongoose.Schema(
  {
    // Recipient
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Notification Content
    type: {
      type: String,
      enum: Object.values(notificationTypes),
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },

    // Related entities
    relatedSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    relatedMatching: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Matching",
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Action
    actionUrl: String,
    actionText: String,

    // Status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,

    // Delivery
    channels: [
      {
        type: String,
        enum: ["in_app", "email", "push"],
        default: "in_app",
      },
    ],
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: Date,
    pushSent: {
      type: Boolean,
      default: false,
    },
    pushSentAt: Date,

    // Priority
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // Expiry
    expiresAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
