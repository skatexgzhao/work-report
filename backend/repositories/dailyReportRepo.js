const { get, all, run } = require('../lib/dbUtil')

function appendDailyListFilters(sql, params, { from, to, status, q } = {}) {
  if (from) {
    sql += ' AND report_date >= ?'
    params.push(from)
  }
  if (to) {
    sql += ' AND report_date <= ?'
    params.push(to)
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (q) {
    const { likePattern } = require('../lib/listFilters')
    sql += ` AND LOWER(content_json) LIKE LOWER(?) ESCAPE '\\'`
    params.push(likePattern(q))
  }
  return sql
}

async function findById(db, id) {
  return get(
    db,
    `SELECT id, user_id, department_id, template_version_id, report_date, content_json, status, created_at, updated_at
     FROM daily_reports WHERE id = ?`,
    [id]
  )
}

async function countByUser(db, userId, filters = {}) {
  let sql = 'SELECT COUNT(*) AS cnt FROM daily_reports WHERE user_id = ?'
  const params = [userId]
  sql = appendDailyListFilters(sql, params, filters)
  const row = await get(db, sql, params)
  return row?.cnt ?? 0
}

async function listByUser(db, userId, filters = {}) {
  const { limit, offset, ...listFilters } = filters
  let sql = `SELECT id, user_id, department_id, template_version_id, report_date, content_json, status, created_at, updated_at
             FROM daily_reports WHERE user_id = ?`
  const params = [userId]
  sql = appendDailyListFilters(sql, params, listFilters)
  sql += ' ORDER BY report_date DESC'
  if (limit != null && offset != null) {
    sql += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
  }
  return all(db, sql, params)
}

async function findByUserAndDate(db, userId, reportDate) {
  return get(
    db,
    `SELECT id, user_id, department_id, template_version_id, report_date, content_json, status, created_at, updated_at
     FROM daily_reports WHERE user_id = ? AND report_date = ?`,
    [userId, reportDate]
  )
}

async function insert(db, { userId, departmentId, templateVersionId, reportDate, contentJson, status = 'DRAFT' }) {
  const result = await run(
    db,
    `INSERT INTO daily_reports (user_id, department_id, template_version_id, report_date, content_json, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, departmentId, templateVersionId, reportDate, JSON.stringify(contentJson), status]
  )
  return findById(db, result.lastID)
}

async function updateContent(db, id, contentJson) {
  await run(
    db,
    `UPDATE daily_reports SET content_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [JSON.stringify(contentJson), id]
  )
  return findById(db, id)
}

async function updateStatus(db, id, status) {
  await run(
    db,
    `UPDATE daily_reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, id]
  )
  return findById(db, id)
}

module.exports = {
  findById,
  countByUser,
  listByUser,
  findByUserAndDate,
  insert,
  updateContent,
  updateStatus
}
