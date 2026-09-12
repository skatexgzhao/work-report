const { AppError } = require('../lib/errors')
const { get, all } = require('../lib/dbUtil')
const periodReportRepo = require('../repositories/periodReportRepo')
const {
  CONTENT_FORMAT_V2,
  emptyPeriodV2Content,
  periodV2ContentFromEditor,
  isPeriodV2Report
} = require('../lib/periodContentV2')
const teamRepo = require('../repositories/teamRepo')
const { calculatePeriodRange, assertRangeMatches } = require('../lib/periodCalculator')
const {
  defaultSourceConfig,
  parseSourceConfig,
  validateSourceConfig,
  getSourceOptions,
  diffSourceConfig,
  hasSourceConfigChanges,
  DEPARTMENT_TO_PERSONAL,
  DEPARTMENT_TO_TEAM,
  TEAM_TO_PERSONAL,
  isMemberSourceType,
  isTeamSourceType
} = require('../lib/sourceConfig')
const { resolveSourceData } = require('./sourceDataService')

const PERSONAL_TYPES = new Set(['PERSONAL_WEEKLY', 'PERSONAL_MONTHLY', 'PERSONAL_QUARTERLY'])
const TEAM_TYPES = new Set(['TEAM_WEEKLY', 'TEAM_MONTHLY', 'TEAM_QUARTERLY'])
const DEPARTMENT_TYPES = new Set(['DEPARTMENT_WEEKLY', 'DEPARTMENT_MONTHLY', 'DEPARTMENT_QUARTERLY'])
const ALL_TYPES = new Set([...PERSONAL_TYPES, ...TEAM_TYPES, ...DEPARTMENT_TYPES])

function isDepartmentReport(report) {
  return DEPARTMENT_TYPES.has(report.report_type)
}

function isTeamReport(report) {
  return TEAM_TYPES.has(report.report_type) || (report.team_id && !report.user_id)
}

function isEditableStatus(status) {
  return status === 'DRAFT' || status === 'REVISING'
}

function assertCanAccessReport(user, report) {
  if (isDepartmentReport(report)) {
    if (user.role === 'admin') return
    if (user.role === 'manager' && user.departmentId === report.department_id) return
    throw new AppError('FORBIDDEN', '无权访问该部门报告', 403)
  }
  if (isTeamReport(report)) {
    if (user.role === 'admin') return
    if (user.role === 'manager' && user.departmentId === report.department_id) return
    throw new AppError('FORBIDDEN', '无权访问该小组报告', 403)
  }
  if (user.role === 'admin') return
  if (report.user_id === user.userId) return
  throw new AppError('FORBIDDEN', '无权访问该报告', 403)
}

function assertCanEditReport(user, report) {
  assertCanAccessReport(user, report)
  if (isDepartmentReport(report) || isTeamReport(report)) {
    if (user.role === 'admin' || user.role === 'manager') return
    throw new AppError('FORBIDDEN', '无权编辑该报告', 403)
  }
  if (report.user_id !== user.userId) {
    throw new AppError('FORBIDDEN', '无权编辑该报告', 403)
  }
}

async function getTemplateForType(db, reportType) {
  const row = await get(
    db,
    `SELECT tv.id, tv.form_schema, tv.prompt_template, tv.output_schema
     FROM templates t
     JOIN template_versions tv ON tv.id = t.current_version_id
     WHERE t.type = ? AND t.status = 'ACTIVE'
     LIMIT 1`,
    [reportType]
  )
  if (!row) {
    throw new AppError('TEMPLATE_NOT_FOUND', `未找到模板: ${reportType}`, 404)
  }
  return row
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback
  return typeof value === 'string' ? JSON.parse(value) : value
}

function serializeReport(report) {
  if (!report) return null
  return {
    ...report,
    source_config: parseSourceConfig(report.source_config, report.report_type)
  }
}

function serializeVersion(version) {
  return {
    ...version,
    content_json: parseJson(version.content_json),
    source_snapshot: parseJson(version.source_snapshot, null)
  }
}

