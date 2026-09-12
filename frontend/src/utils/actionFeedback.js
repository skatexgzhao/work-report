import { ElNotification } from 'element-plus'
import { sourceTypeLabel, statusLabel, versionTypeLabel } from './reportLabels'

function formatSourceTypes(types = []) {
  if (!types.length) return '无'
  return types.map(sourceTypeLabel).join('、')
}

function formatSourceConfigChanges(changes) {
  if (!changes) return ''
  const parts = []
  if (changes.sourceTypesAdded?.length) {
    parts.push(`新增素材：${changes.sourceTypesAdded.map(sourceTypeLabel).join('、')}`)
  }
  if (changes.sourceTypesRemoved?.length) {
    parts.push(`移除素材：${changes.sourceTypesRemoved.map(sourceTypeLabel).join('、')}`)
  }
  if (changes.includeAllMembersChanged || changes.referenceUserIdsChanged) {
    parts.push('成员范围已调整')
  }
  if (changes.referenceTeamIdsChanged) {
    parts.push('参考小组已调整')
  }
  if (changes.scopeModeChanged) {
    parts.push('汇总维度已切换')
  }
  return parts.join('；') || '素材设置已更新'
}

export function notifyPeriodSave(result) {
  const meta = result.meta || {}
  const version = meta.version ?? result.version?.version
  const versionType = versionTypeLabel(meta.versionType ?? result.version?.version_type)
  ElNotification({
    title: '草稿已保存',
    message: `第 ${version} 版（${versionType}）· 引用 ${meta.sourceItemCount ?? 0} 条素材 · ${formatSourceTypes(meta.sourceTypes)}`,
    type: 'success',
    duration: 5000
  })
}

export function notifyPeriodSubmit(result) {
  const meta = result.meta || {}
  ElNotification({
    title: '报告已提交',
    message: `状态：${statusLabel(meta.status)} · 第 ${meta.version} 版 · 引用 ${meta.sourceItemCount ?? 0} 条素材`,
    type: 'success',
    duration: 6000
  })
}

export function notifySourceConfigUpdate(result) {
  const meta = result.meta || {}
  if (!meta.changed) {
    ElNotification({ title: '素材设置未变化', message: '当前配置与保存的一致', type: 'info', duration: 4000 })
    return
  }
  ElNotification({
    title: '素材设置已更新',
    message: `${formatSourceConfigChanges(result.changes)} · 现有 ${meta.sourceItemCount ?? 0} 条素材`,
    type: 'warning',
    duration: 7000
  })
}

export function notifyDailySave(report) {
  ElNotification({
    title: '草稿已保存',
    message: `状态：${statusLabel(report.status)} · ${report.report_date}`,
    type: 'success',
    duration: 4000
  })
}

export function notifyDailySubmit(report) {
  ElNotification({
    title: '日报已提交',
    message: `状态：${statusLabel(report.status)} · ${report.report_date} · 如需修改请发起「修改」`,
    type: 'success',
    duration: 6000
  })
}
