const { get, all, run } = require('../lib/dbUtil')

const REPORT_COLUMNS = `id, report_type, user_id, department_id, team_id, start_date, end_date, status,
  current_version_id, source_config, generation_focus, content_format, created_at, updated_at`

async function countWithFilters(db, baseFromWhere, params) {
  const row = await get(db, `SELECT COUNT(*) AS cnt ${baseFromWhere}`, params)
  return row?.cnt ?? 0
}

function appendListFilters(sql, params, filters = {}) {
  const { status, from, to, q } = filters
  if (status) {
    sql += ' AND pr.status = ?'
    params.push(status)
  }
  if (from) {
    sql += ' AND pr.end_date >= ?'
    params.push(from)
  }
  if (to) {
    sql += ' AND pr.start_date <= ?'
    params.push(to)
  }
  if (q) {
    const { likePattern } = require('../lib/listFilters')
    const pattern = likePattern(q)
    sql += ` AND (pr.start_date LIKE ? ESCAPE '\\' OR pr.end_date LIKE ? ESCAPE '\\' OR IFNULL(v.content_json, '') LIKE ? ESCAPE '\\')`
    params.push(pattern, pattern, pattern)
  }
  return sql
}

async function findById(db, id) {
  return get(db, `SELECT ${REPORT_COLUMNS} FROM period_reports WHERE id = ?`, [id])
}

async function findPersonalReport(db, userId, reportType, startDate, endDate) {
  return get(
    db,
    `SELECT id FROM period_reports
     WHERE user_id = ? AND team_id IS NULL AND report_type = ? AND start_date = ? AND end_date = ?`,
    [userId, reportType, startDate, endDate]
  )
}

async function findTeamReport(db, teamId, reportType, startDate, endDate) {
  return get(
    db,
    `SELECT id FROM period_reports
     WHERE team_id = ? AND user_id IS NULL AND report_type = ? AND start_date = ? AND end_date = ?`,
    [teamId, reportType, startDate, endDate]
  )
}

async function findDepartmentReport(db, departmentId, reportType, startDate, endDate) {
  return get(
    db,
    `SELECT id FROM period_reports
     WHERE user_id IS NULL AND team_id IS NULL AND department_id = ? AND report_type = ? AND start_date = ? AND end_date = ?`,
    [departmentId, reportType, startDate, endDate]
  )
}

async function listPersonalReports(db, userId, reportType, filters = {}) {
  const { limit, offset, ...listFilters } = filters
  let fromWhere = `FROM period_reports pr
    LEFT JOIN period_report_versions v ON v.id = pr.current_version_id
    WHERE pr.user_id = ? AND pr.team_id IS NULL`
  const params = [userId]
  if (reportType) {
    fromWhere += ' AND pr.report_type = ?'
    params.push(reportType)
  }
  fromWhere = appendListFilters(fromWhere, params, listFilters)
  const total = await countWithFilters(db, fromWhere, params)
  let dataSql = `SELECT pr.id, pr.report_type, pr.user_id, pr.department_id, pr.team_id, pr.start_date, pr.end_date, pr.status,
    pr.current_version_id, pr.source_config, pr.generation_focus, pr.content_format, pr.created_at, pr.updated_at
    ${fromWhere} ORDER BY pr.start_date DESC`
  if (limit != null && offset != null) {
    dataSql += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
  }
  const rows = await all(db, dataSql, params)
  return { rows, total }
}

async function listTeamReports(db, teamId, reportType, filters = {}) {
  const { limit, offset, ...listFilters } = filters
  let fromWhere = `FROM period_reports pr
    LEFT JOIN period_report_versions v ON v.id = pr.current_version_id
    WHERE pr.team_id = ? AND pr.user_id IS NULL`
  const params = [teamId]
  if (reportType) {
    fromWhere += ' AND pr.report_type = ?'
    params.push(reportType)
  }
  fromWhere = appendListFilters(fromWhere, params, listFilters)
  const total = await countWithFilters(db, fromWhere, params)
  let dataSql = `SELECT pr.id, pr.report_type, pr.user_id, pr.department_id, pr.team_id, pr.start_date, pr.end_date, pr.status,
    pr.current_version_id, pr.source_config, pr.generation_focus, pr.content_format, pr.created_at, pr.updated_at
    ${fromWhere} ORDER BY pr.start_date DESC`
  if (limit != null && offset != null) {
    dataSql += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
  }
  const rows = await all(db, dataSql, params)
  return { rows, total }
}

