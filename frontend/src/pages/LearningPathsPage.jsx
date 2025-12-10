import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DashboardLayout } from "../components/Layout";
import learningPathService from "../services/learningPathService";

const LearningPathsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdminRole = ["admin", "coordinator", "department_head"].includes(
    user?.role
  );
  const canCreate = user?.role === "student";
  const [learningPaths, setLearningPaths] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // active, completed, all

  // Fetch learning paths
  const fetchLearningPaths = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (activeTab === "active") params.status = "active";
      if (activeTab === "completed") params.status = "completed";

      const response = await learningPathService.getLearningPaths(params);
      if (response.success) {
        setLearningPaths(response.data?.learningPaths || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await learningPathService.getMyStats();
      if (response.success) {
        setStats(response.data?.stats || null);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  useEffect(() => {
    fetchLearningPaths();
  }, [fetchLearningPaths]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Get progress summary helper
  const getProgressSummary = (path) => {
    return learningPathService.getProgressSummary(path);
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
                  Bạn đang xem các lộ trình học tập. Chỉ sinh viên mới có thể
                  tạo và sử dụng lộ trình AI.
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
                Lộ trình học tập AI
              </h1>
              <p className="mt-1 text-gray-500">
                Lộ trình học tập cá nhân hóa với trợ lý AI
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
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
                Tạo lộ trình mới
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon="📚"
                label="Lộ trình đang học"
                value={stats.activePaths}
                color="blue"
              />
              <StatCard
                icon="✅"
                label="Đã hoàn thành"
                value={stats.completedPaths}
                color="green"
              />
              <StatCard
                icon="⏰"
                label="Giờ học"
                value={Math.round(stats.totalStudyHours)}
                suffix="giờ"
                color="purple"
              />
              <StatCard
                icon="🔥"
                label="Streak tốt nhất"
                value={stats.longestStreak}
                suffix="ngày"
                color="orange"
              />
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {[
                  { id: "active", label: "Đang học", icon: "📖" },
                  { id: "completed", label: "Hoàn thành", icon: "✅" },
                  { id: "all", label: "Tất cả", icon: "📋" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Learning Paths Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          ) : learningPaths.length === 0 ? (
            isAdminRole ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Chưa có lộ trình học tập nào
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Các lộ trình học tập của sinh viên sẽ hiển thị ở đây. Bạn có
                  thể xem và theo dõi tiến độ học tập của họ.
                </p>
              </div>
            ) : (
              <EmptyState onCreateClick={() => setShowCreateModal(true)} />
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {learningPaths.map((path) => (
                <LearningPathCard
                  key={path._id}
                  path={path}
                  getProgressSummary={getProgressSummary}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <CreatePathModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={(newPath) => {
              setShowCreateModal(false);
              fetchLearningPaths();
              if (newPath?._id) {
                navigate(`/learning-paths/${newPath._id}`);
              }
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, suffix = "", color }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-2xl`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value} <span className="text-sm font-normal">{suffix}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// Learning Path Card Component
const LearningPathCard = ({ path, getProgressSummary }) => {
  const progress = getProgressSummary(path);

  const getLevelColor = (level) => {
    const colors = {
      beginner: "bg-green-100 text-green-700",
      elementary: "bg-blue-100 text-blue-700",
      intermediate: "bg-yellow-100 text-yellow-700",
      upper_intermediate: "bg-orange-100 text-orange-700",
      advanced: "bg-red-100 text-red-700",
      expert: "bg-purple-100 text-purple-700",
    };
    return colors[level] || colors.beginner;
  };

  const getLevelLabel = (level) => {
    const labels = {
      beginner: "Cơ bản",
      elementary: "Sơ cấp",
      intermediate: "Trung cấp",
      upper_intermediate: "Trung cấp+",
      advanced: "Nâng cao",
      expert: "Chuyên gia",
    };
    return labels[level] || level;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 relative">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 ${getLevelColor(
              path.currentLevel
            )} text-xs rounded-full`}
          >
            {getLevelLabel(path.currentLevel)}
          </span>
          <span className="text-white text-xs opacity-75">→</span>
          <span
            className={`px-2 py-1 ${getLevelColor(
              path.targetLevel
            )} text-xs rounded-full`}
          >
            {getLevelLabel(path.targetLevel)}
          </span>
        </div>

        {path.currentStreak > 0 && (
          <div className="absolute top-4 right-4 px-2 py-1 bg-orange-400 text-white text-xs rounded-full flex items-center gap-1">
            🔥 {path.currentStreak} ngày
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <Link to={`/learning-paths/${path._id}`}>
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {path.subject}
          </h3>
        </Link>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Tiến độ</span>
            <span className="font-medium text-gray-900">
              {progress.percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Milestones Summary */}
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {progress.completed} hoàn thành
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            {progress.inProgress} đang học
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
            {progress.notStarted} còn lại
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
          {path.totalStudyHours > 0 && (
            <span className="text-gray-500">
              ⏰ {Math.round(path.totalStudyHours)} giờ học
            </span>
          )}
          {path.assignedTutor && (
            <span className="text-blue-600">👨‍🏫 Có gia sư hướng dẫn</span>
          )}
        </div>

        {/* Action */}
        <Link
          to={`/learning-paths/${path._id}`}
          className="block mt-4 w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {progress.inProgress > 0 ? "Tiếp tục học" : "Xem chi tiết"}
        </Link>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = ({ onCreateClick }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
        <span className="text-5xl">🎯</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Bắt đầu hành trình học tập của bạn
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Tạo lộ trình học tập cá nhân hóa với sự hỗ trợ của AI. Chúng tôi sẽ giúp
        bạn thiết kế các milestone và đề xuất gia sư phù hợp nhất.
      </p>
      <button
        onClick={onCreateClick}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
      >
        ✨ Tạo lộ trình đầu tiên
      </button>
    </div>
  );
};

// Create Path Modal Component
const CreatePathModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    subject: "",
    currentLevel: "beginner",
    targetLevel: "intermediate",
    weeklyStudyHours: 10,
    goals: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedTutors, setSuggestedTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(false);

  const levels = [
    { value: "beginner", label: "Cơ bản" },
    { value: "elementary", label: "Sơ cấp" },
    { value: "intermediate", label: "Trung cấp" },
    { value: "upper_intermediate", label: "Trung cấp+" },
    { value: "advanced", label: "Nâng cao" },
    { value: "expert", label: "Chuyên gia" },
  ];

  // Fetch suggested tutors when subject changes
  const fetchSuggestedTutors = async () => {
    if (!formData.subject.trim()) return;

    try {
      setLoadingTutors(true);
      const response = await learningPathService.getSuggestedTutors(
        formData.subject,
        3
      );
      if (response.success) {
        setSuggestedTutors(response.data?.suggestions || []);
      }
    } catch (err) {
      console.error("Failed to fetch tutors:", err);
    } finally {
      setLoadingTutors(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestedTutors();
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.subject]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      setError("Vui lòng nhập môn học/chủ đề");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const pathData = {
        subject: formData.subject.trim(),
        currentLevel: formData.currentLevel,
        targetLevel: formData.targetLevel,
        weeklyGoal: {
          studyHours: parseInt(formData.weeklyStudyHours),
          sessionsCount: Math.ceil(parseInt(formData.weeklyStudyHours) / 2),
        },
        goals: formData.goals
          .split("\n")
          .map((g) => g.trim())
          .filter((g) => g),
      };

      const response = await learningPathService.createLearningPath(pathData);
      if (response.success) {
        onSuccess(response.data?.learningPath);
      } else {
        setError(
          response.message || "Không thể tạo lộ trình. Vui lòng thử lại."
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎯</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Tạo lộ trình học tập mới
                </h2>
                <p className="text-sm text-gray-500">
                  AI sẽ giúp bạn thiết kế lộ trình phù hợp
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Môn học / Chủ đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="VD: Toán cao cấp, Lập trình Python, IELTS..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Levels */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trình độ hiện tại
              </label>
              <select
                value={formData.currentLevel}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    currentLevel: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {levels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mục tiêu đạt được
              </label>
              <select
                value={formData.targetLevel}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetLevel: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {levels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weekly Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số giờ học mỗi tuần: {formData.weeklyStudyHours} giờ
            </label>
            <input
              type="range"
              min="2"
              max="40"
              step="2"
              value={formData.weeklyStudyHours}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  weeklyStudyHours: e.target.value,
                }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>2 giờ</span>
              <span>20 giờ</span>
              <span>40 giờ</span>
            </div>
          </div>

          {/* Goals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mục tiêu cụ thể (mỗi mục tiêu một dòng)
            </label>
            <textarea
              value={formData.goals}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, goals: e.target.value }))
              }
              placeholder="VD:&#10;Đạt điểm A môn Toán cao cấp&#10;Hiểu được các khái niệm đạo hàm, tích phân&#10;Giải được các bài tập nâng cao"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* AI Suggested Tutors */}
          {formData.subject && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                ✨ Gia sư được AI đề xuất
                {loadingTutors && (
                  <span className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                )}
              </h4>
              {suggestedTutors.length > 0 ? (
                <div className="space-y-2">
                  {suggestedTutors.map((suggestion) => (
                    <div
                      key={suggestion.tutor._id}
                      className="flex items-center justify-between bg-white rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                          {suggestion.tutor.user?.fullName?.charAt(0) || "T"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {suggestion.tutor.user?.fullName || "Tutor"}
                          </p>
                          <p className="text-sm text-gray-500">
                            ⭐{" "}
                            {suggestion.tutor.averageRating?.toFixed(1) ||
                              "N/A"}{" "}
                            · {suggestion.tutor.completedSessions || 0} buổi
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-600 font-medium">
                          {suggestion.matchScore}% phù hợp
                        </span>
                        <p className="text-xs text-gray-400">
                          {suggestion.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-700">
                  {loadingTutors
                    ? "Đang tìm kiếm gia sư phù hợp..."
                    : "Nhập môn học để xem đề xuất gia sư"}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              ✨ Tạo lộ trình AI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LearningPathsPage;
