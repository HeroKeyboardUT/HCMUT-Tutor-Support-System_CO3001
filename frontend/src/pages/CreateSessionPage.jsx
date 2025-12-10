import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { sessionService, tutorService } from "../services";
import { SUBJECT_NAMES } from "../constants/subjects";

const CreateSessionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tutorProfile, setTutorProfile] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    scheduledDate: "",
    startTime: "09:00",
    duration: "60",
    sessionType: "online",
    location: "",
    meetingUrl: "",
    maxParticipants: 5,
    isOpen: true, // Default to open so students can register
  });

  // Preset durations in minutes
  const durations = [
    { value: "30", label: "30 phút" },
    { value: "45", label: "45 phút" },
    { value: "60", label: "1 giờ" },
    { value: "90", label: "1.5 giờ" },
    { value: "120", label: "2 giờ" },
  ];

  // Common locations
  const commonLocations = [
    "Thư viện HCMUT",
    "Phòng học A1",
    "Phòng học A2",
    "Phòng học B1",
    "Quán cà phê gần HCMUT",
    "Khác",
  ];

  // Load tutor profile to get expertise
  useEffect(() => {
    const fetchTutorProfile = async () => {
      try {
        const res = await tutorService.getMyProfile();
        if (res.success) {
          setTutorProfile(res.data?.profile || res.data || res);
        }
      } catch (err) {
        console.error("Failed to fetch tutor profile:", err);
      }
    };
    fetchTutorProfile();
  }, []);

  // Get subject options from tutor's expertise, fallback to unified list
  const tutorExpertise = tutorProfile?.expertise
    ? tutorProfile.expertise.map((exp) => exp.subject || exp).filter(Boolean)
    : [];
  // Combine tutor's expertise with standard subjects (remove duplicates)
  const subjectOptions = [...new Set([...tutorExpertise, ...SUBJECT_NAMES])];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate
      if (
        !formData.title ||
        !formData.subject ||
        !formData.scheduledDate ||
        !formData.startTime
      ) {
        setError("Vui lòng điền đầy đủ các trường bắt buộc");
        setLoading(false);
        return;
      }

      // Calculate end time from start time + duration
      const [startHour, startMin] = formData.startTime.split(":").map(Number);
      const durationMins = parseInt(formData.duration);
      const totalMins = startHour * 60 + startMin + durationMins;
      const endHour = Math.floor(totalMins / 60);
      const endMin = totalMins % 60;
      const endTime = `${String(endHour).padStart(2, "0")}:${String(
        endMin
      ).padStart(2, "0")}`;

      const sessionData = {
        ...formData,
        endTime,
        duration: durationMins,
      };

      const res = await sessionService.create(sessionData);

      if (res.success) {
        navigate(`/sessions/${res.data?.session?._id || res.data?._id}`, {
          state: { message: "Tạo buổi học thành công!" },
        });
      } else {
        setError(res.message || "Không thể tạo buổi học");
      }
    } catch (err) {
      setError(err.message || "Không thể tạo buổi học");
    } finally {
      setLoading(false);
    }
  };

  // Only tutors can create sessions
  if (user?.role !== "tutor") {
    return (
      <DashboardLayout title="Tạo Buổi Học">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <p className="text-gray-500">
            Chỉ giáo viên mới có thể tạo buổi học.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Tạo Buổi Học Mới"
      subtitle="Thiết lập một buổi dạy kèm cho học sinh"
    >
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm p-6"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Thông Tin Cơ Bản
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiêu Đề Buổi Học *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="VD: Hướng dẫn Thuật toán Sắp xếp"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Môn Học *
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- Chọn Môn Học --</option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô Tả Chi Tiết
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mô tả nội dung buổi học sẽ bao gồm những gì..."
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Lịch Trình
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày *
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giờ Bắt Đầu *
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thời Lượng *
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {durations.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Session Type & Location */}
          <div className="space-y-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Hình Thức Dạy Học
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Loại Buổi Học
              </label>
              <div className="flex items-center space-x-4">
                {["online", "offline", "hybrid"].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      name="sessionType"
                      value={type}
                      checked={formData.sessionType === type}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      {type === "online"
                        ? "Online"
                        : type === "offline"
                        ? "Offline"
                        : "Kết Hợp"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {(formData.sessionType === "online" ||
              formData.sessionType === "hybrid") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Cuộc Họp
                </label>
                <input
                  type="url"
                  name="meetingUrl"
                  value={formData.meetingUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://meet.google.com/... (có thể để sau)"
                />
              </div>
            )}

            {(formData.sessionType === "offline" ||
              formData.sessionType === "hybrid") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa Điểm
                </label>
                <select
                  value={formData.location || ""}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Chọn Địa Điểm --</option>
                  {commonLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Chọn "Khác" để nhập địa điểm tự do
                </p>
              </div>
            )}
          </div>

          {/* Open Session Settings */}
          <div className="space-y-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Cài Đặt Tham Gia
            </h3>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isOpen"
                name="isOpen"
                checked={formData.isOpen}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="isOpen" className="text-sm text-gray-700">
                Buổi Học Công Khai (học sinh có thể đăng ký)
              </label>
            </div>

            {formData.isOpen && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số Lượng Học Sinh Tối Đa
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min={1}
                  max={50}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Đang Tạo..." : "Tạo Buổi Học"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateSessionPage;
