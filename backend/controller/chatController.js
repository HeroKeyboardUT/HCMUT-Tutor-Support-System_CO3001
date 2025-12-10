const Conversation = require("../model/Conversation");
const Message = require("../model/Message");
const User = require("../model/User");

// Get all conversations for current user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .populate("participants", "fullName email avatar role")
      .populate("lastMessage.sender", "fullName")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Conversation.countDocuments({
      participants: userId,
      isActive: true,
    });

    // Format response to exclude current user from participants display
    const formattedConversations = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== userId
      );
      return {
        _id: conv._id,
        otherUser: otherParticipant,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCounts.get(userId) || 0,
        type: conv.type,
        updatedAt: conv.updatedAt,
      };
    });

    res.json({
      success: true,
      data: {
        conversations: formattedConversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tải danh sách cuộc trò chuyện",
    });
  }
};

// Get or create conversation with a specific user
exports.getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;

    // Validate target user exists
    const targetUser = await User.findById(targetUserId).select(
      "fullName email avatar role"
    );
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Cannot chat with yourself
    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Không thể tạo cuộc trò chuyện với chính mình",
      });
    }

    // Find or create conversation
    const conversation = await Conversation.findOrCreate(userId, targetUserId);

    // Populate participants
    await conversation.populate("participants", "fullName email avatar role");

    res.json({
      success: true,
      data: {
        conversation: {
          _id: conversation._id,
          otherUser: targetUser,
          type: conversation.type,
          createdAt: conversation.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Get/create conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tạo cuộc trò chuyện",
    });
  }
};

// Get messages in a conversation
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cuộc trò chuyện",
      });
    }

    // Get messages (newest first for pagination, but will reverse for display)
    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: userId },
    })
      .populate("sender", "fullName avatar role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({
      conversation: conversationId,
      deletedFor: { $ne: userId },
    });

    // Mark conversation as read
    await conversation.markAsRead(userId);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Oldest first for display
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tải tin nhắn",
    });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content, type = "text" } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Nội dung tin nhắn không được để trống",
      });
    }

    // Check if user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cuộc trò chuyện",
      });
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      content: content.trim(),
      type,
      readBy: [{ user: userId }],
    });

    // Update conversation
    conversation.lastMessage = {
      content: content.trim().substring(0, 100),
      sender: userId,
      createdAt: new Date(),
    };

    // Increment unread count for other participant
    const otherParticipant = conversation.participants.find(
      (p) => p.toString() !== userId
    );
    if (otherParticipant) {
      await conversation.incrementUnread(otherParticipant.toString());
    }

    await conversation.save();

    // Populate sender info
    await message.populate("sender", "fullName avatar role");

    res.status(201).json({
      success: true,
      data: {
        message,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể gửi tin nhắn",
    });
  }
};

// Mark conversation as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cuộc trò chuyện",
      });
    }

    await conversation.markAsRead(userId);

    // Mark all messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
      },
      {
        $push: { readBy: { user: userId, readAt: new Date() } },
      }
    );

    res.json({
      success: true,
      message: "Đã đánh dấu đã đọc",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể đánh dấu đã đọc",
    });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    });

    let totalUnread = 0;
    conversations.forEach((conv) => {
      totalUnread += conv.unreadCounts.get(userId) || 0;
    });

    res.json({
      success: true,
      data: {
        unreadCount: totalUnread,
      },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy số tin nhắn chưa đọc",
    });
  }
};

// Search users for new conversation
exports.searchUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, role } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { users: [] },
      });
    }

    const query = {
      _id: { $ne: userId },
      isActive: true,
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    };

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select("fullName email avatar role")
      .limit(10);

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tìm kiếm người dùng",
    });
  }
};

// Delete a message (soft delete for current user)
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tin nhắn",
      });
    }

    // Add user to deletedFor array
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.json({
      success: true,
      message: "Đã xóa tin nhắn",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể xóa tin nhắn",
    });
  }
};
