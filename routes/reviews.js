const express = require("express")
const { body, validationResult } = require("express-validator")
const Review = require("../models/Review")
const College = require("../models/College")
const User = require("../models/User")
const { auth, adminAuth } = require("../middleware/auth")

const router = express.Router()

// Helper function to update college ratings
const updateCollegeRatings = async (collegeId) => {
  const reviews = await Review.find({ college: collegeId, isActive: true })

  if (reviews.length === 0) {
    await College.findByIdAndUpdate(collegeId, {
      "reviews.averageRating": 0,
      "reviews.totalReviews": 0,
      "reviews.ratingBreakdown": {
        academics: 0,
        campusLife: 0,
        facilities: 0,
        location: 0,
        value: 0,
      },
    })
    return
  }

  const totalReviews = reviews.length
  const averageRating = reviews.reduce((sum, review) => sum + review.ratings.overall, 0) / totalReviews

  const ratingBreakdown = {
    academics: reviews.reduce((sum, review) => sum + review.ratings.academics, 0) / totalReviews,
    campusLife: reviews.reduce((sum, review) => sum + review.ratings.campusLife, 0) / totalReviews,
    facilities: reviews.reduce((sum, review) => sum + review.ratings.facilities, 0) / totalReviews,
    location: reviews.reduce((sum, review) => sum + review.ratings.location, 0) / totalReviews,
    value: reviews.reduce((sum, review) => sum + review.ratings.value, 0) / totalReviews,
  }

  await College.findByIdAndUpdate(collegeId, {
    "reviews.averageRating": Math.round(averageRating * 10) / 10,
    "reviews.totalReviews": totalReviews,
    "reviews.ratingBreakdown": ratingBreakdown,
  })
}

