import api from "./api";

// Matching Service
const matchingService = {
  // Get all matchings
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(`/matchings${queryString ? `?${queryString}` : ""}`);
  },

  // Request matching
  request: async (data) => {
    return await api.post("/matchings", data);
  },

  // Get AI suggestions
  getAISuggestions: async (data) => {
    return await api.post("/matchings/ai-suggest", data);
  },

  // Approve matching
  approve: async (id) => {
    return await api.put(`/matchings/${id}/approve`);
  },

  // Reject matching
  reject: async (id, reason) => {
    return await api.put(`/matchings/${id}/reject`, { reason });
  },

  // Complete matching
  complete: async (id, data) => {
    return await api.put(`/matchings/${id}/complete`, data);
  },
};

export default matchingService;
