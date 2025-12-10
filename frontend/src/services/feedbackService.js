import api from "./api";

const feedbackService = {
  // Create feedback
  createFeedback: async (feedbackData) => {
    return await api.post("/feedback", feedbackData);
  },

  // Get feedback by ID
  getFeedbackById: async (feedbackId) => {
    return await api.get(`/feedback/${feedbackId}`);
  },

  // Get feedback for a session
  getSessionFeedback: async (sessionId) => {
    return await api.get(`/feedback/session/${sessionId}`);
  },

  // Get my given feedback
  getMyGivenFeedback: async () => {
    return await api.get("/feedback/my/given");
  },

  // Get my received feedback
  getMyReceivedFeedback: async () => {
    return await api.get("/feedback/my/received");
  },

  // Get feedback for a user
  getUserFeedback: async (userId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/feedback/user/${userId}${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get tutor feedbacks
  getTutorFeedbacks: async (tutorId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/feedback/tutor/${tutorId}${queryString ? `?${queryString}` : ""}`
    );
  },

  // Update feedback
  updateFeedback: async (feedbackId, feedbackData) => {
    return await api.put(`/feedback/${feedbackId}`, feedbackData);
  },

  // Delete feedback
  deleteFeedback: async (feedbackId) => {
    return await api.delete(`/feedback/${feedbackId}`);
  },

  // Get feedback stats
  getStats: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/feedback/stats${queryString ? `?${queryString}` : ""}`
    );
  },
};

export default feedbackService;
