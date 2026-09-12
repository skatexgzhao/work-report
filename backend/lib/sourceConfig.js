const DEFAULT_SOURCE_TYPES = {
  PERSONAL_WEEKLY: ['DAILY'],
  PERSONAL_MONTHLY: ['PERSONAL_WEEKLY'],
  PERSONAL_QUARTERLY: ['PERSONAL_MONTHLY'],
  TEAM_WEEKLY: ['PERSONAL_WEEKLY'],
  TEAM_MONTHLY: ['PERSONAL_MONTHLY'],
  TEAM_QUARTERLY: ['PERSONAL_QUARTERLY'],
  DEPARTMENT_WEEKLY: ['TEAM_WEEKLY'],
  DEPARTMENT_MONTHLY: ['TEAM_MONTHLY'],
  DEPARTMENT_QUARTERLY: ['TEAM_QUARTERLY']
}

/** 可选参考素材（默认见 DEFAULT_SOURCE_TYPES；保存时仅能单选其一） */
const ALLOWED_SOURCE_TYPES = {
  PERSONAL_WEEKLY: ['DAILY'],
  PERSONAL_MONTHLY: ['PERSONAL_WEEKLY', 'DAILY'],
  PERSONAL_QUARTERLY: ['PERSONAL_MONTHLY', 'PERSONAL_WEEKLY'],
  TEAM_WEEKLY: ['PERSONAL_WEEKLY', 'DAILY'],
  TEAM_MONTHLY: ['PERSONAL_MONTHLY', 'PERSONAL_WEEKLY'],
  TEAM_QUARTERLY: ['PERSONAL_QUARTERLY', 'PERSONAL_MONTHLY'],
  DEPARTMENT_WEEKLY: ['TEAM_WEEKLY', 'DAILY', 'PERSONAL_WEEKLY'],
  DEPARTMENT_MONTHLY: ['TEAM_MONTHLY', 'PERSONAL_WEEKLY', 'PERSONAL_MONTHLY'],
  DEPARTMENT_QUARTERLY: ['TEAM_QUARTERLY', 'PERSONAL_MONTHLY', 'PERSONAL_QUARTERLY']
}

const VALID_SOURCE_TYPES = new Set([
  'DAILY',
  'PERSONAL_WEEKLY',
  'PERSONAL_MONTHLY',
  'PERSONAL_QUARTERLY',
  'TEAM_WEEKLY',
  'TEAM_MONTHLY',
  'TEAM_QUARTERLY'
])

const DEPARTMENT_TO_TEAM = {
  DEPARTMENT_WEEKLY: 'TEAM_WEEKLY',
  DEPARTMENT_MONTHLY: 'TEAM_MONTHLY',
  DEPARTMENT_QUARTERLY: 'TEAM_QUARTERLY'
}

const DEPARTMENT_TO_PERSONAL = {
  DEPARTMENT_WEEKLY: 'PERSONAL_WEEKLY',
  DEPARTMENT_MONTHLY: 'PERSONAL_MONTHLY',
  DEPARTMENT_QUARTERLY: 'PERSONAL_QUARTERLY'
}

const TEAM_TO_PERSONAL = {
  TEAM_WEEKLY: 'PERSONAL_WEEKLY',
  TEAM_MONTHLY: 'PERSONAL_MONTHLY',
  TEAM_QUARTERLY: 'PERSONAL_QUARTERLY'
}

function teamMemberAllowedTypes(reportType) {
  return allowedSourceTypes(reportType).filter(isMemberSourceType)
}

function isTeamSourceType(type) {
  return type.startsWith('TEAM_')
}

function isMemberSourceType(type) {
  return type === 'DAILY' || type.startsWith('PERSONAL_')
}

function departmentTeamAllowedTypes(reportType) {
  return allowedSourceTypes(reportType)
}

function departmentMemberAllowedTypes(reportType) {
  return allowedSourceTypes(reportType).filter(isMemberSourceType)
}

function selectableSourceTypes(reportType, scopeMode) {
  if (!reportType.startsWith('DEPARTMENT_')) {
    return allowedSourceTypes(reportType)
  }
  return scopeMode === 'member'
    ? departmentMemberAllowedTypes(reportType)
    : departmentTeamAllowedTypes(reportType)
}

function inferScopeMode(reportType, sourceTypes, explicitMode) {
  if (!reportType.startsWith('DEPARTMENT_')) return null
  if (explicitMode === 'team' || explicitMode === 'member') return explicitMode
  const hasTeam = sourceTypes.some(isTeamSourceType)
  const hasMember = sourceTypes.some(isMemberSourceType)
  if (hasTeam && !hasMember) return 'team'
  if (hasMember && !hasTeam) return 'member'
  return 'team'
}

function defaultSourceTypes(reportType) {
  return [...(DEFAULT_SOURCE_TYPES[reportType] || ['DAILY'])]
}

function allowedSourceTypes(reportType) {
  return [...(ALLOWED_SOURCE_TYPES[reportType] || VALID_SOURCE_TYPES)]
}

function defaultSourceConfig(reportType) {
  const config = {
    sourceTypes: defaultSourceTypes(reportType),
    referenceUserIds: [],
    referenceTeamIds: [],
    includeAllMembers: true
  }
  if (reportType.startsWith('DEPARTMENT_')) {
    config.scopeMode = 'team'
  }
  return config
}

