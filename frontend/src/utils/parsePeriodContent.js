/** 解析 API 返回的 period 正文（含双重 JSON 编码） */
export function parsePeriodContent(raw) {
  if (raw == null || raw === '') return {}
  let data = raw
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return {}
    }
  }
  while (typeof data === 'string' && data.trim()) {
    try {
      data = JSON.parse(data)
    } catch {
      break
    }
  }
  return data && typeof data === 'object' ? { ...data } : {}
}
