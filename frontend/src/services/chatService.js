import api from "./api";

const chatService = {
  // Get all conversations
  getConversations: async (page = 1, limit = 20) => {
    const response = await api.get("/chat/conversations", {
      params: { page, limit },
    });
    return response.data;
  },

  // Get or create conversation with user
  getOrCreateConversation: async (targetUserId) => {
    const response = await api.get(`/chat/conversations/user/${targetUserId}`);
    return response.data;
  },

  // Get messages in conversation
  getMessages: async (conversationId, page = 1, limit = 50) => {
    const response = await api.get(
      `/chat/conversations/${conversationId}/messages`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  // Send message
  sendMessage: async (conversationId, content, type = "text") => {
    const response = await api.post(
      `/chat/conversations/${conversationId}/messages`,
      {
        content,
        type,
      }
    );
    return response.data;
  },

  // Mark conversation as read
  markAsRead: async (conversationId) => {
    const response = await api.put(
      `/chat/conversations/${conversationId}/read`
    );
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await api.get("/chat/unread");
    return response.data;
  },

  // Search users for new conversation
  searchUsers: async (query, role = null) => {
    const response = await api.get("/chat/users/search", {
      params: { q: query, role },
    });
    return response.data;
  },

  // Delete message
  deleteMessage: async (messageId) => {
    const response = await api.delete(`/chat/messages/${messageId}`);
    return response.data;
  },
};

export default chatService;
