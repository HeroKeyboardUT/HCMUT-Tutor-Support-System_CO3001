import api from "./api";

const studentService = {
  // Get all students (admin/coordinator)
  getAllStudents: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(`/students${queryString ? `?${queryString}` : ""}`);
  },

  // Get student by ID
  getStudentById: async (studentId) => {
    return await api.get(`/students/${studentId}`);
  },

  // Get my student profile
  getMyProfile: async () => {
    return await api.get("/students/me");
  },

  // Create student profile
  createProfile: async (profileData) => {
    return await api.post("/students/profile", profileData);
  },

  // Update my student profile
  updateProfile: async (profileData) => {
    return await api.put("/students/me", profileData);
  },

  // Get student stats
  getStats: async () => {
    return await api.get("/students/stats");
  },

  // Get student match history
  getMatchHistory: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/students/match-history${queryString ? `?${queryString}` : ""}`
    );
  },
};

export default studentService;
