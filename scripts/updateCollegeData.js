const mongoose = require("mongoose")
const dotenv = require("dotenv")
const College = require("../models/College")

dotenv.config()

const updateCollegeData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/college-booking")

    console.log("Connected to MongoDB")

    // Update existing colleges with additional data
    const updates = [
      {
        slug: "stanford-university",
        update: {
          images: [
            {
              url: "/stanford-university-campus.png",
              caption: "Stanford University Campus",
              isMain: true,
            },
            {
              url: "/stanford-quad.png",
              caption: "Stanford Quad",
              isMain: false,
            },
            {
              url: "/stanford-library-exterior.png",
              caption: "Stanford Library",
              isMain: false,
            },
          ],
          academics: {
            programs: [
              {
                name: "Computer Science",
                degree: "bachelor",
                department: "Engineering",
                duration: "4 years",
                credits: 120,
              },
              {
                name: "Business Administration",
                degree: "master",
                department: "Business",
                duration: "2 years",
                credits: 60,
              },
              {
                name: "Medicine",
                degree: "doctoral",
                department: "Medicine",
                duration: "4 years",
                credits: 160,
              },
            ],
            facultyStudentRatio: "5:1",
            averageClassSize: 15,
            graduationRate: 94,
            employmentRate: 92,
          },
          admissions: {
            applicationDeadlines: {
              earlyDecision: new Date("2024-11-01"),
              earlyAction: new Date("2024-11-01"),
              regular: new Date("2025-01-02"),
              transfer: new Date("2025-03-15"),
            },
            requirements: {
              gpaMinimum: 3.8,
              testScores: {
                satRange: { min: 1470, max: 1570 },
                actRange: { min: 33, max: 35 },
              },
              requiredDocuments: [
                "High School Transcript",
                "Letters of Recommendation",
                "Personal Essay",
                "SAT/ACT Scores",
              ],
              essayRequired: true,
              interviewRequired: false,
            },
            acceptanceRate: 4.3,
            applicationFee: 90,
          },
          costs: {
            tuition: {
              inState: 56169,
              outOfState: 56169,
              international: 56169,
            },
            fees: {
              application: 90,
              registration: 650,
              technology: 150,
              other: 200,
            },
            roomAndBoard: 17255,
            books: 1245,
            personalExpenses: 2130,
            totalEstimated: 78218,
          },
          stats: {
            totalStudents: 17000,
            undergraduateStudents: 7087,
            graduateStudents: 9913,
            internationalStudents: 3500,
            averageAge: 20,
            genderRatio: {
              male: 51,
              female: 49,
              other: 0,
            },
          },
          featured: true,
        },
      },
      {
        slug: "mit",
        update: {
          images: [
            {
              url: "/mit-campus-building.png",
              caption: "MIT Campus Building",
              isMain: true,
            },
            {
              url: "/mit-dome-building.png",
              caption: "MIT Dome Building",
              isMain: false,
            },
            {
              url: "/mit-laboratory.png",
              caption: "MIT Laboratory",
              isMain: false,
            },
          ],
          academics: {
            programs: [
              {
                name: "Electrical Engineering",
                degree: "bachelor",
                department: "Engineering",
                duration: "4 years",
                credits: 120,
              },
              {
                name: "Computer Science",
                degree: "master",
                department: "Engineering",
                duration: "2 years",
                credits: 66,
              },
              {
                name: "Physics",
                degree: "doctoral",
                department: "Science",
                duration: "5 years",
                credits: 180,
              },
            ],
            facultyStudentRatio: "3:1",
            averageClassSize: 12,
            graduationRate: 96,
            employmentRate: 94,
          },
          admissions: {
            applicationDeadlines: {
              earlyAction: new Date("2024-11-01"),
              regular: new Date("2025-01-01"),
              transfer: new Date("2025-02-15"),
            },
            requirements: {
              gpaMinimum: 3.9,
              testScores: {
                satRange: { min: 1510, max: 1580 },
                actRange: { min: 34, max: 36 },
              },
              requiredDocuments: [
                "High School Transcript",
                "Letters of Recommendation",
                "Personal Essays",
                "SAT/ACT Scores",
                "SAT Subject Tests",
              ],
              essayRequired: true,
              interviewRequired: true,
            },
            acceptanceRate: 6.7,
            applicationFee: 75,
          },
          costs: {
            tuition: {
              inState: 53790,
              outOfState: 53790,
              international: 53790,
            },
            fees: {
              application: 75,
              registration: 312,
              technology: 150,
              other: 200,
            },
            roomAndBoard: 16390,
            books: 820,
            personalExpenses: 2160,
            totalEstimated: 73160,
          },
          stats: {
            totalStudents: 11500,
            undergraduateStudents: 4530,
            graduateStudents: 6970,
            internationalStudents: 3800,
            averageAge: 21,
            genderRatio: {
              male: 54,
              female: 46,
              other: 0,
            },
          },
          featured: true,
        },
      },
    ]

    for (const { slug, update } of updates) {
      await College.findOneAndUpdate({ slug }, update, { new: true })
      console.log(`Updated college: ${slug}`)
    }

    console.log("College data updated successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Error updating college data:", error)
    process.exit(1)
  }
}

updateCollegeData()
