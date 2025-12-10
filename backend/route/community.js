const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware");
const { roles } = require("../config/config");
const { CommunityPost, User, Notification } = require("../model");

// @desc    Get all posts
// @route   GET /api/community/posts
// @access  Private
router.get("/posts", authenticate, async (req, res) => {
  try {
    const {
      category,
      tag,
      subject,
      search,
      isQuestion,
      author,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { status: { $in: ["active", "pinned"] } };

    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (subject) query.subject = { $regex: subject, $options: "i" };
    if (isQuestion === "true") query.isQuestion = true;
    if (author) query.author = author;

    if (search) {
      query.$text = { $search: search };
    }

    const sortOptions = {};
    sortOptions.isPinned = -1; // Pinned posts first
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [posts, total] = await Promise.all([
      CommunityPost.find(query)
        .populate("author", "firstName lastName fullName avatar role")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-comments.replies -reports"),
      CommunityPost.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get posts",
      error: error.message,
    });
  }
});

// @desc    Get single post
// @route   GET /api/community/posts/:id
// @access  Private
router.get("/posts/:id", authenticate, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate("author", "firstName lastName fullName avatar role")
      .populate("comments.author", "firstName lastName fullName avatar role")
      .populate(
        "comments.replies.author",
        "firstName lastName fullName avatar role"
      );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Increment views
    post.views += 1;
    await post.save();

    res.json({
      success: true,
      data: { post },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get post",
      error: error.message,
    });
  }
});

// @desc    Create post
// @route   POST /api/community/posts
// @access  Private
router.post("/posts", authenticate, async (req, res) => {
  try {
    const { title, content, category, tags, subject, attachments, isQuestion } =
      req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const post = new CommunityPost({
      author: req.userId,
      title,
      content,
      category: category || "general",
      tags: tags || [],
      subject,
      attachments: attachments || [],
      isQuestion: isQuestion || false,
    });

    await post.save();
    await post.populate("author", "firstName lastName fullName avatar role");

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: { post },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create post",
      error: error.message,
    });
  }
});

// @desc    Update post
// @route   PUT /api/community/posts/:id
// @access  Private (owner only)
router.put("/posts/:id", authenticate, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check ownership
    if (
      post.author.toString() !== req.userId &&
      ![roles.ADMIN, roles.COORDINATOR].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this post",
      });
    }

    const { title, content, category, tags, subject, attachments } = req.body;

    if (title) post.title = title;
    if (content) post.content = content;
    if (category) post.category = category;
    if (tags) post.tags = tags;
    if (subject !== undefined) post.subject = subject;
    if (attachments) post.attachments = attachments;

    await post.save();
    await post.populate("author", "firstName lastName fullName avatar role");

    res.json({
      success: true,
      message: "Post updated successfully",
      data: { post },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update post",
      error: error.message,
    });
  }
});

// @desc    Delete post
// @route   DELETE /api/community/posts/:id
// @access  Private (owner or admin)
router.delete("/posts/:id", authenticate, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check authorization
    if (
      post.author.toString() !== req.userId &&
      ![roles.ADMIN, roles.COORDINATOR].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this post",
      });
    }

    post.status = "deleted";
    await post.save();

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete post",
      error: error.message,
    });
  }
});

// @desc    Like/Unlike post
// @route   POST /api/community/posts/:id/like
// @access  Private
router.post("/posts/:id/like", authenticate, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const likeIndex = post.likes.indexOf(req.userId);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      // Like
      post.likes.push(req.userId);
      post.likesCount += 1;

      // Notify author (if not self-like)
      if (post.author.toString() !== req.userId) {
        await Notification.create({
          user: post.author,
          type: "community_like",
          title: "Someone liked your post",
          message: `${req.user.fullName || "Someone"} liked your post "${
            post.title
          }"`,
          actionUrl: `/community/posts/${post._id}`,
        });
      }
    }

    await post.save();

    res.json({
      success: true,
      data: {
        liked: likeIndex === -1,
        likesCount: post.likesCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to like post",
      error: error.message,
    });
  }
});

// @desc    Add comment
// @route   POST /api/community/posts/:id/comments
// @access  Private
router.post("/posts/:id/comments", authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comment = {
      author: req.userId,
      content,
      createdAt: new Date(),
    };

    post.comments.push(comment);
    post.commentsCount = post.comments.length;

    await post.save();

    // Notify post author
    if (post.author.toString() !== req.userId) {
      await Notification.create({
        user: post.author,
        type: "community_comment",
        title: "New comment on your post",
        message: `${req.user.fullName || "Someone"} commented on "${
          post.title
        }"`,
        actionUrl: `/community/posts/${post._id}`,
      });
    }

    // Get the newly added comment with populated author
    const newComment = post.comments[post.comments.length - 1];
    await CommunityPost.populate(newComment, {
      path: "author",
      select: "firstName lastName fullName avatar role",
    });

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: { comment: newComment },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message,
    });
  }
});