function buildActionMeta(report, version, sourceData, extra = {}) {
  const config = parseSourceConfig(report.source_config, report.report_type)
  return {
    action: extra.action || 'unknown',
    status: report.status,
    version: version?.version ?? null,
    versionType: version?.version_type ?? null,
    sourceTypes: sourceData?.sourceTypes || config.sourceTypes || [],
    sourceItemCount: sourceData?.itemCount ?? 0,
    ...extra
  }
}

function buildSourceConfig(reportType, input) {
  const base = defaultSourceConfig(reportType)
  const partial = input?.sourceConfig
    ? {
        ...base,
        sourceTypes: input.sourceConfig.sourceTypes,
        referenceUserIds: input.sourceConfig.referenceUserIds || [],
        referenceTeamIds: input.sourceConfig.referenceTeamIds || [],
        includeAllMembers: input.sourceConfig.includeAllMembers !== false,
        scopeMode: input.sourceConfig.scopeMode ?? base.scopeMode
      }
    : { ...base }

  if (reportType.startsWith('DEPARTMENT_') && partial.scopeMode === 'team') {
    partial.referenceUserIds = []
    partial.includeAllMembers = true
  } else if (reportType.startsWith('DEPARTMENT_') && partial.scopeMode === 'member') {
    partial.referenceTeamIds = []
  }

  const config = parseSourceConfig(partial, reportType)
  const error = validateSourceConfig(reportType, config)
  if (error) {
    throw new AppError('VALIDATION_ERROR', error, 400)
  }
  return config
}

function buildListFilters(query = {}) {
  const { normalizeStatus, normalizeDate, normalizeKeyword } = require('../lib/listFilters')
  return {
    status: normalizeStatus(query.status),
    from: normalizeDate(query.from),
    to: normalizeDate(query.to),
    q: normalizeKeyword(query.q)
  }
}

async function enrichReportListRow(db, row) {
  const base = serializeReport(row)
  let team_name = null
  if (row.team_id) {
    const team = await get(db, 'SELECT name FROM teams WHERE id = ?', [row.team_id])
    team_name = team?.name || null
  }
  const creator = await get(
    db,
    `SELECT u.username FROM period_report_versions v
     JOIN users u ON u.id = v.created_by
     WHERE v.report_id = ?
     ORDER BY v.version ASC
     LIMIT 1`,
    [row.id]
  )
  return {
    ...base,
    team_name,
    created_by_username: creator?.username || null,
    last_edited_at: row.updated_at
  }
}

async function listReports(db, user, query = {}) {
  const { parsePagination, paginatedEnvelope } = require('../lib/pagination')
  const { scope = 'personal', reportType, teamId } = query
  const listFilters = buildListFilters(query)
  const { page, pageSize, offset } = parsePagination(query)
  const pageOpts = { ...listFilters, limit: pageSize, offset }

  if (scope === 'department') {
    if (user.role !== 'manager' && user.role !== 'admin') {
      throw new AppError('FORBIDDEN', '需要管理者权限', 403)
    }
    if (!user.departmentId) {
      throw new AppError('DEPARTMENT_REQUIRED', '用户未分配部门', 400)
    }
    const { rows, total } = await periodReportRepo.listDepartmentReports(
      db,
      user.departmentId,
      reportType,
      pageOpts
    )
    const items = await Promise.all(rows.map((row) => enrichReportListRow(db, row)))
    return paginatedEnvelope(items, total, page, pageSize)
  }

  if (scope === 'team') {
    if (user.role !== 'manager' && user.role !== 'admin') {
      throw new AppError('FORBIDDEN', '需要管理者权限', 403)
    }
    if (!teamId) {
      throw new AppError('VALIDATION_ERROR', 'teamId 不能为空', 400)
    }
    const team = await teamRepo.findById(db, teamId)
    if (!team || (user.role !== 'admin' && team.department_id !== user.departmentId)) {
      throw new AppError('FORBIDDEN', '无权访问该小组', 403)
    }
    const { rows, total } = await periodReportRepo.listTeamReports(db, teamId, reportType, pageOpts)
    const enriched = await Promise.all(rows.map((row) => enrichReportListRow(db, row)))
    const items = enriched.map((row) => ({ ...row, team_name: row.team_name || team.name }))
    return paginatedEnvelope(items, total, page, pageSize)
  }

  const { rows, total } = await periodReportRepo.listPersonalReports(db, user.userId, reportType, pageOpts)
  const items = await Promise.all(rows.map((row) => enrichReportListRow(db, row)))
  return paginatedEnvelope(items, total, page, pageSize)
}

