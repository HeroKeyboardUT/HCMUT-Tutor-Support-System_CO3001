import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/Layout";
import { userService, tutorService } from "../services";

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  const systemSettings = [
    {
      key: "maxSessionsPerWeek",
      label: "Max Sessions Per Week",
      value: "10",
      type: "number",
    },
    {
      key: "sessionDuration",
      label: "Default Session Duration (minutes)",
      value: "90",
      type: "number",
    },
    {
      key: "autoMatchingEnabled",
      label: "Auto Matching",
      value: true,
      type: "toggle",
    },
    {
      key: "emailNotifications",
      label: "Email Notifications",
      value: true,
      type: "toggle",
    },
    {
      key: "maintenanceMode",
      label: "Maintenance Mode",
      value: false,
      type: "toggle",
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const usersRes = await userService.getAllUsers({ limit: 100 });
      const usersData = usersRes.data?.users || usersRes.users || [];
      setUsers(
        usersData.map((u) => ({
          id: u._id,
          name: u.fullName || `${u.firstName} ${u.lastName}`,
          email: u.email,
          role: u.role,
          status: u.isActive ? "active" : "pending",
          joinDate: new Date(u.createdAt).toLocaleDateString(),
        }))
      );

      // Fetch pending tutor approvals
      const tutorsRes = await tutorService.getPendingApprovals();
      const pendingTutors = tutorsRes.data?.tutors || tutorsRes.tutors || [];
      setPendingApprovals(
        pendingTutors.map((t) => ({
          id: t._id,
          name: t.user?.fullName || `${t.user?.firstName} ${t.user?.lastName}`,
          email: t.user?.email,
          role: "tutor",
          faculty: t.user?.faculty || t.faculty,
          requestDate: new Date(t.createdAt).toLocaleDateString(),
        }))
      );
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tutorId) => {
    try {
      setActionLoading(tutorId);
      await tutorService.approve(tutorId);
      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Failed to approve tutor:", error);
      alert("Không thể phê duyệt. Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (tutorId) => {
    if (!window.confirm("Bạn có chắc muốn từ chối tutor này?")) return;
    try {
      setActionLoading(tutorId);
      await tutorService.reject(tutorId);
      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Failed to reject tutor:", error);
      alert("Không thể từ chối. Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: "bg-red-100 text-red-700",
      coordinator: "bg-purple-100 text-purple-700",
      tutor: "bg-blue-100 text-blue-700",
      student: "bg-green-100 text-green-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  const getStatusBadge = (status) => {
    return status === "active"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";
  };

  const tabs = [
    { id: "users", label: "Users", count: users.length },
    {
      id: "approvals",
      label: "Pending Approvals",
      count: pendingApprovals.length,
    },
    { id: "settings", label: "System Settings" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 mt-1">
            Manage users, approvals, and system settings
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
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
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="text-gray-500 mt-4">Đang tải dữ liệu...</p>
          </div>
        )}

        {/* Users Tab */}
        {!loading && activeTab === "users" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
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
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users
                    .filter(
                      (u) =>
                        u.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        u.email
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                    )
                    .map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                {user.name[0]}
                              </span>
                            </div>
                            <div className="ml-3">
                              <p className="font-medium text-gray-900">
                                {user.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                              user.status
                            )}`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.joinDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-800">
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
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                            <button className="text-red-600 hover:text-red-800">
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Approvals Tab */}
        {!loading && activeTab === "approvals" && (
          <div className="space-y-4">
            {pendingApprovals.length === 0 ? (
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
                <p className="text-gray-500">No pending approvals</p>
              </div>
            ) : (
              pendingApprovals.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-600"
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
                        <h3 className="font-semibold text-gray-900">
                          {request.name}
                        </h3>
                        <p className="text-gray-500 text-sm">{request.email}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadge(
                              request.role
                            )}`}
                          >
                            {request.role}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-500">
                            {request.faculty}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          Requested: {request.requestDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-3 mt-4 md:mt-0">
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading === request.id}
                        className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === request.id ? "..." : "Reject"}
                      </button>
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={actionLoading === request.id}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === request.id ? "..." : "Approve"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* System Settings Tab */}
        {!loading && activeTab === "settings" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              System Configuration
            </h2>
            <div className="space-y-6">
              {systemSettings.map((setting) => (
                <div
                  key={setting.key}
                  className="flex items-center justify-between py-4 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">{setting.label}</p>
                    <p className="text-sm text-gray-500">{setting.key}</p>
                  </div>
                  {setting.type === "toggle" ? (
                    <button
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        setting.value ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          setting.value ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  ) : (
                    <input
                      type={setting.type}
                      defaultValue={setting.value}
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPage;
