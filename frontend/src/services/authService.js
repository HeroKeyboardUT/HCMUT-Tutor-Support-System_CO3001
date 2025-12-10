import api from "./api";

// Auth Service
const authService = {
  // Login
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    if (response.success) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response;
  },

  // Register
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    if (response.success) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response;
  },

  // SSO Login
  ssoLogin: async (credentials) => {
    const response = await api.post("/auth/sso", credentials);
    if (response.success) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response;
  },

  // Logout
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await api.post("/auth/logout", { refreshToken });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("permissions");
    }
  },

  // Get current user
  getMe: async () => {
    return await api.get("/auth/me");
  },

  // Update password
  updatePassword: async (passwords) => {
    return await api.put("/auth/password", passwords);
  },

  // Check if logged in
  isAuthenticated: () => {
    return !!localStorage.getItem("accessToken");
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  // Get access token
  getToken: () => {
    return localStorage.getItem("accessToken");
  },

  // Get user permissions from API
  getPermissions: async () => {
    const response = await api.get("/auth/permissions");
    if (response.success) {
      localStorage.setItem("permissions", JSON.stringify(response.data));
    }
    return response;
  },

  // Get stored permissions
  getStoredPermissions: () => {
    const permissions = localStorage.getItem("permissions");
    return permissions ? JSON.parse(permissions) : null;
  },

  // Check if user has a specific permission
  hasPermission: (permissionKey) => {
    const permissions = authService.getStoredPermissions();
    return permissions?.permissions?.[permissionKey] || false;
  },

  // Get sidebar items for current user
  getSidebarItems: () => {
    const permissions = authService.getStoredPermissions();
    return permissions?.sidebarItems || [];
  },

  // Get dashboard cards for current user
  getDashboardCards: () => {
    const permissions = authService.getStoredPermissions();
    return permissions?.dashboardCards || [];
  },
};

export default authService;
