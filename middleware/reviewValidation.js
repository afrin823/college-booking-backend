const { body } = require("express-validator")

const createReviewValidation = [
  body("college").isMongoId().withMessage("Valid college ID is required"),

  body("title")
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters")
    .matches(/^[a-zA-Z0-9\s.,!?'-]+$/)
    .withMessage("Title contains invalid characters"),

  body("content").trim().isLength({ min: 50, max: 2000 }).withMessage("Content must be between 50 and 2000 characters"),

  // Rating validations
  body("ratings.overall")
    .isInt({ min: 1, max: 5 })
    .withMessage("Overall rating must be between 1 and 5"),

  body("ratings.academics").isInt({ min: 1, max: 5 }).withMessage("Academics rating must be between 1 and 5"),

  body("ratings.campusLife").isInt({ min: 1, max: 5 }).withMessage("Campus life rating must be between 1 and 5"),

  body("ratings.facilities").isInt({ min: 1, max: 5 }).withMessage("Facilities rating must be between 1 and 5"),

  body("ratings.location").isInt({ min: 1, max: 5 }).withMessage("Location rating must be between 1 and 5"),

  body("ratings.value").isInt({ min: 1, max: 5 }).withMessage("Value rating must be between 1 and 5"),

  body("studentType")
    .isIn(["current", "alumni", "parent", "faculty"])
    .withMessage("Student type must be one of: current, alumni, parent, faculty"),

  body("wouldRecommend").isBoolean().withMessage("Would recommend must be true or false"),

  body("pros").optional().isArray({ max: 10 }).withMessage("Maximum 10 pros allowed"),

  body("pros.*")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Each pro must be between 3 and 100 characters"),

  body("cons").optional().isArray({ max: 10 }).withMessage("Maximum 10 cons allowed"),

  body("cons.*")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Each con must be between 3 and 100 characters"),

  body("graduationYear")
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() + 10 })
    .withMessage("Invalid graduation year"),

  body("major").optional().trim().isLength({ max: 100 }).withMessage("Major cannot exceed 100 characters"),
]

const updateReviewValidation = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),

  body("content")
    .optional()
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage("Content must be between 50 and 2000 characters"),

  // Optional rating validations
  body("ratings.overall")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Overall rating must be between 1 and 5"),

  body("ratings.academics")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Academics rating must be between 1 and 5"),

  body("ratings.campusLife")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Campus life rating must be between 1 and 5"),

  body("ratings.facilities")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Facilities rating must be between 1 and 5"),

  body("ratings.location").optional().isInt({ min: 1, max: 5 }).withMessage("Location rating must be between 1 and 5"),

  body("ratings.value").optional().isInt({ min: 1, max: 5 }).withMessage("Value rating must be between 1 and 5"),

  body("wouldRecommend").optional().isBoolean().withMessage("Would recommend must be true or false"),
]

module.exports = {
  createReviewValidation,
  updateReviewValidation,
}
