import { useState, useEffect, useCallback } from "react";
import { reportService } from "../services";

export const useDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportService.getDashboardStats();
      setStats(response.data.stats);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to fetch dashboard stats"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
};

export default useDashboard;
