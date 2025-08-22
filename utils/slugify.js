const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, "") // Trim - from end of text
}

const generateUniqueSlug = async (Model, baseSlug, excludeId = null) => {
  let slug = slugify(baseSlug)
  let counter = 1

  while (true) {
    const query = { slug }
    if (excludeId) {
      query._id = { $ne: excludeId }
    }

    const existingDoc = await Model.findOne(query)
    if (!existingDoc) {
      return slug
    }

    slug = `${slugify(baseSlug)}-${counter}`
    counter++
  }
}

module.exports = {
  slugify,
  generateUniqueSlug,
}
