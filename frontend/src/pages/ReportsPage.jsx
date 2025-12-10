import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/Layout";
import { reportService } from "../services";

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState("month");
  const [loading, setLoading] = useState(true);

  // Data from API
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalHours: 0,
    activeStudents: 0,
    avgRating: 0,
    completionRate: 0,
    totalTutors: 0,
  });
  const [topTutors, setTopTutors] = useState([]);
  const [popularSubjects, setPopularSubjects] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get date range params
        const now = new Date();
        let startDate;
        switch (dateRange) {
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "quarter":
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
          case "year":
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default: // month
            startDate = new Date(now.setMonth(now.getMonth() - 1));
        }

        const params = { startDate: startDate.toISOString() };

        // Fetch dashboard stats
        const dashboardRes = await reportService.getDashboardStats();
        const dashboardStats = dashboardRes.data?.stats || {};

        // Fetch tutor performance
        const tutorRes = await reportService.getTutorPerformanceReport(params);
        const tutorData = tutorRes.data?.performance || tutorRes.data || [];

        // Fetch session report (for popular subjects)
        const sessionRes = await reportService.getSessionReport(params);
        const sessionData = sessionRes.data?.stats || [];

        // Fetch total hours (accurate)
        const hoursRes = await reportService.getTotalHours(params);
        const totalHours = hoursRes.data?.totalHours || 0;

        // Fetch recent activity
        const activityRes = await reportService.getRecentActivity(10);
        const activityData = activityRes.data?.activities || [];

        // Calculate stats
        const completedSessions = dashboardStats.completedSessions || 0;
        const totalSessions = dashboardStats.totalSessions || 0;
        const completionRate =
          totalSessions > 0
            ? Math.round((completedSessions / totalSessions) * 100)
            : 0;

        // Handle avgRating - it might be an object {average, count} or a number
        const avgRatingValue =
          typeof dashboardStats.avgRating === "object"
            ? dashboardStats.avgRating?.average || 0
            : dashboardStats.avgRating || 0;

        setStats({
          totalSessions: totalSessions,
          totalHours: totalHours, // Use actual calculated hours
          activeStudents: dashboardStats.totalStudents || 0,
          avgRating: Number(avgRatingValue).toFixed(1),
          completionRate: completionRate,
          totalTutors: dashboardStats.totalTutors || 0,
        });

        // Format top tutors
        setTopTutors(
          (Array.isArray(tutorData) ? tutorData : []).slice(0, 4).map((t) => ({
            name: t.name || "Unknown Tutor",
            sessions: t.totalSessions || 0,
            rating:
              typeof t.rating === "object"
                ? Number(t.rating?.average || 0).toFixed(1)
                : Number(t.rating || 0).toFixed(1),
            students: t.currentStudents || 0,
          }))
        );

        // Format popular subjects
        const totalSubjectSessions = sessionData.reduce(
          (sum, s) => sum + (s.totalSessions || 0),
          0
        );
        setPopularSubjects(
          (Array.isArray(sessionData) ? sessionData : [])
            .slice(0, 5)
            .map((s) => ({
              name: s._id || "Unknown Subject",
              sessions: s.totalSessions || 0,
              percentage:
                totalSubjectSessions > 0
                  ? Math.round((s.totalSessions / totalSubjectSessions) * 100)
                  : 0,
            }))
        );

        // Recent activity - using new endpoint
        setRecentActivity(
          activityData.length > 0
            ? activityData.map((a) => ({
                type: a.type,
                message: a.message,
                time: new Date(a.time).toLocaleString("vi-VN"),
              }))
            : [{ type: "info", message: "No recent activity", time: "" }]
        );
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reports & Analytics
            </h1>
            <p className="text-gray-500 mt-1">
              Monitor system performance and activity
            </p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="mt-4 md:mt-0 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 3 months</option>
            <option value="year">Last year</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="text-gray-500 mt-4">Đang tải dữ liệu báo cáo...</p>
          </div>
        )}

        {/* Stats Grid */}
        {!loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600"
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
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.totalSessions}
                </p>
                <p className="text-sm text-gray-500">Total Sessions</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600"
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
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.totalHours}
                </p>
                <p className="text-sm text-gray-500">Total Hours</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-purple-600"
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
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.activeStudents}
                </p>
                <p className="text-sm text-gray-500">Active Students</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-yellow-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.avgRating}
                </p>
                <p className="text-sm text-gray-500">Avg Rating</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-teal-600"
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
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.completionRate}%
                </p>
                <p className="text-sm text-gray-500">Completion</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">
                  {stats.totalTutors}
                </p>
                <p className="text-sm text-gray-500">Active Tutors</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top Tutors */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Top Performing Tutors
                </h2>
                <div className="space-y-4">
                  {topTutors.map((tutor, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-blue-600">
                            {i + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {tutor.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {tutor.sessions} sessions • {tutor.students}{" "}
                            students
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <svg
                          className="w-4 h-4 text-yellow-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="ml-1 font-medium text-gray-900">
                          {tutor.rating}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Subjects */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Popular Subjects
                </h2>
                <div className="space-y-4">
                  {popularSubjects.map((subject, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700">{subject.name}</span>
                        <span className="text-sm text-gray-500">
                          {subject.sessions} sessions
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${subject.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        activity.type === "session"
                          ? "bg-blue-100"
                          : activity.type === "feedback"
                          ? "bg-yellow-100"
                          : activity.type === "matching"
                          ? "bg-green-100"
                          : "bg-purple-100"
                      }`}
                    >
                      {activity.type === "session" && (
                        <svg
                          className="w-4 h-4 text-blue-600"
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
                      )}
                      {activity.type === "feedback" && (
                        <svg
                          className="w-4 h-4 text-yellow-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                      {activity.type === "matching" && (
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                      )}
                      {activity.type === "user" && (
                        <svg
                          className="w-4 h-4 text-purple-600"
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
                      <p className="text-gray-900">{activity.message}</p>
                      <p className="text-sm text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
