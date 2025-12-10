import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  LoadingSpinner,
  Modal,
  TextArea,
  Select,
} from "../components/ui";
import { sessionService, feedbackService } from "../services";
import { useAuth } from "../contexts/AuthContext";

const SessionDetailPage = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const res = await sessionService.getById(sessionId);
        if (res.success) {
          setSession(res.data?.session || res.session);
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
        setError(
          err.response?.data?.message || "Không thể tải thông tin buổi học"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleCancelSession = async () => {
    if (!window.confirm("Bạn có chắc muốn hủy buổi học này?")) return;

    try {
      setSubmitting(true);
      await sessionService.cancel(sessionId);
      navigate("/sessions");
    } catch (err) {
      alert(err.response?.data?.message || "Không thể hủy buổi học");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSession = async () => {
    try {
      setSubmitting(true);
      const res = await sessionService.start(sessionId);
      if (res.success) {
        setSession(res.data?.session || res.session);
        alert("Đã bắt đầu buổi học!");
      } else {
        // Show specific error message from backend
        const errorMsg = res.message || "Không thể bắt đầu buổi học";
        if (errorMsg.includes("confirmed")) {
          alert(
            "Session cần được xác nhận trước khi bắt đầu. Vui lòng click 'Xác nhận Session' trước."
          );
        } else {
          alert(errorMsg);
        }
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Không thể bắt đầu buổi học";
      console.error("Start session error:", err.response?.data || err);
      if (errorMsg.includes("confirmed")) {
        alert(
          "Session cần được xác nhận trước khi bắt đầu. Vui lòng click 'Xác nhận Session' trước."
        );
      } else if (errorMsg.includes("tutor")) {
        alert("Chỉ tutor của session này mới có thể bắt đầu buổi học.");
      } else {
        alert(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSession = async () => {
    try {
      setSubmitting(true);
      const res = await sessionService.confirm(sessionId);
      if (res.success) {
        setSession(res.data?.session || res.session);
        alert("Session đã được xác nhận!");
      } else {
        alert(res.message || "Không thể xác nhận session");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xác nhận session");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSession = async () => {
    try {
      setSubmitting(true);
      const res = await sessionService.complete(sessionId);
      if (res.success) {
        setSession(res.data?.session || res.session);
        alert("Đã hoàn thành buổi học!");
      } else {
        alert(res.message || "Không thể hoàn thành buổi học");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể hoàn thành buổi học");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await feedbackService.createFeedback({
        sessionId: sessionId,
        ratings: { overall: parseInt(feedback.rating) },
        comment: feedback.comment,
      });
      setShowFeedbackModal(false);
      alert("Đã gửi đánh giá thành công!");
    } catch (err) {
      alert(err.message || "Không thể gửi đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { variant: "warning", label: "Chờ xác nhận" },
      confirmed: { variant: "primary", label: "Đã xác nhận" },
      in_progress: { variant: "info", label: "Đang diễn ra" },
      completed: { variant: "success", label: "Hoàn thành" },
      cancelled: { variant: "danger", label: "Đã hủy" },
      no_show: { variant: "secondary", label: "Vắng mặt" },
    };
    return config[status] || { variant: "secondary", label: status };
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">{error}</h2>
            <Link to="/sessions">
              <Button variant="primary">Quay lại danh sách</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const statusConfig = getStatusBadge(session?.status);
  const userId = user?._id || user?.id;
  // Check if current user is the tutor of THIS session (compare user ID with session's tutor user ID)
  const tutorUserId = session?.tutor?.user?._id || session?.tutor?.user;
  const isSessionTutor =
    user?.role === "tutor" &&
    (tutorUserId === userId || String(tutorUserId) === String(userId));

  // Check if current user is the student of THIS session
  const studentUserId = session?.student?.user?._id || session?.student?.user;
  const isSessionStudent =
    user?.role === "student" &&
    (studentUserId === userId || String(studentUserId) === String(userId));

  const canConfirm = isSessionTutor && session?.status === "pending";
  const canStart = isSessionTutor && session?.status === "confirmed";
  const canComplete = isSessionTutor && session?.status === "in_progress";
  const canCancel =
    ["pending", "confirmed"].includes(session?.status) &&
    (isSessionTutor || isSessionStudent);
  // Both tutor and student can give feedback after session is completed
  const canFeedback =
    session?.status === "completed" && (isSessionTutor || isSessionStudent);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          to="/sessions"
          className="inline-flex items-center text-blue-600 hover:underline mb-6"
        >
          ← Quay lại danh sách
        </Link>

        {/* Session Header */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {session?.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                  <Badge
                    variant={
                      session?.sessionType === "online"
                        ? "primary"
                        : "secondary"
                    }
                  >
                    {session?.sessionType === "online"
                      ? "Online"
                      : session?.sessionType === "offline"
                      ? "Offline"
                      : "Hybrid"}
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {canConfirm && (
                  <Button
                    variant="primary"
                    onClick={handleConfirmSession}
                    loading={submitting}
                  >
                    Xác nhận Session
                  </Button>
                )}
                {canStart && (
                  <Button
                    variant="success"
                    onClick={handleStartSession}
                    loading={submitting}
                  >
                    Bắt đầu buổi học
                  </Button>
                )}
                {canComplete && (
                  <Button
                    variant="primary"
                    onClick={handleCompleteSession}
                    loading={submitting}
                  >
                    Hoàn thành
                  </Button>
                )}
                {canFeedback && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowFeedbackModal(true)}
                  >
                    Đánh giá
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="danger"
                    onClick={handleCancelSession}
                    loading={submitting}
                  >
                    Hủy buổi học
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Time & Location */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Thời gian & Địa điểm</h2>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Ngày</dt>
                  <dd className="font-medium">
                    {formatDate(session?.scheduledDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Giờ</dt>
                  <dd className="font-medium">
                    {session?.startTime} - {session?.endTime}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Thời lượng</dt>
                  <dd className="font-medium">{session?.duration} phút</dd>
                </div>
                {session?.location && (
                  <div>
                    <dt className="text-sm text-gray-500">Địa điểm</dt>
                    <dd className="font-medium">{session.location}</dd>
                  </div>
                )}
                {session?.meetingLink && (
                  <div>
                    <dt className="text-sm text-gray-500">Link meeting</dt>
                    <dd>
                      <a
                        href={session.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {session.meetingLink}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* Subject & Content */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Nội dung</h2>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Môn học</dt>
                  <dd className="font-medium">{session?.subject}</dd>
                </div>
                {session?.courseCode && (
                  <div>
                    <dt className="text-sm text-gray-500">Mã môn</dt>
                    <dd className="font-medium">{session.courseCode}</dd>
                  </div>
                )}
                {session?.topics?.length > 0 && (
                  <div>
                    <dt className="text-sm text-gray-500">Chủ đề</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {session.topics.map((topic, i) => (
                        <Badge key={i} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>
        </div>

        {/* Participants */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Người tham gia</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {/* Tutor */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                  {session?.tutor?.user?.firstName?.[0] || "T"}
                </div>
                <div>
                  <div className="text-sm text-gray-500">Tutor</div>
                  <div className="font-medium">
                    {session?.tutor?.user?.fullName ||
                      `${session?.tutor?.user?.firstName || ""} ${
                        session?.tutor?.user?.lastName || ""
                      }`.trim() ||
                      "N/A"}
                  </div>
                </div>
              </div>

              {/* Students - Show registeredStudents for open sessions */}
              <div>
                <div className="text-sm text-gray-500 mb-3">
                  Học viên đã đăng ký
                  {session?.isOpen && session?.maxParticipants && (
                    <span className="text-blue-600 font-medium">
                      {" "}
                      ({session?.registeredStudents?.length || 0}/
                      {session?.maxParticipants})
                    </span>
                  )}
                </div>

                {/* Single student (old model) */}
                {session?.student && !session?.isOpen && (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg">
                      {session?.student?.user?.firstName?.[0] || "S"}
                    </div>
                    <div>
                      <div className="font-medium">
                        {session?.student?.user?.fullName ||
                          `${session?.student?.user?.firstName || ""} ${
                            session?.student?.user?.lastName || ""
                          }`.trim() ||
                          "N/A"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Multiple registered students (open session) */}
                {session?.isOpen && session?.registeredStudents?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {session.registeredStudents.map((reg, index) => (
                      <div
                        key={reg._id || index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                          {reg.student?.user?.firstName?.[0] || "S"}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {reg.student?.user?.fullName ||
                              `${reg.student?.user?.firstName || ""} ${
                                reg.student?.user?.lastName || ""
                              }`.trim() ||
                              "Học viên"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Đăng ký:{" "}
                            {new Date(reg.registeredAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : session?.isOpen ? (
                  <div className="text-gray-500 italic">
                    Chưa có học viên đăng ký
                  </div>
                ) : !session?.student ? (
                  <div className="text-gray-500 italic">Chưa có học viên</div>
                ) : null}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Description */}
        {session?.description && (
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-lg font-semibold">Mô tả</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700 whitespace-pre-wrap">
                {session.description}
              </p>
            </CardBody>
          </Card>
        )}

        {/* Notes */}
        {session?.notes && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Ghi chú</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700 whitespace-pre-wrap">
                {session.notes}
              </p>
            </CardBody>
          </Card>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <Modal
            title="Đánh giá buổi học"
            onClose={() => setShowFeedbackModal(false)}
          >
            <form onSubmit={handleSubmitFeedback}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đánh giá
                  </label>
                  <Select
                    value={feedback.rating}
                    onChange={(e) =>
                      setFeedback({ ...feedback, rating: e.target.value })
                    }
                  >
                    <option value="5">⭐⭐⭐⭐⭐ - Xuất sắc</option>
                    <option value="4">⭐⭐⭐⭐ - Tốt</option>
                    <option value="3">⭐⭐⭐ - Khá</option>
                    <option value="2">⭐⭐ - Trung bình</option>
                    <option value="1">⭐ - Kém</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhận xét
                  </label>
                  <TextArea
                    value={feedback.comment}
                    onChange={(e) =>
                      setFeedback({ ...feedback, comment: e.target.value })
                    }
                    placeholder="Chia sẻ trải nghiệm của bạn về buổi học..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowFeedbackModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" loading={submitting}>
                    Gửi đánh giá
                  </Button>
                </div>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default SessionDetailPage;
