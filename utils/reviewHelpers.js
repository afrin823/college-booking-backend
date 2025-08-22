const calculateReviewScore = (review) => {
  const { ratings, helpful, reported } = review

  // Base score from ratings (weighted average)
  const ratingScore =
    ratings.overall * 0.3 +
    ratings.academics * 0.2 +
    ratings.campusLife * 0.15 +
    ratings.facilities * 0.15 +
    ratings.location * 0.1 +
    ratings.value * 0.1

  // Helpful votes boost
  const helpfulBoost = Math.min(helpful.count * 0.1, 2) // Max 2 points from helpful votes

  // Report penalty
  const reportPenalty = Math.min(reported.count * 0.5, 3) // Max 3 points penalty

  // Content quality score (based on length and detail)
  const contentLength = review.content.length
  const prosConsCount = (review.pros?.length || 0) + (review.cons?.length || 0)
  const contentScore = Math.min(contentLength / 200 + prosConsCount * 0.2, 1)

  const finalScore = Math.max(0, ratingScore + helpfulBoost - reportPenalty + contentScore)

  return Math.round(finalScore * 10) / 10
}

const getReviewSentiment = (review) => {
  const { ratings, wouldRecommend, pros, cons } = review

  const averageRating =
    (ratings.overall + ratings.academics + ratings.campusLife + ratings.facilities + ratings.location + ratings.value) /
    6

  const prosCount = pros?.length || 0
  const consCount = cons?.length || 0

  let sentiment = "neutral"

  if (averageRating >= 4 && wouldRecommend && prosCount > consCount) {
    sentiment = "positive"
  } else if (averageRating <= 2 && !wouldRecommend && consCount > prosCount) {
    sentiment = "negative"
  }

  return sentiment
}

const validateReviewContent = (content, title) => {
  const errors = []

  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{4,}/, // Repeated characters
    /^[A-Z\s!]{20,}$/, // All caps
    /(buy|sell|cheap|discount|offer|deal).{0,20}(now|today|click)/i,
  ]

  spamPatterns.forEach((pattern) => {
    if (pattern.test(content) || pattern.test(title)) {
      errors.push("Content appears to be spam")
    }
  })

  // Check for minimum meaningful content
  const words = content.split(/\s+/).filter((word) => word.length > 2)
  if (words.length < 20) {
    errors.push("Review must contain at least 20 meaningful words")
  }

  // Check for profanity (basic check)
  const profanityWords = ["badword1", "badword2"] // Add actual profanity list
  const hasProfanity = profanityWords.some(
    (word) => content.toLowerCase().includes(word) || title.toLowerCase().includes(word),
  )

  if (hasProfanity) {
    errors.push("Review contains inappropriate language")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

module.exports = {
  calculateReviewScore,
  getReviewSentiment,
  validateReviewContent,
}
