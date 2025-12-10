import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { DashboardLayout } from "../components/Layout";
import { sessionService, studentService, tutorService } from "../services";

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExpertiseModal, setShowExpertiseModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Session form state
  const [sessionForm, setSessionForm] = useState({
    title: "",
    description: "",
    scheduledDate: "",
    startTime: "",
    endTime: "",
    location: "",
    meetingLink: "",
    sessionType: "online",
    isOpen: true,
  });

  // Expertise/Learning needs form state
  const [expertiseList, setExpertiseList] = useState([]);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const isStudent = user?.role === "student";
  const isTutor = user?.role === "tutor";

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile based on role
        if (isStudent) {
          const res = await studentService.getMyProfile();
          if (res.success) setProfile(res.data?.student || res.data);
        } else if (isTutor) {
          const res = await tutorService.getMyProfile();
          if (res.success) setProfile(res.data?.tutor || res.data);
        }

        // Fetch sessions
        const sessionsRes = await sessionService.getAll({ limit: 10 });
        if (sessionsRes.success) {
          setSessions(sessionsRes.data?.sessions || sessionsRes.sessions || []);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isStudent, isTutor]);

  const upcomingSessions = sessions.filter((s) => s.status === "confirmed");
  const pendingSessions = sessions.filter((s) => s.status === "pending");

  const expertise = isTutor
    ? (profile?.expertise || []).map((e) => e.subject)
    : (profile?.learningNeeds || []).map((n) => n.subject);

  // Initialize expertise list when modal opens
  const openExpertiseModal = () => {
    if (isTutor) {
      setExpertiseList(profile?.expertise || []);
    } else {
      setExpertiseList(profile?.learningNeeds || []);
    }
    setShowExpertiseModal(true);
  };

  // Handle save expertise/learning needs
  const handleSaveExpertise = async () => {
    try {
      setSaving(true);
      if (isTutor && profile?._id) {
        await tutorService.update(profile._id, { expertise: expertiseList });
        setProfile({ ...profile, expertise: expertiseList });
      } else if (isStudent) {
        await studentService.updateProfile({ learningNeeds: expertiseList });
        setProfile({ ...profile, learningNeeds: expertiseList });
      }
      setShowExpertiseModal(false);
      alert("Đã lưu thành công!");
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Không thể lưu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // Open session modal (for create or edit)
  const openSessionModal = (session = null) => {
    if (session) {
      setSessionForm({
        title: session.title || "",
        description: session.description || "",
        scheduledDate: session.scheduledDate
          ? new Date(session.scheduledDate).toISOString().split("T")[0]
          : "",
        startTime: session.startTime || "",
        endTime: session.endTime || "",
        location: session.location || "",
        meetingLink: session.meetingLink || "",
        sessionType: session.sessionType || "online",
        isOpen: session.isOpen ?? true,
      });
      setSelectedSession(session);
    } else {
      setSessionForm({
        title: "",
        description: "",
        scheduledDate: "",
        startTime: "",
        endTime: "",
        location: "",
        meetingLink: "",
        sessionType: "online",
        isOpen: true,
      });
      setSelectedSession(null);
    }
    setShowSessionModal(true);
  };

  // Handle save session (create or update)
  const handleSaveSession = async () => {
    try {
      setSaving(true);
      if (selectedSession) {
        // Update existing session
        const res = await sessionService.update(
          selectedSession._id,
          sessionForm
        );
        if (res.success) {
          setSessions(
            sessions.map((s) =>
              s._id === selectedSession._id ? { ...s, ...sessionForm } : s
            )
          );
          alert("Đã cập nhật buổi học!");
        } else {
          alert(res.message || "Cập nhật buổi học thất bại. Vui lòng thử lại.");
        }
      } else {
        // Create new session
        const res = await sessionService.create(sessionForm);
        if (res.success) {
          setSessions([res.data?.session || res.session, ...sessions]);
          alert("Đã tạo buổi học mới!");
        } else {
          alert(res.message || "Tạo buổi học thất bại. Vui lòng thử lại.");
        }
      }
      setShowSessionModal(false);
    } catch (error) {
      console.error("Failed to save session:", error);
      alert("Không thể lưu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete session
  const handleDeleteSession = async () => {
    if (deleteConfirmText !== "Delete this session") {
      alert("Vui lòng nhập đúng 'Delete this session' để xác nhận");
      return;
    }
    try {
      setSaving(true);
      await sessionService.cancel(selectedSession._id, "Deleted by user");
      setSessions(sessions.filter((s) => s._id !== selectedSession._id));
      setShowDeleteConfirm(false);
      setShowSessionModal(false);
      setDeleteConfirmText("");
      alert("Đã xóa buổi học!");
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Không thể xóa. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const SessionCard = ({ session, isPending = false }) => (
    <button
      onClick={() => openSessionModal(session)}
      className={`w-full p-3 rounded-lg text-white text-center transition-colors ${
        isPending
          ? "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
          : "bg-green-500 hover:bg-green-600"
      }`}
    >
      <p className="font-medium text-sm">{session.title}</p>
      <p className="text-xs opacity-80">
        {session.startTime} - {session.endTime},{" "}
        {new Date(session.scheduledDate).toLocaleDateString()}
      </p>
    </button>
  );

  if (loading) {
    return (
      <DashboardLayout
        title="My Profile"
        subtitle="Manage your personal information and account settings"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Profile"
      subtitle="Manage your personal information and account settings"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-500"
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
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Major</p>
                <p className="text-gray-900">
                  {user?.faculty || "Computer Science"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Data Synchronization */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Data Synchronization
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">
                  Last synchronized with university system
                </p>
                <p className="text-gray-900">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  (2 hours ago)
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Source system</p>
                <p className="text-gray-900">HCMUT_DATACORE</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Support Needs / Expertise */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {isStudent ? "Support Needs" : "Expertise"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {isStudent ? "Subjects You Need Help With" : "Areas of Expertise"}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {expertise.slice(0, 2).map((subject, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {subject}
                </span>
              ))}
              {expertise.length > 2 && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  +{expertise.length - 2}
                </span>
              )}
            </div>

            <button
              onClick={openExpertiseModal}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span>{isStudent ? "Edit Support Needs" : "Edit Expertise"}</span>
            </button>
          </div>

          {/* My Schedule */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              My Schedule
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Upcoming / Open Slots */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {isTutor ? "Open Slots" : "Upcoming"}
                </p>
                <div className="space-y-2">
                  {upcomingSessions.length === 0 ? (
                    <div className="bg-green-500 text-white p-3 rounded-lg text-center text-sm">
                      Nothing
                    </div>
                  ) : (
                    upcomingSessions
                      .slice(0, 3)
                      .map((session) => (
                        <SessionCard key={session._id} session={session} />
                      ))
                  )}
                </div>
              </div>

              {/* Pending / Booked Sessions */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {isTutor ? "Booked Sessions" : "Pending"}
                </p>
                <div className="space-y-2">
                  {pendingSessions.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-3">
                      No pending sessions
                    </p>
                  ) : (
                    pendingSessions
                      .slice(0, 3)
                      .map((session) => (
                        <SessionCard
                          key={session._id}
                          session={session}
                          isPending
                        />
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => openSessionModal(null)}
              className={`w-full mt-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                isTutor
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span>{isTutor ? "+ Add new session" : "Reschedule"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expertise Modal */}
      {showExpertiseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">List Expertise</h3>
              <button
                onClick={() => setShowExpertiseModal(false)}
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

            <div className="space-y-2 mb-4">
              {[
                "Database Systems",
                "Network Systems",
                "Digital Systems",
                "Data Structures",
                "Advanced Programming",
                "Machine Learning",
                "Computer Architecture",
              ].map((item) => {
                const isChecked = expertiseList.some(
                  (e) => (e.subject || e) === item
                );
                return (
                  <label
                    key={item}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <span className="text-gray-700">{item}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExpertiseList([
                            ...expertiseList,
                            isTutor
                              ? { subject: item, level: "intermediate" }
                              : {
                                  subject: item,
                                  currentLevel: "beginner",
                                  priority: "medium",
                                },
                          ]);
                        } else {
                          setExpertiseList(
                            expertiseList.filter(
                              (ex) => (ex.subject || ex) !== item
                            )
                          );
                        }
                      }}
                      className="w-4 h-4 text-blue-500"
                    />
                  </label>
                );
              })}
            </div>

            <button
              onClick={handleSaveExpertise}
              disabled={saving}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span>{saving ? "Đang lưu..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {selectedSession ? "Edit Session Details" : "Add New Session"}
              </h3>
              <button
                onClick={() => setShowSessionModal(false)}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={sessionForm.scheduledDate}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      scheduledDate: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End time
                  </label>
                  <input
                    type="time"
                    value={sessionForm.endTime}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {isTutor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Type
                  </label>
                  <select
                    value={sessionForm.sessionType}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        sessionType: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location / Meeting Link
                </label>
                <input
                  type="text"
                  placeholder="HCMUT or meet.google.com/xyz"
                  value={sessionForm.location || sessionForm.meetingLink}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      location:
                        sessionForm.sessionType === "offline"
                          ? e.target.value
                          : "",
                      meetingLink:
                        sessionForm.sessionType !== "offline"
                          ? e.target.value
                          : "",
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title of Session
                </label>
                <input
                  type="text"
                  placeholder="Tutoring session title"
                  value={sessionForm.title}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, title: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Discuss about..."
                  value={sessionForm.description}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              {selectedSession && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Delete Session</span>
                </button>
              )}
              <button
                onClick={handleSaveSession}
                disabled={saving}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
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
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                <span>
                  {saving
                    ? "Đang lưu..."
                    : selectedSession
                    ? "Save Changes"
                    : "+ Add new session"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Confirm Delete Session</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmation
              </label>
              <input
                type="text"
                placeholder='Type "Delete this session" to confirm'
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Type "Delete this session" to confirm that you want to delete
                the session
              </p>
            </div>

            <button
              onClick={handleDeleteSession}
              disabled={saving || deleteConfirmText !== "Delete this session"}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>{saving ? "Đang xóa..." : "Delete Session"}</span>
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProfilePage;
