import { CONTENT_FORMAT_V2 } from './periodContentV2'

export const PERIOD_ACHIEVEMENTS_REQUIRED_MESSAGE =
  '请填写「本周期重要成果」后再保存或提交'

export const LEGACY_KEY_RESULTS_REQUIRED_MESSAGE =
  '请填写「重要成果」后再保存或提交'

function achievementsSectionHasText(sections) {
  return String(sections?.achievements || '').trim().length > 0
}

function legacyV1HasKeyResults(payload) {
  if (!payload || typeof payload !== 'object') return false
  const keyResults = payload.key_results
  if (Array.isArray(keyResults)) {
    return keyResults.some((line) => String(line || '').trim())
  }
  return String(keyResults || '').trim().length > 0
}

/** 周期报告保存/提交：重要成果（v2 achievements / v1 key_results）必填 */
export function periodContentHasRequiredAchievements(payload, contentFormat) {
  if (!payload || typeof payload !== 'object') return false
  const isV2 = contentFormat === CONTENT_FORMAT_V2 || payload.content_format === CONTENT_FORMAT_V2
  if (isV2) {
    return achievementsSectionHasText(payload.sections || {})
  }
  return legacyV1HasKeyResults(payload)
}

/** @deprecated 使用 periodContentHasRequiredAchievements */
export function periodContentHasBody(payload, contentFormat) {
  return periodContentHasRequiredAchievements(payload, contentFormat)
}

export function periodContentValidationMessage(payload, contentFormat) {
  const isV2 = contentFormat === CONTENT_FORMAT_V2 || payload?.content_format === CONTENT_FORMAT_V2
  return isV2 ? PERIOD_ACHIEVEMENTS_REQUIRED_MESSAGE : LEGACY_KEY_RESULTS_REQUIRED_MESSAGE
}
