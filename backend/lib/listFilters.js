function normalizeStatus(status) {
  if (!status) return null
  const value = String(status).toUpperCase()
  if (['DRAFT', 'SUBMITTED', 'REVISING'].includes(value)) return value
  return null
}

function normalizeDate(value) {
  if (!value) return null
  return String(value).slice(0, 10)
}

function normalizeKeyword(q) {
  if (!q) return null
  const trimmed = String(q).trim()
  return trimmed.length > 0 ? trimmed : null
}

function likePattern(q) {
  return `%${q.replace(/[%_\\]/g, '\\$&')}%`
}

module.exports = {
  normalizeStatus,
  normalizeDate,
  normalizeKeyword,
  likePattern
}
