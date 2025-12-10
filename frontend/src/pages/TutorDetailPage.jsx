import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DashboardLayout } from "../components/Layout";
import { tutorService, chatService } from "../services";

const TutorDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    const fetchTutor = async () => {
      try {
        const res = await tutorService.getById(id);
        if (res.success) {
          setTutor(res.data?.tutor || res.tutor);
        }
      } catch (error) {
        console.error("Failed to fetch tutor:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTutor();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!tutor) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-2xl p-12 text-center">
          <p className="text-gray-500">Tutor not found</p>
          <Link
            to="/tutors"
            className="text-blue-500 hover:underline mt-4 inline-block"
          >
            Back to Tutors
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: "about", label: "About" },
    { id: "availability", label: "Availability" },
    { id: "reviews", label: "Reviews" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link
          to="/tutors"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Tutors
        </Link>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mb-4 md:mb-0 overflow-hidden">
              {tutor.user?.avatar ? (
                <img
                  src={tutor.user.avatar}
                  alt={tutor.user?.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-12 h-12 text-gray-500"
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

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {tutor.user?.fullName ||
                      `${tutor.user?.firstName || ""} ${
                        tutor.user?.lastName || ""
                      }`.trim() ||
                      "N/A"}
                  </h1>
                  <p className="text-gray-500">
                    {tutor.user?.faculty ||
                      tutor.user?.department ||
                      "Computer Science"}
                  </p>
                </div>
                <div className="flex items-center mt-2 md:mt-0">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${
                        star <= (tutor.rating?.average || 0)
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-gray-600 ml-2">
                    {tutor.rating?.average?.toFixed(1) || "0.0"} (
                    {tutor.rating?.count || 0} reviews)
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {tutor.stats?.completedSessions || 0}
                  </p>
                  <p className="text-sm text-gray-500">Sessions</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {tutor.stats?.totalStudents || 0}
                  </p>
                  <p className="text-sm text-gray-500">Students</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {tutor.experience || 0}
                  </p>
                  <p className="text-sm text-gray-500">Years Exp.</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {(tutor.expertise || []).length}
                  </p>
                  <p className="text-sm text-gray-500">Subjects</p>
                </div>
              </div>

              {/* Expertise Tags */}
              <div className="flex flex-wrap gap-2">
                {(tutor.expertise || []).map((exp, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 text-blue-600 text-sm rounded-full"
                  >
                    {exp.subject || exp}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              {user && user.id !== tutor.user?._id && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={async () => {
                      try {
                        setStartingChat(true);
                        const res = await chatService.getOrCreateConversation(
                          tutor.user?._id
                        );
                        if (res.success) {
                          navigate(`/chat/${res.data?.conversation?._id}`);
                        }
                      } catch (error) {
                        console.error("Failed to start chat:", error);
                        alert(
                          "Không thể bắt đầu trò chuyện. Vui lòng thử lại."
                        );
                      } finally {
                        setStartingChat(false);
                      }
                    }}
                    disabled={startingChat}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {startingChat ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    )}
                    Nhắn tin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 text-center font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* About Tab */}
            {activeTab === "about" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">About Me</h3>
                  <p className="text-gray-600">
                    {tutor.bio || "This tutor hasn't added a bio yet."}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Teaching Style
                  </h3>
                  <p className="text-gray-600">
                    {tutor.teachingStyle ||
                      "Focus on problem-solving and practical examples."}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Education
                  </h3>
                  <ul className="space-y-2">
                    {(tutor.education || []).length > 0 ? (
                      tutor.education.map((edu, i) => (
                        <li key={i} className="flex items-start space-x-3">
                          <svg
                            className="w-5 h-5 text-blue-500 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 14l9-5-9-5-9 5 9 5z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                            />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900">
                              {edu.degree}
                            </p>
                            <p className="text-sm text-gray-500">
                              {edu.institution}
                            </p>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500">
                        No education info available
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(tutor.languages || ["Vietnamese", "English"]).map(
                      (lang, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {lang}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === "availability" && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">
                  Weekly Availability
                </h3>
                <div className="grid grid-cols-7 gap-2 mb-6">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day, i) => {
                      const isAvailable = (tutor.availability || []).some(
                        (a) => a.dayOfWeek === i + 1
                      );
                      return (
                        <div
                          key={day}
                          className={`p-3 rounded-lg text-center ${
                            isAvailable
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          <p className="font-medium">{day}</p>
                          <p className="text-xs">
                            {isAvailable ? "Available" : "Unavailable"}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="space-y-3">
                  {(tutor.availability || []).map((slot, i) => {
                    const days = [
                      "",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ];
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">
                          {days[slot.dayOfWeek]}
                        </span>
                        <span className="text-gray-600">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    );
                  })}
                  {(tutor.availability || []).length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No availability set
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                {(tutor.reviews || []).length > 0 ? (
                  tutor.reviews.map((review, i) => (
                    <div
                      key={i}
                      className="border-b last:border-0 pb-4 last:pb-0"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {review.student?.firstName?.[0] || "S"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">
                              {review.student?.firstName}{" "}
                              {review.student?.lastName}
                            </p>
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-600 mt-1">{review.comment}</p>
                          <p className="text-sm text-gray-400 mt-2">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No reviews yet
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <Link
            to={`/matching?tutor=${tutor._id}`}
            className="w-full block bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-semibold text-center transition-colors"
          >
            Request Tutoring Session
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TutorDetailPage;
