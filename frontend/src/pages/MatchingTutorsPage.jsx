import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/Layout";
import { tutorService, sessionService } from "../services";
import { useAuth } from "../contexts/AuthContext";
import { SUBJECT_NAMES } from "../constants/subjects";

const MatchingTutorsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tutors, setTutors] = useState([]);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [registering, setRegistering] = useState(null);

  // Check if user can register (only students can register)
  const canRegister = user?.role === "student";
  const isAdminRole = ["admin", "coordinator", "department_head"].includes(
    user?.role
  );

  // Use unified subject list from constants
  const subjects = ["Tất cả", ...SUBJECT_NAMES];

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Build params for available sessions - exclude already registered ones
      const sessionParams = {};
      const userId = user?._id || user?.id;
      if (userId) {
        sessionParams.excludeRegistered = "true";
        sessionParams.userId = userId;
      }

      const [tutorsRes, sessionsRes] = await Promise.all([
        tutorService.getAll(),
        sessionService.getAvailable(sessionParams),
      ]);

      if (tutorsRes.success) {
        const tutorList = tutorsRes.data?.tutors || tutorsRes.tutors || [];
        setTutors(tutorList);
      }

      if (sessionsRes.success) {
        const sessionList =
          sessionsRes.data?.sessions || sessionsRes.sessions || [];
        setAvailableSessions(sessionList);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setSessionsLoading(false);
    }
  };

  const handleRegister = async (sessionId) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setRegistering(sessionId);
      const res = await sessionService.register(sessionId);

      if (res.success) {
        alert(
          "Đăng ký thành công! Bạn có thể xem chi tiết trong trang Sessions."
        );
        // Refresh available sessions - exclude ones user already registered
        try {
          const userId = user._id || user.id;
          const sessionParams = {
            excludeRegistered: "true",
            userId: userId,
          };
          const sessionsRes = await sessionService.getAvailable(sessionParams);
          if (sessionsRes.success) {
            setAvailableSessions(sessionsRes.data?.sessions || []);
          }
        } catch (refreshError) {
          console.error("Failed to refresh sessions:", refreshError);
          // Don't show error to user since registration was successful
        }
      } else {
        alert(res.message || "Đăng ký thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      alert(error.message || "Không thể đăng ký. Vui lòng thử lại.");
    } finally {
      setRegistering(null);
    }
  };

  const handleViewTutor = (tutorId) => {
    navigate(`/tutors/${tutorId}`);
  };

  // Filter sessions
  const filteredSessions = availableSessions.filter((session) => {
    const matchesSearch =
      !searchQuery ||
      session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.tutor?.user?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesSubject =
      selectedSubject === "all" ||
      selectedSubject === "Tất cả" ||
      session.subject?.toLowerCase().includes(selectedSubject.toLowerCase());

    return matchesSearch && matchesSubject;
  });

  // Filter tutors
  const filteredTutors = tutors.filter((tutor) => {
    const tutorName =
      tutor.user?.fullName ||
      `${tutor.user?.firstName || ""} ${tutor.user?.lastName || ""}`.trim();

    // Search by name or expertise
    const matchesSearch =
      !searchQuery ||
      tutorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tutor.expertise || []).some((exp) =>
        (exp.subject || exp)?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Filter by subject
    const matchesSubject =
      selectedSubject === "all" ||
      selectedSubject === "Tất cả" ||
      (tutor.expertise || []).some((exp) =>
        (exp.subject || exp)
          ?.toLowerCase()
          .includes(selectedSubject.toLowerCase())
      );

    return matchesSearch && matchesSubject;
  });

  // Format date/time
  const formatDateTime = (date, startTime) => {
    const d = new Date(date);
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const day = dayNames[d.getDay()];
    const dateStr = d.toLocaleDateString("vi-VN");
    return `${day}, ${dateStr} • ${startTime}`;
  };

  // Session Card Component
  const SessionCard = ({ session }) => {
    const tutor = session.tutor;
    const tutorName =
      tutor?.user?.fullName ||
      `${tutor?.user?.firstName || ""} ${tutor?.user?.lastName || ""}`.trim() ||
      "Tutor";
    const tutorAvatar = tutor?.user?.avatar;
    const spotsLeft =
      session.maxParticipants - (session.registeredStudents?.length || 0);
    const isRegistering = registering === session._id;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 line-clamp-1">
              {session.title}
            </h3>
            <p className="text-sm text-blue-600 font-medium">
              {session.subject}
            </p>
          </div>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              session.sessionType === "online"
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {session.sessionType === "online" ? "Online" : "Offline"}
          </span>
        </div>

        {/* Tutor Info */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {tutorAvatar ? (
              <img
                src={tutorAvatar}
                alt={tutorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{tutorName}</p>
            <p className="text-xs text-gray-500">
              {tutor?.user?.department || tutor?.user?.faculty || "HCMUT"}
            </p>
          </div>
        </div>

        {/* Time & Duration */}
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <svg
            className="w-4 h-4 mr-1.5 text-gray-400"
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
          <span>
            {formatDateTime(session.scheduledDate, session.startTime)}
          </span>
          <span className="mx-2">•</span>
          <span>{session.duration} phút</span>
        </div>

        {/* Location/Link */}
        {session.sessionType === "offline" && session.location && (
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <svg
              className="w-4 h-4 mr-1.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="line-clamp-1">{session.location}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span
            className={`text-sm ${
              spotsLeft <= 1 ? "text-red-600" : "text-gray-600"
            }`}
          >
            {spotsLeft > 0 ? `Còn ${spotsLeft} chỗ` : "Đã đầy"}
          </span>
          {canRegister ? (
            <button
              onClick={() => handleRegister(session._id)}
              disabled={spotsLeft === 0 || isRegistering}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                spotsLeft === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              {isRegistering ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Đang xử lý
                </span>
              ) : (
                "Đăng ký"
              )}
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-sm rounded-lg">
              Chỉ xem
            </span>
          )}
        </div>
      </div>
    );
  };

  const TutorCard = ({ tutor }) => {
    const tutorName =
      tutor.user?.fullName ||
      `${tutor.user?.firstName || ""} ${tutor.user?.lastName || ""}`;
    const tutorAvatar = tutor.user?.avatar;
    const tutorDepartment =
      tutor.user?.department || tutor.user?.faculty || "Computer Science";
    const tutorRating = tutor.rating?.average || tutor.rating || 0;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            {tutorAvatar ? (
              <img
                src={tutorAvatar}
                alt={tutorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{tutorName}</h3>
            <p className="text-sm text-gray-500">{tutorDepartment}</p>

            {/* Expertise Tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {(tutor.expertise || []).slice(0, 2).map((exp, i) => (
                <span
                  key={i}
                  className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full"
                >
                  {exp.subject || exp}
                </span>
              ))}
              {(tutor.expertise || []).length > 2 && (
                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{tutor.expertise.length - 2}
                </span>
              )}
            </div>

            {/* Rating */}
            {tutorRating > 0 && (
              <div className="flex items-center mt-2">
                <svg
                  className="w-4 h-4 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm text-gray-600 ml-1">
                  {tutorRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* View Button */}
          <button
            onClick={() => handleViewTutor(tutor._id)}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
          >
            Xem
          </button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      title="Tìm Tutor & Đăng ký Session"
      subtitle="Khám phá các buổi học có sẵn và đăng ký ngay"
    >
      {/* Admin View-Only Notice */}
      {isAdminRole && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
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
              Bạn đang xem trang này với tư cách{" "}
              {user?.role === "admin"
                ? "Admin"
                : user?.role === "coordinator"
                ? "Điều phối viên"
                : "Trưởng khoa"}
              . Chỉ sinh viên mới có thể đăng ký session.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Tìm theo tên tutor, môn học, tiêu đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {subjects.map((subject) => (
              <option
                key={subject}
                value={subject === "Tất cả" ? "all" : subject}
              >
                {subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Available Sessions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Sessions có sẵn</h2>
          <span className="text-sm text-gray-500">
            {filteredSessions.length} buổi học
          </span>
        </div>

        {sessionsLoading ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Chưa có session nào
            </h3>
            <p className="text-gray-500">
              Các tutor chưa mở buổi học nào. Hãy quay lại sau nhé!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => (
              <SessionCard key={session._id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Recommended Tutors */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Tutor gợi ý cho bạn
          </h2>
          <button
            onClick={() => navigate("/tutors")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Xem tất cả →
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
        ) : filteredTutors.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <p className="text-gray-500">
              {selectedSubject !== "all" && selectedSubject !== "Tất cả"
                ? `Không tìm thấy tutor dạy môn "${selectedSubject}".`
                : searchQuery
                ? `Không tìm thấy tutor với từ khóa "${searchQuery}".`
                : "Không có tutor nào."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTutors.slice(0, 6).map((tutor) => (
              <TutorCard key={tutor._id} tutor={tutor} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MatchingTutorsPage;