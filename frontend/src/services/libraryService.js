import api from "./api";

// Library Service
const libraryService = {
  // Get all resources
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(`/library${queryString ? `?${queryString}` : ""}`);
  },

  // Get resource by ID
  getById: async (id) => {
    return await api.get(`/library/${id}`);
  },

  // Get by course
  getByCourse: async (courseCode) => {
    return await api.get(`/library/course/${courseCode}`);
  },

  // Create resource
  create: async (data) => {
    return await api.post("/library", data);
  },

  // Update resource
  update: async (id, data) => {
    return await api.put(`/library/${id}`, data);
  },

  // Delete resource
  delete: async (id) => {
    return await api.delete(`/library/${id}`);
  },

  // Record download
  recordDownload: async (id) => {
    return await api.post(`/library/${id}/download`);
  },
};

export default libraryService;
