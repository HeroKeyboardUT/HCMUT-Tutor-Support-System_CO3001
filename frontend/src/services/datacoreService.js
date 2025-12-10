import api from "./api";

const datacoreService = {
  // Get DataCore records (admin)
  getRecords: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(`/datacore${queryString ? `?${queryString}` : ""}`);
  },

  // Get record by ID
  getRecordById: async (recordId) => {
    return await api.get(`/datacore/${recordId}`);
  },

  // Sync student data
  syncStudent: async (studentId) => {
    return await api.post("/datacore/sync/student", { studentId });
  },

  // Sync tutor data
  syncTutor: async (tutorId) => {
    return await api.post("/datacore/sync/tutor", { tutorId });
  },

  // Verify student data
  verifyStudent: async (userId) => {
    return await api.get(`/datacore/verify/student/${userId}`);
  },

  // Verify tutor data
  verifyTutor: async (userId) => {
    return await api.get(`/datacore/verify/tutor/${userId}`);
  },

  // Get DataCore stats
  getStats: async () => {
    return await api.get("/datacore/stats");
  },

  // Bulk sync
  bulkSync: async (personType) => {
    return await api.post("/datacore/bulk-sync", { personType });
  },

  // Search by userId
  searchByUserId: async (userId) => {
    return await api.get(`/datacore/search?userId=${userId}`);
  },
};

export default datacoreService;
