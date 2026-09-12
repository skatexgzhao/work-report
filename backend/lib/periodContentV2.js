const CONTENT_FORMAT_V2 = 'period_v2'

function emptySections() {
  return { achievements: '', issues: '', next_focus: '' }
}

function emptyPeriodV2Content() {
  return {
    content_format: CONTENT_FORMAT_V2,
    sections: emptySections(),
    achievements: [],
    issues: [],
    next_focus: []
  }
}

function emptyAchievement() {
  return {
    domain: '',
    title: '',
    completion: '',
    outputs: [''],
    value: ''
  }
}

function emptyIssue() {
  return {
    title: '',
    impact: '',
    root_cause: '',
    actions_taken: '',
    solution: '',
    status: ''
  }
}

function emptyNextFocus() {
  return {
    title: '',
    goal: '',
    expected_outputs: [''],
    dependencies: ''
  }
}

function isPeriodV2Content(content) {
  if (!content || typeof content !== 'object') return false
  if (content.content_format === CONTENT_FORMAT_V2) return true
  if (content.sections && typeof content.sections === 'object') return true
  return Array.isArray(content.achievements) || Array.isArray(content.issues) || Array.isArray(content.next_focus)
}

function isPeriodV2Report(report) {
  return report?.content_format === CONTENT_FORMAT_V2
}

function bulletLines(arr) {
  if (!Array.isArray(arr)) return ''
  const lines = arr.map((x) => String(x || '').trim()).filter(Boolean)
  if (!lines.length) return ''
  return lines.map((l) => `- ${l}`).join('\n')
}

function formatAchievementsSection(achievements) {
  if (!Array.isArray(achievements) || !achievements.length) return ''
  return achievements
    .map((item, index) => {
      const parts = []
      const label = item?.domain || item?.title
        ? `【成果${index + 1}】${[item.domain, item.title].filter(Boolean).join(' · ')}`
        : `【成果${index + 1}】`
      parts.push(label)
      if (item?.completion) parts.push(`完成情况：${item.completion}`)
      const outputs = bulletLines(item?.outputs)
      if (outputs) parts.push(`关键产出：\n${outputs}`)
      if (item?.value) parts.push(`价值：${item.value}`)
      return parts.join('\n')
    })
    .join('\n\n')
}

function formatIssuesSection(issues) {
  if (!Array.isArray(issues) || !issues.length) return ''
  return issues
    .map((item, index) => {
      const parts = []
      const title = item?.title ? `【问题${index + 1}】${item.title}` : `【问题${index + 1}】`
      parts.push(title)
      if (item?.impact) parts.push(`影响：${item.impact}`)
      if (item?.root_cause) parts.push(`根因：${item.root_cause}`)
      if (item?.actions_taken) parts.push(`已采取措施：${item.actions_taken}`)
      if (item?.solution) parts.push(`解决方案：${item.solution}`)
      if (item?.status) parts.push(`当前状态：${item.status}`)
      return parts.join('\n')
    })
    .join('\n\n')
}

function formatNextFocusSection(nextFocus) {
  if (!Array.isArray(nextFocus) || !nextFocus.length) return ''
  return nextFocus
    .map((item, index) => {
      const parts = []
      const title = item?.title ? `【计划${index + 1}】${item.title}` : `【计划${index + 1}】`
      parts.push(title)
      if (item?.goal) parts.push(`目标：${item.goal}`)
      const outputs = bulletLines(item?.expected_outputs)
      if (outputs) parts.push(`关键产出：\n${outputs}`)
      if (item?.dependencies) parts.push(`前置依赖：${item.dependencies}`)
      return parts.join('\n')
    })
    .join('\n\n')
}

function formatPeriodV2ToSections(content) {
  const achievements = content?.achievements
  const issues = content?.issues
  const nextFocus = content?.next_focus
  return {
    achievements: formatAchievementsSection(achievements),
    issues: formatIssuesSection(issues),
    next_focus: formatNextFocusSection(nextFocus)
  }
}

