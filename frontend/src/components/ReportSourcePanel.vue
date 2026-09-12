<template>
  <el-card class="source-panel">
    <template #header>
      <div class="source-panel-header">
        <span>参考素材</span>
        <div v-if="sourceData?.items?.length" class="source-panel-header-actions">
          <el-button link type="primary" size="small" @click="expandAll">全部展开</el-button>
          <el-button link type="primary" size="small" @click="collapseAll">全部收起</el-button>
        </div>
      </div>
    </template>

    <el-skeleton v-if="loading" :rows="4" animated />
    <el-alert v-else-if="error" type="error" :title="error" show-icon />

    <template v-else-if="sourceData">
      <div class="summary-line">
        <template v-if="isDepartment && sourceData.scopeMode === 'team'">
          已有 <strong>{{ sourceData.submittedCount }}</strong> / {{ sourceData.teamCount }} 个小组提交了素材
        </template>
        <template v-else-if="isDepartment || teamPersonalSummary">
          已有 <strong>{{ sourceData.submittedCount }}</strong> / {{ sourceData.memberCount }} 人提交了{{ memberSourceLabel }}
        </template>
        <template v-else-if="sourceData.isTeamReport && sourceData.dailyCount != null">
          已填写 <strong>{{ sourceData.dailyCount }}</strong> / {{ sourceData.expectedCount }} 条成员日报
        </template>
        <template v-else>
          已填写 <strong>{{ sourceData.dailyCount }}</strong> / {{ sourceData.expectedCount }} 天日报
        </template>
      </div>

      <el-alert
        v-if="missingLabel"
        type="warning"
        :title="missingLabel"
        show-icon
        :closable="false"
        class="missing-alert"
      />

      <el-scrollbar max-height="480px">
        <div v-for="item in sourceData.items" :key="itemKey(item)" class="source-item">
          <div class="source-item-head">
            <span class="source-date">{{ itemHeadline(item) }}</span>
            <el-tag
              v-if="item.status"
              size="small"
              :type="item.status === 'SUBMITTED' ? 'success' : item.status === 'MISSING' ? 'warning' : 'info'"
            >
              {{ statusTagLabel(item.status) }}
            </el-tag>
          </div>

          <div v-if="contentEntries(item).length" class="source-body">
            <div v-for="(entry, idx) in contentEntries(item)" :key="idx" class="source-field">
              <div class="field-label">{{ entry.label }}</div>
              <ul v-if="entry.type === 'list'" class="field-list">
                <li v-for="(line, lineIdx) in entry.value" :key="lineIdx">{{ line }}</li>
              </ul>
              <template v-else>
                <div class="field-text">{{ displayText(item, idx, entry.value) }}</div>
                <el-button
                  v-if="needsTruncate(entry.value)"
                  link
                  type="primary"
                  size="small"
                  class="field-toggle"
                  @click="toggleEntry(item, idx)"
                >
                  {{ isEntryExpanded(item, idx) ? '收起' : '查看全文' }}
                </el-button>
              </template>
            </div>
          </div>
          <div v-else class="source-empty">{{ emptyItemHint(item) }}</div>
        </div>
        <el-empty v-if="!sourceData.items?.length" description="还没有可用的参考素材" />
      </el-scrollbar>
    </template>
  </el-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { contentToEntries, sourceTypeLabel } from '../utils/reportLabels'

const PREVIEW_MAX_CHARS = 220

const props = defineProps({
  sourceData: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  isDepartment: { type: Boolean, default: false }
})

const expandedKeys = ref(new Set())

watch(
  () => props.sourceData?.items,
  () => {
    expandedKeys.value = new Set()
  }
)

const teamPersonalSummary = computed(() => {
  if (!props.sourceData?.isTeamReport) return false
  return (props.sourceData.sourceTypes || []).some((t) => String(t).startsWith('PERSONAL_'))
})

