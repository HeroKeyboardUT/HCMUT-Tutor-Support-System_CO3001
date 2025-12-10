import { useState, useEffect, useCallback } from "react";
import { tutorService } from "../services";

export const useTutors = (initialParams = {}) => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [params, setParams] = useState(initialParams);

  const fetchTutors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tutorService.getAllTutors({
        ...params,
        ...pagination,
      });
      setTutors(response.data.tutors);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch tutors");
    } finally {
      setLoading(false);
    }
  }, [params, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const goToPage = useCallback((page) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  return {
    tutors,
    loading,
    error,
    pagination,
    updateParams,
    goToPage,
    refetch: fetchTutors,
  };
};

export default useTutors;
