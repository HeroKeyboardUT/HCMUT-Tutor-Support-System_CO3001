import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../components/Layout";
import { sessionService } from "../services";
import { useAuth } from "../contexts/AuthContext";

const SessionsPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, upcoming, completed, cancelled

  const isStudent = user?.role === "student";
  const isTutor = user?.role === "tutor";

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await sessionService.getAll();
        if (res.success) {
          setSessions(res.data?.sessions || res.sessions || []);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (filter === "upcoming")
      return s.status === "confirmed" || s.status === "pending";
    if (filter === "completed") return s.status === "completed";
    if (filter === "cancelled") return s.status === "cancelled";
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-400 text-gray-900";
      case "completed":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <DashboardLayout title="Sessions" subtitle="Manage your tutoring sessions">
      <div className="bg-white rounded-2xl shadow-sm">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 p-6 border-b border-gray-100">
          {["all", "upcoming", "completed", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filter === f
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-500">No sessions found</p>
              {isStudent && (
                <Link
                  to="/matching"
                  className="inline-block mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Find a Tutor
                </Link>
              )}
              {isTutor && (
                <Link
                  to="/sessions/create"
                  className="inline-block mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Session
                </Link>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <Link
                key={session._id}
                to={`/sessions/${session._id}`}
                className="flex items-center p-6 hover:bg-gray-50 transition-colors"
              >
                {/* Date Badge */}
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex flex-col items-center justify-center mr-4">
                  <span className="text-xs text-gray-500 uppercase">
                    {new Date(session.scheduledDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                      }
                    )}
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {new Date(session.scheduledDate).getDate()}
                  </span>
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {session.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs text-white font-medium ${getStatusColor(
                        session.status
                      )}`}
                    >
                      {session.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">
                    {session.subject ||
                      session.tutor?.user?.fullName ||
                      "Tutoring Session"}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
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
                      {session.startTime} - {session.endTime} (
                      {session.duration} mins)
                    </span>
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
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
                      {session.sessionType === "online"
                        ? "Online"
                        : session.location || "TBD"}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SessionsPage;
