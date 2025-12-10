const mongoose = require("mongoose");

// AI-Personalized Learning Path Schema
const learningPathSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
      unique: true,
    },

    // AI Analysis Results
    learningProfile: {
      // Learning Style (based on VARK or similar)
      learningStyle: {
        primary: {
          type: String,
          enum: ["visual", "auditory", "reading", "kinesthetic"],
        },
        secondary: {
          type: String,
          enum: ["visual", "auditory", "reading", "kinesthetic"],
        },
        scores: {
          visual: { type: Number, default: 0 },
          auditory: { type: Number, default: 0 },
          reading: { type: Number, default: 0 },
          kinesthetic: { type: Number, default: 0 },
        },
      },

      // Strengths & Weaknesses
      strengths: [
        {
          area: String,
          score: Number,
          description: String,
        },
      ],
      weaknesses: [
        {
          area: String,
          score: Number,
          suggestedImprovement: String,
        },
      ],

      // Preferred Study Time
      preferredStudyTime: {
        type: String,
        enum: ["morning", "afternoon", "evening", "night"],
      },
      optimalSessionDuration: {
        type: Number, // minutes
        default: 45,
      },

      // Pace
      learningPace: {
        type: String,
        enum: ["slow", "moderate", "fast"],
        default: "moderate",
      },

      // Analyzed At
      analyzedAt: Date,
    },

    // Current Goals
    goals: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        type: {
          type: String,
          enum: ["academic", "skill", "career", "personal"],
          default: "academic",
        },
        subject: String,
        targetScore: Number,
        currentScore: Number,
        deadline: Date,
        priority: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
          default: "medium",
        },
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed", "abandoned"],
          default: "not_started",
        },
        progress: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        milestones: [
          {
            title: String,
            targetDate: Date,
            completed: { type: Boolean, default: false },
            completedAt: Date,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
        completedAt: Date,
      },
    ],

    // AI Recommendations
    recommendations: {
      // Recommended Tutors
      tutors: [
        {
          tutor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TutorProfile",
          },
          matchScore: Number,
          reasons: [String],
          recommendedAt: {
            type: Date,
            default: Date.now,
          },
          status: {
            type: String,
            enum: ["pending", "viewed", "contacted", "matched", "dismissed"],
            default: "pending",
          },
        },
      ],

      // Recommended Resources
      resources: [
        {
          resource: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LibraryResource",
          },
          relevanceScore: Number,
          reason: String,
          forGoal: String,
          recommendedAt: {
            type: Date,
            default: Date.now,
          },
          status: {
            type: String,
            enum: ["pending", "viewed", "started", "completed", "dismissed"],
            default: "pending",
          },
        },
      ],

      // Recommended Programs
      programs: [
        {
          program: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Program",
          },
          matchScore: Number,
          reasons: [String],
          recommendedAt: {
            type: Date,
            default: Date.now,
          },
          status: {
            type: String,
            enum: ["pending", "viewed", "enrolled", "dismissed"],
            default: "pending",
          },
        },
      ],

      // Recommended Sessions
      sessions: [
        {
          session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Session",
          },
          relevanceScore: Number,
          reason: String,
          recommendedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

      // Study Tips
      studyTips: [
        {
          tip: String,
          category: {
            type: String,
            enum: [
              "time_management",
              "study_technique",
              "motivation",
              "exam_prep",
              "note_taking",
              "focus",
            ],
          },
          forSubject: String,
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

      // Last Updated
      lastUpdated: Date,
    },

    // Weekly Study Plan
    weeklyPlan: {
      generatedAt: Date,
      validUntil: Date,
      schedule: [
        {
          dayOfWeek: {
            type: Number,
            required: true,
            min: 0,
            max: 6,
          },
          sessions: [
            {
              startTime: String,
              endTime: String,
              type: {
                type: String,
                enum: ["self_study", "tutoring", "practice", "review", "break"],
              },
              subject: String,
              activity: String,
              resource: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "LibraryResource",
              },
              duration: Number, // minutes
              completed: { type: Boolean, default: false },
            },
          ],
        },
      ],
      completionRate: {
        type: Number,
        default: 0,
      },
    },

    // Progress Tracking
    progressHistory: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        metrics: {
          sessionsCompleted: Number,
          studyHours: Number,
          goalsProgress: Number, // Average progress across all goals
          resourcesCompleted: Number,
          quizScores: Number, // Average quiz score
        },
        notes: String,
      },
    ],

    // Achievements
    achievements: [
      {
        type: {
          type: String,
          enum: [
            "first_session",
            "week_streak",
            "month_streak",
            "goal_completed",
            "perfect_attendance",
            "high_score",
            "fast_learner",
            "consistent_learner",
          ],
        },
        title: String,
        description: String,
        earnedAt: {
          type: Date,
          default: Date.now,
        },
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    // Study Streaks
    streaks: {
      current: {
        type: Number,
        default: 0,
      },
      longest: {
        type: Number,
        default: 0,
      },
      lastStudyDate: Date,
    },

    // AI Insights
    insights: [
      {
        type: {
          type: String,
          enum: ["progress", "pattern", "suggestion", "warning", "achievement"],
        },
        title: String,
        message: String,
        data: mongoose.Schema.Types.Mixed,
        isRead: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Settings
    settings: {
      notifyRecommendations: {
        type: Boolean,
        default: true,
      },
      notifyReminders: {
        type: Boolean,
        default: true,
      },
      notifyInsights: {
        type: Boolean,
        default: true,
      },
      weeklyReportEmail: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
learningPathSchema.index({ student: 1 });
learningPathSchema.index({ "goals.status": 1 });
learningPathSchema.index({ "recommendations.lastUpdated": 1 });

const LearningPath = mongoose.model("LearningPath", learningPathSchema);

module.exports = LearningPath;
