<template>
  <el-table :data="rows" stripe>
    <el-table-column :prop="nameProp" :label="nameLabel" />
    <el-table-column :label="statusColumnLabel">
      <template #default="{ row }">
        <el-tag :type="statusType(row.reportStatus)">
          {{ statusText(row.reportStatus) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="updatedAt" label="最后更新时间">
      <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
    </el-table-column>
  </el-table>
</template>

<script setup>
import { computed } from 'vue'
import { reportTypeLabel } from '../utils/reportLabels'

const props = defineProps({
  statusData: { type: Object, default: null }
})

const rows = computed(() => props.statusData?.rows || [])

const isTeamMode = computed(() => props.statusData?.scopeMode === 'team')

const nameProp = computed(() => (isTeamMode.value ? 'teamName' : 'username'))
const nameLabel = computed(() => (isTeamMode.value ? '小组名称' : '成员姓名'))

const statusColumnLabel = computed(() => {
  const type = props.statusData?.targetReportType
  if (!type) return '报告是否提交'
  return `${reportTypeLabel(type)}是否提交`
})

function statusType(status) {
  if (status === 'SUBMITTED') return 'success'
  if (status === 'DRAFT') return 'warning'
  return 'info'
}

function statusText(status) {
  if (status === 'SUBMITTED') return '已提交'
  if (status === 'DRAFT') return '还是草稿'
  return '还没创建'
}

function formatTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
</script>
