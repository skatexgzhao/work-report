import { nextTick } from 'vue'
import v1Client from '../api/v1/client'
import { parsePeriodContent } from './parsePeriodContent'
import {
  periodContentHasRequiredAchievements,
  periodContentValidationMessage
} from './periodContentHasBody'

/**
 * Read editor state into a content payload (flush + getContent).
 */
function editorHost(refOrInstance) {
  return refOrInstance?.value ?? refOrInstance
}

export async function collectPeriodEditorPayload(periodEditorRef, contentValue, contentFormat) {
  const host = editorHost(periodEditorRef)
  if (host?.flush) {
    host.flush()
  }
  await nextTick()
  let payload = parsePeriodContent(contentValue)
  const fromEditor = parsePeriodContent(host?.getContent?.())
  if (periodContentHasRequiredAchievements(fromEditor, contentFormat)) {
    payload = fromEditor
  }
  return payload
}

/**
 * PUT draft to API and verify persisted body. Used by save and submit flows.
 */
export async function persistPeriodDraft(reportId, periodEditorRef, contentRef, reportRef) {
  const contentFormat = reportRef.value?.content_format
  const payload = await collectPeriodEditorPayload(
    periodEditorRef,
    contentRef.value,
    contentFormat
  )
  contentRef.value = payload

  if (!periodContentHasRequiredAchievements(payload, contentFormat)) {
    return {
      ok: false,
      code: 'EMPTY',
      message: periodContentValidationMessage(payload, contentFormat)
    }
  }

  const { data } = await v1Client.put(`/period-reports/${reportId}`, { content: payload })
  reportRef.value = data.report
  const persisted = parsePeriodContent(
    data.version?.content_json ?? data.report?.currentVersion?.content_json
  )
  if (!periodContentHasRequiredAchievements(persisted, contentFormat)) {
    return { ok: false, code: 'PERSIST_FAILED', message: '保存未写入正文，请重试或刷新页面后再编辑' }
  }
  contentRef.value = persisted
  return { ok: true, data, persisted }
}
