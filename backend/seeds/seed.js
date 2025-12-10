/**
 * Seed script to populate database with sample data
 * Run with: node seeds/seed.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Models
const User = require("../model/User");
const TutorProfile = require("../model/TutorProfile");
const StudentProfile = require("../model/StudentProfile");
const Session = require("../model/Session");
const Matching = require("../model/Matching");
const Feedback = require("../model/Feedback");
const LibraryResource = require("../model/LibraryResource");
const Notification = require("../model/Notification");
const CommunityPost = require("../model/Community");
const { Program, ProgramEnrollment } = require("../model/Program");
const LearningPath = require("../model/LearningPath");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/hcmut_tutor";

const faculties = [
  "Khoa học và Kỹ thuật Máy tính",
  "Điện - Điện tử",
  "Cơ khí",
  "Xây dựng",
  "Kỹ thuật Hóa học",
  "Quản lý Công nghiệp",
  "Môi trường và Tài nguyên",
  "Khoa học Ứng dụng",
];

const subjects = [
  { name: "Lập trình C/C++", code: "CO1007" },
  { name: "Cấu trúc dữ liệu và Giải thuật", code: "CO2003" },
  { name: "Mạng máy tính", code: "CO3001" },
  { name: "Hệ điều hành", code: "CO2017" },
  { name: "Cơ sở dữ liệu", code: "CO2013" },
  { name: "Trí tuệ nhân tạo", code: "CO3061" },
  { name: "Machine Learning", code: "CO3068" },
  { name: "Kỹ thuật phần mềm", code: "CO3009" },
  { name: "Toán rời rạc", code: "MT1003" },
  { name: "Xác suất thống kê", code: "MT2013" },
  { name: "Đại số tuyến tính", code: "MT1007" },
  { name: "Vật lý đại cương", code: "PH1003" },
];

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const seedUsers = async () => {
  const hashedPassword = await hashPassword("123456");

  const users = [
    // Admin
    {
      userId: "admin001",
      email: "admin@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "HCMUT",
      role: "admin",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      isVerified: true,
      isActive: true,
    },
    // Department Head
    {
      userId: "dhead001",
      email: "depthead@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Trưởng",
      lastName: "Khoa",
      role: "department_head",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      isVerified: true,
      isActive: true,
    },
    // Coordinator
    {
      userId: "coord001",
      email: "coordinator@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Điều phối",
      lastName: "Viên",
      role: "coordinator",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      isVerified: true,
      isActive: true,
    },
    // Tutors (10 tutors)
    {
      userId: "2012345",
      email: "tutor1@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Nguyễn Văn",
      lastName: "An",
      role: "tutor",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      department: "Bộ môn Khoa học Máy tính",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2012346",
      email: "tutor2@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Trần Thị",
      lastName: "Bình",
      role: "tutor",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      department: "Bộ môn Kỹ thuật Phần mềm",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2012347",
      email: "tutor3@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Lê Hoàng",
      lastName: "Cường",
      role: "tutor",
      faculty: "Điện - Điện tử",
      department: "Bộ môn Điện tử",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2012348",
      email: "tutor4@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Phạm Thanh",
      lastName: "Duy",
      role: "tutor",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      department: "Bộ môn Hệ thống Thông tin",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2012349",
      email: "tutor5@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Hoàng Thị",
      lastName: "Hương",
      role: "tutor",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      department: "Bộ môn Mạng Máy tính",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2012350",
      email: "tutor6@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Ngô Quốc",
      lastName: "Khánh",
      role: "tutor",
      faculty: "Cơ khí",
      department: "Bộ môn Cơ điện tử",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2012351",
      email: "tutor7@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Vũ Minh",
      lastName: "Long",
      role: "tutor",
      faculty: "Xây dựng",
      department: "Bộ môn Kết cấu",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2012352",
      email: "tutor8@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Đặng Thị",
      lastName: "Mai",
      role: "tutor",
      faculty: "Kỹ thuật Hóa học",
      department: "Bộ môn Hóa Hữu cơ",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2012353",
      email: "tutor9@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Bùi Văn",
      lastName: "Nam",
      role: "tutor",
      faculty: "Quản lý Công nghiệp",
      department: "Bộ môn Quản trị Kinh doanh",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2012354",
      email: "tutor10@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Lý Thị",
      lastName: "Oanh",
      role: "tutor",
      faculty: "Môi trường và Tài nguyên",
      department: "Bộ môn Môi trường",
      isVerified: true,
      isActive: true,
    },
    // Students (15 students)
    {
      userId: "2211001",
      email: "student1@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Phạm Minh",
      lastName: "Đức",
      role: "student",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211002",
      email: "student2@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Hoàng Thị",
      lastName: "Em",
      role: "student",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211003",
      email: "student3@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Vũ Quốc",
      lastName: "Phong",
      role: "student",
      faculty: "Điện - Điện tử",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211004",
      email: "student4@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Nguyễn Thị",
      lastName: "Quỳnh",
      role: "student",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211005",
      email: "student5@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Trần Văn",
      lastName: "Sơn",
      role: "student",
      faculty: "Cơ khí",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211006",
      email: "student6@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Lê Thị",
      lastName: "Trang",
      role: "student",
      faculty: "Xây dựng",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211007",
      email: "student7@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Phan Văn",
      lastName: "Uy",
      role: "student",
      faculty: "Kỹ thuật Hóa học",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211008",
      email: "student8@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Đỗ Thị",
      lastName: "Vân",
      role: "student",
      faculty: "Quản lý Công nghiệp",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211009",
      email: "student9@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Ngô Văn",
      lastName: "Xuân",
      role: "student",
      faculty: "Môi trường và Tài nguyên",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211010",
      email: "student10@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Bùi Thị",
      lastName: "Yến",
      role: "student",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211011",
      email: "student11@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Cao Văn",
      lastName: "Anh",
      role: "student",
      faculty: "Điện - Điện tử",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211012",
      email: "student12@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Dương Thị",
      lastName: "Bích",
      role: "student",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211013",
      email: "student13@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Hà Văn",
      lastName: "Cảnh",
      role: "student",
      faculty: "Cơ khí",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211014",
      email: "student14@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Lâm Thị",
      lastName: "Diệu",
      role: "student",
      faculty: "Khoa học Ứng dụng",
      isVerified: true,
      isActive: true,
    },
    {
      userId: "2211015",
      email: "student15@hcmut.edu.vn",
      password: hashedPassword,
      firstName: "Mai Văn",
      lastName: "Hải",
      role: "student",
      faculty: "Khoa học và Kỹ thuật Máy tính",
      isVerified: true,
      isActive: true,
    },
  ];

  return await User.insertMany(users);
};

const seedTutorProfiles = async (users) => {
  const tutors = users.filter((u) => u.role === "tutor");

  const tutorProfiles = [
    {
      user: tutors[0]._id,
      tutorType: "senior_student",
      expertise: [
        { subject: "Lập trình C/C++", level: "advanced" },
        { subject: "Cấu trúc dữ liệu", level: "advanced" },
        { subject: "Giải thuật", level: "intermediate" },
      ],
      availability: [
        { dayOfWeek: 1, startTime: "14:00", endTime: "17:00" },
        { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" },
        { dayOfWeek: 5, startTime: "09:00", endTime: "12:00" },
      ],
      gpa: 3.6,
      completedCredits: 120,
      // Real stats - will be updated as sessions are created and completed
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
    {
      user: tutors[1]._id,
      tutorType: "researcher",
      expertise: [
        { subject: "Machine Learning", level: "advanced" },
        { subject: "Trí tuệ nhân tạo", level: "advanced" },
        { subject: "Python", level: "advanced" },
      ],
      availability: [
        { dayOfWeek: 2, startTime: "18:00", endTime: "21:00" },
        { dayOfWeek: 4, startTime: "18:00", endTime: "21:00" },
        { dayOfWeek: 6, startTime: "09:00", endTime: "12:00" },
      ],
      // Real stats - will be updated as sessions are created and completed
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
    {
      user: tutors[2]._id,
      tutorType: "lecturer",
      expertise: [
        { subject: "Điện tử cơ bản", level: "advanced" },
        { subject: "Vi xử lý", level: "intermediate" },
        { subject: "Mạch điện", level: "advanced" },
      ],
      availability: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
        { dayOfWeek: 4, startTime: "14:00", endTime: "17:00" },
      ],
      // Real stats - will be updated as sessions are created and completed
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
    {
      user: tutors[3]._id,
      tutorType: "senior_student",
      expertise: [
        { subject: "Cơ sở dữ liệu", level: "advanced" },
        { subject: "SQL", level: "advanced" },
        { subject: "NoSQL", level: "intermediate" },
      ],
      availability: [
        { dayOfWeek: 2, startTime: "14:00", endTime: "17:00" },
        { dayOfWeek: 5, startTime: "14:00", endTime: "17:00" },
      ],
      gpa: 3.5,
      completedCredits: 110,
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
    {
      user: tutors[4]._id,
      tutorType: "researcher",
      expertise: [
        { subject: "Mạng máy tính", level: "advanced" },
        { subject: "An ninh mạng", level: "intermediate" },
        { subject: "Cloud Computing", level: "intermediate" },
      ],
      availability: [
        { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" },
        { dayOfWeek: 3, startTime: "18:00", endTime: "20:00" },
        { dayOfWeek: 6, startTime: "14:00", endTime: "17:00" },
      ],
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
    {
      user: tutors[5]._id,
      tutorType: "lecturer",
      expertise: [
        { subject: "Cơ điện tử", level: "advanced" },
        { subject: "Robot học", level: "advanced" },
        { subject: "CAD/CAM", level: "intermediate" },
      ],
      availability: [
        { dayOfWeek: 2, startTime: "09:00", endTime: "11:00" },
        { dayOfWeek: 4, startTime: "09:00", endTime: "11:00" },
      ],
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
    {
      user: tutors[6]._id,
      tutorType: "senior_student",
      expertise: [
        { subject: "Sức bền vật liệu", level: "advanced" },
        { subject: "Cơ học kết cấu", level: "intermediate" },
        { subject: "AutoCAD", level: "advanced" },
      ],
      availability: [
        { dayOfWeek: 3, startTime: "09:00", endTime: "12:00" },
        { dayOfWeek: 5, startTime: "14:00", endTime: "17:00" },
      ],
      gpa: 3.4,
      completedCredits: 100,
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
    {
      user: tutors[7]._id,
      tutorType: "researcher",
      expertise: [
        { subject: "Hóa Hữu cơ", level: "advanced" },
        { subject: "Hóa phân tích", level: "intermediate" },
        { subject: "Thí nghiệm Hóa", level: "advanced" },
      ],
      availability: [
        { dayOfWeek: 1, startTime: "14:00", endTime: "16:00" },
        { dayOfWeek: 4, startTime: "14:00", endTime: "16:00" },
      ],
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
    {
      user: tutors[8]._id,
      tutorType: "lecturer",
      expertise: [
        { subject: "Quản trị Kinh doanh", level: "advanced" },
        { subject: "Marketing", level: "intermediate" },
        { subject: "Kỹ năng mềm", level: "advanced" },
      ],
      availability: [
        { dayOfWeek: 2, startTime: "18:00", endTime: "20:00" },
        { dayOfWeek: 5, startTime: "18:00", endTime: "20:00" },
      ],
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
    {
      user: tutors[9]._id,
      tutorType: "senior_student",
      expertise: [
        { subject: "Môi trường", level: "advanced" },
        { subject: "Xử lý nước thải", level: "intermediate" },
        { subject: "GIS", level: "intermediate" },
      ],
      availability: [
        { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" },
        { dayOfWeek: 6, startTime: "09:00", endTime: "12:00" },
      ],
      gpa: 3.3,
      completedCredits: 95,
      rating: { average: 0, count: 0 },
      totalSessions: 0,
      completedSessions: 0,
      isApproved: true,
      isActive: true,
    },
  ];

  return await TutorProfile.insertMany(tutorProfiles);
};

const seedStudentProfiles = async (users) => {
  const students = users.filter((u) => u.role === "student");

  const studentProfiles = students.map((student, index) => ({
    user: student._id,
    learningNeeds: [
      {
        subject: subjects[index % subjects.length].name,
        currentLevel: "beginner",
        targetLevel: "intermediate",
        priority: "high",
      },
    ],
    preferredSessionTypes: ["online"],
    preferredSchedule: [
      { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" },
      { dayOfWeek: 6, startTime: "09:00", endTime: "11:00" },
    ],
  }));

  return await StudentProfile.insertMany(studentProfiles);
};

const seedLibraryResources = async (users) => {
  const admin = users.find((u) => u.role === "admin");
  const tutors = users.filter((u) => u.role === "tutor");

  const resources = [
    {
      title: "Tài liệu lập trình C++ cơ bản",
      description:
        "Tổng hợp kiến thức C++ từ cơ bản đến nâng cao, có ví dụ minh họa chi tiết.",
      type: "document",
      subjects: ["Lập trình C/C++"],
      courseCode: "CO1007",
      uploadedBy: tutors[0]._id,
      fileUrl: "/uploads/cpp-basics.pdf",
      fileType: "pdf",
      fileSize: 2048000,
      tags: ["C++", "programming", "basic"],
      downloadCount: 150,
      accessLevel: "public",
      isActive: true,
    },
    {
      title: "Video bài giảng Cấu trúc dữ liệu",
      description: "Series video giảng dạy về các cấu trúc dữ liệu phổ biến.",
      type: "video",
      subjects: ["Cấu trúc dữ liệu và Giải thuật"],
      courseCode: "CO2003",
      uploadedBy: tutors[0]._id,
      externalLink: "https://youtube.com/playlist?list=xxx",
      tags: ["data-structure", "algorithm", "video"],
      downloadCount: 200,
      accessLevel: "public",
      isActive: true,
    },
    {
      title: "Đề thi Machine Learning các năm",
      description:
        "Tổng hợp đề thi và lời giải môn Machine Learning từ 2020-2024.",
      type: "exam",
      subjects: ["Machine Learning"],
      courseCode: "CO3068",
      uploadedBy: tutors[1]._id,
      fileUrl: "/uploads/ml-exams.pdf",
      fileType: "pdf",
      fileSize: 5120000,
      tags: ["ML", "exam", "solution"],
      downloadCount: 300,
      accessLevel: "student",
      isActive: true,
    },
    {
      title: "Hướng dẫn sử dụng Python cho AI",
      description: "Tutorial Python cơ bản cho người mới bắt đầu học AI/ML.",
      type: "document",
      subjects: ["Trí tuệ nhân tạo"],
      courseCode: "CO3061",
      uploadedBy: tutors[1]._id,
      fileUrl: "/uploads/python-ai.pdf",
      fileType: "pdf",
      fileSize: 3072000,
      tags: ["python", "AI", "tutorial"],
      downloadCount: 180,
      accessLevel: "public",
      isActive: true,
    },
  ];

  return await LibraryResource.insertMany(resources);
};

const seedMatchings = async (users, tutorProfiles, studentProfiles) => {
  const matchings = [
    {
      student: studentProfiles[0]._id,
      tutor: tutorProfiles[0]._id,
      subject: "Lập trình C/C++",
      programType: "academic",
      matchType: "student_choice",
      status: "active",
      requestMessage:
        "Em muốn được hỗ trợ về môn lập trình C++, em đang gặp khó khăn về con trỏ và cấp phát bộ nhớ.",
    },
    {
      student: studentProfiles[1]._id,
      tutor: tutorProfiles[1]._id,
      subject: "Machine Learning",
      programType: "non_academic",
      matchType: "ai_recommended",
      status: "active",
      requestMessage:
        "Chị ơi, em muốn tìm hiểu về ML để làm đồ án. Chị có thể mentor em được không ạ?",
    },
    {
      student: studentProfiles[2]._id,
      tutor: tutorProfiles[0]._id,
      subject: "Cấu trúc dữ liệu và Giải thuật",
      programType: "academic",
      matchType: "student_choice",
      status: "pending",
      requestMessage:
        "Em cần hỗ trợ môn DSA, đặc biệt là phần graph và dynamic programming.",
    },
  ];

  return await Matching.insertMany(matchings);
};

const seedSessions = async (matchings, tutorProfiles, studentProfiles) => {
  const now = new Date();

  const sessions = [
    {
      tutor: tutorProfiles[0]._id,
      student: studentProfiles[0]._id,
      title: "Học về con trỏ trong C++",
      description: "Buổi học về khái niệm và cách sử dụng con trỏ trong C++",
      subject: "Lập trình C/C++",
      sessionType: "online",
      scheduledDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days later
      startTime: "14:00",
      endTime: "16:00",
      duration: 120,
      status: "confirmed", // Changed from completed - để sinh viên/tutor tự hoàn thành
      meetingLink: "https://meet.google.com/abc-defg-hij",
      agenda: ["Khái niệm con trỏ", "Địa chỉ bộ nhớ", "Tham chiếu"],
    },
    {
      tutor: tutorProfiles[0]._id,
      student: studentProfiles[0]._id,
      title: "Cấp phát bộ nhớ động",
      description: "Học về new, delete và quản lý bộ nhớ",
      subject: "Lập trình C/C++",
      sessionType: "online",
      scheduledDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days later
      startTime: "14:00",
      endTime: "16:00",
      duration: 120,
      status: "confirmed",
      meetingLink: "https://meet.google.com/abc-defg-hij",
      agenda: ["new", "delete", "memory leak"],
    },
    {
      tutor: tutorProfiles[1]._id,
      student: studentProfiles[1]._id,
      title: "Giới thiệu Machine Learning",
      description: "Buổi đầu tiên giới thiệu tổng quan về ML",
      subject: "Machine Learning",
      sessionType: "offline",
      scheduledDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days later
      startTime: "18:00",
      endTime: "20:00",
      duration: 120,
      status: "confirmed", // Changed from completed - để sinh viên/tutor tự hoàn thành
      location: "Phòng H6.1",
      agenda: [
        "Supervised learning",
        "Unsupervised learning",
        "Model evaluation",
      ],
    },
    // Open sessions for students to register
    {
      tutor: tutorProfiles[0]._id,
      title: "Ôn tập Cấu trúc dữ liệu - Graph & Tree",
      description:
        "Buổi ôn tập về đồ thị và cây, các thuật toán duyệt BFS, DFS, Dijkstra",
      subject: "Cấu trúc dữ liệu và Giải thuật",
      sessionType: "online",
      scheduledDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days later
      startTime: "19:00",
      endTime: "21:00",
      duration: 120,
      status: "pending",
      isOpen: true,
      maxParticipants: 5,
      meetingLink: "https://meet.google.com/dsa-review",
      agenda: ["Graph traversal", "Dijkstra", "Tree structures"],
    },
    {
      tutor: tutorProfiles[0]._id,
      title: "Hướng dẫn làm bài tập lớn C++",
      description: "Hỗ trợ sinh viên làm BTL môn lập trình, review code, debug",
      subject: "Lập trình C/C++",
      sessionType: "offline",
      scheduledDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days later
      startTime: "14:00",
      endTime: "16:00",
      duration: 120,
      status: "pending",
      isOpen: true,
      maxParticipants: 3,
      location: "Thư viện - Phòng học nhóm 2",
    },
    {
      tutor: tutorProfiles[1]._id,
      title: "Workshop: Xây dựng model ML đầu tiên",
      description:
        "Thực hành xây dựng model phân loại với scikit-learn, từ cơ bản đến nâng cao",
      subject: "Machine Learning",
      sessionType: "online",
      scheduledDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days later
      startTime: "20:00",
      endTime: "22:00",
      duration: 120,
      status: "pending",
      isOpen: true,
      maxParticipants: 10,
      meetingLink: "https://meet.google.com/ml-workshop",
      agenda: [
        "Data preprocessing",
        "Train/test split",
        "Model training",
        "Evaluation",
      ],
    },
    {
      tutor: tutorProfiles[1]._id,
      title: "Q&A Cơ sở dữ liệu - Chuẩn bị thi cuối kỳ",
      description: "Giải đáp thắc mắc, ôn tập các kiến thức trọng tâm môn CSDL",
      subject: "Cơ sở dữ liệu",
      sessionType: "online",
      scheduledDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days later
      startTime: "18:00",
      endTime: "20:00",
      duration: 120,
      status: "pending",
      isOpen: true,
      maxParticipants: 8,
      meetingLink: "https://meet.google.com/db-review",
    },
    {
      tutor: tutorProfiles[2]._id,
      title: "Thực hành Mạng máy tính - Lab Wireshark",
      description:
        "Hướng dẫn sử dụng Wireshark để phân tích gói tin, bắt packet",
      subject: "Mạng máy tính",
      sessionType: "offline",
      scheduledDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days later
      startTime: "15:00",
      endTime: "17:00",
      duration: 120,
      status: "pending",
      isOpen: true,
      maxParticipants: 4,
      location: "Phòng Lab H6.2",
    },
  ];

  return await Session.insertMany(sessions);
};

const seedFeedbacks = async (sessions, users) => {
  // Không tạo feedback giả - feedback sẽ được tạo bởi người dùng thực
  // Đánh giá của tutor phải đến từ sinh viên thực sự sau khi hoàn thành session
  console.log(
    "    → Skipping fake feedbacks (sẽ được tạo bởi người dùng thực)"
  );
  return [];
};

const seedNotifications = async (users) => {
  const students = users.filter((u) => u.role === "student");

  const notifications = students.flatMap((student) => [
    {
      user: student._id,
      title: "Chào mừng bạn đến với HCMUT Tutor!",
      message: "Hãy cập nhật hồ sơ và tìm tutor phù hợp để bắt đầu học nhé.",
      type: "system",
      isRead: false,
    },
    {
      user: student._id,
      title: "Khám phá thư viện tài liệu",
      message: "Truy cập thư viện để tìm các tài liệu học tập hữu ích.",
      type: "system",
      isRead: false,
    },
  ]);

  return await Notification.insertMany(notifications);
};

// Seed Programs
const seedPrograms = async (users) => {
  const admin = users.find((u) => u.role === "admin");
  const coordinator = users.find((u) => u.role === "coordinator");

  const programs = [
    {
      name: "Chương trình Hỗ trợ Lập trình Cơ bản",
      description:
        "Chương trình mentor 1-1 giúp sinh viên năm nhất làm quen với lập trình C/C++, giải quyết bài tập và chuẩn bị cho kỳ thi.",
      type: "academic",
      category: "course_support",
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      maxParticipants: 50,
      enrolledCount: 25,
      registrationOpen: true,
      isFeatured: true,
      duration: { value: 12, unit: "weeks" },
      totalSessions: 12,
      sessionDuration: 90,
      targetAudience: {
        faculties: ["Khoa học và Kỹ thuật Máy tính"],
        academicYears: [1, 2],
      },
      modules: [
        { title: "Cú pháp C++ cơ bản", order: 1, duration: 120 },
        { title: "Mảng và Con trỏ", order: 2, duration: 120 },
        { title: "Hàm và Đệ quy", order: 3, duration: 120 },
        { title: "OOP cơ bản", order: 4, duration: 180 },
      ],
      createdBy: coordinator._id,
    },
    {
      name: "Workshop Machine Learning từ Zero",
      description:
        "Chuỗi workshop thực hành về Machine Learning dành cho người mới bắt đầu. Học từ lý thuyết đến thực hành với Python và scikit-learn.",
      type: "academic",
      category: "research",
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      maxParticipants: 30,
      enrolledCount: 18,
      registrationOpen: true,
      isFeatured: true,
      duration: { value: 8, unit: "weeks" },
      totalSessions: 8,
      sessionDuration: 120,
      targetAudience: {
        faculties: ["Khoa học và Kỹ thuật Máy tính"],
        academicYears: [3, 4],
      },
      modules: [
        { title: "Python cho Data Science", order: 1, duration: 180 },
        { title: "Supervised Learning", order: 2, duration: 180 },
        { title: "Unsupervised Learning", order: 3, duration: 180 },
        { title: "Neural Networks cơ bản", order: 4, duration: 240 },
      ],
      createdBy: admin._id,
    },
    {
      name: "Kỹ năng Thuyết trình Hiệu quả",
      description:
        "Chương trình phát triển kỹ năng mềm giúp sinh viên tự tin thuyết trình, trình bày ý tưởng và bảo vệ đồ án.",
      type: "non_academic",
      category: "soft_skills",
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      maxParticipants: 40,
      enrolledCount: 32,
      registrationOpen: true,
      isFeatured: false,
      duration: { value: 4, unit: "weeks" },
      totalSessions: 4,
      sessionDuration: 90,
      modules: [
        { title: "Cấu trúc bài thuyết trình", order: 1, duration: 90 },
        { title: "Ngôn ngữ cơ thể", order: 2, duration: 90 },
        { title: "Xử lý câu hỏi", order: 3, duration: 90 },
        { title: "Thực hành", order: 4, duration: 120 },
      ],
      createdBy: coordinator._id,
    },
    {
      name: "Chuẩn bị Thi TOEIC",
      description:
        "Chương trình ôn thi TOEIC với target 700+, bao gồm lý thuyết, bài tập và mock test.",
      type: "non_academic",
      category: "career",
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      maxParticipants: 35,
      enrolledCount: 28,
      registrationOpen: true,
      isFeatured: true,
      duration: { value: 6, unit: "weeks" },
      totalSessions: 12,
      sessionDuration: 90,
      modules: [
        { title: "Listening Part 1-4", order: 1, duration: 180 },
        { title: "Reading Part 5-7", order: 2, duration: 180 },
        { title: "Strategies & Tips", order: 3, duration: 120 },
        { title: "Mock Tests", order: 4, duration: 240 },
      ],
      createdBy: admin._id,
    },
    {
      name: "Ôn tập Giải tích 1",
      description:
        "Chương trình hỗ trợ ôn tập môn Giải tích 1 trước kỳ thi cuối kỳ.",
      type: "academic",
      category: "exam_prep",
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      maxParticipants: 60,
      enrolledCount: 45,
      registrationOpen: true,
      isFeatured: false,
      duration: { value: 3, unit: "weeks" },
      totalSessions: 6,
      sessionDuration: 120,
      targetAudience: {
        academicYears: [1],
      },
      modules: [
        { title: "Giới hạn và Liên tục", order: 1, duration: 120 },
        { title: "Đạo hàm", order: 2, duration: 120 },
        { title: "Tích phân", order: 3, duration: 120 },
        { title: "Đề thi mẫu", order: 4, duration: 180 },
      ],
      createdBy: coordinator._id,
    },
  ];

  return await Program.insertMany(programs);
};

// Seed Community Posts
const seedCommunityPosts = async (users, tutorProfiles, studentProfiles) => {
  const students = users.filter((u) => u.role === "student");
  const tutors = users.filter((u) => u.role === "tutor");

  const posts = [
    {
      author: students[0]._id,
      title: "Hỏi về cách học Cấu trúc dữ liệu hiệu quả?",
      content:
        "Mình đang học môn Cấu trúc dữ liệu và cảm thấy khá khó khăn với phần Graph và Tree. Các bạn có tips gì để học hiệu quả không? Mình đã đọc slide nhưng vẫn chưa hiểu lắm.",
      category: "question",
      tags: ["DSA", "học tập", "tips"],
      isQuestion: true,
      status: "active",
      views: 156,
      likesCount: 23,
      likes: [students[1]._id, students[2]._id, tutors[0]._id],
      comments: [
        {
          author: tutors[0]._id,
          content:
            "Bạn nên bắt đầu bằng việc vẽ ra các cấu trúc dữ liệu trên giấy, sau đó mới code. Với Graph thì nên hiểu BFS, DFS trước. Mình có thể hỗ trợ thêm nếu bạn cần!",
          likes: [students[0]._id, students[1]._id],
          likesCount: 2,
          isAcceptedAnswer: true,
        },
        {
          author: students[3]._id,
          content:
            "Mình thấy xem video trên YouTube của Abdul Bari rất hay, giải thích trực quan lắm!",
          likes: [students[0]._id],
          likesCount: 1,
        },
      ],
    },
    {
      author: tutors[1]._id,
      title: "[Chia sẻ] Roadmap học Machine Learning cho người mới",
      content: `Xin chào các bạn! Mình là tutor chuyên về ML/AI và muốn chia sẻ roadmap học Machine Learning cho các bạn mới bắt đầu:

1. **Nền tảng toán học**: Đại số tuyến tính, Xác suất thống kê, Giải tích
2. **Python cơ bản**: Numpy, Pandas, Matplotlib
3. **ML cơ bản**: Supervised learning (Linear Regression, Logistic Regression, Decision Trees)
4. **ML nâng cao**: Ensemble methods, SVM, Neural Networks
5. **Deep Learning**: CNN, RNN, Transformers

Nếu các bạn có thắc mắc gì, hãy comment bên dưới nhé!`,
      category: "tips",
      tags: ["Machine Learning", "AI", "roadmap", "học tập"],
      isQuestion: false,
      status: "pinned",
      isPinned: true,
      views: 892,
      likesCount: 67,
      likes: students.slice(0, 10).map((s) => s._id),
      comments: [
        {
          author: students[1]._id,
          content:
            "Cảm ơn anh/chị! Em đang muốn học ML, bài viết này rất hữu ích ạ!",
          likes: [tutors[1]._id],
          likesCount: 1,
        },
        {
          author: students[4]._id,
          content:
            "Cho em hỏi là nên học Python ở đâu ạ? Em chưa biết gì về Python",
          likesCount: 0,
          replies: [
            {
              author: tutors[1]._id,
              content:
                "Bạn có thể học trên Codecademy hoặc freeCodeCamp nhé. Sau đó làm các bài tập trên LeetCode để luyện thêm.",
            },
          ],
        },
      ],
    },
    {
      author: students[2]._id,
      title: "Tìm bạn học nhóm môn Mạng máy tính",
      content:
        "Có bạn nào đang học môn Mạng máy tính học kỳ này không? Mình muốn lập nhóm học để cùng nhau ôn tập và làm lab. Liên hệ mình qua email nhé!",
      category: "general",
      tags: ["tìm nhóm", "Mạng máy tính", "học nhóm"],
      isQuestion: false,
      status: "active",
      views: 78,
      likesCount: 12,
      likes: [students[5]._id, students[10]._id],
    },
    {
      author: tutors[3]._id,
      title: "[Tài liệu] Tổng hợp đề thi Cơ sở dữ liệu các năm",
      content:
        "Mình đã tổng hợp đề thi môn Cơ sở dữ liệu từ 2019-2024, có lời giải chi tiết. Các bạn có thể vào thư viện để download nhé!",
      category: "resource",
      tags: ["đề thi", "Cơ sở dữ liệu", "tài liệu"],
      isQuestion: false,
      status: "active",
      views: 345,
      likesCount: 56,
      likes: students.slice(0, 8).map((s) => s._id),
    },
    {
      author: students[5]._id,
      title: "Hỏi về lỗi Segmentation Fault trong C++",
      content: `Mình đang làm bài tập C++ và gặp lỗi Segmentation Fault nhưng không biết debug như thế nào. Đây là code của mình:

\`\`\`cpp
int* arr = new int[10];
for(int i = 0; i <= 10; i++) {
    arr[i] = i;
}
\`\`\`

Có ai biết lỗi ở đâu không ạ?`,
      category: "question",
      tags: ["C++", "debug", "lỗi"],
      isQuestion: true,
      status: "active",
      views: 89,
      likesCount: 5,
      comments: [
        {
          author: tutors[0]._id,
          content:
            "Lỗi của bạn là truy cập out of bounds. Mảng có 10 phần tử (index 0-9) nhưng vòng lặp đi đến i=10. Sửa thành `i < 10` là được!",
          likes: [students[5]._id, students[0]._id],
          likesCount: 2,
          isAcceptedAnswer: true,
        },
      ],
    },
    {
      author: students[8]._id,
      title: "Review về chương trình Kỹ năng Thuyết trình",
      content:
        "Mình vừa hoàn thành chương trình Kỹ năng Thuyết trình và muốn chia sẻ với mọi người. Chương trình rất bổ ích, mentor hướng dẫn tận tình, được thực hành nhiều. Highly recommend cho các bạn muốn cải thiện kỹ năng presentation!",
      category: "experience",
      tags: ["review", "kỹ năng mềm", "thuyết trình"],
      isQuestion: false,
      status: "active",
      views: 123,
      likesCount: 34,
    },
  ];

  return await CommunityPost.insertMany(posts);
};

// Seed Learning Paths
const seedLearningPaths = async (users, studentProfiles) => {
  const students = users.filter((u) => u.role === "student");

  const learningPaths = [
    {
      student: studentProfiles[0]._id,
      title: "Lộ trình học Lập trình C/C++",
      description: "Lộ trình cá nhân hóa để master C/C++ trong 3 tháng",
      subject: "Lập trình C/C++",
      currentLevel: "beginner",
      targetLevel: "advanced",
      estimatedDuration: 12, // weeks
      status: "in_progress",
      progress: 45,
      milestones: [
        {
          title: "Cú pháp cơ bản",
          description:
            "Học các cú pháp cơ bản của C++: biến, kiểu dữ liệu, vòng lặp, điều kiện",
          order: 1,
          isCompleted: true,
          completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          resources: ["Slide bài giảng", "Video tutorial"],
        },
        {
          title: "Hàm và Mảng",
          description: "Học về functions, arrays, và cách sử dụng",
          order: 2,
          isCompleted: true,
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          resources: ["Bài tập thực hành", "Lab guide"],
        },
        {
          title: "Con trỏ và Tham chiếu",
          description: "Hiểu về pointers, references và memory management",
          order: 3,
          isCompleted: false,
          resources: ["Video giải thích", "Bài tập debug"],
        },
        {
          title: "OOP cơ bản",
          description: "Class, Object, Inheritance, Polymorphism",
          order: 4,
          isCompleted: false,
          resources: ["Slide OOP", "Project mini"],
        },
        {
          title: "STL và Templates",
          description: "Standard Template Library và Generic Programming",
          order: 5,
          isCompleted: false,
          resources: ["Documentation STL", "Coding exercises"],
        },
      ],
      aiGenerated: true,
      generatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    },
    {
      student: studentProfiles[1]._id,
      title: "Lộ trình học Machine Learning",
      description: "Từ zero đến hero trong Machine Learning",
      subject: "Machine Learning",
      currentLevel: "beginner",
      targetLevel: "intermediate",
      estimatedDuration: 16,
      status: "in_progress",
      progress: 25,
      milestones: [
        {
          title: "Python cho Data Science",
          description: "Numpy, Pandas, Matplotlib cơ bản",
          order: 1,
          isCompleted: true,
          completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
        {
          title: "Toán cho ML",
          description: "Linear Algebra, Probability, Calculus",
          order: 2,
          isCompleted: false,
        },
        {
          title: "Supervised Learning",
          description: "Regression, Classification algorithms",
          order: 3,
          isCompleted: false,
        },
        {
          title: "Unsupervised Learning",
          description: "Clustering, Dimensionality Reduction",
          order: 4,
          isCompleted: false,
        },
        {
          title: "Project thực tế",
          description: "Xây dựng end-to-end ML project",
          order: 5,
          isCompleted: false,
        },
      ],
      aiGenerated: true,
      generatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      student: studentProfiles[3]._id,
      title: "Ôn tập Cấu trúc Dữ liệu",
      description: "Lộ trình ôn tập DSA chuẩn bị thi cuối kỳ",
      subject: "Cấu trúc dữ liệu và Giải thuật",
      currentLevel: "intermediate",
      targetLevel: "advanced",
      estimatedDuration: 4,
      status: "in_progress",
      progress: 60,
      milestones: [
        {
          title: "Ôn tập Array & Linked List",
          order: 1,
          isCompleted: true,
        },
        {
          title: "Stack & Queue",
          order: 2,
          isCompleted: true,
        },
        {
          title: "Tree & Binary Search Tree",
          order: 3,
          isCompleted: true,
        },
        {
          title: "Graph & BFS/DFS",
          order: 4,
          isCompleted: false,
        },
        {
          title: "Dynamic Programming",
          order: 5,
          isCompleted: false,
        },
      ],
      aiGenerated: true,
      generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ];

  return await LearningPath.insertMany(learningPaths);
};

const seed = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    console.log("Clearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      TutorProfile.deleteMany({}),
      StudentProfile.deleteMany({}),
      Session.deleteMany({}),
      Matching.deleteMany({}),
      Feedback.deleteMany({}),
      LibraryResource.deleteMany({}),
      Notification.deleteMany({}),
      CommunityPost.deleteMany({}),
      Program.deleteMany({}),
      ProgramEnrollment.deleteMany({}),
      LearningPath.deleteMany({}),
    ]);

    // Seed data
    console.log("Seeding users...");
    const users = await seedUsers();
    console.log(`Created ${users.length} users`);

    console.log("Seeding tutor profiles...");
    const tutorProfiles = await seedTutorProfiles(users);
    console.log(`Created ${tutorProfiles.length} tutor profiles`);

    console.log("Seeding student profiles...");
    const studentProfiles = await seedStudentProfiles(users);
    console.log(`Created ${studentProfiles.length} student profiles`);

    console.log("Seeding library resources...");
    const resources = await seedLibraryResources(users);
    console.log(`Created ${resources.length} library resources`);

    console.log("Seeding matchings...");
    const matchings = await seedMatchings(
      users,
      tutorProfiles,
      studentProfiles
    );
    console.log(`Created ${matchings.length} matchings`);

    console.log("Seeding sessions...");
    const sessions = await seedSessions(
      matchings,
      tutorProfiles,
      studentProfiles
    );
    console.log(`Created ${sessions.length} sessions`);

    console.log("Seeding feedbacks...");
    const feedbacks = await seedFeedbacks(sessions, users);
    console.log(`Created ${feedbacks.length} feedbacks`);

    console.log("Seeding notifications...");
    const notifications = await seedNotifications(users);
    console.log(`Created ${notifications.length} notifications`);

    console.log("Seeding programs...");
    const programs = await seedPrograms(users);
    console.log(`Created ${programs.length} programs`);

    console.log("Seeding community posts...");
    const posts = await seedCommunityPosts(
      users,
      tutorProfiles,
      studentProfiles
    );
    console.log(`Created ${posts.length} community posts`);

    console.log("Seeding learning paths...");
    const learningPaths = await seedLearningPaths(users, studentProfiles);
    console.log(`Created ${learningPaths.length} learning paths`);

    console.log("\n✅ Seed completed successfully!");
    console.log("\n📝 Test accounts:");
    console.log("Admin: admin@hcmut.edu.vn / 123456");
    console.log("Dept Head: depthead@hcmut.edu.vn / 123456");
    console.log("Coordinator: coordinator@hcmut.edu.vn / 123456");
    console.log("Tutor: tutor1@hcmut.edu.vn / 123456");
    console.log("Student: student1@hcmut.edu.vn / 123456");
    console.log("\n📊 Data summary:");
    console.log(`- Users: ${users.length}`);
    console.log(`- Tutor Profiles: ${tutorProfiles.length}`);
    console.log(`- Student Profiles: ${studentProfiles.length}`);
    console.log(`- Sessions: ${sessions.length}`);
    console.log(`- Matchings: ${matchings.length}`);
    console.log(`- Programs: ${programs.length}`);
    console.log(`- Community Posts: ${posts.length}`);
    console.log(`- Learning Paths: ${learningPaths.length}`);
  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
};

seed();
