/** 报告相关文案：简单易懂的中文，避免英文术语直出 */

import {
  CONTENT_FORMAT_V2,
  isPeriodV2Content,
  normalizePeriodV2Content,
  PERIOD_V2_SECTION_DEFS
} from './periodContentV2'

export const DAILY_FIELD_LABELS = {
  completed: '今日工作',
  risk: '问题与风险',
  plan: '明日计划'
}

export const PERIOD_FIELD_DEFS = [
  {
    key: 'summary',
    label: '整体总结',
    hint: '用几句话说明这个周期整体工作情况',
    placeholder: '例如：本周主要完成了授权中心数据库升级，整体按计划推进。'
  },
  {
    key: 'completed',
    label: '做了哪些事',
    hint: '每行写一件具体完成的事',
    placeholder: '每行一条，例如：\n完成 MySQL 版本升级\n完成 Redis 实例迁移',
    isList: true
  },
  {
    key: 'key_results',
    label: '重要成果',
    required: true,
    hint: '必填。写清楚做成了什么、有什么价值',
    placeholder: '每行一条，例如：\n生产环境数据库升级顺利完成\n业务中断时间控制在预期内',
    isList: true
  },
  {
    key: 'problems',
    label: '遇到的困难',
    hint: '写清楚问题和影响，方便后续跟进',
    placeholder: '每行一条，例如：\n某实例 DNS 解析异常\n外部依赖响应较慢',
    isList: true
  },
  {
    key: 'next_plan',
    label: '接下来要做什么',
    hint: '写下个周期计划安排',
    placeholder: '每行一条，例如：\n继续观察升级后稳定性\n完善备份与回滚方案',
    isList: true
  },
  {
    key: 'risks',
    label: '需要关注的风险',
    hint: '可能影响进度或质量的事项',
    placeholder: '每行一条，例如：\n旧实例仍存在兼容性隐患',
    isList: true
  }
]

export const REPORT_TYPE_LABELS = {
  PERSONAL_WEEKLY: '个人周报',
  PERSONAL_MONTHLY: '个人月报',
  PERSONAL_QUARTERLY: '个人季报',
  TEAM_WEEKLY: '小组周报',
  TEAM_MONTHLY: '小组月报',
  TEAM_QUARTERLY: '小组季报',
  DEPARTMENT_WEEKLY: '部门周报',
  DEPARTMENT_MONTHLY: '部门月报',
  DEPARTMENT_QUARTERLY: '部门季报'
}

export const SOURCE_TYPE_LABELS = {
  DAILY: '日报',
  PERSONAL_WEEKLY: '个人周报',
  PERSONAL_MONTHLY: '个人月报',
  PERSONAL_QUARTERLY: '个人季报',
  TEAM_WEEKLY: '小组周报',
  TEAM_MONTHLY: '小组月报',
  TEAM_QUARTERLY: '小组季报'
}

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

export const VERSION_TYPE_LABELS = {
  DRAFT: '手动保存',
  SUBMITTED: '正式提交',
  AI: '智能生成',
  REVISION: '修改版本'
}

export const STATUS_LABELS = {
  DRAFT: '草稿',
  REVISING: '修改中',
  SUBMITTED: '已提交'
}

export function reportTypeLabel(type) {
  return REPORT_TYPE_LABELS[type] || type
}

export function sourceTypeLabel(type) {
  return SOURCE_TYPE_LABELS[type] || type
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status
}

export function defaultSourceTypes(reportType) {
  return DEFAULT_SOURCE_TYPES[reportType] || ['DAILY']
}

export function versionTypeLabel(type) {
  return VERSION_TYPE_LABELS[type] || type
}

export function dailyFieldLabel(key) {
  return DAILY_FIELD_LABELS[key] || key
}

/** 把日报/报告 JSON 转成可读条目列表 */
function parseContentObject(content) {
  if (content == null || content === '') return null
  let parsed = content
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return null
    }
  }
  while (typeof parsed === 'string' && parsed.trim()) {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      break
    }
  }
  return parsed && typeof parsed === 'object' ? parsed : null
}

export function contentToEntries(content) {
  const obj = parseContentObject(content)
  if (!obj) return []

  if (isPeriodV2Content(obj)) {
    const normalized = normalizePeriodV2Content(obj)
    const v2Entries = []
    for (const def of PERIOD_V2_SECTION_DEFS) {
      const text = String(normalized.sections?.[def.key] || '').trim()
      if (text) v2Entries.push({ label: def.label, value: text, type: 'text' })
    }
    if (v2Entries.length) return v2Entries
  }

  const entries = []
  const knownDailyKeys = Object.keys(DAILY_FIELD_LABELS)
  const hasDailyShape = knownDailyKeys.some((key) => obj[key] != null && obj[key] !== '')

  if (hasDailyShape) {
    for (const key of knownDailyKeys) {
      const value = obj[key]
      if (value == null || String(value).trim() === '') continue
      entries.push({ label: dailyFieldLabel(key), value: String(value).trim(), type: 'text' })
    }
    return entries
  }

  for (const field of PERIOD_FIELD_DEFS) {
    const value = obj[field.key]
    if (value == null) continue
    if (field.isList && Array.isArray(value)) {
      if (value.length === 0) continue
      entries.push({ label: field.label, value: value.filter(Boolean), type: 'list' })
    } else if (String(value).trim() !== '') {
      entries.push({ label: field.label, value: String(value).trim(), type: 'text' })
    }
  }

  return entries
}
