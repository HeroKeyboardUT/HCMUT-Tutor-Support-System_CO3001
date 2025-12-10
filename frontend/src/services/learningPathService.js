// Learning Path Service - AI Personalized Learning Paths API
import api from "./api";

// ==========================================
// LEARNING PATHS
// ==========================================

// Get all learning paths for current user
export const getLearningPaths = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.status) queryParams.append("status", params.status);
  if (params.subject) queryParams.append("subject", params.subject);

  const queryString = queryParams.toString();
  return await api.get(
    `/learning-paths${queryString ? `?${queryString}` : ""}`
  );
};

// Get learning path by ID
export const getLearningPathById = async (pathId) => {
  return await api.get(`/learning-paths/${pathId}`);
};

// Create new learning path with AI generation
export const createLearningPath = async (pathData) => {
  return await api.post("/learning-paths", pathData);
};

// Update learning path
export const updateLearningPath = async (pathId, pathData) => {
  return await api.put(`/learning-paths/${pathId}`, pathData);
};

// ==========================================
// MILESTONES
// ==========================================

// Update milestone status
export const updateMilestone = async (pathId, milestoneId, milestoneData) => {
  return await api.put(
    `/learning-paths/${pathId}/milestones/${milestoneId}`,
    milestoneData
  );
};

// Complete milestone
export const completeMilestone = async (pathId, milestoneId, notes = "") => {
  return updateMilestone(pathId, milestoneId, {
    status: "completed",
    notes,
  });
};

// Start milestone
export const startMilestone = async (pathId, milestoneId) => {
  return updateMilestone(pathId, milestoneId, {
    status: "in_progress",
  });
};

// Add new milestone
export const addMilestone = async (pathId, milestoneData) => {
  return await api.post(`/learning-paths/${pathId}/milestones`, milestoneData);
};

// ==========================================
// TUTOR ASSIGNMENT
// ==========================================

// Assign tutor to learning path
export const assignTutor = async (pathId, tutorId) => {
  return await api.post(`/learning-paths/${pathId}/assign-tutor`, { tutorId });
};

// ==========================================
// AI RECOMMENDATIONS
// ==========================================

// Get AI recommendations for learning path
export const getRecommendations = async (pathId) => {
  return await api.get(`/learning-paths/${pathId}/recommendations`);
};

// Get AI suggested tutors for a subject
export const getSuggestedTutors = async (subject, limit = 5) => {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.append("limit", limit);

  const queryString = queryParams.toString();
  return await api.get(
    `/learning-paths/suggest-tutors/${encodeURIComponent(subject)}${
      queryString ? `?${queryString}` : ""
    }`
  );
};

// ==========================================
// STUDY LOGGING
// ==========================================

// Log study session
export const logStudySession = async (pathId, logData) => {
  return await api.post(`/learning-paths/${pathId}/study-log`, logData);
};

// ==========================================
// STATISTICS
// ==========================================

// Get my learning path statistics
export const getMyStats = async () => {
  return await api.get("/learning-paths/stats/me");
};

// ==========================================
// HELPERS
// ==========================================

// Get active learning paths
export const getActiveLearningPaths = async () => {
  return getLearningPaths({ status: "active" });
};

// Get completed learning paths
export const getCompletedLearningPaths = async () => {
  return getLearningPaths({ status: "completed" });
};

// Create learning path with default settings
export const quickCreatePath = async (
  subject,
  targetLevel = "intermediate"
) => {
  return createLearningPath({
    subject,
    currentLevel: "beginner",
    targetLevel,
    weeklyGoal: { studyHours: 10, sessionsCount: 2 },
  });
};

// Calculate estimated completion date
export const calculateEstimatedCompletion = (path) => {
  if (!path?.milestones?.length) return null;

  const remainingMilestones = path.milestones.filter(
    (m) => m.status !== "completed"
  );

  let totalDays = 0;
  remainingMilestones.forEach((m) => {
    if (m.estimatedDuration) {
      const duration = m.estimatedDuration.value || 7;
      const unit = m.estimatedDuration.unit || "days";
      if (unit === "weeks") {
        totalDays += duration * 7;
      } else if (unit === "months") {
        totalDays += duration * 30;
      } else {
        totalDays += duration;
      }
    }
  });

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + totalDays);
  return estimatedDate;
};

// Get progress summary
export const getProgressSummary = (path) => {
  if (!path?.milestones?.length) {
    return {
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      total: 0,
      percentage: 0,
    };
  }

  const completed = path.milestones.filter(
    (m) => m.status === "completed"
  ).length;
  const inProgress = path.milestones.filter(
    (m) => m.status === "in_progress"
  ).length;
  const notStarted = path.milestones.filter(
    (m) => m.status === "not_started"
  ).length;
  const total = path.milestones.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, inProgress, notStarted, total, percentage };
};

export default {
  // Learning Paths
  getLearningPaths,
  getLearningPathById,
  createLearningPath,
  updateLearningPath,
  // Milestones
  updateMilestone,
  completeMilestone,
  startMilestone,
  addMilestone,
  // Tutor Assignment
  assignTutor,
  // AI Recommendations
  getRecommendations,
  getSuggestedTutors,
  // Study Logging
  logStudySession,
  // Statistics
  getMyStats,
  // Helpers
  getActiveLearningPaths,
  getCompletedLearningPaths,
  quickCreatePath,
  calculateEstimatedCompletion,
  getProgressSummary,
};