const memberSourceLabel = computed(() => {
  const t = props.sourceData?.sourceTypes?.[0]
  if (t === 'DAILY') return '日报'
  if (t && String(t).startsWith('PERSONAL_')) return sourceTypeLabel(t)
  return '个人报告'
})

const missingLabel = computed(() => {
  if (!props.sourceData) return ''
  if (props.isDepartment && props.sourceData.scopeMode === 'team') {
    return props.sourceData.missingTeams?.length
      ? `还有这些小组没提交：${props.sourceData.missingTeams.join('、')}`
      : ''
  }
  if (props.isDepartment || teamPersonalSummary.value) {
    return props.sourceData.missingMembers?.length
      ? `还有这些成员没提交：${props.sourceData.missingMembers.join('、')}`
      : ''
  }
  return props.sourceData.missingDates?.length
    ? `还有这些日期没写日报：${props.sourceData.missingDates.join('、')}`
    : ''
})

function entryKey(item, idx) {
  return `${itemKey(item)}::${idx}`
}

function isEntryExpanded(item, idx) {
  return expandedKeys.value.has(entryKey(item, idx))
}

function toggleEntry(item, idx) {
  const key = entryKey(item, idx)
  const next = new Set(expandedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedKeys.value = next
}

function expandAll() {
  const keys = new Set()
  for (const item of props.sourceData?.items || []) {
    contentEntries(item).forEach((entry, idx) => {
      if (entry.type !== 'list' && needsTruncate(entry.value)) {
        keys.add(entryKey(item, idx))
      }
    })
  }
  expandedKeys.value = keys
}

function collapseAll() {
  expandedKeys.value = new Set()
}

function needsTruncate(text) {
  return String(text || '').length > PREVIEW_MAX_CHARS
}

function displayText(item, idx, text) {
  const full = String(text || '')
  if (!needsTruncate(full) || isEntryExpanded(item, idx)) return full
  return `${full.slice(0, PREVIEW_MAX_CHARS)}…`
}

function statusTagLabel(status) {
  if (status === 'SUBMITTED') return '已提交'
  if (status === 'MISSING') return '未提交'
  return '草稿'
}

function emptyItemHint(item) {
  if (item.periodLabel || item.sourceType?.startsWith('PERSONAL_')) {
    if (item.status === 'MISSING') return '该成员在本周期尚未提交个人报告'
    return '该报告暂无正文内容'
  }
  return '这一天没有填写内容'
}

function itemKey(item) {
  return `${item.userId || item.teamId || ''}-${item.reportDate || item.periodLabel || item.reportId || Math.random()}`
}

function itemHeadline(item) {
  if (item.username && item.periodLabel) return `${item.username} · ${item.periodLabel}`
  if (item.teamName && item.periodLabel) return `${item.teamName} · ${item.periodLabel}`
  if (item.username) return `${item.username} 的报告`
  if (item.sourceLabel && item.reportDate) return `${formatDateLabel(item.reportDate)} · ${item.sourceLabel}`
  if (item.periodLabel) return item.periodLabel
  return formatDateLabel(item.reportDate)
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '未知日期'
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

function contentEntries(item) {
  return contentToEntries(item.contentJson || item.content_json || {})
}
</script>

<style scoped>
.source-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.source-panel-header-actions {
  display: flex;
  gap: 4px;
}

.summary-line {
  margin-bottom: 12px;
  color: #606266;
  font-size: 14px;
}

.missing-alert {
  margin-bottom: 12px;
}

.source-item {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.source-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #dcdfe6;
}

.source-date {
  font-weight: 600;
  color: #303133;
}

.source-field + .source-field {
  margin-top: 10px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 4px;
}

.field-text {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

.field-toggle {
  margin-top: 4px;
  padding: 0;
}

.field-list {
  margin: 0;
  padding-left: 18px;
  color: #303133;
  line-height: 1.7;
}

.field-list li + li {
  margin-top: 4px;
}

.source-empty {
  color: #909399;
  font-size: 13px;
}
</style>
