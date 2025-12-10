import api from "./api";

// Notification Service
const notificationService = {
  // Get all notifications
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(
      `/notifications${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get unread count
  getUnreadCount: async () => {
    return await api.get("/notifications/unread-count");
  },

  // Mark as read
  markAsRead: async (id) => {
    return await api.put(`/notifications/${id}/read`);
  },

  // Mark all as read
  markAllAsRead: async () => {
    return await api.put("/notifications/read-all");
  },

  // Delete notification
  delete: async (id) => {
    return await api.delete(`/notifications/${id}`);
  },
};

export default notificationService;