// @route   GET /api/reviews
// @desc    Get all reviews with filtering and pagination
// @access  Public
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      college,
      rating,
      studentType,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = req.query

    // Build query
    const query = { isActive: true }

    if (college) {
      query.college = college
    }

    if (rating) {
      query["ratings.overall"] = { $gte: Number.parseInt(rating) }
    }

    if (studentType && studentType !== "all") {
      query.studentType = studentType
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { pros: { $in: [new RegExp(search, "i")] } },
        { cons: { $in: [new RegExp(search, "i")] } },
      ]
    }

    // Build sort
    const sort = {}
    if (sortBy === "rating") {
      sort["ratings.overall"] = sortOrder === "desc" ? -1 : 1
    } else if (sortBy === "helpful") {
      sort["helpful.count"] = sortOrder === "desc" ? -1 : 1
    } else {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1
    }

    const reviews = await Review.find(query)
      .populate("user", "name avatar")
      .populate("college", "name slug location")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Review.countDocuments(query)

    // Get filter options
    const filterOptions = {
      ratings: [1, 2, 3, 4, 5],
      studentTypes: await Review.distinct("studentType", { isActive: true }),
    }

    res.json({
      success: true,
      data: {
        reviews,
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

// @route   GET /api/reviews/college/:collegeId
// @desc    Get reviews for a specific college
// @access  Public
router.get("/college/:collegeId", async (req, res) => {
  try {
    const { collegeId } = req.params
    const { page = 1, limit = 10, rating, studentType, sortBy = "createdAt", sortOrder = "desc" } = req.query

    // Build query
    const query = { college: collegeId, isActive: true }

    if (rating) {
      query["ratings.overall"] = { $gte: Number.parseInt(rating) }
    }

    if (studentType && studentType !== "all") {
      query.studentType = studentType
    }

    // Build sort
    const sort = {}
    if (sortBy === "rating") {
      sort["ratings.overall"] = sortOrder === "desc" ? -1 : 1
    } else if (sortBy === "helpful") {
      sort["helpful.count"] = sortOrder === "desc" ? -1 : 1
    } else {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1
    }

    const reviews = await Review.find(query)
      .populate("user", "name avatar")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Review.countDocuments(query)

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { college: collegeId, isActive: true } },
      {
        $group: {
          _id: "$ratings.overall",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ])

    // Get student type distribution
    const studentTypeDistribution = await Review.aggregate([
      { $match: { college: collegeId, isActive: true } },
      {
        $group: {
          _id: "$studentType",
          count: { $sum: 1 },
        },
      },
    ])

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: Number.parseInt(limit),
        },
        distributions: {
          ratings: ratingDistribution,
          studentTypes: studentTypeDistribution,
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/reviews/:id
// @desc    Get single review
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const review = await Review.findOne({ _id: id, isActive: true })
      .populate("user", "name avatar")
      .populate("college", "name slug location")

    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    res.json({
      success: true,
      data: review,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/reviews
// @desc    Create new review
// @access  Private
router.post(
  "/",
  auth,
  [
    body("college").isMongoId().withMessage("Valid college ID is required"),
    body("title").trim().isLength({ min: 5, max: 100 }).withMessage("Title must be 5-100 characters"),
    body("content").trim().isLength({ min: 50, max: 2000 }).withMessage("Content must be 50-2000 characters"),
    body("ratings.overall").isInt({ min: 1, max: 5 }).withMessage("Overall rating must be 1-5"),
    body("ratings.academics").isInt({ min: 1, max: 5 }).withMessage("Academics rating must be 1-5"),
    body("ratings.campusLife").isInt({ min: 1, max: 5 }).withMessage("Campus life rating must be 1-5"),
    body("ratings.facilities").isInt({ min: 1, max: 5 }).withMessage("Facilities rating must be 1-5"),
    body("ratings.location").isInt({ min: 1, max: 5 }).withMessage("Location rating must be 1-5"),
    body("ratings.value").isInt({ min: 1, max: 5 }).withMessage("Value rating must be 1-5"),
    body("studentType").isIn(["current", "alumni", "parent", "faculty"]).withMessage("Invalid student type"),
    body("wouldRecommend").isBoolean().withMessage("Recommendation must be true or false"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { college: collegeId } = req.body

      // Check if college exists
      const college = await College.findById(collegeId)
      if (!college) {
        return res.status(404).json({ message: "College not found" })
      }

      // Check if user already has a review for this college
      const existingReview = await Review.findOne({
        user: req.user.id,
        college: collegeId,
      })

      if (existingReview) {
        return res.status(400).json({
          message: "You have already reviewed this college",
        })
      }

      // Create new review
      const review = new Review({
        ...req.body,
        user: req.user.id,
      })

      await review.save()

      // Update college ratings
      await updateCollegeRatings(collegeId)

      const populatedReview = await Review.findById(review._id)
        .populate("user", "name avatar")
        .populate("college", "name slug location")

      res.status(201).json({
        success: true,
        data: populatedReview,
        message: "Review created successfully",
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   PUT /api/reviews/:id
// @desc    Update review (only by review author)
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params

    const review = await Review.findOne({ _id: id, user: req.user.id })

    if (!review) {
      return res.status(404).json({ message: "Review not found or unauthorized" })
    }

    // Update allowed fields
    const allowedUpdates = ["title", "content", "ratings", "pros", "cons", "wouldRecommend", "graduationYear", "major"]

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        review[field] = req.body[field]
      }
    })

    await review.save()

    // Update college ratings
    await updateCollegeRatings(review.college)

    const updatedReview = await Review.findById(id)
      .populate("user", "name avatar")
      .populate("college", "name slug location")

    res.json({
      success: true,
      data: updatedReview,
      message: "Review updated successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/reviews/:id
// @desc    Delete review (only by review author)
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params

    const review = await Review.findOne({ _id: id, user: req.user.id })

    if (!review) {
      return res.status(404).json({ message: "Review not found or unauthorized" })
    }

    const collegeId = review.college

    // Soft delete
    review.isActive = false
    await review.save()

    // Update college ratings
    await updateCollegeRatings(collegeId)

    res.json({
      success: true,
      message: "Review deleted successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/reviews/:id/helpful
// @desc    Mark review as helpful/unhelpful
// @access  Private
router.post("/:id/helpful", auth, async (req, res) => {
  try {
    const { id } = req.params
    const { helpful } = req.body // true for helpful, false for unhelpful

    const review = await Review.findOne({ _id: id, isActive: true })

    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    // Check if user already voted
    const hasVoted = review.helpful.users.includes(req.user.id)

    if (helpful) {
      if (!hasVoted) {
        review.helpful.users.push(req.user.id)
        review.helpful.count += 1
      }
    } else {
      if (hasVoted) {
        review.helpful.users = review.helpful.users.filter((userId) => userId.toString() !== req.user.id)
        review.helpful.count -= 1
      }
    }

    await review.save()

    res.json({
      success: true,
      data: {
        helpful: review.helpful,
        userVoted: review.helpful.users.includes(req.user.id),
      },
      message: helpful ? "Review marked as helpful" : "Helpful vote removed",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/reviews/:id/report
// @desc    Report review
// @access  Private
router.post("/:id/report", auth, async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const review = await Review.findOne({ _id: id, isActive: true })

    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    // Check if user already reported
    const hasReported = review.reported.users.includes(req.user.id)

    if (hasReported) {
      return res.status(400).json({ message: "You have already reported this review" })
    }

    review.reported.users.push(req.user.id)
    review.reported.count += 1

    await review.save()

    res.json({
      success: true,
      message: "Review reported successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/reviews/user/my-reviews
// @desc    Get current user's reviews
// @access  Private
router.get("/user/my-reviews", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query

    const reviews = await Review.find({ user: req.user.id, isActive: true })
      .populate("college", "name slug location")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Review.countDocuments({ user: req.user.id, isActive: true })

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: Number.parseInt(limit),
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Admin Routes

// @route   GET /api/reviews/admin/reported
// @desc    Get reported reviews (Admin only)
// @access  Private/Admin
router.get("/admin/reported", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query

    const reviews = await Review.find({
      "reported.count": { $gt: 0 },
      isActive: true,
    })
      .populate("user", "name email")
      .populate("college", "name slug")
      .sort({ "reported.count": -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Review.countDocuments({
      "reported.count": { $gt: 0 },
      isActive: true,
    })

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: Number.parseInt(limit),
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/reviews/admin/:id/moderate
// @desc    Moderate review (Admin only)
// @access  Private/Admin
router.post("/:id/moderate", adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { action, reason } = req.body // action: 'approve', 'remove', 'warn'

    const review = await Review.findById(id)

    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    if (action === "remove") {
      review.isActive = false
      await updateCollegeRatings(review.college)
    } else if (action === "approve") {
      // Clear reports
      review.reported = { count: 0, users: [] }
    }

    await review.save()

    res.json({
      success: true,
      message: `Review ${action}d successfully`,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/reviews/admin/analytics
// @desc    Get review analytics (Admin only)
// @access  Private/Admin
router.get("/admin/analytics", adminAuth, async (req, res) => {
  try {
    const { college, period = "month" } = req.query

    const matchQuery = { isActive: true }
    if (college) {
      matchQuery.college = college
    }

    // Overall statistics
    const overallStats = await Review.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$ratings.overall" },
          recommendationRate: {
            $avg: { $cond: [{ $eq: ["$wouldRecommend", true] }, 1, 0] },
          },
          totalHelpfulVotes: { $sum: "$helpful.count" },
          totalReports: { $sum: "$reported.count" },
        },
      },
    ])

    // Rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$ratings.overall",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Monthly trends
    const monthlyTrends = await Review.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          reviews: { $sum: 1 },
          averageRating: { $avg: "$ratings.overall" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ])

    // Student type distribution
    const studentTypeDistribution = await Review.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$studentType",
          count: { $sum: 1 },
          averageRating: { $avg: "$ratings.overall" },
        },
      },
    ])

    res.json({
      success: true,
      data: {
        overview: overallStats[0] || {},
        distributions: {
          ratings: ratingDistribution,
          studentTypes: studentTypeDistribution,
        },
        trends: monthlyTrends,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