function sectionsHaveText(sections) {
  if (!sections || typeof sections !== 'object') return false
  return ['achievements', 'issues', 'next_focus'].some((k) => String(sections[k] || '').trim())
}

function achievementsSectionHasText(sections) {
  if (!sections || typeof sections !== 'object') return false
  return String(sections.achievements || '').trim().length > 0
}

const PERIOD_ACHIEVEMENTS_REQUIRED_MESSAGE = '请填写「本周期重要成果」后再保存或提交'

function validatePeriodV2AchievementsRequired(contentJson) {
  if (!achievementsSectionHasText(contentJson?.sections)) {
    return PERIOD_ACHIEVEMENTS_REQUIRED_MESSAGE
  }
  return null
}

function legacyV1HasKeyResults(content) {
  if (!content || typeof content !== 'object') return false
  const keyResults = content.key_results
  if (Array.isArray(keyResults)) {
    return keyResults.some((line) => String(line || '').trim())
  }
  return String(keyResults || '').trim().length > 0
}

const LEGACY_KEY_RESULTS_REQUIRED_MESSAGE = '请填写「重要成果」后再保存或提交'

/** 周期/小组/部门报告保存或提交前：重要成果必填 */
function validatePeriodReportContentForSave(report, contentJson) {
  if (isPeriodV2Report(report) || contentJson?.content_format === CONTENT_FORMAT_V2) {
    return validatePeriodV2AchievementsRequired(contentJson)
  }
  if (!legacyV1HasKeyResults(contentJson)) {
    return LEGACY_KEY_RESULTS_REQUIRED_MESSAGE
  }
  return null
}

/** 编辑以 sections 为准；无 sections 文本时从结构化数组生成 */
function normalizePeriodV2Content(content) {
  const base = { ...emptyPeriodV2Content(), ...(content || {}) }
  if (!base.sections || typeof base.sections !== 'object') {
    base.sections = emptySections()
  } else {
    base.sections = {
      achievements: String(base.sections.achievements ?? ''),
      issues: String(base.sections.issues ?? ''),
      next_focus: String(base.sections.next_focus ?? '')
    }
  }
  if (!Array.isArray(base.achievements)) base.achievements = []
  if (!Array.isArray(base.issues)) base.issues = []
  if (!Array.isArray(base.next_focus)) base.next_focus = []

  if (!sectionsHaveText(base.sections)) {
    const fromArrays = formatPeriodV2ToSections(base)
    if (sectionsHaveText(fromArrays)) {
      base.sections = fromArrays
    }
  }
  base.content_format = CONTENT_FORMAT_V2
  return base
}

/** AI 解析结果：保留数组并写入 sections 供前端展示 */
function enrichPeriodV2AfterAi(parsed) {
  const normalized = normalizePeriodV2Content(parsed)
  const fromParsed = formatPeriodV2ToSections(parsed)
  if (sectionsHaveText(fromParsed)) {
    normalized.sections = fromParsed
  }
  normalized.achievements = Array.isArray(parsed?.achievements) ? parsed.achievements : []
  normalized.issues = Array.isArray(parsed?.issues) ? parsed.issues : []
  normalized.next_focus = Array.isArray(parsed?.next_focus) ? parsed.next_focus : []
  return normalized
}

/** 用户保存：以 sections 为真源，清空结构化数组避免双源不一致 */
function periodV2ContentFromEditor(content) {
  const normalized = normalizePeriodV2Content(content)
  return {
    content_format: CONTENT_FORMAT_V2,
    sections: normalized.sections,
    achievements: [],
    issues: [],
    next_focus: []
  }
}

