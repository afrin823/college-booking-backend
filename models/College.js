const mongoose = require("mongoose")

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "College name is required"],
      trim: true,
      maxlength: [100, "College name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    location: {
      address: String,
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: "USA",
      },
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    images: [
      {
        url: String,
        caption: String,
        isMain: {
          type: Boolean,
          default: false,
        },
      },
    ],
    type: {
      type: String,
      enum: ["public", "private", "community"],
      required: true,
    },
    size: {
      type: String,
      enum: ["small", "medium", "large"],
      required: true,
    },
    establishedYear: {
      type: Number,
      min: 1600,
      max: new Date().getFullYear(),
    },
    accreditation: [String],
    rankings: {
      national: Number,
      global: Number,
      byProgram: [
        {
          program: String,
          rank: Number,
          source: String,
        },
      ],
    },
    academics: {
      programs: [
        {
          name: String,
          degree: {
            type: String,
            enum: ["associate", "bachelor", "master", "doctoral", "certificate"],
          },
          department: String,
          duration: String,
          credits: Number,
        },
      ],
      facultyStudentRatio: String,
      averageClassSize: Number,
      graduationRate: Number,
      employmentRate: Number,
    },
    admissions: {
      applicationDeadlines: {
        earlyDecision: Date,
        earlyAction: Date,
        regular: Date,
        transfer: Date,
      },
      requirements: {
        gpaMinimum: Number,
        testScores: {
          satRange: {
            min: Number,
            max: Number,
          },
          actRange: {
            min: Number,
            max: Number,
          },
        },
        requiredDocuments: [String],
        essayRequired: Boolean,
        interviewRequired: Boolean,
      },
      acceptanceRate: Number,
      applicationFee: Number,
    },
    costs: {
      tuition: {
        inState: Number,
        outOfState: Number,
        international: Number,
      },
      fees: {
        application: Number,
        registration: Number,
        technology: Number,
        other: Number,
      },
      roomAndBoard: Number,
      books: Number,
      personalExpenses: Number,
      totalEstimated: Number,
    },
    financialAid: {
      available: Boolean,
      scholarships: [
        {
          name: String,
          amount: Number,
          criteria: String,
          deadline: Date,
        },
      ],
      averageAidPackage: Number,
      percentReceivingAid: Number,
    },
    campusLife: {
      housing: {
        available: Boolean,
        types: [String],
        capacity: Number,
      },
      dining: {
        mealPlans: [String],
        diningHalls: Number,
        specialDiets: [String],
      },
      activities: {
        clubs: Number,
        sports: [String],
        greekLife: Boolean,
        studentGovernment: Boolean,
      },
      facilities: [String],
    },
    contact: {
      phone: String,
      email: String,
      website: String,
      admissionsOffice: {
        phone: String,
        email: String,
        address: String,
      },
    },
    stats: {
      totalStudents: Number,
      undergraduateStudents: Number,
      graduateStudents: Number,
      internationalStudents: Number,
      averageAge: Number,
      genderRatio: {
        male: Number,
        female: Number,
        other: Number,
      },
    },
    reviews: {
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      ratingBreakdown: {
        academics: { type: Number, default: 0 },
        campusLife: { type: Number, default: 0 },
        facilities: { type: Number, default: 0 },
        location: { type: Number, default: 0 },
        value: { type: Number, default: 0 },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for better search performance
collegeSchema.index({ name: "text", description: "text" })
collegeSchema.index({ "location.city": 1, "location.state": 1 })
collegeSchema.index({ type: 1, size: 1 })
collegeSchema.index({ "reviews.averageRating": -1 })

module.exports = mongoose.model("College", collegeSchema)
