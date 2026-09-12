<template>
  <el-collapse v-model="activeNames" class="submission-status-collapse">
    <el-collapse-item name="status">
      <template #title>
        <span class="submission-status-collapse__title">{{ title }}</span>
        <span v-if="summary" class="submission-status-collapse__summary">{{ summary }}</span>
      </template>
      <SubmissionStatusTable :status-data="statusData" />
    </el-collapse-item>
  </el-collapse>
</template>

<script setup>
import { computed, ref } from 'vue'
import SubmissionStatusTable from './SubmissionStatusTable.vue'
import { reportTypeLabel } from '../utils/reportLabels'

const props = defineProps({
  statusData: { type: Object, default: null }
})

const activeNames = ref(['status'])

const title = computed(() => {
  if (props.statusData?.scopeMode === 'team') return '小组提交情况'
  return '成员提交情况'
})

const summary = computed(() => {
  const rows = props.statusData?.rows || []
  if (!rows.length) return ''
  const submitted = rows.filter((r) => r.reportStatus === 'SUBMITTED').length
  const type = props.statusData?.targetReportType
  const typeLabel = type ? reportTypeLabel(type) : '报告'
  return `（${submitted}/${rows.length} 人已提交${typeLabel}）`
})
</script>

<style scoped>
.submission-status-collapse {
  margin-bottom: 16px;
  border: none;
}

.submission-status-collapse :deep(.el-collapse-item__header) {
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.submission-status-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.submission-status-collapse__title {
  margin-right: 8px;
}

.submission-status-collapse__summary {
  font-size: 13px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
}
</style>
