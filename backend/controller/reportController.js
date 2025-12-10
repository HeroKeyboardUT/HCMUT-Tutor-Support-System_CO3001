const {
  User,
  Session,
  Matching,
  Feedback,
  TutorProfile,
  LibraryResource,
} = require("../model");

/**
 * Report Controller
 * Generates various reports for administrators and coordinators
 */

// Get system overview report
exports.getSystemOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const createdAtFilter =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [
      totalUsers,
      activeUsers,
      students,
      tutors,
      totalSessions,
      completedSessions,
      totalMatches,
      acceptedMatches,
      avgRating,
      totalResources,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: "student", isActive: true }),
      User.countDocuments({ role: "tutor", isActive: true }),
      Session.countDocuments(createdAtFilter),
      Session.countDocuments({ ...createdAtFilter, status: "completed" }),
      Matching.countDocuments(createdAtFilter),
      Matching.countDocuments({ ...createdAtFilter, status: "accepted" }),
      Feedback.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]),
      LibraryResource.countDocuments({ isPublic: true }),
    ]);

    const sessionCompletionRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    const matchAcceptanceRate =
      totalMatches > 0 ? Math.round((acceptedMatches / totalMatches) * 100) : 0;

    res.json({
      success: true,
      report: {
        users: {
          total: totalUsers,
          active: activeUsers,
          students,
          tutors,
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          completionRate: sessionCompletionRate,
        },
        matching: {
          total: totalMatches,
          accepted: acceptedMatches,
          acceptanceRate: matchAcceptanceRate,
        },
        feedback: {
          averageRating: avgRating[0]?.avg
            ? Math.round(avgRating[0].avg * 10) / 10
            : 0,
        },
        resources: {
          total: totalResources,
        },
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Get system overview error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get user growth report
exports.getUserGrowthReport = async (req, res) => {
  try {
    const { period = "monthly", months = 6 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const groupBy =
      period === "daily"
        ? { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        : { $dateToString: { format: "%Y-%m", date: "$createdAt" } };

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            period: groupBy,
            role: "$role",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.period": 1 } },
    ]);

    // Restructure data
    const periods = [...new Set(userGrowth.map((u) => u._id.period))].sort();
    const data = periods.map((period) => {
      const periodData = { period };
      userGrowth
        .filter((u) => u._id.period === period)
        .forEach((u) => {
          periodData[u._id.role] = u.count;
        });
      return periodData;
    });

    res.json({
      success: true,
      report: {
        period,
        data,
        totalNewUsers: userGrowth.reduce((sum, u) => sum + u.count, 0),
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Get user growth report error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get session analytics report
exports.getSessionAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "status" } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage =
      Object.keys(dateFilter).length > 0
        ? { $match: { scheduledAt: dateFilter } }
        : { $match: {} };

    // Sessions by status
    const byStatus = await Session.aggregate([
      matchStage,
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Sessions by type
    const byType = await Session.aggregate([
      matchStage,
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    // Sessions over time
    const overTime = await Session.aggregate([
      matchStage,
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    // Average session duration
    const avgDuration = await Session.aggregate([
      { ...matchStage.$match, status: "completed" },
      { $group: { _id: null, avg: { $avg: "$duration" } } },
    ]);

    // Peak hours
    const peakHours = await Session.aggregate([
      matchStage,
      {
        $group: {
          _id: { $hour: "$scheduledAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      report: {
        byStatus: byStatus.reduce(
          (acc, s) => ({ ...acc, [s._id]: s.count }),
          {}
        ),
        byType: byType.reduce((acc, t) => ({ ...acc, [t._id]: t.count }), {}),
        overTime: overTime.map((d) => ({ date: d._id, count: d.count })),
        averageDuration: avgDuration[0]?.avg
          ? Math.round(avgDuration[0].avg)
          : 0,
        peakHours: peakHours.map((h) => ({ hour: h._id, count: h.count })),
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Get session analytics error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get tutor performance report
exports.getTutorPerformanceReport = async (req, res) => {
  try {
    const { limit = 10, sortBy = "rating" } = req.query;

    // Top tutors by rating
    const topByRating = await TutorProfile.find({ averageRating: { $gt: 0 } })
      .populate("user", "fullName email department avatarUrl")
      .sort({ averageRating: -1 })
      .limit(parseInt(limit));

    // Top tutors by sessions
    const topBySessions = await TutorProfile.find({ totalSessions: { $gt: 0 } })
      .populate("user", "fullName email department avatarUrl")
      .sort({ totalSessions: -1 })
      .limit(parseInt(limit));

    // Department performance
    const byDepartment = await User.aggregate([
      { $match: { role: "tutor", isActive: true } },
      {
        $lookup: {
          from: "tutorprofiles",
          localField: "_id",
          foreignField: "user",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$department",
          tutorCount: { $sum: 1 },
          avgRating: { $avg: "$profile.averageRating" },
          totalSessions: { $sum: "$profile.totalSessions" },
        },
      },
      { $sort: { avgRating: -1 } },
    ]);

    res.json({
      success: true,
      report: {
        topByRating: topByRating.map((t) => ({
          id: t.user._id,
          name: t.user.fullName,
          department: t.user.department,
          rating: t.averageRating,
          sessions: t.totalSessions,
        })),
        topBySessions: topBySessions.map((t) => ({
          id: t.user._id,
          name: t.user.fullName,
          department: t.user.department,
          sessions: t.totalSessions,
          rating: t.averageRating,
        })),
        byDepartment: byDepartment.map((d) => ({
          department: d._id || "Unknown",
          tutorCount: d.tutorCount,
          avgRating: d.avgRating ? Math.round(d.avgRating * 10) / 10 : 0,
          totalSessions: d.totalSessions || 0,
        })),
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Get tutor performance report error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get matching analytics report
exports.getMatchingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage =
      Object.keys(dateFilter).length > 0
        ? { $match: { createdAt: dateFilter } }
        : { $match: {} };

    // Matches by status
    const byStatus = await Matching.aggregate([
      matchStage,
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Average match score
    const avgScore = await Matching.aggregate([
      matchStage,
      { $group: { _id: null, avg: { $avg: "$matchScore" } } },
    ]);

    // Response time (from request to response)
    const responseTime = await Matching.aggregate([
      { ...matchStage.$match, respondedAt: { $exists: true } },
      {
        $project: {
          responseTimeHours: {
            $divide: [
              { $subtract: ["$respondedAt", "$requestedAt"] },
              1000 * 60 * 60, // Convert to hours
            ],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: "$responseTimeHours" } } },
    ]);

    // Matches over time
    const overTime = await Matching.aggregate([
      matchStage,
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    res.json({
      success: true,
      report: {
        byStatus: byStatus.reduce(
          (acc, s) => ({ ...acc, [s._id]: s.count }),
          {}
        ),
        averageMatchScore: avgScore[0]?.avg ? Math.round(avgScore[0].avg) : 0,
        averageResponseTimeHours: responseTime[0]?.avg
          ? Math.round(responseTime[0].avg * 10) / 10
          : 0,
        overTime: overTime.map((d) => ({ date: d._id, count: d.count })),
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Get matching analytics error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get feedback analysis report
exports.getFeedbackAnalysis = async (req, res) => {
  try {
    // Rating distribution
    const ratingDistribution = await Feedback.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    // Average rating over time
    const ratingOverTime = await Feedback.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    // Category breakdown
    const categoryBreakdown = await Feedback.aggregate([
      { $unwind: "$categories" },
      { $group: { _id: "$categories", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Total stats
    const totalStats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    res.json({
      success: true,
      report: {
        ratingDistribution: ratingDistribution.reduce(
          (acc, r) => ({ ...acc, [r._id]: r.count }),
          {}
        ),
        ratingOverTime: ratingOverTime.map((r) => ({
          month: r._id,
          avgRating: Math.round(r.avgRating * 10) / 10,
          count: r.count,
        })),
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c._id,
          count: c.count,
        })),
        totalFeedback: totalStats[0]?.total || 0,
        averageRating: totalStats[0]?.avgRating
          ? Math.round(totalStats[0].avgRating * 10) / 10
          : 0,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Get feedback analysis error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Export report (generates downloadable data)
exports.exportReport = async (req, res) => {
  try {
    const { reportType, format = "json", startDate, endDate } = req.query;

    let data;
    switch (reportType) {
      case "users":
        data = await User.find().select("-password -refreshToken").lean();
        break;
      case "sessions":
        data = await Session.find()
          .populate("tutor", "fullName email")
          .populate("student", "fullName email")
          .lean();
        break;
      case "feedback":
        data = await Feedback.find()
          .populate("tutor", "fullName")
          .populate("student", "fullName")
          .lean();
        break;
      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid report type" });
    }

    if (format === "csv") {
      // Convert to CSV
      const fields = Object.keys(data[0] || {});
      const csv = [
        fields.join(","),
        ...data.map((row) =>
          fields.map((f) => JSON.stringify(row[f] || "")).join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${reportType}_report.csv`
      );
      return res.send(csv);
    }

    res.json({
      success: true,
      data,
      count: data.length,
      exportedAt: new Date(),
    });
  } catch (error) {
    console.error("Export report error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
