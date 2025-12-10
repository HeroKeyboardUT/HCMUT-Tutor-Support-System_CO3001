import api from "./api";

const reportService = {
  // Get dashboard stats
  getDashboardStats: async () => {
    return await api.get("/reports/dashboard");
  },

  // Get overview stats (admin)
  getOverviewStats: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/reports/overview${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get session report (by subject)
  getSessionReport: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/reports/sessions-by-subject${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get tutor performance report
  getTutorPerformanceReport: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/reports/tutor-performance${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get matching report
  getMatchingReport: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/reports/matchings${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get student progress report
  getStudentProgressReport: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/reports/students${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get total hours (accurate calculation)
  getTotalHours: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/reports/total-hours${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get recent activity
  getRecentActivity: async (limit = 10) => {
    return await api.get(`/reports/recent-activity?limit=${limit}`);
  },

  // Get faculty report
  getFacultyReport: async () => {
    return await api.get("/reports/by-faculty");
  },

  // Get training points report
  getTrainingPointsReport: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/reports/training-points${queryString ? `?${queryString}` : ""}`
    );
  },

  // Export report
  exportReport: async (reportType, format = "json", params = {}) => {
    const queryParams = new URLSearchParams({
      type: reportType,
      format,
      ...params,
    }).toString();
    return await api.get(`/reports/export?${queryParams}`);
  },
};

export default reportService;
