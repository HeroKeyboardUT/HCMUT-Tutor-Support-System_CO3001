import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DashboardLayout } from "../components/Layout";
import programService from "../services/programService";

const ProgramsPage = () => {
  const { user } = useAuth();
  const isAdminRole = ["admin", "coordinator", "department_head"].includes(
    user?.role
  );
  const canEnroll = user?.role === "student";
  const [programs, setPrograms] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all, academic, non_academic, enrolled
  const [academicCategories, setAcademicCategories] = useState([]);
  const [nonAcademicCategories, setNonAcademicCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  // Fetch programs
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const params = { status: "active" };

      if (activeTab === "academic") params.type = "academic";
      if (activeTab === "non_academic") params.type = "non_academic";
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;

      const response = await programService.getPrograms(params);
      if (response.success) {
        setPrograms(response.data?.programs || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch enrollments
  const fetchEnrollments = async () => {
    try {
      const response = await programService.getMyEnrollments();
      if (response.success) {
        setMyEnrollments(response.data?.enrollments || []);
      }
    } catch (err) {
      console.error("Failed to fetch enrollments:", err);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const [academicRes, nonAcademicRes] = await Promise.all([
        programService.getAcademicCategories(),
        programService.getNonAcademicCategories(),
      ]);

      if (academicRes.success) {
        setAcademicCategories(academicRes.data?.categories || []);
      }
      if (nonAcademicRes.success) {
        setNonAcademicCategories(nonAcademicRes.data?.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [activeTab, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchEnrollments();
    fetchCategories();
  }, []);

  // Handle enrollment
  const handleEnroll = async (programId) => {
    try {
      const response = await programService.enrollInProgram(programId);
      if (response.success) {
        fetchEnrollments();
        fetchPrograms();
        alert("Đăng ký chương trình thành công!");
      } else {
        alert(
          response.message || "Đăng ký chương trình thất bại. Vui lòng thử lại."
        );
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Check if enrolled
  const isEnrolled = (programId) => {
    return myEnrollments.some(
      (e) => e.program?._id === programId || e.program === programId
    );
  };

  // Get current categories
  const getCurrentCategories = () => {
    if (activeTab === "academic") return academicCategories;
    if (activeTab === "non_academic") return nonAcademicCategories;
    return [...academicCategories, ...nonAcademicCategories];
  };

  // Program type badge
  const getTypeBadge = (type) => {
    if (type === "academic") {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
          📚 Học thuật
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
        🌟 Kỹ năng mềm
      </span>
    );
  };

  // Format duration
  const formatDuration = (duration) => {
    if (!duration) return "N/A";
    const unitMap = { days: "ngày", weeks: "tuần", months: "tháng" };
    return `${duration.value} ${unitMap[duration.unit] || duration.unit}`;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
        {/* Admin View-Only Notice */}
        {isAdminRole && (
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <svg
                className="w-5 h-5 text-blue-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Chế độ xem dành cho quản trị
                </p>
                <p className="text-xs text-blue-600">
                  Bạn đang xem các chương trình đào tạo. Chỉ sinh viên mới có
                  thể đăng ký tham gia.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Chương trình đào tạo
              </h1>
              <p className="mt-1 text-gray-500">
                Khám phá các chương trình học thuật và kỹ năng mềm
              </p>
            </div>
            {(user?.role === "tutor" ||
              user?.role === "admin" ||
              user?.role === "coordinator") && (
              <Link
                to="/programs/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Tạo chương trình
              </Link>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {[
                  { id: "all", label: "Tất cả", icon: "📋" },
                  { id: "academic", label: "Học thuật", icon: "📚" },
                  { id: "non_academic", label: "Kỹ năng mềm", icon: "🌟" },
                  { id: "enrolled", label: "Đã đăng ký", icon: "✅" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSelectedCategory("");
                    }}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.icon} {tab.label}
                    {tab.id === "enrolled" && myEnrollments.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                        {myEnrollments.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Filters */}
            <div className="p-4 flex gap-4 items-center flex-wrap">
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="Tìm kiếm chương trình..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {activeTab !== "enrolled" && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tất cả danh mục</option>
                  {getCurrentCategories().map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          ) : activeTab === "enrolled" ? (
            // Enrolled Programs View
            <div className="space-y-4">
              {myEnrollments.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">
                    Chưa đăng ký chương trình nào
                  </h3>
                  <p className="text-gray-500 mt-1">
                    Hãy khám phá các chương trình phù hợp với bạn!
                  </p>
                  <button
                    onClick={() => setActiveTab("all")}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Xem chương trình
                  </button>
                </div>
              ) : (
                myEnrollments.map((enrollment) => (
                  <EnrollmentCard
                    key={enrollment._id}
                    enrollment={enrollment}
                  />
                ))
              )}
            </div>
          ) : (
            // All Programs View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-sm p-8 text-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Không tìm thấy chương trình
                  </h3>
                  <p className="text-gray-500 mt-1">
                    Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                  </p>
                </div>
              ) : (
                programs.map((program) => (
                  <ProgramCard
                    key={program._id}
                    program={program}
                    isEnrolled={isEnrolled(program._id)}
                    onEnroll={handleEnroll}
                    getTypeBadge={getTypeBadge}
                    formatDuration={formatDuration}
                    canEnroll={canEnroll}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Program Card Component
const ProgramCard = ({
  program,
  isEnrolled,
  onEnroll,
  getTypeBadge,
  formatDuration,
  canEnroll,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 relative">
        {program.thumbnailUrl ? (
          <img
            src={program.thumbnailUrl}
            alt={program.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-4xl">
            {program.type === "academic" ? "📚" : "🌟"}
          </div>
        )}
        {program.isFeatured && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-medium rounded-full">
            ⭐ Nổi bật
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {getTypeBadge(program.type)}
          {program.hasCertificate && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              🎓 Có chứng chỉ
            </span>
          )}
        </div>

        <Link to={`/programs/${program._id}`}>
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
            {program.name}
          </h3>
        </Link>

        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
          {program.shortDescription || program.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {formatDuration(program.duration)}
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {program.enrolledCount || 0}/{program.maxParticipants}
          </span>
          {program.trainingPoints > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              +{program.trainingPoints} điểm
            </span>
          )}
        </div>

        {/* Rating */}
        {program.rating?.count > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <span className="text-yellow-400">★</span>
            <span className="text-sm font-medium">
              {program.rating.average.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">
              ({program.rating.count} đánh giá)
            </span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {isEnrolled ? (
            <Link
              to={`/programs/${program._id}`}
              className="w-full inline-block text-center px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium"
            >
              Đã đăng ký - Xem chi tiết
            </Link>
          ) : !canEnroll ? (
            <Link
              to={`/programs/${program._id}`}
              className="w-full inline-block text-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Xem chi tiết chương trình
            </Link>
          ) : program.registrationOpen ? (
            <button
              onClick={() => onEnroll(program._id)}
              disabled={program.enrolledCount >= program.maxParticipants}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {program.enrolledCount >= program.maxParticipants
                ? "Đã đầy"
                : "Đăng ký tham gia"}
            </button>
          ) : (
            <span className="block text-center text-gray-500 text-sm">
              Chưa mở đăng ký
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Enrollment Card Component
const EnrollmentCard = ({ enrollment }) => {
  const program = enrollment.program || {};
  const progressPercent = enrollment.progress || 0;

  const getStatusBadge = (status) => {
    const statusMap = {
      enrolled: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        label: "Đã đăng ký",
      },
      in_progress: {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        label: "Đang học",
      },
      completed: {
        bg: "bg-green-100",
        text: "text-green-700",
        label: "Hoàn thành",
      },
      dropped: { bg: "bg-gray-100", text: "text-gray-700", label: "Đã hủy" },
    };
    const s = statusMap[status] || statusMap.enrolled;
    return (
      <span className={`px-2 py-1 ${s.bg} ${s.text} text-xs rounded-full`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl flex-shrink-0">
          {program.type === "academic" ? "📚" : "🌟"}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getStatusBadge(enrollment.status)}
            {enrollment.status === "completed" &&
              enrollment.certificateIssued && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  🎓 Đã nhận chứng chỉ
                </span>
              )}
          </div>

          <Link to={`/programs/${program._id}`}>
            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
              {program.name}
            </h3>
          </Link>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Tiến độ</span>
              <span className="font-medium text-gray-900">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span>
              Module: {enrollment.currentModule || 0}/
              {program.modules?.length || 0}
            </span>
            {enrollment.attendedSessions > 0 && (
              <span>
                Buổi học: {enrollment.attendedSessions}/{program.totalSessions}
              </span>
            )}
            {enrollment.pointsAwarded > 0 && (
              <span className="text-green-600">
                +{enrollment.pointsAwarded} điểm đã nhận
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <Link
          to={`/programs/${program._id}`}
          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Xem chi tiết →
        </Link>
      </div>
    </div>
  );
};

export default ProgramsPage;
