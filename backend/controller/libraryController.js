const { LibraryResource } = require("../model");

// Create a new resource
exports.createResource = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      subjects,
      fileUrl,
      externalLink,
      thumbnailUrl,
      tags,
      isPublic,
    } = req.body;

    const resource = new LibraryResource({
      title,
      description,
      type,
      category,
      subjects,
      fileUrl: type !== "link" ? fileUrl : undefined,
      externalLink: type === "link" ? externalLink : undefined,
      thumbnailUrl,
      tags,
      isPublic: isPublic !== false,
      uploadedBy: req.user.id,
    });

    await resource.save();

    res.status(201).json({
      success: true,
      message: "Resource uploaded successfully",
      resource,
    });
  } catch (error) {
    console.error("Create resource error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all resources with filters
exports.getAllResources = async (req, res) => {
  try {
    const {
      search,
      type,
      category,
      subject,
      tags,
      uploadedBy,
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { isPublic: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }
    if (type) query.type = type;
    if (category) query.category = category;
    if (subject) query.subjects = { $in: subject.split(",") };
    if (tags) query.tags = { $in: tags.split(",") };
    if (uploadedBy) query.uploadedBy = uploadedBy;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [resources, total] = await Promise.all([
      LibraryResource.find(query)
        .populate("uploadedBy", "fullName avatarUrl")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      LibraryResource.countDocuments(query),
    ]);

    res.json({
      success: true,
      resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all resources error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get resource by ID
exports.getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await LibraryResource.findById(id).populate(
      "uploadedBy",
      "fullName avatarUrl email"
    );

    if (!resource) {
      return res
        .status(404)
        .json({ success: false, message: "Resource not found" });
    }

    // Increment view count
    resource.views = (resource.views || 0) + 1;
    await resource.save();

    res.json({
      success: true,
      resource,
    });
  } catch (error) {
    console.error("Get resource by ID error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update resource
exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      subjects,
      fileUrl,
      externalLink,
      thumbnailUrl,
      tags,
      isPublic,
    } = req.body;

    const resource = await LibraryResource.findById(id);
    if (!resource) {
      return res
        .status(404)
        .json({ success: false, message: "Resource not found" });
    }

    // Check ownership or admin
    const isOwner = resource.uploadedBy.toString() === req.user.id;
    const isAdmin = ["admin", "coordinator"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (title) resource.title = title;
    if (description !== undefined) resource.description = description;
    if (category) resource.category = category;
    if (subjects) resource.subjects = subjects;
    if (fileUrl) resource.fileUrl = fileUrl;
    if (externalLink) resource.externalLink = externalLink;
    if (thumbnailUrl) resource.thumbnailUrl = thumbnailUrl;
    if (tags) resource.tags = tags;
    if (isPublic !== undefined) resource.isPublic = isPublic;

    await resource.save();

    res.json({
      success: true,
      message: "Resource updated successfully",
      resource,
    });
  } catch (error) {
    console.error("Update resource error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete resource
exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await LibraryResource.findById(id);
    if (!resource) {
      return res
        .status(404)
        .json({ success: false, message: "Resource not found" });
    }

    // Check ownership or admin
    const isOwner = resource.uploadedBy.toString() === req.user.id;
    const isAdmin = ["admin", "coordinator"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await LibraryResource.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("Delete resource error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Download resource (track download count)
exports.downloadResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await LibraryResource.findById(id);
    if (!resource) {
      return res
        .status(404)
        .json({ success: false, message: "Resource not found" });
    }

    // Increment download count
    resource.downloads = (resource.downloads || 0) + 1;
    await resource.save();

    // Return the file URL or redirect
    if (resource.fileUrl) {
      res.json({
        success: true,
        downloadUrl: resource.fileUrl,
        downloads: resource.downloads,
      });
    } else if (resource.externalLink) {
      res.json({
        success: true,
        downloadUrl: resource.externalLink,
        downloads: resource.downloads,
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "No file available for download" });
    }
  } catch (error) {
    console.error("Download resource error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get my uploaded resources
exports.getMyResources = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [resources, total] = await Promise.all([
      LibraryResource.find({ uploadedBy: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LibraryResource.countDocuments({ uploadedBy: req.user.id }),
    ]);

    res.json({
      success: true,
      resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get my resources error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get categories with counts
exports.getCategories = async (req, res) => {
  try {
    const categories = await LibraryResource.aggregate([
      { $match: { isPublic: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      categories: categories.map((c) => ({
        name: c._id,
        count: c.count,
      })),
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get subjects with counts
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await LibraryResource.aggregate([
      { $match: { isPublic: true } },
      { $unwind: "$subjects" },
      { $group: { _id: "$subjects", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      subjects: subjects.map((s) => ({
        name: s._id,
        count: s.count,
      })),
    });
  } catch (error) {
    console.error("Get subjects error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get library stats
exports.getLibraryStats = async (req, res) => {
  try {
    const [totalResources, totalDownloads, totalViews, byType] =
      await Promise.all([
        LibraryResource.countDocuments({ isPublic: true }),
        LibraryResource.aggregate([
          { $group: { _id: null, total: { $sum: "$downloads" } } },
        ]),
        LibraryResource.aggregate([
          { $group: { _id: null, total: { $sum: "$views" } } },
        ]),
        LibraryResource.aggregate([
          { $match: { isPublic: true } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),
      ]);

    res.json({
      success: true,
      stats: {
        totalResources,
        totalDownloads: totalDownloads[0]?.total || 0,
        totalViews: totalViews[0]?.total || 0,
        byType: byType.reduce((acc, t) => {
          acc[t._id] = t.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Get library stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