function linesFromField(value) {
  if (Array.isArray(value)) return value.map((x) => String(x || '').trim()).filter(Boolean)
  if (value == null || value === '') return []
  return String(value)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** period_v1 表单字段 → v2 三章（兼容旧客户端） */
function legacyPeriodV1ToSections(content) {
  if (!content || typeof content !== 'object') return emptySections()
  const achievementParts = []
  const summary = String(content.summary || '').trim()
  if (summary) achievementParts.push(summary)
  const completed = linesFromField(content.completed)
  if (completed.length) achievementParts.push(completed.join('\n'))
  const keyResults = linesFromField(content.key_results)
  if (keyResults.length) achievementParts.push(keyResults.join('\n'))
  const problems = linesFromField(content.problems).join('\n')
  const nextPlan = linesFromField(content.next_plan).join('\n')
  const risks = linesFromField(content.risks).join('\n')
  let nextFocus = nextPlan
  if (risks) nextFocus = [nextFocus, risks].filter(Boolean).join('\n\n')
  return {
    achievements: achievementParts.filter(Boolean).join('\n\n'),
    issues: problems,
    next_focus: nextFocus
  }
}

/** 保存前：归一化 v2，必要时从 v1 字段或数组补全 sections */
function preparePeriodV2SaveContent(content) {
  const normalized = normalizePeriodV2Content(content)
  if (!sectionsHaveText(normalized.sections)) {
    const fromLegacy = legacyPeriodV1ToSections(content)
    if (sectionsHaveText(fromLegacy)) {
      normalized.sections = fromLegacy
    }
  }
  return periodV2ContentFromEditor(normalized)
}

/** 内置 AI 输出 schema 描述（也可由模板 output_schema 覆盖） */
const PERIOD_V2_OUTPUT_SCHEMA_DOC = {
  content_format: 'period_v2',
  _writing_rules:
    '同一项目/领域下多项任务合并为一条成果；每条写清为谁、做了什么、产出与收益；achievements 通常 3~5 条，勿按日报条数拆分',
  achievements: [
    {
      domain: '项目/领域/服务对象（合并后的归属）',
      title: '本周期该主题下的总成果名（非单条任务名）',
      completion: '1~2 句合并概括，勿按日流水',
      outputs: ['合并去重后的关键产出1', '产出2'],
      value: '对业务/项目的收益（定性或素材中的量化）'
    }
  ],
  issues: [
    {
      title: '问题简述',
      impact: '影响',
      root_cause: '根因',
      actions_taken: '已采取措施',
      solution: '解决方案',
      status: '当前状态'
    }
  ],
  next_focus: [
    {
      title: '事项',
      goal: '下周期目标',
      expected_outputs: ['关键产出'],
      dependencies: '前置依赖'
    }
  ]
}

function validatePeriodV2Output(parsed) {
  if (typeof parsed !== 'object' || parsed == null) {
    return 'AI 输出不是有效 JSON 对象'
  }
  for (const key of ['achievements', 'issues', 'next_focus']) {
    if (!Array.isArray(parsed[key])) {
      return `AI 输出缺少数组字段: ${key}`
    }
  }
  return null
}

module.exports = {
  CONTENT_FORMAT_V2,
  emptyPeriodV2Content,
  emptyAchievement,
  emptyIssue,
  emptyNextFocus,
  isPeriodV2Content,
  isPeriodV2Report,
  sectionsHaveText,
  achievementsSectionHasText,
  PERIOD_ACHIEVEMENTS_REQUIRED_MESSAGE,
  LEGACY_KEY_RESULTS_REQUIRED_MESSAGE,
  validatePeriodV2AchievementsRequired,
  validatePeriodReportContentForSave,
  legacyV1HasKeyResults,
  formatPeriodV2ToSections,
  normalizePeriodV2Content,
  enrichPeriodV2AfterAi,
  periodV2ContentFromEditor,
  preparePeriodV2SaveContent,
  PERIOD_V2_OUTPUT_SCHEMA_DOC,
  validatePeriodV2Output
}
