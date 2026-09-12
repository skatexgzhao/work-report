const { get, all } = require('../lib/dbUtil')
const { eachDateInclusive } = require('../lib/periodCalculator')
const { isPeriodV2Content, normalizePeriodV2Content } = require('../lib/periodContentV2')
const { parseSourceConfig } = require('../lib/sourceConfig')

function parseJson(value, fallback = {}) {
  if (value == null || value === '') return fallback
  let parsed = typeof value === 'string' ? JSON.parse(value) : value
  while (typeof parsed === 'string' && parsed.trim()) {
    parsed = JSON.parse(parsed)
  }
  return parsed ?? fallback
}

const SOURCE_TYPE_LABELS = {
  DAILY: '日报',
  PERSONAL_WEEKLY: '个人周报',
  PERSONAL_MONTHLY: '个人月报',
  PERSONAL_QUARTERLY: '个人季报',
  TEAM_WEEKLY: '小组周报',
  TEAM_MONTHLY: '小组月报',
  TEAM_QUARTERLY: '小组季报'
}

async function fetchDailyItems(db, userId, startDate, endDate) {
  const rows = await all(
    db,
    `SELECT report_date AS reportDate, content_json AS contentJson, status
     FROM daily_reports WHERE user_id = ? AND report_date >= ? AND report_date <= ?
     ORDER BY report_date ASC`,
    [userId, startDate, endDate]
  )
  return rows.map((row) => ({
    sourceType: 'DAILY',
    sourceLabel: SOURCE_TYPE_LABELS.DAILY,
    reportDate: row.reportDate,
    contentJson: parseJson(row.contentJson),
    status: row.status
  }))
}

function mapPeriodRow(row, reportType) {
  const raw = parseJson(row.content_json)
  const contentJson = isPeriodV2Content(raw) ? normalizePeriodV2Content(raw) : raw
  return {
    sourceType: reportType,
    sourceLabel: SOURCE_TYPE_LABELS[reportType] || reportType,
    periodLabel: `${row.start_date} 至 ${row.end_date}`,
    reportId: row.id,
    contentJson,
    status: row.status
  }
}

