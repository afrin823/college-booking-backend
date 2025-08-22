const mongoose = require("mongoose")
const dotenv = require("dotenv")
const College = require("../models/College")
const User = require("../models/User")
const Review = require("../models/Review")

dotenv.config()

const colleges = [
  {
    name: "Stanford University",
    slug: "stanford-university",
    description:
      "Stanford University is a private research university in Stanford, California. Known for its academic strength, wealth, and proximity to Silicon Valley.",
    location: {
      address: "450 Serra Mall",
      city: "Stanford",
      state: "California",
      country: "USA",
      zipCode: "94305",
    },
    type: "private",
    size: "large",
    establishedYear: 1885,
    academics: {
      programs: [
        { name: "Computer Science", degree: "bachelor", department: "Engineering" },
        { name: "Business Administration", degree: "master", department: "Business" },
      ],
      facultyStudentRatio: "5:1",
      graduationRate: 94,
    },
    admissions: {
      acceptanceRate: 4.3,
      applicationFee: 90,
      requirements: {
        gpaMinimum: 3.8,
        testScores: {
          satRange: { min: 1470, max: 1570 },
        },
      },
    },
    costs: {
      tuition: { outOfState: 56169 },
      totalEstimated: 78218,
    },
    reviews: {
      averageRating: 4.5,
      totalReviews: 0,
    },
  },
  {
    name: "Massachusetts Institute of Technology",
    slug: "mit",
    description:
      "MIT is a private research university in Cambridge, Massachusetts. Known for its rigorous academics and cutting-edge research.",
    location: {
      address: "77 Massachusetts Ave",
      city: "Cambridge",
      state: "Massachusetts",
      country: "USA",
      zipCode: "02139",
    },
    type: "private",
    size: "medium",
    establishedYear: 1861,
    academics: {
      programs: [
        { name: "Electrical Engineering", degree: "bachelor", department: "Engineering" },
        { name: "Computer Science", degree: "master", department: "Engineering" },
      ],
      facultyStudentRatio: "3:1",
      graduationRate: 96,
    },
    admissions: {
      acceptanceRate: 6.7,
      applicationFee: 75,
      requirements: {
        gpaMinimum: 3.9,
        testScores: {
          satRange: { min: 1510, max: 1580 },
        },
      },
    },
    costs: {
      tuition: { outOfState: 53790 },
      totalEstimated: 73160,
    },
    reviews: {
      averageRating: 4.4,
      totalReviews: 0,
    },
  },
]

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/college-booking")

    console.log("Connected to MongoDB")

    // Clear existing data
    await College.deleteMany({})
    await User.deleteMany({})
    await Review.deleteMany({})

    console.log("Cleared existing data")

    // Insert colleges
    await College.insertMany(colleges)
    console.log("Colleges seeded successfully")

    // Create admin user
    const adminUser = new User({
      name: "Admin User",
      email: "admin@collegebooking.com",
      password: "admin123",
      role: "admin",
    })

    await adminUser.save()
    console.log("Admin user created")

    console.log("Database seeded successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Error seeding database:", error)
    process.exit(1)
  }
}

seedDatabase()
