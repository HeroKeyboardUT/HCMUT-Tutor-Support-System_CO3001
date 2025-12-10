const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    // Participants (2 users)
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Last message (for preview)
    lastMessage: {
      content: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: Date,
    },

    // Unread counts per participant
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    // Conversation status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Related session (optional - for session-related conversations)
    relatedSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },

    // Type of conversation
    type: {
      type: String,
      enum: ["direct", "session", "support"],
      default: "direct",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// Static method to find or create conversation between 2 users
conversationSchema.statics.findOrCreate = async function (
  user1Id,
  user2Id,
  type = "direct"
) {
  // Find existing conversation
  let conversation = await this.findOne({
    participants: { $all: [user1Id, user2Id] },
    type: type,
  });

  // If not found, create new
  if (!conversation) {
    conversation = await this.create({
      participants: [user1Id, user2Id],
      type: type,
      unreadCounts: new Map([
        [user1Id.toString(), 0],
        [user2Id.toString(), 0],
      ]),
    });
  }

  return conversation;
};

// Method to mark messages as read
conversationSchema.methods.markAsRead = async function (userId) {
  this.unreadCounts.set(userId.toString(), 0);
  await this.save();
};

// Method to increment unread count
conversationSchema.methods.incrementUnread = async function (userId) {
  const currentCount = this.unreadCounts.get(userId.toString()) || 0;
  this.unreadCounts.set(userId.toString(), currentCount + 1);
  await this.save();
};

module.exports = mongoose.model("Conversation", conversationSchema);
