const { DataCoreRecord, User } = require("../model");

/**
 * DataCore Controller
 * Simulates integration with HCMUT's university data system
 * In production, this would connect to actual university APIs
 */

// Sync user data from DataCore
exports.syncUserData = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Simulate fetching data from university system
    const universityData = await simulateDataCoreFetch(
      user.studentId || user.staffId
    );

    if (!universityData) {
      return res.status(404).json({
        success: false,
        message: "No data found in university system",
      });
    }

    // Create or update DataCore record
    const record = await DataCoreRecord.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          user: userId,
          studentId: user.studentId,
          staffId: user.staffId,
          universityData,
          lastSyncAt: new Date(),
          syncStatus: "success",
        },
      },
      { upsert: true, new: true }
    );

    // Update user with synced data
    const updateFields = {};
    if (universityData.fullName)
      updateFields.fullName = universityData.fullName;
    if (universityData.department)
      updateFields.department = universityData.department;
    if (universityData.email) updateFields.email = universityData.email;

    if (Object.keys(updateFields).length > 0) {
      await User.findByIdAndUpdate(userId, { $set: updateFields });
    }

    res.json({
      success: true,
      message: "User data synced successfully",
      record,
    });
  } catch (error) {
    console.error("Sync user data error:", error);

    // Log failed sync
    if (req.params.userId) {
      await DataCoreRecord.findOneAndUpdate(
        { user: req.params.userId },
        {
          $set: {
            lastSyncAt: new Date(),
            syncStatus: "failed",
            syncError: error.message,
          },
        },
        { upsert: true }
      );
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Verify student/staff ID
exports.verifyId = async (req, res) => {
  try {
    const { studentId, staffId } = req.body;
    const idToVerify = studentId || staffId;
    const idType = studentId ? "student" : "staff";

    if (!idToVerify) {
      return res.status(400).json({
        success: false,
        message: "Student ID or Staff ID is required",
      });
    }

    // Simulate verification against university database
    const verificationResult = await simulateIdVerification(idToVerify, idType);

    res.json({
      success: true,
      verified: verificationResult.verified,
      data: verificationResult.data,
    });
  } catch (error) {
    console.error("Verify ID error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get academic records
exports.getAcademicRecords = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check authorization
    const isOwner = userId === req.user.id;
    const isAdmin = ["admin", "department_head", "coordinator"].includes(
      req.user.role
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Simulate fetching academic records
    const academicRecords = await simulateAcademicRecordsFetch(user.studentId);

    res.json({
      success: true,
      records: academicRecords,
    });
  } catch (error) {
    console.error("Get academic records error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get course enrollments
exports.getCourseEnrollments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { semester } = req.query;

    const user = await User.findById(userId);
    if (!user || user.role !== "student") {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Simulate fetching course enrollments
    const enrollments = await simulateCourseEnrollmentsFetch(
      user.studentId,
      semester
    );

    res.json({
      success: true,
      enrollments,
    });
  } catch (error) {
    console.error("Get course enrollments error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get department data
exports.getDepartmentData = async (req, res) => {
  try {
    const { departmentCode } = req.params;

    // Simulate fetching department data
    const departmentData = await simulateDepartmentDataFetch(departmentCode);

    if (!departmentData) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }

    res.json({
      success: true,
      department: departmentData,
    });
  } catch (error) {
    console.error("Get department data error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Sync all users (admin only)
exports.syncAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select(
      "_id studentId staffId"
    );

    let synced = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const universityData = await simulateDataCoreFetch(
          user.studentId || user.staffId
        );

        if (universityData) {
          await DataCoreRecord.findOneAndUpdate(
            { user: user._id },
            {
              $set: {
                universityData,
                lastSyncAt: new Date(),
                syncStatus: "success",
              },
            },
            { upsert: true }
          );
          synced++;
        }
      } catch (err) {
        failed++;
      }
    }

    res.json({
      success: true,
      message: `Sync completed: ${synced} success, ${failed} failed`,
      synced,
      failed,
      total: users.length,
    });
  } catch (error) {
    console.error("Sync all users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get sync status
exports.getSyncStatus = async (req, res) => {
  try {
    const [total, synced, failed, pending] = await Promise.all([
      User.countDocuments({ isActive: true }),
      DataCoreRecord.countDocuments({ syncStatus: "success" }),
      DataCoreRecord.countDocuments({ syncStatus: "failed" }),
      User.countDocuments({ isActive: true }) -
        (await DataCoreRecord.countDocuments()),
    ]);

    const lastSync = await DataCoreRecord.findOne()
      .sort({ lastSyncAt: -1 })
      .select("lastSyncAt");

    res.json({
      success: true,
      status: {
        total,
        synced,
        failed,
        pending: Math.max(0, pending),
        lastSyncAt: lastSync?.lastSyncAt,
      },
    });
  } catch (error) {
    console.error("Get sync status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get DataCore record for user
exports.getUserRecord = async (req, res) => {
  try {
    const { userId } = req.params;

    const record = await DataCoreRecord.findOne({ user: userId }).populate(
      "user",
      "fullName email studentId staffId"
    );

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "No DataCore record found" });
    }

    res.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error("Get user record error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========== Simulation Functions ==========
// These simulate DataCore API responses. Replace with actual API calls in production.

async function simulateDataCoreFetch(id) {
  if (!id) return null;

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Generate mock data based on ID prefix
  const isStudent = id.startsWith("2") || id.length === 7;

  return {
    id,
    fullName: `User ${id}`,
    email: `${id.toLowerCase()}@hcmut.edu.vn`,
    department: "Computer Science & Engineering",
    faculty: "Faculty of Computer Science and Engineering",
    type: isStudent ? "student" : "staff",
    status: "active",
    enrollmentYear: isStudent ? 2020 + Math.floor(Math.random() * 4) : null,
    gpa: isStudent ? (3.0 + Math.random()).toFixed(2) : null,
    credits: isStudent ? Math.floor(Math.random() * 100) + 50 : null,
  };
}

async function simulateIdVerification(id, type) {
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Simple validation rules
  const isValidFormat =
    type === "student" ? /^\d{7}$/.test(id) : /^[A-Z]{2}\d{4,5}$/.test(id);

  return {
    verified: isValidFormat,
    data: isValidFormat
      ? {
          id,
          type,
          status: "active",
          department: "Computer Science & Engineering",
        }
      : null,
  };
}

async function simulateAcademicRecordsFetch(studentId) {
  if (!studentId) return null;

  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    studentId,
    gpa: (3.0 + Math.random()).toFixed(2),
    totalCredits: Math.floor(Math.random() * 100) + 50,
    completedCourses: Math.floor(Math.random() * 30) + 10,
    currentSemester: "Fall 2024",
    academicStanding: "Good",
    semesters: [
      { term: "Fall 2023", gpa: "3.5", credits: 18 },
      { term: "Spring 2024", gpa: "3.6", credits: 17 },
      { term: "Fall 2024", gpa: "3.4", credits: 16 },
    ],
  };
}

async function simulateCourseEnrollmentsFetch(studentId, semester) {
  if (!studentId) return [];

  await new Promise((resolve) => setTimeout(resolve, 100));

  return [
    {
      code: "CO2003",
      name: "Data Structures & Algorithms",
      credits: 4,
      instructor: "Dr. Nguyen",
    },
    {
      code: "CO2007",
      name: "Computer Architecture",
      credits: 3,
      instructor: "Dr. Tran",
    },
    {
      code: "CO2013",
      name: "Database Systems",
      credits: 4,
      instructor: "Dr. Le",
    },
    { code: "MT1003", name: "Calculus 1", credits: 4, instructor: "Dr. Pham" },
  ];
}

async function simulateDepartmentDataFetch(departmentCode) {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const departments = {
    CSE: {
      code: "CSE",
      name: "Computer Science & Engineering",
      faculty: "Faculty of Computer Science and Engineering",
      head: "Prof. Nguyen Van A",
      studentCount: 2500,
      staffCount: 120,
    },
    EE: {
      code: "EE",
      name: "Electrical & Electronic Engineering",
      faculty: "Faculty of Electrical & Electronic Engineering",
      head: "Prof. Tran Van B",
      studentCount: 1800,
      staffCount: 85,
    },
    ME: {
      code: "ME",
      name: "Mechanical Engineering",
      faculty: "Faculty of Mechanical Engineering",
      head: "Prof. Le Van C",
      studentCount: 1500,
      staffCount: 70,
    },
  };

  return departments[departmentCode] || null;
}
