/** 与 AI 格式化正文中的行首标签一致，用于加粗强调 */

export const PERIOD_V2_LINE_LABELS = [
  '完成情况',
  '关键产出',
  '价值',
  '影响',
  '根因',
  '已采取措施',
  '解决方案',
  '当前状态',
  '目标',
  '前置依赖'
]

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 将 period_v2 章节纯文本转为 HTML（行首【标签】与「关键词：」加粗）
 */
export function highlightPeriodV2TextToHtml(text) {
  const raw = String(text ?? '')
  if (!raw.trim()) return ''

  const labelAlt = PERIOD_V2_LINE_LABELS.join('|')
  const labelRe = new RegExp(`^((?:${labelAlt})：)`)

  return raw
    .split('\n')
    .map((line) => {
      const escaped = escapeHtml(line)
      if (!line.trim()) return ''

      const bracket = escaped.match(/^(\【[^】]+\】)(.*)$/)
      if (bracket) {
        return `<strong class="period-v2-kw">${bracket[1]}</strong>${bracket[2]}`
      }

      const labeled = escaped.match(labelRe)
      if (labeled) {
        const rest = escaped.slice(labeled[1].length)
        return `<strong class="period-v2-kw">${labeled[1]}</strong>${rest}`
      }

      return escaped
    })
    .join('<br />')
}

export function periodV2TextHasHighlightMarkers(text) {
  const s = String(text ?? '')
  if (/\【[^】]+\】/.test(s)) return true
  return PERIOD_V2_LINE_LABELS.some((label) => s.includes(`${label}：`))
}