async function createReport(db, user, body) {
  const { reportType, anchorDate, startDate, endDate, departmentId, teamId, sourceConfig: sourceConfigInput } = body

  if (!ALL_TYPES.has(reportType)) {
    throw new AppError('VALIDATION_ERROR', '无效的报告类型', 400)
  }

  const calculated = calculatePeriodRange(reportType, anchorDate)
  const finalStart = startDate || calculated.startDate
  const finalEnd = endDate || calculated.endDate

  if (startDate && endDate) {
    const mismatch = assertRangeMatches(reportType, anchorDate || finalStart, startDate, endDate)
    if (mismatch) {
      throw new AppError('VALIDATION_ERROR', 'startDate/endDate 与周期计算结果不一致', 400)
    }
  }

  const sourceConfig = buildSourceConfig(reportType, { sourceConfig: sourceConfigInput })

  if (DEPARTMENT_TYPES.has(reportType)) {
    if (user.role !== 'manager' && user.role !== 'admin') {
      throw new AppError('FORBIDDEN', '需要管理者权限', 403)
    }
    const targetDepartmentId = user.role === 'admin' && departmentId ? departmentId : user.departmentId
    if (!targetDepartmentId) {
      throw new AppError('DEPARTMENT_REQUIRED', '用户未分配部门', 400)
    }
    if (user.role === 'manager' && departmentId && departmentId !== user.departmentId) {
      throw new AppError('FORBIDDEN', '无权为其他部门创建报告', 403)
    }

    const existing = await periodReportRepo.findDepartmentReport(db, targetDepartmentId, reportType, finalStart, finalEnd)
    if (existing) {
      throw new AppError('REPORT_EXISTS', '该周期部门报告已存在', 409)
    }

    return serializeReport(
      await periodReportRepo.insertReport(db, {
        reportType,
        userId: null,
        departmentId: targetDepartmentId,
        startDate: finalStart,
        endDate: finalEnd,
        sourceConfig,
        contentFormat: CONTENT_FORMAT_V2
      })
    )
  }

  if (TEAM_TYPES.has(reportType)) {
    if (user.role !== 'manager' && user.role !== 'admin') {
      throw new AppError('FORBIDDEN', '需要管理者权限', 403)
    }
    if (!teamId) {
      throw new AppError('VALIDATION_ERROR', 'teamId 不能为空', 400)
    }
    const team = await teamRepo.findById(db, teamId)
    if (!team) {
      throw new AppError('TEAM_NOT_FOUND', '小组不存在', 404)
    }
    if (user.role !== 'admin' && team.department_id !== user.departmentId) {
      throw new AppError('FORBIDDEN', '无权为该小组创建报告', 403)
    }

    const existing = await periodReportRepo.findTeamReport(db, teamId, reportType, finalStart, finalEnd)
    if (existing) {
      throw new AppError('REPORT_EXISTS', '该周期小组报告已存在', 409)
    }

    return serializeReport(
      await periodReportRepo.insertReport(db, {
        reportType,
        userId: null,
        departmentId: team.department_id,
        teamId,
        startDate: finalStart,
        endDate: finalEnd,
        sourceConfig,
        contentFormat: CONTENT_FORMAT_V2
      })
    )
  }

  if (!user.departmentId) {
    throw new AppError('DEPARTMENT_REQUIRED', '用户未分配部门', 400)
  }

  const existing = await periodReportRepo.findPersonalReport(db, user.userId, reportType, finalStart, finalEnd)
  if (existing) {
    throw new AppError('REPORT_EXISTS', '该周期报告已存在', 409)
  }

  return serializeReport(
    await periodReportRepo.insertReport(db, {
      reportType,
      userId: user.userId,
      departmentId: user.departmentId,
      startDate: finalStart,
      endDate: finalEnd,
      sourceConfig,
      contentFormat: CONTENT_FORMAT_V2
    })
  )
}

