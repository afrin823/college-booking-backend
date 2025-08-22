const mongoose = require("mongoose")

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    ratings: {
      overall: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      academics: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      campusLife: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      facilities: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      location: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      value: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
    },
    title: {
      type: String,
      required: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, "Review content cannot exceed 2000 characters"],
    },
    pros: [String],
    cons: [String],
    wouldRecommend: {
      type: Boolean,
      required: true,
    },
    graduationYear: Number,
    major: String,
    studentType: {
      type: String,
      enum: ["current", "alumni", "parent", "faculty"],
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    helpful: {
      count: {
        type: Number,
        default: 0,
      },
      users: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    reported: {
      count: {
        type: Number,
        default: 0,
      },
      users: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index to prevent duplicate reviews from same user for same college
reviewSchema.index({ user: 1, college: 1 }, { unique: true })

module.exports = mongoose.model("Review", reviewSchema)
