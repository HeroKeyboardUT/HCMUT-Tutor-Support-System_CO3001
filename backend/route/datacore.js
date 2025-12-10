const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles } = require("../config/config");
const { DataCoreRecord } = require("../model");

// @desc    Get all DataCore records (admin only)
// @route   GET /api/datacore
// @access  Private/Admin
router.get("/", authenticate, authorize(roles.ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 10, personType, faculty, search } = req.query;

    const query = {};
    if (personType) query.personType = personType;
    if (faculty) query.faculty = faculty;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    const records = await DataCoreRecord.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await DataCoreRecord.countDocuments(query);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get DataCore records",
      error: error.message,
    });
  }
});

// @desc    Get DataCore record by userId
// @route   GET /api/datacore/:userId
// @access  Private/Admin
router.get(
  "/:userId",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const record = await DataCoreRecord.findOne({
        userId: req.params.userId,
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Record not found",
        });
      }

      res.json({
        success: true,
        data: { record },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get record",
        error: error.message,
      });
    }
  }
);

// @desc    Create/Import DataCore record (simulate sync from university system)
// @route   POST /api/datacore
// @access  Private/Admin
router.post("/", authenticate, authorize(roles.ADMIN), async (req, res) => {
  try {
    const {
      dataCoreId,
      personType,
      userId,
      email,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      faculty,
      department,
      major,
      academicYear,
      studentClass,
      enrollmentYear,
      currentGpa,
      position,
      degree,
      academicStatus,
    } = req.body;

    // Check if record exists
    const existingRecord = await DataCoreRecord.findOne({
      $or: [{ dataCoreId }, { userId }],
    });

    if (existingRecord) {
      // Update existing record
      Object.assign(existingRecord, {
        personType,
        email,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        phone,
        faculty,
        department,
        major,
        academicYear,
        studentClass,
        enrollmentYear,
        currentGpa,
        position,
        degree,
        academicStatus,
        lastUpdated: new Date(),
      });

      await existingRecord.save();

      return res.json({
        success: true,
        message: "DataCore record updated",
        data: { record: existingRecord },
      });
    }

    const record = await DataCoreRecord.create({
      dataCoreId: dataCoreId || `DC${Date.now()}`,
      personType,
      userId,
      email,
      firstName,
      lastName,
      fullName: `${lastName} ${firstName}`,
      dateOfBirth,
      gender,
      phone,
      faculty,
      department,
      major,
      academicYear,
      studentClass,
      enrollmentYear,
      currentGpa,
      position,
      degree,
      academicStatus: academicStatus || "active",
    });

    res.status(201).json({
      success: true,
      message: "DataCore record created",
      data: { record },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create DataCore record",
      error: error.message,
    });
  }
});

// @desc    Bulk import DataCore records
// @route   POST /api/datacore/bulk
// @access  Private/Admin
router.post("/bulk", authenticate, authorize(roles.ADMIN), async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of records",
      });
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const recordData of records) {
      try {
        const existingRecord = await DataCoreRecord.findOne({
          userId: recordData.userId,
        });

        if (existingRecord) {
          Object.assign(existingRecord, {
            ...recordData,
            lastUpdated: new Date(),
          });
          await existingRecord.save();
          results.updated++;
        } else {
          await DataCoreRecord.create({
            ...recordData,
            dataCoreId:
              recordData.dataCoreId ||
              `DC${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
            fullName: `${recordData.lastName} ${recordData.firstName}`,
          });
          results.created++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push({
          userId: recordData.userId,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Bulk import completed",
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Bulk import failed",
      error: error.message,
    });
  }
});

// @desc    Verify user from DataCore
// @route   GET /api/datacore/verify/:userId
// @access  Public (used for registration verification)
router.get("/verify/:userId", async (req, res) => {
  try {
    const record = await DataCoreRecord.findOne({
      userId: req.params.userId,
      academicStatus: "active",
    });

    if (!record) {
      return res.json({
        success: true,
        data: {
          verified: false,
          message: "User not found in university system or not active",
        },
      });
    }

    res.json({
      success: true,
      data: {
        verified: true,
        personType: record.personType,
        faculty: record.faculty,
        department: record.department,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error.message,
    });
  }
});

module.exports = router;