/** 取完全落在父报告周期内的下级周期报告（如月报内多份周报） */
async function fetchPeriodReportsInWindow(
  db,
  { userId, teamId, reportType, windowStart, windowEnd, submittedOnly = true }
) {
  let sql = `SELECT pr.id, pr.start_date, pr.end_date, pr.status,
             COALESCE(
               prv.content_json,
               (SELECT v2.content_json FROM period_report_versions v2
                WHERE v2.report_id = pr.id ORDER BY v2.version DESC LIMIT 1)
             ) AS content_json
             FROM period_reports pr
             LEFT JOIN period_report_versions prv ON prv.id = pr.current_version_id
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
  if (submittedOnly) {
    sql += " AND pr.status = 'SUBMITTED'"
  }
  sql += ' ORDER BY pr.start_date ASC, pr.id ASC'
  const rows = await all(db, sql, params)
  return rows.map((row) => mapPeriodRow(row, reportType))
}

async function buildPersonalSourceData(db, report, config) {
  const items = []
  for (const sourceType of config.sourceTypes) {
    if (sourceType === 'DAILY') {
      items.push(...(await fetchDailyItems(db, report.user_id, report.start_date, report.end_date)))
    } else {
      items.push(
        ...(await fetchPeriodReportsInWindow(db, {
          userId: report.user_id,
          reportType: sourceType,
          windowStart: report.start_date,
          windowEnd: report.end_date,
          submittedOnly: true
        }))
      )
    }
  }

  const dailyDates = items.filter((i) => i.sourceType === 'DAILY').map((i) => i.reportDate)
  const allDates = eachDateInclusive(report.start_date, report.end_date)
  const missingDates = config.sourceTypes.includes('DAILY')
    ? allDates.filter((d) => !dailyDates.includes(d))
    : []

  const dailyItems = items.filter((i) => i.sourceType === 'DAILY')

  return {
    startDate: report.start_date,
    endDate: report.end_date,
    sourceTypes: config.sourceTypes,
    itemCount: items.length,
    dailyCount: dailyItems.length,
    expectedCount: config.sourceTypes.includes('DAILY') ? allDates.length : dailyItems.length,
    missingDates,
    items
  }
}

async function buildTeamSourceData(db, report, config) {
  const items = []
  const members = await all(
    db,
    `SELECT u.id AS userId, u.username FROM users u
     JOIN user_teams ut ON ut.user_id = u.id WHERE ut.team_id = ? ORDER BY u.username`,
    [report.team_id]
  )

  const scopedUserIds = (
    config.includeAllMembers
      ? members.map((m) => Number(m.userId))
      : config.referenceUserIds.length
        ? config.referenceUserIds.map(Number)
        : members.map((m) => Number(m.userId))
  ).filter((id) => !Number.isNaN(id))

  const scopedMembers = scopedUserIds
    .map((userId) => members.find((m) => Number(m.userId) === userId))
    .filter(Boolean)

  const personalSourceTypes = config.sourceTypes.filter((t) => t.startsWith('PERSONAL_'))
  const dailyInSources = config.sourceTypes.includes('DAILY')

  for (const sourceType of config.sourceTypes) {
    if (sourceType === 'DAILY' || sourceType.startsWith('PERSONAL_')) {
      for (const userId of scopedUserIds) {
        const member = members.find((m) => Number(m.userId) === userId)
        if (!member) continue
        if (sourceType === 'DAILY') {
          const daily = await fetchDailyItems(db, userId, report.start_date, report.end_date)
          daily.forEach((d) => items.push({ ...d, username: member.username, userId: Number(userId) }))
        } else {
          const periods = await fetchPeriodReportsInWindow(db, {
            userId,
            reportType: sourceType,
            windowStart: report.start_date,
            windowEnd: report.end_date,
            submittedOnly: true
          })
          periods.forEach((p) => items.push({ ...p, username: member.username, userId: Number(userId) }))
        }
      }
    }
  }

  let submittedCount = 0
  const missingMembers = []
  if (personalSourceTypes.length) {
    const primaryPersonalType = personalSourceTypes[0]
    for (const member of scopedMembers) {
      const uid = Number(member.userId)
      const hasSubmitted = items.some(
        (i) => i.userId === uid && i.sourceType === primaryPersonalType && i.status === 'SUBMITTED'
      )
      if (hasSubmitted) submittedCount += 1
      else missingMembers.push(member.username)
    }
  }

  const dailyItems = items.filter((i) => i.sourceType === 'DAILY')
  const allDates = eachDateInclusive(report.start_date, report.end_date)
  const missingDates = dailyInSources
    ? allDates.filter((date) => !dailyItems.some((i) => i.reportDate === date))
    : []

  return {
    startDate: report.start_date,
    endDate: report.end_date,
    sourceTypes: config.sourceTypes,
    isTeamReport: true,
    memberCount: scopedMembers.length,
    submittedCount: personalSourceTypes.length ? submittedCount : undefined,
    missingMembers: personalSourceTypes.length ? missingMembers : [],
    dailyCount: dailyInSources ? dailyItems.length : undefined,
    expectedCount: dailyInSources ? allDates.length * scopedMembers.length : undefined,
    missingDates,
    itemCount: items.length,
    items
  }
}

async function buildDepartmentSourceData(db, report, config) {
  const members = await all(
    db,
    `SELECT u.id AS userId, u.username FROM users u
     JOIN user_departments ud ON ud.user_id = u.id
     WHERE ud.department_id = ? ORDER BY u.username`,
    [report.department_id]
  )

  const scopedUserIds = (
    config.includeAllMembers
      ? members.map((m) => Number(m.userId))
      : config.referenceUserIds.length
        ? config.referenceUserIds.map(Number)
        : members.map((m) => Number(m.userId))
  ).filter((id) => !Number.isNaN(id))

  const scopedMembers = scopedUserIds
    .map((userId) => members.find((m) => Number(m.userId) === userId))
    .filter(Boolean)

  const teamIds = (
    config.referenceTeamIds.length
      ? config.referenceTeamIds.map(Number)
      : (await all(db, 'SELECT id FROM teams WHERE department_id = ? AND status = ?', [report.department_id, 'ACTIVE'])).map(
          (t) => Number(t.id)
        )
  ).filter((id) => !Number.isNaN(id))

  const items = []
  const scopeMode = config.scopeMode || 'team'
  const personalSourceTypes = config.sourceTypes.filter((t) => t.startsWith('PERSONAL_'))
  const teamSourceTypes = config.sourceTypes.filter((t) => t.startsWith('TEAM_'))

  for (const sourceType of config.sourceTypes) {
    if (sourceType.startsWith('TEAM_')) {
      for (const teamId of teamIds) {
        const team = await get(db, 'SELECT name FROM teams WHERE id = ?', [teamId])
        const periods = await fetchPeriodReportsInWindow(db, {
          teamId,
          reportType: sourceType,
          windowStart: report.start_date,
          windowEnd: report.end_date,
          submittedOnly: true
        })
        periods.forEach((p) => items.push({ ...p, teamId: Number(teamId), teamName: team?.name }))
      }
    } else if (sourceType === 'DAILY' || sourceType.startsWith('PERSONAL_')) {
      for (const userId of scopedUserIds) {
        const member = members.find((m) => Number(m.userId) === userId)
        if (!member) continue
        if (sourceType === 'DAILY') {
          const daily = await fetchDailyItems(db, userId, report.start_date, report.end_date)
          daily.forEach((d) => items.push({ ...d, username: member.username, userId: Number(userId) }))
        } else {
          const periods = await fetchPeriodReportsInWindow(db, {
            userId,
            reportType: sourceType,
            windowStart: report.start_date,
            windowEnd: report.end_date,
            submittedOnly: true
          })
          periods.forEach((p) => items.push({ ...p, username: member.username, userId: Number(userId) }))
        }
      }
    }
  }

  const missingTeams = []
  let submittedCount = 0
  if (scopeMode === 'team' && teamSourceTypes.length) {
    const primaryTeamType = teamSourceTypes[0]
    for (const teamId of teamIds) {
      const team = await get(db, 'SELECT name FROM teams WHERE id = ?', [teamId])
      const hasSubmitted = items.some(
        (i) => i.teamId === Number(teamId) && i.sourceType === primaryTeamType && i.status === 'SUBMITTED'
      )
      if (hasSubmitted) submittedCount += 1
      else if (team?.name) missingTeams.push(team.name)
    }
  }

  const missingMembers = []
  if (scopeMode === 'member' && personalSourceTypes.length) {
    const primaryPersonalType = personalSourceTypes[0]
    for (const member of scopedMembers) {
      const uid = Number(member.userId)
      const hasSubmitted = items.some(
        (i) => i.userId === uid && i.sourceType === primaryPersonalType && i.status === 'SUBMITTED'
      )
      if (hasSubmitted) submittedCount += 1
      else missingMembers.push(member.username)
    }
  }

  return {
    startDate: report.start_date,
    endDate: report.end_date,
    sourceTypes: config.sourceTypes,
    scopeMode,
    memberCount: scopeMode === 'member' ? scopedMembers.length : members.length,
    teamCount: teamIds.length,
    submittedCount,
    itemCount: items.length,
    missingMembers,
    missingTeams,
    items
  }
}

async function resolveSourceData(db, report, configOverride = null) {
  const config = configOverride || parseSourceConfig(report.source_config, report.report_type)
  if (report.team_id && !report.user_id) {
    return buildTeamSourceData(db, report, config)
  }
  if (!report.user_id && report.department_id) {
    return buildDepartmentSourceData(db, report, config)
  }
  return buildPersonalSourceData(db, report, config)
}

module.exports = {
  SOURCE_TYPE_LABELS,
  resolveSourceData,
  buildPersonalSourceData,
  buildTeamSourceData,
  buildDepartmentSourceData
}
