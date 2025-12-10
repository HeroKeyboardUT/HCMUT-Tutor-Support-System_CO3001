const { User, TutorProfile, Session, Feedback } = require("../model");

// Get all tutors with filters
exports.getAllTutors = async (req, res) => {
  try {
    const {
      expertise,
      department,
      minRating,
      maxRate,
      availability,
      search,
      page = 1,
      limit = 12,
      sortBy = "rating",
      sortOrder = "desc",
    } = req.query;

    // Build tutor profile query
    const profileQuery = { isAvailable: true };
    if (expertise) {
      profileQuery.expertise = { $in: expertise.split(",") };
    }
    if (maxRate) {
      profileQuery.hourlyRate = { $lte: parseInt(maxRate) };
    }
    if (minRating) {
      profileQuery.averageRating = { $gte: parseFloat(minRating) };
    }
    if (availability) {
      profileQuery["availability.day"] = { $in: availability.split(",") };
    }

    // Build user query
    const userQuery = { role: "tutor", isActive: true, isVerified: true };
    if (department) {
      userQuery.department = department;
    }
    if (search) {
      userQuery.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // First find matching users
    const matchingUsers = await User.find(userQuery).select("_id");
    const userIds = matchingUsers.map((u) => u._id);
    profileQuery.user = { $in: userIds };

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy === "rating" ? "averageRating" : sortBy] =
      sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [profiles, total] = await Promise.all([
      TutorProfile.find(profileQuery)
        .populate(
          "user",
          "fullName email department avatarUrl studentId staffId"
        )
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      TutorProfile.countDocuments(profileQuery),
    ]);

    // Format response
    const tutors = profiles.map((profile) => ({
      _id: profile.user._id,
      fullName: profile.user.fullName,
      email: profile.user.email,
      department: profile.user.department,
      avatarUrl: profile.user.avatarUrl,
      expertise: profile.expertise,
      hourlyRate: profile.hourlyRate,
      rating: profile.averageRating,
      totalSessions: profile.totalSessions,
      totalStudents: profile.totalStudents,
      teachingStyle: profile.teachingStyle,
      bio: profile.bio,
      availability: profile.availability,
      isAvailable: profile.isAvailable,
    }));

    res.json({
      success: true,
      tutors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all tutors error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get tutor by ID
exports.getTutorById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, role: "tutor" }).select(
      "-password -refreshToken"
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Tutor not found" });
    }

    const profile = await TutorProfile.findOne({ user: id });

    // Get recent reviews
    const recentFeedback = await Feedback.find({ tutor: id })
      .populate("student", "fullName avatarUrl")
      .sort({ createdAt: -1 })
      .limit(5);

    // Get session stats
    const [completedSessions, upcomingSessions] = await Promise.all([
      Session.countDocuments({ tutor: id, status: "completed" }),
      Session.countDocuments({
        tutor: id,
        status: { $in: ["scheduled", "confirmed"] },
        scheduledAt: { $gte: new Date() },
      }),
    ]);

    res.json({
      success: true,
      tutor: {
        ...user.toObject(),
        profile,
        stats: {
          completedSessions,
          upcomingSessions,
        },
        recentFeedback,
      },
    });
  } catch (error) {
    console.error("Get tutor by ID error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update tutor profile
exports.updateTutorProfile = async (req, res) => {
  try {
    const {
      expertise,
      availability,
      hourlyRate,
      teachingStyle,
      bio,
      maxStudents,
      preferredSessionTypes,
      isAvailable,
    } = req.body;

    const updateData = {};
    if (expertise) updateData.expertise = expertise;
    if (availability) updateData.availability = availability;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (teachingStyle) updateData.teachingStyle = teachingStyle;
    if (bio) updateData.bio = bio;
    if (maxStudents !== undefined) updateData.maxStudents = maxStudents;
    if (preferredSessionTypes)
      updateData.preferredSessionTypes = preferredSessionTypes;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const profile = await TutorProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: "Tutor profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update tutor profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get tutor's sessions
exports.getTutorSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    const query = { tutor: id };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = new Date(startDate);
      if (endDate) query.scheduledAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate("student", "fullName email avatarUrl")
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Session.countDocuments(query),
    ]);

    res.json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get tutor sessions error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get tutor's students
exports.getTutorStudents = async (req, res) => {
  try {
    const tutorId = req.params.id || req.user.id;

    // Find unique students from sessions
    const sessions = await Session.find({
      tutor: tutorId,
      status: { $in: ["completed", "confirmed", "scheduled"] },
    }).distinct("student");

    const students = await User.find({ _id: { $in: sessions } }).select(
      "fullName email department avatarUrl studentId"
    );

    // Get session counts per student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const sessionCount = await Session.countDocuments({
          tutor: tutorId,
          student: student._id,
          status: "completed",
        });
        return {
          ...student.toObject(),
          sessionCount,
        };
      })
    );

    res.json({
      success: true,
      students: studentsWithStats,
    });
  } catch (error) {
    console.error("Get tutor students error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get tutor availability
exports.getTutorAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { week } = req.query; // ISO week string like '2024-W01'

    const profile = await TutorProfile.findOne({ user: id }).select(
      "availability"
    );
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Tutor profile not found" });
    }

    // Get booked sessions for the week
    let startDate, endDate;
    if (week) {
      const [year, weekNum] = week.split("-W").map(Number);
      startDate = getDateOfISOWeek(weekNum, year);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    }

    const bookedSessions = await Session.find({
      tutor: id,
      status: { $in: ["scheduled", "confirmed", "in_progress"] },
      scheduledAt: { $gte: startDate, $lt: endDate },
    }).select("scheduledAt duration");

    res.json({
      success: true,
      availability: profile.availability,
      bookedSlots: bookedSessions.map((s) => ({
        start: s.scheduledAt,
        duration: s.duration,
      })),
    });
  } catch (error) {
    console.error("Get tutor availability error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update tutor availability
exports.updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;

    const profile = await TutorProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: { availability } },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: "Availability updated successfully",
      availability: profile.availability,
    });
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Toggle tutor availability status
exports.toggleAvailability = async (req, res) => {
  try {
    const profile = await TutorProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Tutor profile not found" });
    }

    profile.isAvailable = !profile.isAvailable;
    await profile.save();

    res.json({
      success: true,
      message: `You are now ${
        profile.isAvailable ? "available" : "unavailable"
      } for tutoring`,
      isAvailable: profile.isAvailable,
    });
  } catch (error) {
    console.error("Toggle availability error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Helper function to get date of ISO week
function getDateOfISOWeek(w, y) {
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}
