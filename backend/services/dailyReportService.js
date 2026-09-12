const { AppError } = require('../lib/errors')
const { get } = require('../lib/dbUtil')
const dailyReportRepo = require('../repositories/dailyReportRepo')

async function getActiveDailyTemplateVersion(db) {
  const row = await get(
    db,
    `SELECT tv.id, tv.form_schema
     FROM templates t
     JOIN template_versions tv ON tv.id = t.current_version_id
     WHERE t.type = 'DAILY' AND t.status = 'ACTIVE'
     LIMIT 1`
  )
  if (!row) {
    throw new AppError('TEMPLATE_NOT_FOUND', '未找到可用的日报模板', 404)
  }
  return row
}

function parseFormSchema(formSchemaRaw) {
  if (!formSchemaRaw) return { fields: [] }
  try {
    return typeof formSchemaRaw === 'string' ? JSON.parse(formSchemaRaw) : formSchemaRaw
  } catch {
    return { fields: [] }
  }
}

function validateContent(formSchema, content) {
  const fields = formSchema.fields || []
  for (const field of fields) {
    if (!field.required) continue
    const value = content[field.key]
    if (value == null || String(value).trim() === '') {
      throw new AppError('VALIDATION_ERROR', `${field.label || field.key} 不能为空`, 400)
    }
  }
}

function serializeReport(row) {
  if (!row) return null
  return {
    ...row,
    content_json: typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json
  }
}

async function listReports(db, user, query = {}) {
  const { normalizeStatus, normalizeDate, normalizeKeyword } = require('../lib/listFilters')
  const { parsePagination, paginatedEnvelope } = require('../lib/pagination')
  const filters = {
    from: normalizeDate(query.from),
    to: normalizeDate(query.to),
    status: normalizeStatus(query.status),
    q: normalizeKeyword(query.q)
  }
  const { page, pageSize, offset } = parsePagination(query)
  const total = await dailyReportRepo.countByUser(db, user.userId, filters)
  const rows = await dailyReportRepo.listByUser(db, user.userId, {
    ...filters,
    limit: pageSize,
    offset
  })
  return paginatedEnvelope(rows.map(serializeReport), total, page, pageSize)
}

async function getReport(db, id) {
  const row = await dailyReportRepo.findById(db, id)
  return serializeReport(row)
}

async function createReport(db, user, { reportDate, content }) {
  if (!user.departmentId) {
    throw new AppError('DEPARTMENT_REQUIRED', '用户未分配部门，无法创建日报', 400)
  }
  if (!reportDate) {
    throw new AppError('VALIDATION_ERROR', 'reportDate 不能为空', 400)
  }

  const existing = await dailyReportRepo.findByUserAndDate(db, user.userId, reportDate)
  if (existing) {
    throw new AppError('REPORT_EXISTS', '该日期已有日报', 409)
  }

  const template = await getActiveDailyTemplateVersion(db)
  const formSchema = parseFormSchema(template.form_schema)
  const contentJson = content || {}
  validateContent(formSchema, contentJson)

  const row = await dailyReportRepo.insert(db, {
    userId: user.userId,
    departmentId: user.departmentId,
    templateVersionId: template.id,
    reportDate,
    contentJson
  })
  return serializeReport(row)
}

async function updateReport(db, user, id, content) {
  const existing = await dailyReportRepo.findById(db, id)
  if (!existing) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  if (existing.user_id !== user.userId) {
    throw new AppError('FORBIDDEN', '无权修改他人报告', 403)
  }
  if (existing.status !== 'DRAFT' && existing.status !== 'REVISING') {
    throw new AppError('REPORT_LOCKED', '已提交的日报不可编辑，请先发起修改', 409)
  }

  const template = await get(db, 'SELECT form_schema FROM template_versions WHERE id = ?', [existing.template_version_id])
  const formSchema = parseFormSchema(template?.form_schema)
  validateContent(formSchema, content || {})

  const row = await dailyReportRepo.updateContent(db, id, content || {})
  return serializeReport(row)
}

async function submitReport(db, user, id) {
  const existing = await dailyReportRepo.findById(db, id)
  if (!existing) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  if (existing.user_id !== user.userId) {
    throw new AppError('FORBIDDEN', '无权提交他人报告', 403)
  }
  if (existing.status !== 'DRAFT' && existing.status !== 'REVISING') {
    throw new AppError('REPORT_ALREADY_SUBMITTED', '报告已提交', 409)
  }

  const template = await get(db, 'SELECT form_schema FROM template_versions WHERE id = ?', [existing.template_version_id])
  const formSchema = parseFormSchema(template?.form_schema)
  const content = typeof existing.content_json === 'string' ? JSON.parse(existing.content_json) : existing.content_json
  validateContent(formSchema, content)

  const row = await dailyReportRepo.updateStatus(db, id, 'SUBMITTED')
  return serializeReport(row)
}

async function reviseReport(db, user, id) {
  const existing = await dailyReportRepo.findById(db, id)
  if (!existing) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  if (existing.user_id !== user.userId) {
    throw new AppError('FORBIDDEN', '无权修改他人报告', 403)
  }
  if (existing.status !== 'SUBMITTED') {
    throw new AppError('VALIDATION_ERROR', '仅已提交日报可以发起修改', 400)
  }

  const row = await dailyReportRepo.updateStatus(db, id, 'REVISING')
  return serializeReport(row)
}

module.exports = {
  listReports,
  getReport,
  createReport,
  updateReport,
  submitReport,
  reviseReport,
  getActiveDailyTemplateVersion,
  parseFormSchema
}
