const { Notification } = require("../model");

// Get my notifications
exports.getMyNotifications = async (req, res) => {
  try {
    const { isRead, type, page = 1, limit = 20 } = req.query;

    const query = { user: req.user.id };
    if (isRead !== undefined) query.isRead = isRead === "true";
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user.id, isRead: false }),
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get my notifications error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get notification by ID
exports.getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Get notification by ID error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete all read notifications
exports.deleteAllRead = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user.id,
      isRead: true,
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} read notifications`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete all read error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create notification (system/admin use)
exports.createNotification = async (req, res) => {
  try {
    const { recipientId, type, title, message, data, priority } = req.body;

    const notification = new Notification({
      user: recipientId,
      type,
      title,
      message,
      priority: priority || "normal",
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: "Notification created",
      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Send bulk notification (admin only)
exports.sendBulkNotification = async (req, res) => {
  try {
    const { recipientIds, type, title, message, data } = req.body;

    const notifications = recipientIds.map((recipientId) => ({
      user: recipientId,
      type,
      title,
      message,
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: `Sent ${notifications.length} notifications`,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Send bulk notification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Send announcement to all users (admin only)
exports.sendAnnouncement = async (req, res) => {
  try {
    const { title, message, targetRoles } = req.body;

    // Get all target users
    const { User } = require("../model");
    const query = { isActive: true };
    if (targetRoles && targetRoles.length > 0) {
      query.role = { $in: targetRoles };
    }

    const users = await User.find(query).select("_id");
    const recipientIds = users.map((u) => u._id);

    const notifications = recipientIds.map((recipientId) => ({
      user: recipientId,
      type: "announcement",
      title,
      message,
      priority: "high",
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: `Announcement sent to ${notifications.length} users`,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Send announcement error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get notification preferences
exports.getPreferences = async (req, res) => {
  try {
    // This would typically be stored in user settings
    // For now, return default preferences
    res.json({
      success: true,
      preferences: {
        email: true,
        push: true,
        sessionReminders: true,
        matchUpdates: true,
        feedbackRequests: true,
        announcements: true,
        marketingEmails: false,
      },
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update notification preferences
exports.updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;

    // This would typically update user settings
    // For now, just acknowledge the update
    res.json({
      success: true,
      message: "Preferences updated",
      preferences,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
