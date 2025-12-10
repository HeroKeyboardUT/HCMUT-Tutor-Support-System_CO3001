// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem("accessToken");

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401 && data.message?.includes("expired")) {
        // Try to refresh token
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the original request
          return apiCall(endpoint, options);
        }
      }
      throw new Error(data.message || "API call failed");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// Refresh access token
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("accessToken", data.data.accessToken);
      return true;
    }

    // Refresh failed, clear tokens
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    return false;
  } catch {
    return false;
  }
};

// API methods
const api = {
  get: (endpoint) => apiCall(endpoint, { method: "GET" }),
  post: (endpoint, data) =>
    apiCall(endpoint, { method: "POST", body: JSON.stringify(data) }),
  put: (endpoint, data) =>
    apiCall(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  delete: (endpoint) => apiCall(endpoint, { method: "DELETE" }),
};

export { api, API_BASE_URL };
export default api;
