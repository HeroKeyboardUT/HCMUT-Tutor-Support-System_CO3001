import { useState, useEffect, useCallback } from "react";
import { matchingService } from "../services";

export const useMatchings = (initialParams = {}) => {
  const [matchings, setMatchings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [params, setParams] = useState(initialParams);

  const fetchMatchings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await matchingService.getMyMatches({
        ...params,
        ...pagination,
      });
      setMatchings(response.data.matchings);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch matchings");
    } finally {
      setLoading(false);
    }
  }, [params, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchMatchings();
  }, [fetchMatchings]);

  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const goToPage = useCallback((page) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  return {
    matchings,
    loading,
    error,
    pagination,
    updateParams,
    goToPage,
    refetch: fetchMatchings,
  };
};

export default useMatchings;
