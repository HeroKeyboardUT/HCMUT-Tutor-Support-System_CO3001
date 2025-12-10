const {
  User,
  StudentProfile,
  Session,
  Matching,
  TutorProfile,
} = require("../model");

// Get student profile
exports.getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, role: "student" }).select(
      "-password -refreshToken"
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const profile = await StudentProfile.findOne({ user: id });

    // Get session stats
    const [totalSessions, completedSessions, activeTutors] = await Promise.all([
      Session.countDocuments({ student: id }),
      Session.countDocuments({ student: id, status: "completed" }),
      Matching.countDocuments({ student: id, status: "accepted" }),
    ]);

    res.json({
      success: true,
      student: {
        ...user.toObject(),
        profile,
        stats: {
          totalSessions,
          completedSessions,
          activeTutors,
        },
      },
    });
  } catch (error) {
    console.error("Get student profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update student profile
exports.updateStudentProfile = async (req, res) => {
  try {
    const {
      major,
      year,
      supportNeeds,
      learningGoals,
      preferredSchedule,
      preferredSessionTypes,
      academicInfo,
    } = req.body;

    const updateData = {};
    if (major) updateData.major = major;
    if (year !== undefined) updateData.year = year;
    if (supportNeeds) updateData.supportNeeds = supportNeeds;
    if (learningGoals) updateData.learningGoals = learningGoals;
    if (preferredSchedule) updateData.preferredSchedule = preferredSchedule;
    if (preferredSessionTypes)
      updateData.preferredSessionTypes = preferredSessionTypes;
    if (academicInfo) updateData.academicInfo = academicInfo;

    const profile = await StudentProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: "Student profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update student profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get student's tutors (matched tutors)
exports.getStudentTutors = async (req, res) => {
  try {
    const studentId = req.params.id || req.user.id;

    // Get accepted matches
    const matches = await Matching.find({
      student: studentId,
      status: "accepted",
    }).populate({
      path: "tutor",
      select: "fullName email department avatarUrl",
    });

    // Get tutor profiles
    const tutorIds = matches.map((m) => m.tutor._id);
    const tutorProfiles = await TutorProfile.find({ user: { $in: tutorIds } });

    const tutors = matches.map((match) => {
      const profile = tutorProfiles.find(
        (p) => p.user.toString() === match.tutor._id.toString()
      );
      return {
        _id: match.tutor._id,
        fullName: match.tutor.fullName,
        email: match.tutor.email,
        department: match.tutor.department,
        avatarUrl: match.tutor.avatarUrl,
        expertise: profile?.expertise || [],
        rating: profile?.averageRating || 0,
        matchedAt: match.respondedAt,
      };
    });

    res.json({
      success: true,
      tutors,
    });
  } catch (error) {
    console.error("Get student tutors error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get student's sessions
exports.getStudentSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { student: id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate("tutor", "fullName email avatarUrl")
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
    console.error("Get student sessions error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get student's progress/learning analytics
exports.getStudentProgress = async (req, res) => {
  try {
    const studentId = req.params.id || req.user.id;

    // Get all completed sessions
    const completedSessions = await Session.find({
      student: studentId,
      status: "completed",
    })
      .populate("tutor", "fullName")
      .sort({ completedAt: -1 });

    // Calculate stats
    const totalHours = completedSessions.reduce(
      (sum, s) => sum + (s.duration || 0) / 60,
      0
    );

    // Group sessions by subject
    const bySubject = completedSessions.reduce((acc, session) => {
      session.subjects?.forEach((subject) => {
        if (!acc[subject]) {
          acc[subject] = { count: 0, hours: 0 };
        }
        acc[subject].count++;
        acc[subject].hours += (session.duration || 0) / 60;
      });
      return acc;
    }, {});

    // Sessions over time (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const sessionsOverTime = await Session.aggregate([
      {
        $match: {
          student: studentId,
          status: "completed",
          completedAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$completedAt" } },
          count: { $sum: 1 },
          hours: { $sum: { $divide: ["$duration", 60] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      progress: {
        totalSessions: completedSessions.length,
        totalHours: Math.round(totalHours * 10) / 10,
        bySubject: Object.entries(bySubject).map(([subject, data]) => ({
          subject,
          sessions: data.count,
          hours: Math.round(data.hours * 10) / 10,
        })),
        sessionsOverTime: sessionsOverTime.map((s) => ({
          month: s._id,
          sessions: s.count,
          hours: Math.round(s.hours * 10) / 10,
        })),
        recentSessions: completedSessions.slice(0, 5).map((s) => ({
          title: s.title,
          tutor: s.tutor.fullName,
          date: s.completedAt,
          duration: s.duration,
          subjects: s.subjects,
        })),
      },
    });
  } catch (error) {
    console.error("Get student progress error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all students (admin/coordinator)
exports.getAllStudents = async (req, res) => {
  try {
    const { department, year, search, page = 1, limit = 20 } = req.query;

    const userQuery = { role: "student", isActive: true };
    if (department) userQuery.department = department;
    if (search) {
      userQuery.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let users = await User.find(userQuery)
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get profiles
    const userIds = users.map((u) => u._id);
    const profiles = await StudentProfile.find({ user: { $in: userIds } });

    // Apply year filter if provided
    if (year) {
      const yearNum = parseInt(year);
      const profileUserIds = profiles
        .filter((p) => p.year === yearNum)
        .map((p) => p.user.toString());
      users = users.filter((u) => profileUserIds.includes(u._id.toString()));
    }

    const students = users.map((user) => {
      const profile = profiles.find(
        (p) => p.user.toString() === user._id.toString()
      );
      return {
        ...user.toObject(),
        profile,
      };
    });

    const total = await User.countDocuments(userQuery);

    res.json({
      success: true,
      students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update learning goals
exports.updateLearningGoals = async (req, res) => {
  try {
    const { learningGoals, supportNeeds } = req.body;

    const updateData = {};
    if (learningGoals) updateData.learningGoals = learningGoals;
    if (supportNeeds) updateData.supportNeeds = supportNeeds;

    const profile = await StudentProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: "Learning goals updated",
      profile,
    });
  } catch (error) {
    console.error("Update learning goals error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get recommended tutors for student
exports.getRecommendedTutors = async (req, res) => {
  try {
    const studentId = req.params.id || req.user.id;
    const { limit = 5 } = req.query;

    const studentProfile = await StudentProfile.findOne({ user: studentId });
    const supportNeeds = studentProfile?.supportNeeds || [];

    // Find tutors with matching expertise
    const tutorProfiles = await TutorProfile.find({
      isAvailable: true,
      expertise: { $in: supportNeeds.length > 0 ? supportNeeds : [/.*/] },
    })
      .populate("user", "fullName email department avatarUrl")
      .sort({ averageRating: -1, totalSessions: -1 })
      .limit(parseInt(limit));

    // Exclude already matched tutors
    const existingMatches = await Matching.find({
      student: studentId,
      status: { $in: ["pending", "accepted"] },
    }).select("tutor");
    const matchedTutorIds = existingMatches.map((m) => m.tutor.toString());

    const recommendations = tutorProfiles
      .filter((p) => !matchedTutorIds.includes(p.user._id.toString()))
      .map((profile) => ({
        _id: profile.user._id,
        fullName: profile.user.fullName,
        email: profile.user.email,
        department: profile.user.department,
        avatarUrl: profile.user.avatarUrl,
        expertise: profile.expertise,
        rating: profile.averageRating,
        totalSessions: profile.totalSessions,
        matchingSubjects: profile.expertise.filter((e) =>
          supportNeeds.includes(e)
        ),
      }));

    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Get recommended tutors error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
