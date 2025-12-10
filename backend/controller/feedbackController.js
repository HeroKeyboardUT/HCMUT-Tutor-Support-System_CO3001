const { Feedback, Session, TutorProfile, Notification } = require("../model");

// Create feedback for a session
exports.createFeedback = async (req, res) => {
  try {
    const { sessionId, rating, comment, categories } = req.body;

    // Verify session exists and is completed
    const session = await Session.findById(sessionId)
      .populate("tutor", "fullName")
      .populate("student", "fullName");

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    if (session.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Can only provide feedback for completed sessions",
      });
    }

    // Check if user is the student in this session
    if (session.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the student can provide feedback for this session",
      });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({
      session: sessionId,
      student: req.user.id,
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this session",
      });
    }

    const feedback = new Feedback({
      session: sessionId,
      tutor: session.tutor._id,
      student: req.user.id,
      rating,
      comment,
      categories,
    });

    await feedback.save();

    // Update tutor's average rating
    const allFeedback = await Feedback.find({ tutor: session.tutor._id });
    const avgRating =
      allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;

    await TutorProfile.findOneAndUpdate(
      { user: session.tutor._id },
      {
        $set: { averageRating: Math.round(avgRating * 10) / 10 },
        $inc: { totalRatings: 1 },
      }
    );

    // Notify tutor
    await Notification.create({
      user: session.tutor._id,
      type: "feedback_received",
      title: "New Feedback Received",
      message: `${session.student.fullName} left a ${rating}-star review for your session`,
      relatedSession: sessionId,
    });

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    console.error("Create feedback error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get feedback for a tutor
exports.getTutorFeedback = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const { page = 1, limit = 10, minRating, maxRating } = req.query;

    const query = { tutor: tutorId };
    if (minRating) query.rating = { $gte: parseInt(minRating) };
    if (maxRating) {
      query.rating = { ...query.rating, $lte: parseInt(maxRating) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [feedback, total] = await Promise.all([
      Feedback.find(query)
        .populate("student", "fullName avatarUrl")
        .populate("session", "title scheduledAt subjects")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Feedback.countDocuments(query),
    ]);

    // Calculate rating distribution
    const ratingDistribution = await Feedback.aggregate([
      { $match: { tutor: tutorId } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    res.json({
      success: true,
      feedback,
      ratingDistribution: ratingDistribution.reduce((acc, r) => {
        acc[r._id] = r.count;
        return acc;
      }, {}),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get tutor feedback error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get feedback for a session
exports.getSessionFeedback = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const feedback = await Feedback.findOne({ session: sessionId })
      .populate("student", "fullName avatarUrl")
      .populate("tutor", "fullName avatarUrl");

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "No feedback found for this session",
      });
    }

    res.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("Get session feedback error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get my given feedback (student)
exports.getMyFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [feedback, total] = await Promise.all([
      Feedback.find({ student: req.user.id })
        .populate("tutor", "fullName avatarUrl")
        .populate("session", "title scheduledAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Feedback.countDocuments({ student: req.user.id }),
    ]);

    res.json({
      success: true,
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get my feedback error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get received feedback (tutor)
exports.getReceivedFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [feedback, total] = await Promise.all([
      Feedback.find({ tutor: req.user.id })
        .populate("student", "fullName avatarUrl")
        .populate("session", "title scheduledAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Feedback.countDocuments({ tutor: req.user.id }),
    ]);

    // Calculate stats
    const stats = await Feedback.aggregate([
      { $match: { tutor: req.user._id || req.user.id } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalCount: { $sum: 1 },
          fiveStars: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      feedback,
      stats: stats[0] || {
        avgRating: 0,
        totalCount: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get received feedback error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update feedback
exports.updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, categories } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res
        .status(404)
        .json({ success: false, message: "Feedback not found" });
    }

    // Only the student who created can update
    if (feedback.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Can only update within 7 days
    const daysSinceCreated =
      (Date.now() - feedback.createdAt) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated > 7) {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be updated within 7 days of submission",
      });
    }

    if (rating !== undefined) feedback.rating = rating;
    if (comment !== undefined) feedback.comment = comment;
    if (categories !== undefined) feedback.categories = categories;
    feedback.updatedAt = new Date();

    await feedback.save();

    // Recalculate tutor's average rating
    const allFeedback = await Feedback.find({ tutor: feedback.tutor });
    const avgRating =
      allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;

    await TutorProfile.findOneAndUpdate(
      { user: feedback.tutor },
      { $set: { averageRating: Math.round(avgRating * 10) / 10 } }
    );

    res.json({
      success: true,
      message: "Feedback updated successfully",
      feedback,
    });
  } catch (error) {
    console.error("Update feedback error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete feedback (admin only)
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res
        .status(404)
        .json({ success: false, message: "Feedback not found" });
    }

    const tutorId = feedback.tutor;
    await Feedback.findByIdAndDelete(id);

    // Recalculate tutor's average rating
    const allFeedback = await Feedback.find({ tutor: tutorId });
    const avgRating =
      allFeedback.length > 0
        ? allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length
        : 0;

    await TutorProfile.findOneAndUpdate(
      { user: tutorId },
      {
        $set: { averageRating: Math.round(avgRating * 10) / 10 },
        $inc: { totalRatings: -1 },
      }
    );

    res.json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    console.error("Delete feedback error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get feedback stats
exports.getFeedbackStats = async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          avgRating: { $avg: "$rating" },
          fiveStars: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalFeedback: 0,
        avgRating: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
      },
    });
  } catch (error) {
    console.error("Get feedback stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
