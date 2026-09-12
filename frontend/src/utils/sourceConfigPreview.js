/** 将素材设置表单转为 source-data / member-status 预览 query */
export function sourceConfigPreviewParams(payload) {
  if (!payload) return {}
  const params = { preview: '1' }
  const sourceType = payload.sourceTypes?.[0]
  if (sourceType) params.sourceType = sourceType
  params.includeAllMembers = String(payload.includeAllMembers !== false)
  if (payload.referenceUserIds?.length) {
    params.referenceUserIds = payload.referenceUserIds.join(',')
  }
  if (payload.referenceTeamIds?.length) {
    params.referenceTeamIds = payload.referenceTeamIds.join(',')
  }
  if (payload.scopeMode) params.scopeMode = payload.scopeMode
  return params
}
