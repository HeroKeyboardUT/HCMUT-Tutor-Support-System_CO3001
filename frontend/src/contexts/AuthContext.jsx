import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import authService from "../services/authService";

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
          }
          // Verify with server
          try {
            const response = await authService.getMe();
            if (response.success) {
              setUser(response.data.user);
              localStorage.setItem("user", JSON.stringify(response.data.user));
            } else {
              // Token invalid - clear auth
              console.log("Token invalid, logging out");
              await authService.logout();
              setUser(null);
            }
          } catch {
            // Token might be expired or user not found
            console.log("Session expired or user not found, logging out");
            await authService.logout();
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
        await authService.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login
  const login = useCallback(async (credentials) => {
    setError(null);
    try {
      const response = await authService.login(credentials);
      if (response.success) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const response = await authService.register(userData);
      if (response.success) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  }, []);

  // SSO Login
  const ssoLogin = useCallback(async (credentials) => {
    setError(null);
    try {
      const response = await authService.ssoLogin(credentials);
      if (response.success) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  // Update user data
  const updateUser = useCallback(
    (userData) => {
      setUser((prev) => ({ ...prev, ...userData }));
      localStorage.setItem("user", JSON.stringify({ ...user, ...userData }));
    },
    [user]
  );

  // Check role
  const hasRole = useCallback(
    (role) => {
      return user?.role === role;
    },
    [user]
  );

  // Check if user has any of the roles
  const hasAnyRole = useCallback(
    (roles) => {
      return roles.includes(user?.role);
    },
    [user]
  );

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    ssoLogin,
    logout,
    updateUser,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
