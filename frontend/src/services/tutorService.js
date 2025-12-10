import api from "./api";

// Tutor Service
const tutorService = {
  // Get all tutors
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(`/tutors${queryString ? `?${queryString}` : ""}`);
  },

  // Get tutor by ID
  getById: async (id) => {
    return await api.get(`/tutors/${id}`);
  },

  // Get my tutor profile
  getMyProfile: async () => {
    return await api.get("/tutors/me/profile");
  },

  // Create tutor profile
  create: async (data) => {
    return await api.post("/tutors", data);
  },

  // Update tutor profile
  update: async (id, data) => {
    return await api.put(`/tutors/${id}`, data);
  },

  // Get pending tutor approvals (admin/coordinator)
  getPendingApprovals: async () => {
    return await api.get("/tutors/pending");
  },

  // Approve tutor
  approve: async (id) => {
    return await api.put(`/tutors/${id}/approve`);
  },

  // Reject tutor
  reject: async (id) => {
    return await api.delete(`/tutors/${id}`);
  },
};

export default tutorService;
