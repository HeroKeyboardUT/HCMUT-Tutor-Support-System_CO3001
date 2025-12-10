const express = require("express");
const router = express.Router();
const chatController = require("../controller/chatController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// Get all conversations
router.get("/conversations", chatController.getConversations);

// Get unread count
router.get("/unread", chatController.getUnreadCount);

// Search users for new conversation
router.get("/users/search", chatController.searchUsers);

// Get or create conversation with specific user
router.get(
  "/conversations/user/:targetUserId",
  chatController.getOrCreateConversation
);

// Get messages in conversation
router.get(
  "/conversations/:conversationId/messages",
  chatController.getMessages
);

// Send message
router.post(
  "/conversations/:conversationId/messages",
  chatController.sendMessage
);

// Mark conversation as read
router.put("/conversations/:conversationId/read", chatController.markAsRead);

// Delete message (soft delete)
router.delete("/messages/:messageId", chatController.deleteMessage);

module.exports = router;
