const mongoose = require("mongoose");

// DataCore Record - Simulates HCMUT_DATACORE
// This stores synced data from central university system
const dataCoreRecordSchema = new mongoose.Schema(
  {
    // Unique identifier from central system
    dataCoreId: {
      type: String,
      required: true,
      unique: true,
    },

    // Person Type
    personType: {
      type: String,
      enum: ["student", "lecturer", "researcher", "staff"],
      required: true,
    },

    // Basic Info
    userId: {
      type: String,
      required: true,
      unique: true,
      // MSSV or Mã cán bộ
    },
    email: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    fullName: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    phone: String,
    address: String,
    idNumber: String, // CMND/CCCD

    // Academic Info
    faculty: String,
    department: String,
    major: String,
    academicYear: Number, // Khóa
    studentClass: String,

    // For students
    enrollmentYear: Number,
    expectedGraduationYear: Number,
    currentSemester: Number,
    totalCredits: Number,
    currentGpa: Number,

    // For staff/lecturers
    position: String,
    degree: String, // ThS, TS, PGS, GS
    employeeType: String,
    hireDate: Date,

    // Status
    academicStatus: {
      type: String,
      enum: [
        "active",
        "inactive",
        "graduated",
        "suspended",
        "on_leave",
        "retired",
      ],
      default: "active",
    },

    // Sync info
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index (userId, email already indexed via unique: true)
dataCoreRecordSchema.index({ personType: 1 });
dataCoreRecordSchema.index({ faculty: 1, department: 1 });

const DataCoreRecord = mongoose.model("DataCoreRecord", dataCoreRecordSchema);

module.exports = DataCoreRecord;