async function updateGenerationFocus(db, user, reportId, generationFocus) {
  const report = await periodReportRepo.findById(db, reportId)
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  assertCanEditReport(user, report)
  if (!isEditableStatus(report.status)) {
    throw new AppError('REPORT_LOCKED', '已提交报告不可修改，请先发起修改', 409)
  }
  await periodReportRepo.updateGenerationFocus(db, reportId, generationFocus)
  return getReport(db, user, reportId)
}

async function getReport(db, user, id) {
  const report = await periodReportRepo.findById(db, id)
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  if (user) {
    assertCanAccessReport(user, report)
  }
  const version = await periodReportRepo.getCurrentVersion(db, id)
  const versions = await periodReportRepo.listVersions(db, id)
  return {
    ...serializeReport(report),
    currentVersion: version ? serializeVersion(version) : null,
    versions: versions.map(serializeVersion)
  }
}

function previewConfigFromQuery(report, query = {}) {
  if (!query || query.preview !== '1') return null
  const base = parseSourceConfig(report.source_config, report.report_type)
  const partial = {
    ...base,
    sourceTypes: query.sourceType ? [query.sourceType] : base.sourceTypes,
    includeAllMembers:
      query.includeAllMembers !== undefined ? query.includeAllMembers === 'true' : base.includeAllMembers,
    scopeMode: query.scopeMode || base.scopeMode
  }
  if (query.referenceUserIds) {
    partial.referenceUserIds = String(query.referenceUserIds)
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id))
  }
  if (query.referenceTeamIds) {
    partial.referenceTeamIds = String(query.referenceTeamIds)
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id))
  }
  return buildSourceConfig(report.report_type, { sourceConfig: partial })
}

async function getSourceData(db, user, reportId, query = {}) {
  const report = await periodReportRepo.findById(db, reportId)
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  assertCanAccessReport(user, report)
  const previewConfig = previewConfigFromQuery(report, query)
  return resolveSourceData(db, report, previewConfig)
}

async function findBestPeriodReportInWindow(db, { userId, teamId, reportType, windowStart, windowEnd }) {
  let sql = `SELECT pr.id, pr.status, pr.updated_at, pr.start_date, pr.end_date
             FROM period_reports pr
             WHERE pr.report_type = ?
               AND pr.start_date >= ? AND pr.end_date <= ?`
  const params = [reportType, windowStart, windowEnd]
  if (userId) {
    sql += ' AND pr.user_id = ? AND pr.team_id IS NULL'
    params.push(userId)
  } else if (teamId) {
    sql += ' AND pr.team_id = ? AND pr.user_id IS NULL'
    params.push(teamId)
  }
  sql += ` ORDER BY CASE WHEN pr.status = 'SUBMITTED' THEN 0 ELSE 1 END, pr.end_date DESC, pr.id DESC LIMIT 1`
  return get(db, sql, params)
}

async function findDailySubmissionInWindow(db, userId, windowStart, windowEnd) {
  const row = await get(
    db,
    `SELECT COUNT(*) AS cnt
     FROM daily_reports
     WHERE user_id = ? AND report_date >= ? AND report_date <= ? AND status = 'SUBMITTED'`,
    [userId, windowStart, windowEnd]
  )
  if (!row?.cnt) return null
  const latest = await get(
    db,
    `SELECT updated_at FROM daily_reports
     WHERE user_id = ? AND report_date >= ? AND report_date <= ? AND status = 'SUBMITTED'
     ORDER BY report_date DESC LIMIT 1`,
    [userId, windowStart, windowEnd]
  )
  return { id: null, status: 'SUBMITTED', updated_at: latest?.updated_at || null }
}

