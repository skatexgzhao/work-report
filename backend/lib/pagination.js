const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function parsePagination(query = {}, options = {}) {
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE
  const maxPageSize = options.maxPageSize ?? MAX_PAGE_SIZE
  let page = parseInt(query.page, 10)
  let pageSize = parseInt(query.pageSize, 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = defaultPageSize
  pageSize = Math.min(pageSize, maxPageSize)
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}

function paginatedEnvelope(items, total, page, pageSize) {
  return {
    items,
    total,
    page,
    pageSize
  }
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePagination,
  paginatedEnvelope
}
