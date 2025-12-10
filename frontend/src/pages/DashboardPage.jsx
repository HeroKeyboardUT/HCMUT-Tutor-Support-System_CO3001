import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DashboardLayout } from "../components/Layout";
import { sessionService, reportService, authService } from "../services";
import { Icons } from "../components/Icons";

// Stats Card Component with SVG icons
const StatsCard = ({ title, value, icon, color = "blue", link }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    red: "bg-red-50 text-red-600 border-red-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };

  const content = (
    <div
      className={`rounded-xl p-4 border ${colorClasses[color]} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value ?? "-"}</p>
        </div>
        <div className="opacity-50">{icon}</div>
      </div>
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
};

// Quick Action Button with SVG icons
const QuickAction = ({ to, icon, label, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-500 hover:bg-blue-600",
    green: "bg-green-500 hover:bg-green-600",
    purple: "bg-purple-500 hover:bg-purple-600",
    yellow: "bg-yellow-500 hover:bg-yellow-600",
  };

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 ${colorClasses[color]} text-white rounded-lg font-medium transition-colors`}
    >
      <span className="w-5 h-5">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const isStudent = user?.role === "student";
  const isTutor = user?.role === "tutor";
  const isAdmin = ["admin", "coordinator", "department_head"].includes(
    user?.role
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch permissions
        await authService.getPermissions();

        // Fetch dashboard stats
        const statsRes = await reportService.getDashboardStats();
        if (statsRes.success) {
          setStats(statsRes.data?.stats || {});
        }

        // Fetch sessions for calendar
        const sessionsRes = await sessionService.getAll({ limit: 20 });
        if (sessionsRes.success) {
          setSessions(sessionsRes.data?.sessions || sessionsRes.sessions || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get week dates for calendar
  const getWeekDates = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    start.setDate(diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentDate);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const timeSlots = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
  ];

  const formatMonth = (date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  // Group sessions by month
  const groupSessionsByMonth = (sessions) => {
    const grouped = {};
    sessions.forEach((session) => {
      const date = new Date(session.scheduledDate);
      const monthYear = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(session);
    });
    return grouped;
  };

  const groupedSessions = groupSessionsByMonth(sessions);
  const upcomingSessions = sessions.filter(
    (s) => s.status === "confirmed" || s.status === "pending"
  );
  const hasSessions = upcomingSessions.length > 0;

  // Get session position in calendar
  const getSessionForSlot = (date, time) => {
    const hour = parseInt(time.split(":")[0]);
    return sessions.find((session) => {
      const sessionDate = new Date(session.scheduledDate);
      const sessionHour = parseInt(session.startTime?.split(":")[0] || "0");
      return (
        sessionDate.toDateString() === date.toDateString() &&
        sessionHour === hour
      );
    });
  };

  // Render stats based on role
  const renderStats = () => {
    if (isStudent) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Completed Sessions"
            value={stats.completedSessions || 0}
            icon={Icons.check}
            color="green"
            link="/sessions"
          />
          <StatsCard
            title="Total Sessions"
            value={stats.totalSessions || 0}
            icon={Icons.book}
            color="blue"
            link="/sessions"
          />
          <StatsCard
            title="Training Points"
            value={stats.trainingPoints || 0}
            icon={Icons.trophy}
            color="yellow"
          />
          <StatsCard
            title="Active Tutors"
            value={stats.activeTutors || 0}
            icon={Icons.teacher}
            color="purple"
            link="/matching"
          />
        </div>
      );
    }

    if (isTutor) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Completed Sessions"
            value={stats.completedSessions || 0}
            icon={Icons.check}
            color="green"
            link="/sessions"
          />
          <StatsCard
            title="Total Sessions"
            value={stats.totalSessions || 0}
            icon={Icons.book}
            color="blue"
            link="/sessions"
          />
          <StatsCard
            title="Current Students"
            value={stats.currentStudents || 0}
            icon={Icons.student}
            color="purple"
          />
          <StatsCard
            title="Rating"
            value={stats.rating?.average?.toFixed(1) || "N/A"}
            icon={Icons.star}
            color="yellow"
          />
        </div>
      );
    }

    if (isAdmin) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Students"
            value={stats.totalStudents || 0}
            icon={Icons.student}
            color="blue"
            link="/admin"
          />
          <StatsCard
            title="Total Tutors"
            value={stats.totalTutors || 0}
            icon={Icons.teacher}
            color="green"
            link="/admin"
          />
          <StatsCard
            title="Total Sessions"
            value={stats.totalSessions || 0}
            icon={Icons.calendar}
            color="yellow"
            link="/sessions"
          />
          <StatsCard
            title="Active Matchings"
            value={stats.activeMatchings || 0}
            icon={Icons.users}
            color="indigo"
            link="/admin"
          />
        </div>
      );
    }

    return null;
  };

  // Render quick actions based on role
  const renderQuickActions = () => {
    return (
      <div className="flex flex-wrap gap-3 mb-6">
        {isStudent && (
          <>
            <QuickAction
              to="/sessions"
              icon={Icons.book}
              label="Browse Sessions"
              color="blue"
            />
            <QuickAction
              to="/matching"
              icon={Icons.search}
              label="Find Tutors"
              color="purple"
            />
            <QuickAction
              to="/feedback"
              icon={Icons.star}
              label="Give Feedback"
              color="yellow"
            />
          </>
        )}
        {isTutor && (
          <>
            <QuickAction
              to="/sessions/create"
              icon={Icons.plus}
              label="Create Session"
              color="green"
            />
            <QuickAction
              to="/sessions"
              icon={Icons.calendar}
              label="My Sessions"
              color="blue"
            />
            <QuickAction
              to="/feedback"
              icon={Icons.star}
              label="View Feedback"
              color="yellow"
            />
          </>
        )}
        {isAdmin && (
          <>
            <QuickAction
              to="/admin"
              icon={Icons.admin}
              label="Admin Panel"
              color="purple"
            />
            <QuickAction
              to="/reports"
              icon={Icons.chart}
              label="View Reports"
              color="blue"
            />
            <QuickAction
              to="/sessions"
              icon={Icons.calendar}
              label="All Sessions"
              color="green"
            />
          </>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout
      title={`Welcome, ${user?.firstName || "User"}!`}
      subtitle={
        isStudent
          ? "Track your learning progress and find tutors"
          : isTutor
          ? "Manage your sessions and connect with students"
          : "Overview of the tutoring system"
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {renderStats()}

          {/* Quick Actions */}
          {renderQuickActions()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Meetings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {isAdmin ? "Recent Sessions" : "Upcoming Meetings"}
              </h2>

              {!hasSessions ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 w-full">
                    <p className="text-gray-500 mb-2">
                      {isStudent
                        ? "You haven't joined any tutor program yet."
                        : isTutor
                        ? "You haven't created any sessions yet."
                        : "No recent sessions."}
                    </p>
                    <p className="text-gray-400 text-sm mb-4">
                      {isStudent
                        ? "Register for a tutor program to start scheduling sessions"
                        : isTutor
                        ? "Create a session to start meeting with students."
                        : "Sessions will appear here when created."}
                    </p>
                    {isStudent && (
                      <Link
                        to="/matching"
                        className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Find Tutors
                      </Link>
                    )}
                    {isTutor && (
                      <Link
                        to="/sessions/create"
                        className="inline-block bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Create Session
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedSessions)
                    .slice(0, 3)
                    .map(([month, monthSessions]) => (
                      <div key={month}>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                          {month}
                        </h3>
                        <div className="space-y-2">
                          {monthSessions.slice(0, 5).map((session) => (
                            <Link
                              key={session._id}
                              to={`/sessions/${session._id}`}
                              className={`flex items-center p-3 rounded-lg transition-colors ${
                                session.status === "confirmed"
                                  ? "bg-green-500 text-white hover:bg-green-600"
                                  : "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                              }`}
                            >
                              <span className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full mr-3 text-sm">
                                {new Date(session.scheduledDate).getDate()}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium">{session.title}</p>
                                <p className="text-sm opacity-80">
                                  {session.startTime} - {session.endTime}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}

                  {/* View All Link */}
                  <Link
                    to="/sessions"
                    className="block text-center text-blue-500 hover:text-blue-600 font-medium py-2"
                  >
                    View All Sessions →
                  </Link>
                </div>
              )}
            </div>

            {/* Calendar */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Calendar</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="text-sm text-gray-600">Upcoming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                </div>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center space-x-4 mb-4">
                <span className="font-medium text-gray-700">
                  {formatMonth(currentDate)}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => navigateWeek(-1)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg
                      className="w-4 h-4 text-gray-600"
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
                  </button>
                  <button
                    onClick={() => navigateWeek(1)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg
                      className="w-4 h-4 text-gray-600"
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
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-sm text-gray-500 font-normal text-left">
                        UTC +7
                      </th>
                      {weekDates.map((date, i) => (
                        <th key={i} className="p-2 text-center min-w-[80px]">
                          <div className="text-xl font-semibold text-gray-900">
                            {date.getDate()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {dayNames[i]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((time) => (
                      <tr key={time} className="border-t border-gray-100">
                        <td className="p-2 text-sm text-gray-400">{time}</td>
                        {weekDates.map((date, i) => {
                          const session = getSessionForSlot(date, time);
                          return (
                            <td
                              key={i}
                              className="p-1 border-l border-gray-100"
                            >
                              {session && (
                                <Link
                                  to={`/sessions/${session._id}`}
                                  className={`block p-2 rounded-lg text-center text-sm font-medium transition-colors ${
                                    session.status === "confirmed"
                                      ? "bg-green-500 text-white hover:bg-green-600"
                                      : "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                                  }`}
                                >
                                  {session.tutor?.user?.firstName || "Mentor"}
                                </Link>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
