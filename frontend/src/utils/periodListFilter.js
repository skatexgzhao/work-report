/** 列表「周期粒度」筛选（全部 / 周 / 月 / 季） */

export const PERIOD_GRAIN_FILTER_OPTIONS = [
  { label: '全部类型', value: 'ALL' },
  { label: '周报', value: 'WEEKLY' },
  { label: '月报', value: 'MONTHLY' },
  { label: '季报', value: 'QUARTERLY' }
]

const SCOPE_PREFIX = {
  personal: 'PERSONAL',
  team: 'TEAM',
  department: 'DEPARTMENT'
}

const CREATE_OPTIONS = {
  personal: [
    { label: '个人周报', value: 'PERSONAL_WEEKLY' },
    { label: '个人月报', value: 'PERSONAL_MONTHLY' },
    { label: '个人季报', value: 'PERSONAL_QUARTERLY' }
  ],
  team: [
    { label: '小组周报', value: 'TEAM_WEEKLY' },
    { label: '小组月报', value: 'TEAM_MONTHLY' },
    { label: '小组季报', value: 'TEAM_QUARTERLY' }
  ],
  department: [
    { label: '部门周报', value: 'DEPARTMENT_WEEKLY' },
    { label: '部门月报', value: 'DEPARTMENT_MONTHLY' },
    { label: '部门季报', value: 'DEPARTMENT_QUARTERLY' }
  ]
}

export function createTypeOptions(scope) {
  return CREATE_OPTIONS[scope] || CREATE_OPTIONS.personal
}

/** 列表 API 的 reportType；ALL 时不传 */
export function listReportTypeForGrain(scope, grain) {
  if (!grain || grain === 'ALL') return undefined
  const prefix = SCOPE_PREFIX[scope]
  if (!prefix) return undefined
  return `${prefix}_${grain}`
}

/** 筛选从 ALL 切到具体粒度时，可同步默认新建类型 */
export function defaultCreateTypeForGrain(scope, grain) {
  const g = grain === 'ALL' ? 'WEEKLY' : grain
  return listReportTypeForGrain(scope, g) || createTypeOptions(scope)[0].value
}
