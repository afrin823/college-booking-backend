const express = require("express")
const { body, validationResult } = require("express-validator")
const Application = require("../models/Application")
const College = require("../models/College")
const User = require("../models/User")
const mongoose = require("mongoose") // Import mongoose
const { auth, adminAuth } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/admissions/applications
// @desc    Get user's applications
// @access  Private
router.get("/applications", auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query

    const query = { applicant: req.user.id }
    if (status && status !== "all") {
      query.status = status
    }

    const applications = await Application.find(query)
      .populate("college", "name slug location images admissions")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Application.countDocuments(query)

    // Get application statistics
    const stats = await Application.aggregate([
      { $match: { applicant: req.user._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    const statusCounts = {
      draft: 0,
      submitted: 0,
      "under-review": 0,
      accepted: 0,
      rejected: 0,
      waitlisted: 0,
    }

    stats.forEach((stat) => {
      statusCounts[stat._id] = stat.count
    })

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: Number.parseInt(limit),
        },
        stats: statusCounts,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/admissions/applications/:id
// @desc    Get single application
// @access  Private
router.get("/applications/:id", auth, async (req, res) => {
  try {
    const { id } = req.params

    const application = await Application.findOne({
      _id: id,
      applicant: req.user.id,
    }).populate("college", "name slug location images admissions costs")

    if (!application) {
      return res.status(404).json({ message: "Application not found" })
    }

    res.json({
      success: true,
      data: application,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/admissions/applications
// @desc    Create new application
// @access  Private
router.post(
  "/applications",
  auth,
  [
    body("collegeId").isMongoId().withMessage("Valid college ID is required"),
    body("program").trim().isLength({ min: 2 }).withMessage("Program is required"),
    body("degreeLevel")
      .isIn(["associate", "bachelor", "master", "doctoral"])
      .withMessage("Valid degree level is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { collegeId, program, degreeLevel } = req.body

      // Check if college exists
      const college = await College.findById(collegeId)
      if (!college) {
        return res.status(404).json({ message: "College not found" })
      }

      // Check if user already has an application for this college and program
      const existingApplication = await Application.findOne({
        applicant: req.user.id,
        college: collegeId,
        program,
      })

      if (existingApplication) {
        return res.status(400).json({
          message: "You already have an application for this program at this college",
        })
      }

      // Create new application
      const application = new Application({
        applicant: req.user.id,
        college: collegeId,
        program,
        degreeLevel,
        applicationData: {
          personalInfo: {
            firstName: req.user.name.split(" ")[0] || "",
            lastName: req.user.name.split(" ").slice(1).join(" ") || "",
            email: req.user.email,
          },
        },
        fees: {
          applicationFee: college.admissions?.applicationFee || 0,
          paid: false,
        },
      })

      await application.save()

      // Add to user's applications
      await User.findByIdAndUpdate(req.user.id, {
        $push: { applications: application._id },
      })

      const populatedApplication = await Application.findById(application._id).populate(
        "college",
        "name slug location images admissions",
      )

      res.status(201).json({
        success: true,
        data: populatedApplication,
        message: "Application created successfully",
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   PUT /api/admissions/applications/:id
// @desc    Update application data
// @access  Private
router.put("/applications/:id", auth, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const application = await Application.findOne({
      _id: id,
      applicant: req.user.id,
    })

    if (!application) {
      return res.status(404).json({ message: "Application not found" })
    }

    // Only allow updates if application is in draft status
    if (application.status !== "draft") {
      return res.status(400).json({
        message: "Cannot update application after submission",
      })
    }

    // Update application data
    if (updateData.applicationData) {
      application.applicationData = {
        ...application.applicationData,
        ...updateData.applicationData,
      }
    }

    if (updateData.documents) {
      application.documents = updateData.documents
    }

    await application.save()

    const updatedApplication = await Application.findById(id).populate(
      "college",
      "name slug location images admissions",
    )

    res.json({
      success: true,
      data: updatedApplication,
      message: "Application updated successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/admissions/applications/:id/submit
// @desc    Submit application
// @access  Private
router.post("/applications/:id/submit", auth, async (req, res) => {
  try {
    const { id } = req.params

    const application = await Application.findOne({
      _id: id,
      applicant: req.user.id,
    })

    if (!application) {
      return res.status(404).json({ message: "Application not found" })
    }

    if (application.status !== "draft") {
      return res.status(400).json({
        message: "Application has already been submitted",
      })
    }

    // Validate required fields
    const { personalInfo, academicInfo, essays } = application.applicationData

    if (!personalInfo?.firstName || !personalInfo?.lastName || !personalInfo?.email) {
      return res.status(400).json({
        message: "Personal information is incomplete",
      })
    }

    if (!academicInfo?.gpa) {
      return res.status(400).json({
        message: "Academic information is incomplete",
      })
    }

    if (!essays || essays.length === 0) {
      return res.status(400).json({
        message: "At least one essay is required",
      })
    }

    // Update application status
    application.status = "submitted"
    application.submittedAt = new Date()
    await application.save()

    const updatedApplication = await Application.findById(id).populate(
      "college",
      "name slug location images admissions",
    )

    res.json({
      success: true,
      data: updatedApplication,
      message: "Application submitted successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/admissions/applications/:id
// @desc    Delete application (only if draft)
// @access  Private
router.delete("/applications/:id", auth, async (req, res) => {
  try {
    const { id } = req.params

    const application = await Application.findOne({
      _id: id,
      applicant: req.user.id,
    })

    if (!application) {
      return res.status(404).json({ message: "Application not found" })
    }

    if (application.status !== "draft") {
      return res.status(400).json({
        message: "Cannot delete submitted application",
      })
    }

    await Application.findByIdAndDelete(id)

    // Remove from user's applications
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { applications: id },
    })

    res.json({
      success: true,
      message: "Application deleted successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/admissions/deadlines
// @desc    Get upcoming application deadlines
// @access  Private
router.get("/deadlines", auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const currentDate = new Date()

    const upcomingDeadlines = await College.find({
      $or: [
        { "admissions.applicationDeadlines.regular": { $gte: currentDate } },
        { "admissions.applicationDeadlines.earlyDecision": { $gte: currentDate } },
        { "admissions.applicationDeadlines.earlyAction": { $gte: currentDate } },
      ],
      isActive: true,
    })
      .select("name slug admissions.applicationDeadlines location images")
      .limit(Number.parseInt(limit))

    // Format deadlines for easier frontend consumption
    const formattedDeadlines = []

    upcomingDeadlines.forEach((college) => {
      const deadlines = college.admissions?.applicationDeadlines || {}

      Object.entries(deadlines).forEach(([type, date]) => {
        if (date && new Date(date) >= currentDate) {
          formattedDeadlines.push({
            college: {
              id: college._id,
              name: college.name,
              slug: college.slug,
              location: college.location,
              images: college.images,
            },
            type,
            date,
            daysUntil: Math.ceil((new Date(date) - currentDate) / (1000 * 60 * 60 * 24)),
          })
        }
      })
    })

    // Sort by date
    formattedDeadlines.sort((a, b) => new Date(a.date) - new Date(b.date))

    res.json({
      success: true,
      data: formattedDeadlines.slice(0, limit),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Admin Routes

// @route   GET /api/admissions/admin/applications
// @desc    Get all applications (Admin only)
// @access  Private/Admin
router.get("/admin/applications", adminAuth, async (req, res) => {
  try {
    const { status, college, page = 1, limit = 20, sortBy = "submittedAt", sortOrder = "desc" } = req.query

    const query = {}
    if (status && status !== "all") {
      query.status = status
    }
    if (college) {
      query.college = college
    }

    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    const applications = await Application.find(query)
      .populate("applicant", "name email profile")
      .populate("college", "name slug location")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Application.countDocuments(query)

    // Get statistics
    const stats = await Application.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    const statusCounts = {
      draft: 0,
      submitted: 0,
      "under-review": 0,
      accepted: 0,
      rejected: 0,
      waitlisted: 0,
    }

    stats.forEach((stat) => {
      statusCounts[stat._id] = stat.count
    })

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: Number.parseInt(limit),
        },
        stats: statusCounts,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/admissions/admin/applications/:id/status
// @desc    Update application status (Admin only)
// @access  Private/Admin
router.put(
  "/admin/applications/:id/status",
  adminAuth,
  [
    body("status")
      .isIn(["submitted", "under-review", "accepted", "rejected", "waitlisted"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const { status, notes } = req.body

      const application = await Application.findById(id)
      if (!application) {
        return res.status(404).json({ message: "Application not found" })
      }

      application.status = status
      application.reviewedAt = new Date()

      if (status === "accepted" || status === "rejected") {
        application.decisionDate = new Date()
      }

      if (notes) {
        application.notes.push({
          content: notes,
          addedBy: req.user.id,
        })
      }

      await application.save()

      const updatedApplication = await Application.findById(id)
        .populate("applicant", "name email")
        .populate("college", "name slug")

      res.json({
        success: true,
        data: updatedApplication,
        message: "Application status updated successfully",
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// @route   GET /api/admissions/admin/analytics
// @desc    Get admission analytics (Admin only)
// @access  Private/Admin
router.get("/admin/analytics", adminAuth, async (req, res) => {
  try {
    const { college, year } = req.query

    const matchQuery = {}
    if (college) {
      matchQuery.college = mongoose.Types.ObjectId(college)
    }
    if (year) {
      const startDate = new Date(`${year}-01-01`)
      const endDate = new Date(`${year}-12-31`)
      matchQuery.submittedAt = { $gte: startDate, $lte: endDate }
    }

    // Overall statistics
    const overallStats = await Application.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          submitted: { $sum: { $cond: [{ $ne: ["$status", "draft"] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          waitlisted: { $sum: { $cond: [{ $eq: ["$status", "waitlisted"] }, 1, 0] } },
          underReview: { $sum: { $cond: [{ $eq: ["$status", "under-review"] }, 1, 0] } },
        },
      },
    ])

    // Monthly trends
    const monthlyTrends = await Application.aggregate([
      { $match: { ...matchQuery, submittedAt: { $exists: true } } },
      {
        $group: {
          _id: {
            year: { $year: "$submittedAt" },
            month: { $month: "$submittedAt" },
          },
          applications: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ])

    // College-wise statistics
    const collegeStats = await Application.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$college",
          applications: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "colleges",
          localField: "_id",
          foreignField: "_id",
          as: "college",
        },
      },
      { $unwind: "$college" },
      {
        $project: {
          collegeName: "$college.name",
          applications: 1,
          accepted: 1,
          rejected: 1,
          acceptanceRate: {
            $cond: [
              { $gt: ["$applications", 0] },
              { $multiply: [{ $divide: ["$accepted", "$applications"] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { applications: -1 } },
    ])

    res.json({
      success: true,
      data: {
        overview: overallStats[0] || {},
        trends: monthlyTrends,
        collegeStats,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
