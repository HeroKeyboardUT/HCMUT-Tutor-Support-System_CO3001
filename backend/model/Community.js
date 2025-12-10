const mongoose = require("mongoose");

// Discussion/Forum Post Schema
const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Post Content
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },

    // Category
    category: {
      type: String,
      enum: [
        "general", // Thảo luận chung
        "academic", // Học thuật
        "career", // Hướng nghiệp
        "tips", // Mẹo học tập
        "question", // Q&A
        "resource", // Chia sẻ tài liệu
        "announcement", // Thông báo
        "experience", // Chia sẻ kinh nghiệm
      ],
      default: "general",
    },

    // Tags
    tags: [
      {
        type: String,
        maxlength: 30,
      },
    ],

    // Related Subject
    subject: {
      type: String,
    },

    // Attachments
    attachments: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: ["image", "document", "link"],
        },
      },
    ],

    // Engagement
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },

    // Comments
    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: 2000,
        },
        likes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        likesCount: {
          type: Number,
          default: 0,
        },
        replies: [
          {
            author: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            content: {
              type: String,
              required: true,
              maxlength: 1000,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        isAcceptedAnswer: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: Date,
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
    },

    // Q&A specific
    isQuestion: {
      type: Boolean,
      default: false,
    },
    isAnswered: {
      type: Boolean,
      default: false,
    },
    acceptedAnswer: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "hidden", "deleted", "pinned"],
      default: "active",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },

    // Moderation
    reports: [
      {
        reporter: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reportsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ subject: 1 });
postSchema.index({ status: 1, isPinned: -1, createdAt: -1 });
postSchema.index({ title: "text", content: "text", tags: "text" });

// Virtual for comments count
postSchema.virtual("commentCount").get(function () {
  return this.comments?.length || 0;
});

const CommunityPost = mongoose.model("CommunityPost", postSchema);

module.exports = CommunityPost;
