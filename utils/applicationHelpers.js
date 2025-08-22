const calculateApplicationProgress = (applicationData) => {
  const sections = {
    personalInfo: 0,
    academicInfo: 0,
    essays: 0,
    extracurriculars: 0,
    workExperience: 0,
  }

  const totalSections = Object.keys(sections).length
  let completedSections = 0

  // Check personal info
  const { personalInfo } = applicationData
  if (
    personalInfo?.firstName &&
    personalInfo?.lastName &&
    personalInfo?.email &&
    personalInfo?.phone &&
    personalInfo?.dateOfBirth
  ) {
    sections.personalInfo = 1
    completedSections++
  }

  // Check academic info
  const { academicInfo } = applicationData
  if (academicInfo?.gpa && academicInfo?.currentEducation) {
    sections.academicInfo = 1
    completedSections++
  }

  // Check essays
  const { essays } = applicationData
  if (essays && essays.length > 0 && essays.every((essay) => essay.response && essay.response.length > 100)) {
    sections.essays = 1
    completedSections++
  }

  // Check extracurriculars
  const { extracurriculars } = applicationData
  if (extracurriculars && extracurriculars.length > 0) {
    sections.extracurriculars = 1
    completedSections++
  }

  // Check work experience
  const { workExperience } = applicationData
  if (workExperience && workExperience.length > 0) {
    sections.workExperience = 1
    completedSections++
  }

  return {
    sections,
    completedSections,
    totalSections,
    percentage: Math.round((completedSections / totalSections) * 100),
    isComplete: completedSections === totalSections,
  }
}

const validateApplicationForSubmission = (applicationData) => {
  const errors = []

  // Required personal info
  const { personalInfo } = applicationData
  if (!personalInfo?.firstName) errors.push("First name is required")
  if (!personalInfo?.lastName) errors.push("Last name is required")
  if (!personalInfo?.email) errors.push("Email is required")
  if (!personalInfo?.phone) errors.push("Phone number is required")
  if (!personalInfo?.dateOfBirth) errors.push("Date of birth is required")

  // Required academic info
  const { academicInfo } = applicationData
  if (!academicInfo?.gpa) errors.push("GPA is required")
  if (!academicInfo?.currentEducation) errors.push("Current education level is required")

  // Required essays
  const { essays } = applicationData
  if (!essays || essays.length === 0) {
    errors.push("At least one essay is required")
  } else {
    essays.forEach((essay, index) => {
      if (!essay.response || essay.response.length < 100) {
        errors.push(`Essay ${index + 1} must be at least 100 characters`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

const generateApplicationNumber = () => {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substr(2, 5).toUpperCase()
  return `APP-${timestamp.slice(-6)}-${random}`
}

module.exports = {
  calculateApplicationProgress,
  validateApplicationForSubmission,
  generateApplicationNumber,
}
