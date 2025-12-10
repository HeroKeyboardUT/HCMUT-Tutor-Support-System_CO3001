const mongoose = require("mongoose");

// Library Resource Schema (HCMUT_LIBRARY integration)
const libraryResourceSchema = new mongoose.Schema(
  {
    // Resource Info
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: [
        "book",
        "document",
        "video",
        "article",
        "link",
        "slide",
        "exercise",
        "exam",
        "other",
      ],
      required: true,
    },

    // Categorization
    subjects: [
      {
        type: String,
      },
    ],
    faculty: String,
    department: String,
    course: String,
    courseCode: String,

    // File/Link
    fileUrl: String,
    externalLink: String,
    fileSize: Number, // in bytes
    fileType: String, // pdf, docx, mp4, etc.

    // Thumbnail
    thumbnail: String,

    // Author/Source
    author: String,
    publisher: String,
    publishYear: Number,
    isbn: String,

    // Library specific
    libraryCode: {
      type: String,
      // Original code from HCMUT_LIBRARY
    },
    location: {
      type: String,
      // Physical location in library
    },
    availableCopies: Number,
    totalCopies: Number,

    // Access
    accessLevel: {
      type: String,
      enum: ["public", "student", "staff", "restricted"],
      default: "student",
    },
    allowedRoles: [
      {
        type: String,
      },
    ],

    // Statistics
    viewCount: {
      type: Number,
      default: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    bookmarkCount: {
      type: Number,
      default: 0,
    },

    // Ratings
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },

    // Tags
    tags: [
      {
        type: String,
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Uploaded by
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Sync with external library
    externalLibraryId: String,
    lastSyncedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for search
libraryResourceSchema.index({
  title: "text",
  description: "text",
  tags: "text",
});
libraryResourceSchema.index({ subjects: 1 });
libraryResourceSchema.index({ type: 1 });
libraryResourceSchema.index({ courseCode: 1 });
libraryResourceSchema.index({ faculty: 1, department: 1 });

const LibraryResource = mongoose.model(
  "LibraryResource",
  libraryResourceSchema
);

module.exports = LibraryResource;
