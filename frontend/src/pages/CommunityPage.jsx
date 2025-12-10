import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DashboardLayout } from "../components/Layout";
import communityService from "../services/communityService";

const CommunityPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuestionsOnly, setShowQuestionsOnly] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (activeCategory !== "all") params.category = activeCategory;
      if (searchQuery) params.search = searchQuery;
      if (showQuestionsOnly) params.isQuestion = "true";

      const response = await communityService.getPosts(params);
      if (response.success) {
        setPosts(response.data?.posts || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data?.pagination?.total || 0,
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    activeCategory,
    searchQuery,
    showQuestionsOnly,
    pagination.page,
    pagination.limit,
  ]);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await communityService.getCategories();
      if (response.success) {
        setCategories(response.data?.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  // Fetch trending tags
  const fetchTrendingTags = async () => {
    try {
      const response = await communityService.getTrendingTags();
      if (response.success) {
        setTrendingTags(response.data?.tags || []);
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchCategories();
    fetchTrendingTags();
  }, []);

  // Handle like
  const handleLike = async (postId) => {
    try {
      const response = await communityService.toggleLike(postId);
      if (response.success) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post._id === postId
              ? {
                  ...post,
                  likesCount: response.data.likesCount,
                  likes: response.data.liked
                    ? [...(post.likes || []), user._id]
                    : (post.likes || []).filter((id) => id !== user._id),
                }
              : post
          )
        );
      }
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  // Category labels
  const categoryLabels = {
    general: "Chung",
    academic: "Học thuật",
    non_academic: "Ngoại khóa",
    qa: "Hỏi đáp",
    resources: "Tài liệu",
    events: "Sự kiện",
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Cộng đồng HCMUT Tutor
              </h1>
              <p className="mt-1 text-gray-500">
                Kết nối, chia sẻ và học hỏi cùng nhau
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tạo bài viết
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Search and Filters */}
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="flex gap-4 items-center">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Tìm kiếm bài viết..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <svg
                      className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={showQuestionsOnly}
                      onChange={(e) => setShowQuestionsOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Chỉ xem câu hỏi
                  </label>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  <button
                    onClick={() => setActiveCategory("all")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Tất cả
                  </button>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        activeCategory === key
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Posts List */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {error}
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">
                    Chưa có bài viết nào
                  </h3>
                  <p className="text-gray-500 mt-1">
                    Hãy là người đầu tiên đăng bài!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onLike={handleLike}
                      formatDate={formatDate}
                      currentUserId={user?._id}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1),
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Trước
                  </button>
                  <span className="px-4 py-2 text-gray-600">
                    Trang {pagination.page} /{" "}
                    {Math.ceil(pagination.total / pagination.limit)}
                  </span>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={
                      pagination.page >=
                      Math.ceil(pagination.total / pagination.limit)
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-80 flex-shrink-0">
              {/* Trending Tags */}
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Tags thịnh hành
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trendingTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag._id}
                      onClick={() => setSearchQuery(tag._id)}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-blue-100 hover:text-blue-600 transition-colors"
                    >
                      #{tag._id} ({tag.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories Stats */}
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Thống kê danh mục
                </h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat._id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-600">
                        {categoryLabels[cat._id] || cat._id}
                      </span>
                      <span className="font-medium text-gray-900">
                        {cat.count} bài
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">
                  Liên kết nhanh
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      to="/tutors"
                      className="text-blue-600 hover:underline"
                    >
                      → Tìm gia sư
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/programs"
                      className="text-blue-600 hover:underline"
                    >
                      → Chương trình đào tạo
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/learning-paths"
                      className="text-blue-600 hover:underline"
                    >
                      → Lộ trình học tập
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/library"
                      className="text-blue-600 hover:underline"
                    >
                      → Thư viện tài liệu
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Create Post Modal */}
        {showCreateModal && (
          <CreatePostModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchPosts();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Post Card Component
const PostCard = ({ post, onLike, formatDate, currentUserId }) => {
  const isLiked = post.likes?.includes(currentUserId);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
            {post.author?.fullName?.charAt(0) || "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {post.author?.fullName || "Anonymous"}
              </span>
              {post.author?.role === "tutor" && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                  Tutor
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {formatDate(post.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {post.isPinned && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
              Ghim
            </span>
          )}
          {post.isQuestion && (
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                post.isAnswered
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {post.isAnswered ? "Đã trả lời" : "Câu hỏi"}
            </span>
          )}
        </div>
      </div>

      {/* Post Content */}
      <Link to={`/community/${post._id}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
          {post.title}
        </h2>
      </Link>
      <p className="text-gray-600 mb-4 line-clamp-3">{post.content}</p>

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              #{tag}
            </span>
          ))}
          {post.tags.length > 5 && (
            <span className="text-gray-400 text-xs">
              +{post.tags.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
        <button
          onClick={() => onLike(post._id)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
          }`}
        >
          <svg
            className="w-5 h-5"
            fill={isLiked ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          {post.likesCount || 0}
        </button>

        <Link
          to={`/community/${post._id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {post.commentsCount || 0} bình luận
        </Link>

        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          {post.views || 0} lượt xem
        </span>
      </div>
    </div>
  );
};

// Create Post Modal Component
const CreatePostModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    tags: "",
    isQuestion: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const postData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t),
        isQuestion: formData.isQuestion,
      };

      const response = await communityService.createPost(postData);
      if (response.success) {
        onSuccess();
      } else {
        setError(
          response.message || "Không thể tạo bài viết. Vui lòng thử lại."
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Tạo bài viết mới
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Nhập tiêu đề bài viết..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder="Viết nội dung bài viết của bạn..."
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Danh mục
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="general">Chung</option>
                <option value="academic">Học thuật</option>
                <option value="non_academic">Ngoại khóa</option>
                <option value="qa">Hỏi đáp</option>
                <option value="resources">Tài liệu</option>
                <option value="events">Sự kiện</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tags: e.target.value }))
                }
                placeholder="toán, lập trình, ..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Phân cách bằng dấu phẩy
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isQuestion}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isQuestion: e.target.checked,
                }))
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Đây là câu hỏi cần giải đáp
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              Đăng bài
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommunityPage;
