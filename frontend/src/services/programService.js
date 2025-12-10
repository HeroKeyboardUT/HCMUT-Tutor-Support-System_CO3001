// Program Service - Academic/Non-academic Programs API
import api from "./api";

// ==========================================
// PROGRAMS
// ==========================================

// Get all programs with filters
export const getPrograms = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.type) queryParams.append("type", params.type);
  if (params.category) queryParams.append("category", params.category);
  if (params.status) queryParams.append("status", params.status);
  if (params.faculty) queryParams.append("faculty", params.faculty);
  if (params.search) queryParams.append("search", params.search);
  if (params.isFeatured) queryParams.append("isFeatured", params.isFeatured);
  if (params.registrationOpen)
    queryParams.append("registrationOpen", params.registrationOpen);
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);

  const queryString = queryParams.toString();
  return await api.get(`/programs${queryString ? `?${queryString}` : ""}`);
};

// Get academic programs
export const getAcademicPrograms = async (params = {}) => {
  return getPrograms({ ...params, type: "academic" });
};

// Get non-academic programs
export const getNonAcademicPrograms = async (params = {}) => {
  return getPrograms({ ...params, type: "non_academic" });
};

// Get program by ID
export const getProgramById = async (programId) => {
  return await api.get(`/programs/${programId}`);
};

// Create program
export const createProgram = async (programData) => {
  return await api.post("/programs", programData);
};

// Update program
export const updateProgram = async (programId, programData) => {
  return await api.put(`/programs/${programId}`, programData);
};

// Delete program
export const deleteProgram = async (programId) => {
  return await api.delete(`/programs/${programId}`);
};

// Assign tutor to program
export const assignTutor = async (programId, tutorId, role = "assistant") => {
  return await api.post(`/programs/${programId}/tutors`, { tutorId, role });
};

// Get program statistics
export const getProgramStats = async (programId) => {
  return await api.get(`/programs/${programId}/stats`);
};

// ==========================================
// CATEGORIES
// ==========================================

// Get academic categories
export const getAcademicCategories = async () => {
  return await api.get("/programs/categories/academic");
};

// Get non-academic categories
export const getNonAcademicCategories = async () => {
  return await api.get("/programs/categories/non-academic");
};

// ==========================================
// ENROLLMENTS
// ==========================================

// Enroll in program
export const enrollInProgram = async (programId) => {
  return await api.post(`/programs/${programId}/enroll`);
};

// Get my enrollments
export const getMyEnrollments = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.status) queryParams.append("status", params.status);
  if (params.type) queryParams.append("type", params.type);

  const queryString = queryParams.toString();
  return await api.get(
    `/programs/enrollments/me${queryString ? `?${queryString}` : ""}`
  );
};

// Update enrollment progress (tutor/admin)
export const updateEnrollmentProgress = async (enrollmentId, progressData) => {
  return await api.put(
    `/programs/enrollments/${enrollmentId}/progress`,
    progressData
  );
};

// Drop from program
export const dropFromProgram = async (enrollmentId) => {
  return await api.put(`/programs/enrollments/${enrollmentId}/drop`);
};

// Submit program feedback
export const submitProgramFeedback = async (enrollmentId, rating, comment) => {
  return await api.post(`/programs/enrollments/${enrollmentId}/feedback`, {
    rating,
    comment,
  });
};

// ==========================================
// HELPERS
// ==========================================

// Get featured programs
export const getFeaturedPrograms = async (limit = 5) => {
  return getPrograms({ isFeatured: "true", limit });
};

// Get open registration programs
export const getOpenPrograms = async (params = {}) => {
  return getPrograms({ ...params, registrationOpen: "true" });
};

// Get active academic enrollments
export const getActiveAcademicEnrollments = async () => {
  return getMyEnrollments({ status: "in_progress", type: "academic" });
};

// Get active non-academic enrollments
export const getActiveNonAcademicEnrollments = async () => {
  return getMyEnrollments({ status: "in_progress", type: "non_academic" });
};

export default {
  // Programs
  getPrograms,
  getAcademicPrograms,
  getNonAcademicPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
  assignTutor,
  getProgramStats,
  // Categories
  getAcademicCategories,
  getNonAcademicCategories,
  // Enrollments
  enrollInProgram,
  getMyEnrollments,
  updateEnrollmentProgress,
  dropFromProgram,
  submitProgramFeedback,
  // Helpers
  getFeaturedPrograms,
  getOpenPrograms,
  getActiveAcademicEnrollments,
  getActiveNonAcademicEnrollments,
};