// @desc    Accept answer (for Q&A posts)
// @route   PUT /api/community/posts/:id/comments/:commentId/accept
// @access  Private (post author only)
router.put(
  "/posts/:id/comments/:commentId/accept",
  authenticate,
  async (req, res) => {
    try {
      const post = await CommunityPost.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      // Only post author can accept answers
      if (post.author.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: "Only the post author can accept answers",
        });
      }

      if (!post.isQuestion) {
        return res.status(400).json({
          success: false,
          message: "Can only accept answers on question posts",
        });
      }

      const comment = post.comments.id(req.params.commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }

      // Reset previous accepted answer
      post.comments.forEach((c) => {
        c.isAcceptedAnswer = false;
      });

      // Accept this answer
      comment.isAcceptedAnswer = true;
      post.isAnswered = true;
      post.acceptedAnswer = comment._id;

      await post.save();

      // Notify the answer author
      if (comment.author.toString() !== req.userId) {
        await Notification.create({
          user: comment.author,
          type: "answer_accepted",
          title: "Your answer was accepted!",
          message: `Your answer on "${post.title}" was marked as the accepted answer`,
          actionUrl: `/community/posts/${post._id}`,
        });
      }

      res.json({
        success: true,
        message: "Answer accepted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to accept answer",
        error: error.message,
      });
    }
  }
);

// @desc    Reply to comment
// @route   POST /api/community/posts/:id/comments/:commentId/replies
// @access  Private
router.post(
  "/posts/:id/comments/:commentId/replies",
  authenticate,
  async (req, res) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: "Reply content is required",
        });
      }

      const post = await CommunityPost.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      const comment = post.comments.id(req.params.commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }

      const reply = {
        author: req.userId,
        content,
        createdAt: new Date(),
      };

      comment.replies.push(reply);
      await post.save();

      // Notify comment author
      if (comment.author.toString() !== req.userId) {
        await Notification.create({
          user: comment.author,
          type: "community_reply",
          title: "Someone replied to your comment",
          message: `${
            req.user.fullName || "Someone"
          } replied to your comment on "${post.title}"`,
          actionUrl: `/community/posts/${post._id}`,
        });
      }

      res.status(201).json({
        success: true,
        message: "Reply added successfully",
        data: { reply: comment.replies[comment.replies.length - 1] },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add reply",
        error: error.message,
      });
    }
  }
);

// @desc    Report post
// @route   POST /api/community/posts/:id/report
// @access  Private
router.post("/posts/:id/report", authenticate, async (req, res) => {
  try {
    const { reason } = req.body;

    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if already reported
    const existingReport = post.reports.find(
      (r) => r.reporter.toString() === req.userId
    );

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: "You have already reported this post",
      });
    }

    post.reports.push({
      reporter: req.userId,
      reason,
    });
    post.reportsCount = post.reports.length;

    // Auto-hide if too many reports
    if (post.reportsCount >= 5) {
      post.status = "hidden";
    }

    await post.save();

    res.json({
      success: true,
      message: "Post reported successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to report post",
      error: error.message,
    });
  }
});

// @desc    Pin/Unpin post (admin only)
// @route   PUT /api/community/posts/:id/pin
// @access  Private/Admin
router.put(
  "/posts/:id/pin",
  authenticate,
  authorize(roles.ADMIN, roles.COORDINATOR),
  async (req, res) => {
    try {
      const post = await CommunityPost.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      post.isPinned = !post.isPinned;
      post.status = post.isPinned ? "pinned" : "active";
      await post.save();

      res.json({
        success: true,
        message: post.isPinned ? "Post pinned" : "Post unpinned",
        data: { isPinned: post.isPinned },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to pin/unpin post",
        error: error.message,
      });
    }
  }
);

// @desc    Get categories with counts
// @route   GET /api/community/categories
// @access  Private
router.get("/categories", authenticate, async (req, res) => {
  try {
    const categories = await CommunityPost.aggregate([
      { $match: { status: { $in: ["active", "pinned"] } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get categories",
      error: error.message,
    });
  }
});

// @desc    Get trending tags
// @route   GET /api/community/tags/trending
// @access  Private
router.get("/tags/trending", authenticate, async (req, res) => {
  try {
    const tags = await CommunityPost.aggregate([
      { $match: { status: { $in: ["active", "pinned"] } } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({
      success: true,
      data: { tags },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get trending tags",
      error: error.message,
    });
  }
});

module.exports = router;
