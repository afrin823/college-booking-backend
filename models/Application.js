const mongoose = require("mongoose")

const applicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    program: {
      type: String,
      required: true,
    },
    degreeLevel: {
      type: String,
      enum: ["associate", "bachelor", "master", "doctoral"],
      required: true,
    },
    applicationData: {
      personalInfo: {
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        dateOfBirth: Date,
        address: {
          street: String,
          city: String,
          state: String,
          zipCode: String,
          country: String,
        },
      },
      academicInfo: {
        currentEducation: String,
        gpa: Number,
        testScores: {
          sat: Number,
          act: Number,
          gre: Number,
          gmat: Number,
        },
        transcripts: [String], // File URLs
        recommendations: [
          {
            recommenderName: String,
            recommenderEmail: String,
            relationship: String,
            letterUrl: String,
          },
        ],
      },
      essays: [
        {
          question: String,
          response: String,
          wordCount: Number,
        },
      ],
      extracurriculars: [
        {
          activity: String,
          role: String,
          duration: String,
          description: String,
        },
      ],
      workExperience: [
        {
          company: String,
          position: String,
          startDate: Date,
          endDate: Date,
          description: String,
        },
      ],
    },
    documents: [
      {
        name: String,
        type: String,
        url: String,
        uploadedAt: Date,
      },
    ],
    status: {
      type: String,
      enum: ["draft", "submitted", "under-review", "accepted", "rejected", "waitlisted"],
      default: "draft",
    },
    submittedAt: Date,
    reviewedAt: Date,
    decisionDate: Date,
    notes: [
      {
        content: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    fees: {
      applicationFee: Number,
      paid: {
        type: Boolean,
        default: false,
      },
      paidAt: Date,
      transactionId: String,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index to prevent duplicate applications
applicationSchema.index({ applicant: 1, college: 1, program: 1 }, { unique: true })

module.exports = mongoose.model("Application", applicationSchema)
