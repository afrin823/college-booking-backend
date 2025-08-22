const express = require("express")
const { auth } = require("../middleware/auth")
const User = require("../models/User")
const College = require("../models/College")

const router = express.Router()

// @route   GET /api/users/saved-colleges
// @desc    Get user's saved colleges
// @access  Private
router.get("/saved-colleges", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("savedColleges", "name slug location images reviews")

    res.json({
      success: true,
      savedColleges: user.savedColleges,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/users/save-college/:collegeId
// @desc    Save/unsave a college
// @access  Private
router.post("/save-college/:collegeId", auth, async (req, res) => {
  try {
    const { collegeId } = req.params
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const college = await College.findById(collegeId)
    if (!college) {
      return res.status(404).json({ message: "College not found" })
    }

    const isSaved = user.savedColleges.includes(collegeId)

    if (isSaved) {
      // Remove from saved colleges
      user.savedColleges = user.savedColleges.filter((id) => id.toString() !== collegeId)
      await user.save()

      res.json({
        success: true,
        message: "College removed from saved list",
        isSaved: false,
      })
    } else {
      // Add to saved colleges
      user.savedColleges.push(collegeId)
      await user.save()

      res.json({
        success: true,
        message: "College saved successfully",
        isSaved: true,
      })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get("/dashboard", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("savedColleges", "name slug location images reviews")
      .populate({
        path: "applications",
        populate: {
          path: "college",
          select: "name slug location images",
        },
      })

    // Get recommended colleges based on user preferences
    let recommendedColleges = []
    if (user.profile.preferences.interestedMajors?.length > 0) {
      recommendedColleges = await College.find({
        "academics.programs.name": { $in: user.profile.preferences.interestedMajors },
        _id: { $nin: user.savedColleges },
      })
        .limit(6)
        .select("name slug location images reviews academics")
    }

    // Get upcoming deadlines
    const upcomingDeadlines = await College.find({
      "admissions.applicationDeadlines.regular": { $gte: new Date() },
    })
      .sort({ "admissions.applicationDeadlines.regular": 1 })
      .limit(5)
      .select("name slug admissions.applicationDeadlines")

    res.json({
      success: true,
      data: {
        user,
        savedColleges: user.savedColleges,
        applications: user.applications,
        recommendedColleges,
        upcomingDeadlines,
        stats: {
          savedColleges: user.savedColleges.length,
          applications: user.applications.length,
          completedApplications: user.applications.filter((app) => app.status === "submitted").length,
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put("/preferences", auth, async (req, res) => {
  try {
    const { interestedMajors, preferredLocations, budgetRange } = req.body
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.profile.preferences = {
      ...user.profile.preferences,
      interestedMajors: interestedMajors || user.profile.preferences.interestedMajors,
      preferredLocations: preferredLocations || user.profile.preferences.preferredLocations,
      budgetRange: budgetRange || user.profile.preferences.budgetRange,
    }

    await user.save()

    res.json({
      success: true,
      message: "Preferences updated successfully",
      preferences: user.profile.preferences,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
