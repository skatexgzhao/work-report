/** 与 backend/lib/periodContentV2.js 展示逻辑保持一致 */

export const CONTENT_FORMAT_V2 = 'period_v2'

export function emptySections() {
  return { achievements: '', issues: '', next_focus: '' }
}

export function emptyPeriodV2Content() {
  return {
    content_format: CONTENT_FORMAT_V2,
    sections: emptySections(),
    achievements: [],
    issues: [],
    next_focus: []
  }
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

export function formatPeriodV2ToSections(content) {
  return {
    achievements: formatAchievementsSection(content?.achievements),
    issues: formatIssuesSection(content?.issues),
    next_focus: formatNextFocusSection(content?.next_focus)
  }
}

function sectionsHaveText(sections) {
  if (!sections || typeof sections !== 'object') return false
  return ['achievements', 'issues', 'next_focus'].some((k) => String(sections[k] || '').trim())
}

export function isPeriodV2Content(content) {
  if (!content || typeof content !== 'object') return false
  if (content.content_format === CONTENT_FORMAT_V2) return true
  if (content.sections && typeof content.sections === 'object') return true
  return (
    Array.isArray(content.achievements) ||
    Array.isArray(content.issues) ||
    Array.isArray(content.next_focus)
  )
}

export function normalizePeriodV2Content(content) {
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

export function buildPeriodV2Payload(sections) {
  return {
    content_format: CONTENT_FORMAT_V2,
    sections: {
      achievements: String(sections.achievements ?? ''),
      issues: String(sections.issues ?? ''),
      next_focus: String(sections.next_focus ?? '')
    },
    achievements: [],
    issues: [],
    next_focus: []
  }
}

export const PERIOD_V2_SECTION_DEFS = [
  {
    key: 'achievements',
    label: '一、本周期重要成果',
    required: true,
    hint: '必填。3～5 条为宜；同一项目/领域下多项工作应合并为一条，写清为谁、做了什么、产出与收益。智能生成会按此提炼。',
    placeholder: '例如：\n【成果1】授权中心 · MySQL 升级\n完成情况：……\n关键产出：\n- …\n价值：……',
    minRows: 10
  },
  {
    key: 'issues',
    label: '二、关键问题与解决方案',
    hint: '写问题、影响、根因、已采取措施、方案与当前状态。',
    placeholder: '例如：\n【问题1】……\n影响：……\n根因：……',
    minRows: 10
  },
  {
    key: 'next_focus',
    label: '三、下周期重点计划',
    hint: '写事项、目标、预期产出与前置依赖。',
    placeholder: '例如：\n【计划1】……\n目标：……',
    minRows: 10
  }
]

/** 三章编辑/预览区统一最小高度（与 report-forms.css 大文本框一致） */
export const PERIOD_V2_SECTION_MIN_HEIGHT_PX = 200
