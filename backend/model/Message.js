const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Conversation (between 2 users)
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    // Sender
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Message content
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    // Message type
    type: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },

    // File attachment (optional)
    attachment: {
      url: String,
      name: String,
      type: String,
      size: Number,
    },

    // Read status
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Soft delete
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model("Message", messageSchema);
