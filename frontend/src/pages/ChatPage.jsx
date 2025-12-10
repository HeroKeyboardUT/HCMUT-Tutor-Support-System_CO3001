import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DashboardLayout } from "../components/Layout";
import chatService from "../services/chatService";

const ChatPage = () => {
  const { user } = useAuth();
  const { conversationId: urlConversationId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const pollingRef = useRef(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await chatService.getConversations();
      if (response.success) {
        setConversations(response.data?.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async (convId) => {
    try {
      setLoadingMessages(true);
      const response = await chatService.getMessages(convId);
      if (response.success) {
        setMessages(response.data?.messages || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchConversations();
      setLoading(false);
    };
    init();
  }, [fetchConversations]);

  // Handle URL conversation ID
  useEffect(() => {
    if (urlConversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c._id === urlConversationId);
      if (conv) {
        setActiveConversation(conv);
        fetchMessages(urlConversationId);
      }
    }
  }, [urlConversationId, conversations, fetchMessages]);

  // Polling for new messages
  useEffect(() => {
    if (activeConversation) {
      // Poll every 3 seconds
      pollingRef.current = setInterval(async () => {
        try {
          const response = await chatService.getMessages(
            activeConversation._id
          );
          if (response.success) {
            setMessages(response.data?.messages || []);
          }
          // Also refresh conversations for unread counts
          await fetchConversations();
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [activeConversation, fetchConversations]);

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search users
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        setSearchLoading(true);
        const response = await chatService.searchUsers(searchQuery);
        if (response.success) {
          setSearchResults(response.data?.users || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Handle select conversation
  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    fetchMessages(conv._id);
    navigate(`/chat/${conv._id}`, { replace: true });

    // Mark as read
    chatService.markAsRead(conv._id).catch(console.error);
  };

  // Handle start new conversation
  const handleStartConversation = async (targetUser) => {
    try {
      const response = await chatService.getOrCreateConversation(
        targetUser._id
      );
      if (response.success) {
        const conv = {
          _id: response.data?.conversation?._id,
          otherUser: targetUser,
          lastMessage: null,
          unreadCount: 0,
        };
        setActiveConversation(conv);
        setMessages([]);
        setShowSearch(false);
        setSearchQuery("");
        navigate(`/chat/${conv._id}`, { replace: true });
        await fetchConversations();
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sending) return;

    try {
      setSending(true);
      const response = await chatService.sendMessage(
        activeConversation._id,
        newMessage.trim()
      );
      if (response.success) {
        setMessages((prev) => [...prev, response.data?.message]);
        setNewMessage("");
        messageInputRef.current?.focus();
        await fetchConversations();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Hôm nay";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Hôm qua";
    } else {
      return d.toLocaleDateString("vi-VN");
    }
  };

  // Get role badge
  const getRoleBadge = (role) => {
    const roleMap = {
      tutor: { text: "Tutor", color: "bg-blue-100 text-blue-700" },
      student: { text: "Sinh viên", color: "bg-green-100 text-green-700" },
      coordinator: {
        text: "Điều phối",
        color: "bg-purple-100 text-purple-700",
      },
      admin: { text: "Admin", color: "bg-red-100 text-red-700" },
      department_head: {
        text: "Trưởng khoa",
        color: "bg-orange-100 text-orange-700",
      },
    };
    return roleMap[role] || { text: role, color: "bg-gray-100 text-gray-700" };
  };

  if (loading) {
    return (
      <DashboardLayout title="Tin nhắn">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tin nhắn" subtitle="Chat với tutors và sinh viên">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-[calc(100vh-200px)] flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm cuộc trò chuyện..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
              {showSearch && (
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Search Results or Conversations */}
          <div className="flex-1 overflow-y-auto">
            {showSearch && searchQuery.length >= 2 ? (
              // Search Results
              <div className="p-2">
                <p className="text-xs text-gray-500 px-2 py-1">
                  Kết quả tìm kiếm
                </p>
                {searchLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Không tìm thấy người dùng
                  </p>
                ) : (
                  searchResults.map((searchUser) => (
                    <button
                      key={searchUser._id}
                      onClick={() => handleStartConversation(searchUser)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {searchUser.avatar ? (
                          <img
                            src={searchUser.avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 font-medium">
                            {searchUser.fullName?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 text-sm">
                          {searchUser.fullName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {searchUser.email}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          getRoleBadge(searchUser.role).color
                        }`}
                      >
                        {getRoleBadge(searchUser.role).text}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              // Conversations List
              <div>
                {conversations.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <svg
                      className="w-12 h-12 mx-auto text-gray-300 mb-3"
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
                    <p className="text-gray-500 text-sm">
                      Chưa có cuộc trò chuyện nào
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Tìm kiếm người dùng để bắt đầu chat
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv._id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        activeConversation?._id === conv._id ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          {conv.otherUser?.avatar ? (
                            <img
                              src={conv.otherUser.avatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-500 font-medium text-lg">
                              {conv.otherUser?.fullName?.charAt(0)}
                            </span>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 truncate">
                            {conv.otherUser?.fullName}
                          </p>
                          {conv.lastMessage?.createdAt && (
                            <span className="text-xs text-gray-400">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {conv.lastMessage?.content || "Bắt đầu trò chuyện..."}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {activeConversation.otherUser?.avatar ? (
                    <img
                      src={activeConversation.otherUser.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 font-medium">
                      {activeConversation.otherUser?.fullName?.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {activeConversation.otherUser?.fullName}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      getRoleBadge(activeConversation.otherUser?.role).color
                    }`}
                  >
                    {getRoleBadge(activeConversation.otherUser?.role).text}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 mx-auto text-gray-200 mb-4"
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
                    <p className="text-gray-400">Bắt đầu cuộc trò chuyện</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn = msg.sender?._id === user?.id;
                    const showDate =
                      idx === 0 ||
                      formatDate(msg.createdAt) !==
                        formatDate(messages[idx - 1]?.createdAt);

                    return (
                      <div key={msg._id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${
                            isOwn ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] ${
                              isOwn
                                ? "bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl"
                                : "bg-gray-100 text-gray-900 rounded-r-2xl rounded-tl-2xl"
                            } px-4 py-2`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? "text-blue-100" : "text-gray-400"
                              }`}
                            >
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form
                onSubmit={handleSendMessage}
                className="px-4 py-3 border-t border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
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
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            // No conversation selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="w-20 h-20 mx-auto text-gray-200 mb-4"
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
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Chọn cuộc trò chuyện
                </h3>
                <p className="text-gray-500 text-sm">
                  Chọn một cuộc trò chuyện hoặc tìm kiếm người dùng để bắt đầu
                  chat
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatPage;
