const { body, validationResult } = require("express-validator")

// Common validation rules
const validateEmail = body("email").isEmail().withMessage("Please enter a valid email").normalizeEmail()

const validatePassword = body("password")
  .isLength({ min: 6 })
  .withMessage("Password must be at least 6 characters")
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number")

const validateName = body("name")
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage("Name must be between 2 and 50 characters")
  .matches(/^[a-zA-Z\s]+$/)
  .withMessage("Name can only contain letters and spaces")

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
      message: "Validation failed",
    })
  }
  next()
}

// Export validation chains
const registerValidation = [validateName, validateEmail, validatePassword, handleValidationErrors]

const loginValidation = [
  validateEmail,
  body("password").exists().withMessage("Password is required"),
  handleValidationErrors,
]

const forgotPasswordValidation = [validateEmail, handleValidationErrors]

const resetPasswordValidation = [
  body("token").exists().withMessage("Reset token is required"),
  validatePassword,
  handleValidationErrors,
]

const changePasswordValidation = [
  body("currentPassword").exists().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("New password must contain at least one uppercase letter, one lowercase letter, and one number"),
  handleValidationErrors,
]

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  handleValidationErrors,
}
