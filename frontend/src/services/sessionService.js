import api from "./api";

// Session Service
const sessionService = {
  // Get all sessions
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(`/sessions${queryString ? `?${queryString}` : ""}`);
  },

  // Get available/open sessions for registration
  getAvailable: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/sessions/available${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get session by ID
  getById: async (id) => {
    return await api.get(`/sessions/${id}`);
  },

  // Create session
  create: async (data) => {
    return await api.post("/sessions", data);
  },

  // Register for an open session
  register: async (id) => {
    return await api.post(`/sessions/${id}/register`);
  },

  // Update session
  update: async (id, data) => {
    return await api.put(`/sessions/${id}`, data);
  },

  // Cancel session
  cancel: async (id, reason) => {
    return await api.put(`/sessions/${id}/cancel`, { reason });
  },

  // Confirm session
  confirm: async (id) => {
    return await api.put(`/sessions/${id}/confirm`);
  },

  // Complete session (directly completes the session)
  start: async (id) => {
    return await api.put(`/sessions/${id}/start`);
  },

  // Complete session with notes
  complete: async (id, data) => {
    return await api.put(`/sessions/${id}/complete`, data);
  },

  // Add material
  addMaterial: async (id, material) => {
    return await api.post(`/sessions/${id}/materials`, material);
  },
};

export default sessionService;
