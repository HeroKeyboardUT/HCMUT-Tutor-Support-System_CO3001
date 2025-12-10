import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/Layout";
import { sessionService, feedbackService } from "../services";
import { useAuth } from "../contexts/AuthContext";

const FeedbackPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedSession, setSelectedSession] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState([]);
  const [givenFeedback, setGivenFeedback] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch completed sessions for the current user
        const sessionsRes = await sessionService.getAll({
          status: "completed",
          limit: 50,
        });
        const sessions =
          sessionsRes.data?.sessions || sessionsRes.sessions || [];

        // Filter sessions that need feedback based on user role
        if (user?.role === "student") {
          // For students: sessions where hasStudentFeedback is false
          const pending = sessions.filter((s) => !s.hasStudentFeedback);
          setPendingFeedback(
            pending.map((s) => ({
              id: s._id,
              sessionTitle: s.title,
              tutor: s.tutor?.user?.fullName || "Tutor",
              date: new Date(s.scheduledDate).toLocaleDateString("vi-VN"),
              time: `${s.startTime} - ${s.endTime}`,
              session: s,
            }))
          );
        } else if (user?.role === "tutor") {
          // For tutors: sessions where hasTutorFeedback is false
          const pending = sessions.filter((s) => !s.hasTutorFeedback);
          setPendingFeedback(
            pending.map((s) => ({
              id: s._id,
              sessionTitle: s.title,
              tutor:
                s.student?.user?.fullName ||
                s.registeredStudents?.[0]?.student?.user?.fullName ||
                "Student",
              date: new Date(s.scheduledDate).toLocaleDateString("vi-VN"),
              time: `${s.startTime} - ${s.endTime}`,
              session: s,
            }))
          );
        }

        // Fetch given feedback using the correct endpoint
        try {
          const feedbackRes = await feedbackService.getMyGivenFeedback();
          const feedbacks = feedbackRes.data?.feedback || [];
          setGivenFeedback(
            feedbacks.map((f) => ({
              id: f._id,
              sessionTitle: f.session?.title || "Session",
              tutor: f.toUser?.fullName || "User",
              date: new Date(f.createdAt).toLocaleDateString("vi-VN"),
              rating: f.ratings?.overall || 0,
              comment: f.comment || "",
            }))
          );
        } catch (feedbackError) {
          console.error("Failed to fetch given feedback:", feedbackError);
          setGivenFeedback([]);
        }
      } catch (error) {
        console.error("Failed to fetch feedback data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSubmitFeedback = async () => {
    if (!selectedSession || rating === 0) return;

    try {
      setSubmitting(true);
      const result = await feedbackService.createFeedback({
        sessionId: selectedSession.id,
        ratings: { overall: rating },
        comment,
      });

      if (result.success) {
        // Remove from pending
        setPendingFeedback(
          pendingFeedback.filter((p) => p.id !== selectedSession.id)
        );

        // Add to given feedback
        setGivenFeedback([
          {
            id: result.data?.feedback?._id || Date.now(),
            sessionTitle: selectedSession.sessionTitle,
            tutor: selectedSession.tutor,
            date: new Date().toLocaleDateString("vi-VN"),
            rating,
            comment,
          },
          ...givenFeedback,
        ]);

        setSelectedSession(null);
        setRating(0);
        setComment("");
        alert("Đã gửi đánh giá thành công!");
      } else {
        alert(result.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert(error.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Session Feedback</h1>
          <p className="text-gray-500 mt-1">
            Rate your tutoring sessions and view your feedback history
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === "pending"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Pending Feedback
              {pendingFeedback.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                  {pendingFeedback.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("given")}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === "given"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Feedback History
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="text-gray-500 mt-4">Đang tải dữ liệu...</p>
          </div>
        )}

        {/* Content */}
        {!loading && activeTab === "pending" && (
          <div className="space-y-4">
            {pendingFeedback.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-500">No pending feedback!</p>
              </div>
            ) : (
              pendingFeedback.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {session.sessionTitle}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        with {session.tutor}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {session.date} • {session.time}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="mt-4 md:mt-0 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Give Feedback
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && activeTab === "given" && (
          <div className="space-y-4">
            {givenFeedback.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
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
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
                <p className="text-gray-500">No feedback given yet</p>
              </div>
            ) : (
              givenFeedback.map((feedback) => (
                <div
                  key={feedback.id}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {feedback.sessionTitle}
                      </h3>
                      <p className="text-gray-500 text-sm">{feedback.tutor}</p>
                      <p className="text-gray-400 text-sm">{feedback.date}</p>
                    </div>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= feedback.rating
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
                  <p className="text-gray-600 bg-gray-50 rounded-lg p-3">
                    {feedback.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Feedback Modal */}
        {selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Rate Your Session
                </h2>
                <button
                  onClick={() => {
                    setSelectedSession(null);
                    setRating(0);
                    setComment("");
                  }}
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

              <div className="mb-6">
                <p className="font-medium text-gray-900">
                  {selectedSession.sessionTitle}
                </p>
                <p className="text-gray-500 text-sm">
                  with {selectedSession.tutor}
                </p>
              </div>

              {/* Star Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <svg
                        className={`w-10 h-10 transition-colors ${
                          star <= rating
                            ? "text-yellow-400"
                            : "text-gray-300 hover:text-yellow-200"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-center text-gray-500 text-sm mt-2">
                  {rating === 0 && "Select a rating"}
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </p>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setSelectedSession(null);
                    setRating(0);
                    setComment("");
                  }}
                  disabled={submitting}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0 || submitting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {submitting ? "Đang gửi..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FeedbackPage;
