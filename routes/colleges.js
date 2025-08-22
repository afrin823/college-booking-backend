const express = require("express")
const { body, query, validationResult } = require("express-validator")
const College = require("../models/College")
const Review = require("../models/Review")
const { auth, adminAuth } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/colleges
// @desc    Get all colleges with search, filter, and pagination
// @access  Public
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      type,
      size,
      state,
      minTuition,
      maxTuition,
      minRating,
      sortBy = "name",
      sortOrder = "asc",
      featured,
    } = req.query

    // Build query object
    const query = { isActive: true }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "location.city": { $regex: search, $options: "i" } },
        { "location.state": { $regex: search, $options: "i" } },
        { "academics.programs.name": { $regex: search, $options: "i" } },
      ]
    }

    // Filter by type
    if (type && type !== "all") {
      query.type = type
    }

    // Filter by size
    if (size && size !== "all") {
      query.size = size
    }

    // Filter by state
    if (state && state !== "all") {
      query["location.state"] = state
    }

    // Filter by tuition range
    if (minTuition || maxTuition) {
      query["costs.tuition.outOfState"] = {}
      if (minTuition) query["costs.tuition.outOfState"].$gte = Number.parseInt(minTuition)
      if (maxTuition) query["costs.tuition.outOfState"].$lte = Number.parseInt(maxTuition)
    }

    // Filter by rating
    if (minRating) {
      query["reviews.averageRating"] = { $gte: Number.parseFloat(minRating) }
    }

    // Filter featured colleges
    if (featured === "true") {
      query.featured = true
    }

    // Build sort object
    const sort = {}
    if (sortBy === "rating") {
      sort["reviews.averageRating"] = sortOrder === "desc" ? -1 : 1
    } else if (sortBy === "tuition") {
      sort["costs.tuition.outOfState"] = sortOrder === "desc" ? -1 : 1
    } else if (sortBy === "students") {
      sort["stats.totalStudents"] = sortOrder === "desc" ? -1 : 1
    } else {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1
    }

    // Execute query with pagination
    const colleges = await College.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-__v")

    // Get total count for pagination
    const total = await College.countDocuments(query)

    // Get filter options for frontend
    const filterOptions = {
      types: await College.distinct("type", { isActive: true }),
      sizes: await College.distinct("size", { isActive: true }),
      states: await College.distinct("location.state", { isActive: true }),
      tuitionRange: await College.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            min: { $min: "$costs.tuition.outOfState" },
            max: { $max: "$costs.tuition.outOfState" },
          },
        },
      ]),
    }

    res.json({
      success: true,
      data: {
        colleges,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: Number.parseInt(limit),
        },
        filterOptions,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/colleges/featured
// @desc    Get featured colleges
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const { limit = 6 } = req.query

    const colleges = await College.find({ featured: true, isActive: true })
      .sort({ "reviews.averageRating": -1 })
      .limit(Number.parseInt(limit))
      .select("name slug description location images reviews costs stats")

    res.json({
      success: true,
      data: colleges,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/colleges/search-suggestions
// @desc    Get search suggestions
// @access  Public
router.get("/search-suggestions", async (req, res) => {
  try {
    const { q } = req.query

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] })
    }

    const suggestions = await College.find(
      {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { "location.city": { $regex: q, $options: "i" } },
          { "location.state": { $regex: q, $options: "i" } },
        ],
        isActive: true,
      },
      "name location.city location.state slug",
    ).limit(10)

    res.json({
      success: true,
      data: suggestions,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/colleges/stats
// @desc    Get college statistics
// @access  Public
router.get("/stats", async (req, res) => {
  try {
    const stats = await College.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalColleges: { $sum: 1 },
          averageRating: { $avg: "$reviews.averageRating" },
          totalStudents: { $sum: "$stats.totalStudents" },
          averageTuition: { $avg: "$costs.tuition.outOfState" },
        },
      },
    ])

    const typeDistribution = await College.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ])

    const sizeDistribution = await College.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$size", count: { $sum: 1 } } },
    ])

    const stateDistribution = await College.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$location.state", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    res.json({
      success: true,
      data: {
        overview: stats[0] || {},
        distributions: {
          types: typeDistribution,
          sizes: sizeDistribution,
          states: stateDistribution,
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/colleges/:slug
// @desc    Get single college by slug
// @access  Public
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params

    const college = await College.findOne({ slug, isActive: true })

    if (!college) {
      return res.status(404).json({ message: "College not found" })
    }

    // Get recent reviews for this college
    const recentReviews = await Review.find({ college: college._id, isActive: true })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .limit(5)

    // Get similar colleges
    const similarColleges = await College.find({
      _id: { $ne: college._id },
      $or: [{ type: college.type }, { size: college.size }, { "location.state": college.location.state }],
      isActive: true,
    })
      .limit(4)
      .select("name slug location images reviews")

    res.json({
      success: true,
      data: {
        college,
        recentReviews,
        similarColleges,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/colleges
// @desc    Create new college (Admin only)
// @access  Private/Admin
router.post(
  "/",
  adminAuth,
  [
    body("name").trim().isLength({ min: 2 }).withMessage("College name is required"),
    body("slug").trim().isLength({ min: 2 }).withMessage("Slug is required"),
    body("description").trim().isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),
    body("location.city").trim().isLength({ min: 2 }).withMessage("City is required"),
    body("location.state").trim().isLength({ min: 2 }).withMessage("State is required"),
    body("type").isIn(["public", "private", "community"]).withMessage("Invalid college type"),
    body("size").isIn(["small", "medium", "large"]).withMessage("Invalid college size"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      // Check if slug already exists
      const existingCollege = await College.findOne({ slug: req.body.slug })
      if (existingCollege) {
        return res.status(400).json({ message: "College with this slug already exists" })
      }

      const college = new College(req.body)
      await college.save()

      res.status(201).json({
        success: true,
        data: college,
        message: "College created successfully",
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   PUT /api/colleges/:id
// @desc    Update college (Admin only)
// @access  Private/Admin
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params

    const college = await College.findById(id)
    if (!college) {
      return res.status(404).json({ message: "College not found" })
    }

    // If slug is being updated, check for duplicates
    if (req.body.slug && req.body.slug !== college.slug) {
      const existingCollege = await College.findOne({ slug: req.body.slug, _id: { $ne: id } })
      if (existingCollege) {
        return res.status(400).json({ message: "College with this slug already exists" })
      }
    }

    const updatedCollege = await College.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })

    res.json({
      success: true,
      data: updatedCollege,
      message: "College updated successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/colleges/:id
// @desc    Delete college (Admin only)
// @access  Private/Admin
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params

    const college = await College.findById(id)
    if (!college) {
      return res.status(404).json({ message: "College not found" })
    }

    // Soft delete - set isActive to false
    college.isActive = false
    await college.save()

    res.json({
      success: true,
      message: "College deleted successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/colleges/:id/toggle-featured
// @desc    Toggle featured status (Admin only)
// @access  Private/Admin
router.post("/:id/toggle-featured", adminAuth, async (req, res) => {
  try {
    const { id } = req.params

    const college = await College.findById(id)
    if (!college) {
      return res.status(404).json({ message: "College not found" })
    }

    college.featured = !college.featured
    await college.save()

    res.json({
      success: true,
      data: college,
      message: `College ${college.featured ? "featured" : "unfeatured"} successfully`,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/colleges/:id/analytics
// @desc    Get college analytics (Admin only)
// @access  Private/Admin
router.get("/:id/analytics", adminAuth, async (req, res) => {
  try {
    const { id } = req.params

    const college = await College.findById(id)
    if (!college) {
      return res.status(404).json({ message: "College not found" })
    }

    // Get review analytics
    const reviewAnalytics = await Review.aggregate([
      { $match: { college: college._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageOverall: { $avg: "$ratings.overall" },
          averageAcademics: { $avg: "$ratings.academics" },
          averageCampusLife: { $avg: "$ratings.campusLife" },
          averageFacilities: { $avg: "$ratings.facilities" },
          averageLocation: { $avg: "$ratings.location" },
          averageValue: { $avg: "$ratings.value" },
          recommendationRate: {
            $avg: { $cond: [{ $eq: ["$wouldRecommend", true] }, 1, 0] },
          },
        },
      },
    ])

    // Get monthly review trends
    const reviewTrends = await Review.aggregate([
      { $match: { college: college._id, isActive: true } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          averageRating: { $avg: "$ratings.overall" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ])

    res.json({
      success: true,
      data: {
        college,
        analytics: {
          reviews: reviewAnalytics[0] || {},
          trends: reviewTrends,
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