function teamStatusTargetFromConfig(reportType, config) {
  const chosen = config.sourceTypes?.[0]
  if (chosen === 'DAILY') return 'DAILY'
  if (chosen && chosen.startsWith('PERSONAL_')) return chosen
  return TEAM_TO_PERSONAL[reportType]
}

async function getTeamMemberSubmissionStatus(db, report, config) {
  const targetType = teamStatusTargetFromConfig(report.report_type, config)
  if (!targetType) {
    throw new AppError('VALIDATION_ERROR', '无效的小组报告类型', 400)
  }

  let members = await teamRepo.listMembers(db, report.team_id)
  if (!config.includeAllMembers && config.referenceUserIds.length) {
    const selected = new Set(config.referenceUserIds.map(Number))
    members = members.filter((member) => selected.has(Number(member.id)))
  }

  const rows = []
  for (const member of members) {
    let match = null
    if (targetType === 'DAILY') {
      match = await findDailySubmissionInWindow(db, member.id, report.start_date, report.end_date)
    } else {
      match = await findBestPeriodReportInWindow(db, {
        userId: member.id,
        reportType: targetType,
        windowStart: report.start_date,
        windowEnd: report.end_date
      })
    }

    let reportStatus = 'MISSING'
    if (match) {
      reportStatus = match.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT'
    }

    rows.push({
      userId: member.id,
      username: member.username,
      reportStatus,
      reportId: match?.id || null,
      updatedAt: match?.updated_at || null
    })
  }

  return {
    reportId: report.id,
    scopeMode: 'member',
    targetReportType: targetType,
    startDate: report.start_date,
    endDate: report.end_date,
    rows
  }
}

async function getMemberSubmissionStatus(db, user, reportId, query = {}) {
  const report = await periodReportRepo.findById(db, reportId)
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  assertCanAccessReport(user, report)

  const config = previewConfigFromQuery(report, query) || parseSourceConfig(report.source_config, report.report_type)

  if (isTeamReport(report)) {
    return getTeamMemberSubmissionStatus(db, report, config)
  }

  if (!isDepartmentReport(report)) {
    throw new AppError('VALIDATION_ERROR', '仅部门或小组报告支持提交状态', 400)
  }

  const scopeMode = config.scopeMode || 'team'

  if (scopeMode === 'team') {
    const chosen = config.sourceTypes?.[0]
    const teamReportType =
      chosen && isTeamSourceType(chosen) ? chosen : DEPARTMENT_TO_TEAM[report.report_type]
    let teamRows = await all(
      db,
      `SELECT id, name FROM teams WHERE department_id = ? AND status = 'ACTIVE' ORDER BY name`,
      [report.department_id]
    )
    if (config.referenceTeamIds.length) {
      const selected = new Set(config.referenceTeamIds)
      teamRows = teamRows.filter((team) => selected.has(team.id))
    }

    const rows = []
    for (const team of teamRows) {
      const teamReport = await findBestPeriodReportInWindow(db, {
        teamId: team.id,
        reportType: teamReportType,
        windowStart: report.start_date,
        windowEnd: report.end_date
      })

      let reportStatus = 'MISSING'
      if (teamReport) {
        reportStatus = teamReport.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT'
      }

      rows.push({
        teamId: team.id,
        teamName: team.name,
        reportStatus,
        reportId: teamReport?.id || null,
        updatedAt: teamReport?.updated_at || null
      })
    }

    return {
      reportId: report.id,
      scopeMode: 'team',
      targetReportType: teamReportType,
      startDate: report.start_date,
      endDate: report.end_date,
      rows
    }
  }

  const chosen = config.sourceTypes?.[0]
  const personalType =
    chosen && isMemberSourceType(chosen) && chosen !== 'DAILY'
      ? chosen
      : DEPARTMENT_TO_PERSONAL[report.report_type]
  let members = await all(
    db,
    `SELECT u.id AS userId, u.username
     FROM users u
     JOIN user_departments ud ON ud.user_id = u.id
     WHERE ud.department_id = ?
     ORDER BY u.username`,
    [report.department_id]
  )

  if (!config.includeAllMembers && config.referenceUserIds.length) {
    const selected = new Set(config.referenceUserIds)
    members = members.filter((member) => selected.has(member.userId))
  }

  const rows = []
  for (const member of members) {
    let match = null
    if (config.sourceTypes?.[0] === 'DAILY') {
      match = await findDailySubmissionInWindow(db, member.userId, report.start_date, report.end_date)
    } else {
      match = await findBestPeriodReportInWindow(db, {
        userId: member.userId,
        reportType: personalType,
        windowStart: report.start_date,
        windowEnd: report.end_date
      })
    }

    let reportStatus = 'MISSING'
    if (match) {
      reportStatus = match.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT'
    }

    rows.push({
      userId: member.userId,
      username: member.username,
      reportStatus,
      reportId: match?.id || null,
      updatedAt: match?.updated_at || null
    })
  }

  return {
    reportId: report.id,
    scopeMode: 'member',
    targetReportType: config.sourceTypes?.[0] === 'DAILY' ? 'DAILY' : personalType,
    startDate: report.start_date,
    endDate: report.end_date,
    rows
  }
}

