<template>
  <el-alert
    v-if="report"
    :type="alertType"
    :closable="false"
    show-icon
    class="status-banner"
  >
    <template #title>
      <span>{{ statusText }}</span>
      <span v-if="versionText" class="version-text"> · {{ versionText }}</span>
    </template>
    <template #default>
      <div class="banner-body">
        <span>{{ hintText }}</span>
        <el-button
          v-if="canRevise"
          type="warning"
          size="small"
          :loading="revising"
          @click="$emit('revise')"
        >
          发起修改
        </el-button>
      </div>
    </template>
  </el-alert>
</template>

<script setup>
import { computed } from 'vue'
import { statusLabel, versionTypeLabel } from '../utils/reportLabels'

const props = defineProps({
  report: { type: Object, default: null },
  revising: { type: Boolean, default: false }
})

defineEmits(['revise'])

const alertType = computed(() => {
  if (!props.report) return 'info'
  if (props.report.status === 'SUBMITTED') return 'success'
  if (props.report.status === 'REVISING') return 'warning'
  return 'info'
})

const statusText = computed(() => {
  if (!props.report) return ''
  return statusLabel(props.report.status)
})

const versionText = computed(() => {
  const version = props.report?.currentVersion
  if (!version) return ''
  const typeLabel = versionTypeLabel(version.version_type)
  return `当前第 ${version.version} 版（${typeLabel}）`
})

const canRevise = computed(() => props.report?.status === 'SUBMITTED')

const hintText = computed(() => {
  if (!props.report) return ''
  if (props.report.status === 'SUBMITTED') return '报告已正式提交。如需调整内容，请点击「发起修改」。'
  if (props.report.status === 'REVISING') return '正在修改中，保存后重新提交即可生效。'
  return '当前为草稿，可随时保存或提交。'
})
</script>

<style scoped>
.status-banner {
  margin-bottom: 16px;
}

.version-text {
  font-weight: normal;
  color: inherit;
  opacity: 0.85;
}

.banner-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
