// Community Service - Forum/Discussion Posts API
import api from "./api";

// ==========================================
// POSTS
// ==========================================

// Get all posts with filters
export const getPosts = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.category) queryParams.append("category", params.category);
  if (params.tag) queryParams.append("tag", params.tag);
  if (params.subject) queryParams.append("subject", params.subject);
  if (params.search) queryParams.append("search", params.search);
  if (params.isQuestion) queryParams.append("isQuestion", params.isQuestion);
  if (params.author) queryParams.append("author", params.author);
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const queryString = queryParams.toString();
  return await api.get(
    `/community/posts${queryString ? `?${queryString}` : ""}`
  );
};

// Get single post by ID
export const getPostById = async (postId) => {
  return await api.get(`/community/posts/${postId}`);
};

// Create new post
export const createPost = async (postData) => {
  return await api.post("/community/posts", postData);
};

// Update post
export const updatePost = async (postId, postData) => {
  return await api.put(`/community/posts/${postId}`, postData);
};

// Delete post
export const deletePost = async (postId) => {
  return await api.delete(`/community/posts/${postId}`);
};

// Like/Unlike post
export const toggleLike = async (postId) => {
  return await api.post(`/community/posts/${postId}/like`);
};

// Pin/Unpin post (admin only)
export const togglePin = async (postId) => {
  return await api.put(`/community/posts/${postId}/pin`);
};

// Report post
export const reportPost = async (postId, reason) => {
  return await api.post(`/community/posts/${postId}/report`, { reason });
};

// ==========================================
// COMMENTS
// ==========================================

// Add comment to post
export const addComment = async (postId, content) => {
  return await api.post(`/community/posts/${postId}/comments`, { content });
};

// Accept answer (Q&A posts)
export const acceptAnswer = async (postId, commentId) => {
  return await api.put(
    `/community/posts/${postId}/comments/${commentId}/accept`
  );
};

// ==========================================
// REPLIES
// ==========================================

// Reply to comment
export const addReply = async (postId, commentId, content) => {
  return await api.post(
    `/community/posts/${postId}/comments/${commentId}/replies`,
    { content }
  );
};

// ==========================================
// CATEGORIES & TAGS
// ==========================================

// Get categories with counts
export const getCategories = async () => {
  return await api.get("/community/categories");
};

// Get trending tags
export const getTrendingTags = async () => {
  return await api.get("/community/tags/trending");
};

// ==========================================
// HELPERS
// ==========================================

// Get questions only
export const getQuestions = async (params = {}) => {
  return getPosts({ ...params, isQuestion: "true" });
};

// Get my posts
export const getMyPosts = async (userId, params = {}) => {
  return getPosts({ ...params, author: userId });
};

// Search posts
export const searchPosts = async (query, params = {}) => {
  return getPosts({ ...params, search: query });
};

export default {
  // Posts
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  togglePin,
  reportPost,
  // Comments
  addComment,
  acceptAnswer,
  // Replies
  addReply,
  // Categories & Tags
  getCategories,
  getTrendingTags,
  // Helpers
  getQuestions,
  getMyPosts,
  searchPosts,
};