async function saveDraft(db, user, reportId, content) {
  const report = await periodReportRepo.findById(db, reportId)
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  assertCanEditReport(user, report)
  if (!isEditableStatus(report.status)) {
    throw new AppError('REPORT_LOCKED', '已提交报告不可编辑，请先发起修改', 409)
  }
  if (content === undefined) {
    throw new AppError('VALIDATION_ERROR', '请求体缺少 content 字段', 400)
  }

  const template = await getTemplateForType(db, report.report_type)
  const nextVersion = (await periodReportRepo.getLatestVersionNumber(db, reportId)) + 1
  const sourceData = await resolveSourceData(db, report)

  let contentJson = content ?? (report.content_format === CONTENT_FORMAT_V2 ? emptyPeriodV2Content() : {})
  if (isPeriodV2Report(report) || contentJson?.content_format === CONTENT_FORMAT_V2) {
    const { preparePeriodV2SaveContent, validatePeriodReportContentForSave } = require('../lib/periodContentV2')
    contentJson = preparePeriodV2SaveContent(contentJson)
    const validationError = validatePeriodReportContentForSave(report, contentJson)
    if (validationError) {
      throw new AppError('VALIDATION_ERROR', validationError, 400)
    }
  } else {
    const { validatePeriodReportContentForSave } = require('../lib/periodContentV2')
    const validationError = validatePeriodReportContentForSave(report, contentJson)
    if (validationError) {
      throw new AppError('VALIDATION_ERROR', validationError, 400)
    }
  }

  const version = await periodReportRepo.insertVersion(db, {
    reportId,
    version: nextVersion,
    versionType: report.status === 'REVISING' ? 'REVISION' : 'DRAFT',
    templateVersionId: template.id,
    sourceSnapshot: sourceData,
    contentJson,
    createdBy: user.userId
  })

  return {
    report: await getReport(db, user, reportId),
    version: serializeVersion(version),
    meta: buildActionMeta(await periodReportRepo.findById(db, reportId), version, sourceData, {
      action: 'save_draft'
    })
  }
}

async function updateSourceConfig(db, user, reportId, sourceConfigInput) {
  const report = await periodReportRepo.findById(db, reportId)
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  assertCanEditReport(user, report)
  if (!isEditableStatus(report.status)) {
    throw new AppError('REPORT_LOCKED', '已提交报告不可修改素材设置，请先发起修改', 409)
  }

  const before = parseSourceConfig(report.source_config, report.report_type)
  const next = buildSourceConfig(report.report_type, { sourceConfig: sourceConfigInput })
  const changes = diffSourceConfig(before, next)

  if (!hasSourceConfigChanges(changes)) {
    const sourceData = await resolveSourceData(db, report)
    return {
      report: await getReport(db, user, reportId),
      sourceData,
      changes,
      meta: buildActionMeta(report, null, sourceData, { action: 'update_source_config', changed: false })
    }
  }

  await periodReportRepo.updateSourceConfig(db, reportId, next)
  const updated = await periodReportRepo.findById(db, reportId)
  const sourceData = await resolveSourceData(db, updated)

  return {
    report: await getReport(db, user, reportId),
    sourceData,
    changes,
    meta: buildActionMeta(updated, null, sourceData, { action: 'update_source_config', changed: true, changes })
  }
}

