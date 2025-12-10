import { useState, useEffect, useCallback } from "react";
import { sessionService } from "../services";

export const useSessions = (initialParams = {}) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [params, setParams] = useState(initialParams);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sessionService.getMySessions({
        ...params,
        ...pagination,
      });
      setSessions(response.data.sessions);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  }, [params, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const goToPage = useCallback((page) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  return {
    sessions,
    loading,
    error,
    pagination,
    updateParams,
    goToPage,
    refetch: fetchSessions,
  };
};

export default useSessions;
