import api from "./api";

const userService = {
  // Get all users (admin)
  getAllUsers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(`/users${queryString ? `?${queryString}` : ""}`);
  },

  // Get user by ID
  getUserById: async (userId) => {
    return await api.get(`/users/${userId}`);
  },

  // Update user (admin)
  updateUser: async (userId, userData) => {
    return await api.put(`/users/${userId}`, userData);
  },

  // Delete user (admin)
  deleteUser: async (userId) => {
    return await api.delete(`/users/${userId}`);
  },

  // Verify user
  verifyUser: async (userId) => {
    return await api.post(`/users/${userId}/verify`);
  },

  // Get my profile
  getMyProfile: async () => {
    return await api.get("/auth/me");
  },

  // Update my profile
  updateMyProfile: async (profileData) => {
    return await api.put(
      `/users/${profileData.id || profileData._id}`,
      profileData
    );
  },
};

export default userService;