async function submitReport(db, user, reportId) {
  const report = await periodReportRepo.findById(db, reportId)
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  assertCanEditReport(user, report)
  if (!isEditableStatus(report.status)) {
    throw new AppError('REPORT_ALREADY_SUBMITTED', '报告已提交', 409)
  }

  const current = await periodReportRepo.getCurrentVersion(db, reportId)
  if (!current) {
    throw new AppError('VALIDATION_ERROR', '请先保存或生成报告内容', 400)
  }

  let content = parseJson(current.content_json)
  const { preparePeriodV2SaveContent, validatePeriodReportContentForSave } = require('../lib/periodContentV2')
  if (isPeriodV2Report(report) || content?.content_format === CONTENT_FORMAT_V2) {
    content = preparePeriodV2SaveContent(content)
  }
  const submitValidationError = validatePeriodReportContentForSave(report, content)
  if (submitValidationError) {
    throw new AppError('VALIDATION_ERROR', submitValidationError, 400)
  }

  const nextVersion = (await periodReportRepo.getLatestVersionNumber(db, reportId)) + 1
  const version = await periodReportRepo.insertVersion(db, {
    reportId,
    version: nextVersion,
    versionType: 'SUBMITTED',
    templateVersionId: current.template_version_id,
    sourceSnapshot: parseJson(current.source_snapshot, null),
    contentJson: content,
    createdBy: user.userId
  })

  await periodReportRepo.updateStatus(db, reportId, 'SUBMITTED')
  const updated = await periodReportRepo.findById(db, reportId)
  const sourceData = parseJson(current.source_snapshot, null) || (await resolveSourceData(db, updated))
  return {
    report: await getReport(db, user, reportId),
    version: serializeVersion(version),
    meta: buildActionMeta(updated, version, sourceData, { action: 'submit' })
  }
}

async function reviseReport(db, user, reportId) {
  const report = await periodReportRepo.findById(db, reportId)
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404)
  }
  assertCanEditReport(user, report)
  if (report.status !== 'SUBMITTED') {
    throw new AppError('VALIDATION_ERROR', '仅已提交报告可以发起修改', 400)
  }

  const current = await periodReportRepo.getCurrentVersion(db, reportId)
  if (!current) {
    throw new AppError('VALIDATION_ERROR', '报告缺少已提交版本', 400)
  }

  const nextVersion = (await periodReportRepo.getLatestVersionNumber(db, reportId)) + 1
  const version = await periodReportRepo.insertVersion(db, {
    reportId,
    version: nextVersion,
    versionType: 'REVISION',
    templateVersionId: current.template_version_id,
    sourceSnapshot: parseJson(current.source_snapshot, null),
    contentJson: parseJson(current.content_json),
    createdBy: user.userId
  })

  await periodReportRepo.updateStatus(db, reportId, 'REVISING')
  return { report: await getReport(db, user, reportId), version: serializeVersion(version) }
}

module.exports = {
  PERSONAL_TYPES,
  TEAM_TYPES,
  DEPARTMENT_TYPES,
  isDepartmentReport,
  isTeamReport,
  isEditableStatus,
  assertCanAccessReport,
  assertCanEditReport,
  listReports,
  createReport,
  getReport,
  getSourceData,
  getMemberSubmissionStatus,
  saveDraft,
  submitReport,
  reviseReport,
  updateSourceConfig,
  updateGenerationFocus,
  getSourceOptions,
  getTemplateForType,
  parseJson,
  buildActionMeta
}