async function listDepartmentReports(db, departmentId, reportType, filters = {}) {
  const { limit, offset, ...listFilters } = filters
  let fromWhere = `FROM period_reports pr
    LEFT JOIN period_report_versions v ON v.id = pr.current_version_id
    WHERE pr.user_id IS NULL AND pr.team_id IS NULL AND pr.department_id = ?`
  const params = [departmentId]
  if (reportType) {
    fromWhere += ' AND pr.report_type = ?'
    params.push(reportType)
  }
  fromWhere = appendListFilters(fromWhere, params, listFilters)
  const total = await countWithFilters(db, fromWhere, params)
  let dataSql = `SELECT pr.id, pr.report_type, pr.user_id, pr.department_id, pr.team_id, pr.start_date, pr.end_date, pr.status,
    pr.current_version_id, pr.source_config, pr.generation_focus, pr.content_format, pr.created_at, pr.updated_at
    ${fromWhere} ORDER BY pr.start_date DESC`
  if (limit != null && offset != null) {
    dataSql += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
  }
  const rows = await all(db, dataSql, params)
  return { rows, total }
}

async function insertReport(db, { reportType, userId, departmentId, teamId, startDate, endDate, sourceConfig, contentFormat }) {
  const result = await run(
    db,
    `INSERT INTO period_reports (report_type, user_id, department_id, team_id, start_date, end_date, status, source_config, content_format, generation_focus)
     VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, '')`,
    [
      reportType,
      userId ?? null,
      departmentId,
      teamId ?? null,
      startDate,
      endDate,
      sourceConfig ? JSON.stringify(sourceConfig) : null,
      contentFormat || 'period_v1'
    ]
  )
  return findById(db, result.lastID)
}

async function updateGenerationFocus(db, reportId, generationFocus) {
  await run(
    db,
    `UPDATE period_reports SET generation_focus = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [generationFocus == null ? '' : String(generationFocus), reportId]
  )
  return findById(db, reportId)
}

async function insertVersion(db, { reportId, version, versionType, templateVersionId, sourceSnapshot, contentJson, rawContent, createdBy }) {
  const result = await run(
    db,
    `INSERT INTO period_report_versions
      (report_id, version, version_type, template_version_id, source_snapshot, content_json, raw_content, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reportId,
      version,
      versionType,
      templateVersionId,
      sourceSnapshot ? JSON.stringify(sourceSnapshot) : null,
      JSON.stringify(contentJson),
      rawContent || null,
      createdBy
    ]
  )
  await run(
    db,
    `UPDATE period_reports SET current_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [result.lastID, reportId]
  )
  return get(db, 'SELECT * FROM period_report_versions WHERE id = ?', [result.lastID])
}

async function getLatestVersionNumber(db, reportId) {
  const row = await get(db, 'SELECT MAX(version) AS maxVersion FROM period_report_versions WHERE report_id = ?', [reportId])
  return row?.maxVersion || 0
}

async function getCurrentVersion(db, reportId) {
  const linked = await get(
    db,
    `SELECT v.* FROM period_reports r
     JOIN period_report_versions v ON v.id = r.current_version_id WHERE r.id = ?`,
    [reportId]
  )
  if (linked) return linked
  return get(
    db,
    `SELECT * FROM period_report_versions WHERE report_id = ? ORDER BY version DESC LIMIT 1`,
    [reportId]
  )
}

async function listVersions(db, reportId) {
  return all(
    db,
    `SELECT id, report_id, version, version_type, template_version_id, content_json, created_by, created_at
     FROM period_report_versions WHERE report_id = ? ORDER BY version ASC`,
    [reportId]
  )
}

async function updateStatus(db, id, status) {
  await run(db, `UPDATE period_reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id])
  return findById(db, id)
}

async function updateSourceConfig(db, id, sourceConfig) {
  await run(
    db,
    `UPDATE period_reports SET source_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [JSON.stringify(sourceConfig), id]
  )
  return findById(db, id)
}

module.exports = {
  findById,
  findPersonalReport,
  findTeamReport,
  findDepartmentReport,
  listPersonalReports,
  listTeamReports,
  listDepartmentReports,
  insertReport,
  insertVersion,
  getLatestVersionNumber,
  getCurrentVersion,
  listVersions,
  updateStatus,
  updateSourceConfig,
  updateGenerationFocus
}