function parseSourceConfig(raw, reportType) {
  const base = defaultSourceConfig(reportType)
  if (!raw) return base
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  const allowed = new Set(allowedSourceTypes(reportType))
  const filtered = Array.isArray(parsed.sourceTypes)
    ? parsed.sourceTypes.filter((t) => allowed.has(t))
    : base.sourceTypes
  const resolvedTypes = filtered.length ? [filtered[0]] : base.sourceTypes
  const scopeMode = inferScopeMode(reportType, resolvedTypes, parsed.scopeMode)
  const result = {
    sourceTypes: resolvedTypes,
    referenceUserIds: Array.isArray(parsed.referenceUserIds)
      ? parsed.referenceUserIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
      : [],
    referenceTeamIds: Array.isArray(parsed.referenceTeamIds)
      ? parsed.referenceTeamIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
      : [],
    includeAllMembers: parsed.includeAllMembers !== false
  }
  if (scopeMode) {
    result.scopeMode = scopeMode
  }
  return result
}

function validateSourceConfig(reportType, config) {
  if (!config.sourceTypes?.length) {
    return '请至少选择一种参考素材'
  }
  if (config.sourceTypes.length > 1) {
    return '参考素材只能选择一种'
  }
  const allowed = new Set(allowedSourceTypes(reportType))
  for (const type of config.sourceTypes) {
    if (!allowed.has(type)) {
      return `报告类型 ${reportType} 不支持素材来源 ${type}`
    }
  }
  if (reportType.startsWith('TEAM_')) {
    if (config.sourceTypes.some(isTeamSourceType)) {
      return '小组报告只能选择组内成员的个人日报/个人周期报告作为素材'
    }
    if (!config.sourceTypes.some(isMemberSourceType)) {
      return '请至少选择一种成员个人素材'
    }
  }
  if (reportType.startsWith('DEPARTMENT_')) {
    const mode = config.scopeMode || inferScopeMode(reportType, config.sourceTypes) || 'team'
    const selectable = new Set(selectableSourceTypes(reportType, mode))
    if (!selectable.has(config.sourceTypes[0])) {
      return mode === 'member'
        ? '按成员汇总时不能选择该参考素材'
        : '当前汇总维度不支持该参考素材'
    }
  }
  return null
}

function getSourceOptions(reportType) {
  const options = {
    reportType,
    defaultSourceTypes: defaultSourceTypes(reportType),
    allowedSourceTypes: allowedSourceTypes(reportType)
  }
  if (reportType.startsWith('TEAM_')) {
    options.memberSourceTypes = teamMemberAllowedTypes(reportType)
    options.personalReportType = TEAM_TO_PERSONAL[reportType]
  }
  if (reportType.startsWith('DEPARTMENT_')) {
    options.defaultScopeMode = 'team'
    options.teamSourceTypes = departmentTeamAllowedTypes(reportType)
    options.memberSourceTypes = departmentMemberAllowedTypes(reportType)
    options.teamReportType = DEPARTMENT_TO_TEAM[reportType]
    options.personalReportType = DEPARTMENT_TO_PERSONAL[reportType]
  }
  return options
}

function diffSourceConfig(before, after) {
  const beforeTypes = new Set(before.sourceTypes || [])
  const afterTypes = new Set(after.sourceTypes || [])
  return {
    sourceTypesAdded: [...afterTypes].filter((t) => !beforeTypes.has(t)),
    sourceTypesRemoved: [...beforeTypes].filter((t) => !afterTypes.has(t)),
    includeAllMembersChanged: before.includeAllMembers !== after.includeAllMembers,
    referenceUserIdsChanged:
      JSON.stringify(before.referenceUserIds || []) !== JSON.stringify(after.referenceUserIds || []),
    referenceTeamIdsChanged:
      JSON.stringify(before.referenceTeamIds || []) !== JSON.stringify(after.referenceTeamIds || []),
    scopeModeChanged: before.scopeMode !== after.scopeMode
  }
}

function hasSourceConfigChanges(diff) {
  return (
    diff.sourceTypesAdded.length > 0 ||
    diff.sourceTypesRemoved.length > 0 ||
    diff.includeAllMembersChanged ||
    diff.referenceUserIdsChanged ||
    diff.referenceTeamIdsChanged ||
    diff.scopeModeChanged
  )
}

module.exports = {
  DEFAULT_SOURCE_TYPES,
  ALLOWED_SOURCE_TYPES,
  VALID_SOURCE_TYPES,
  DEPARTMENT_TO_TEAM,
  DEPARTMENT_TO_PERSONAL,
  TEAM_TO_PERSONAL,
  teamMemberAllowedTypes,
  isTeamSourceType,
  isMemberSourceType,
  departmentTeamAllowedTypes,
  departmentMemberAllowedTypes,
  selectableSourceTypes,
  inferScopeMode,
  defaultSourceTypes,
  allowedSourceTypes,
  defaultSourceConfig,
  parseSourceConfig,
  validateSourceConfig,
  getSourceOptions,
  diffSourceConfig,
  hasSourceConfigChanges,
  PERSONAL_SOURCE_MAP: ALLOWED_SOURCE_TYPES
}
