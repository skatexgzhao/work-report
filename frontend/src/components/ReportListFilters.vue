<template>
  <el-card shadow="never" class="report-list-filters">
    <el-form :inline="true" class="filter-form" @submit.prevent="emitSearch">
      <el-form-item v-if="showPeriodGrain" label="报告类型">
        <el-select
          v-model="localPeriodGrain"
          class="filter-period-grain"
          @change="emitSearch"
        >
          <el-option
            v-for="opt in PERIOD_GRAIN_FILTER_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="日期范围">
        <el-date-picker
          v-model="localRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始"
          end-placeholder="结束"
          value-format="YYYY-MM-DD"
          unlink-panels
          class="filter-date"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="localStatus" clearable placeholder="全部" class="filter-status">
          <el-option label="草稿" value="DRAFT" />
          <el-option label="已提交" value="SUBMITTED" />
          <el-option label="修改中" value="REVISING" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input
          v-model="localKeyword"
          clearable
          placeholder="搜正文或日期"
          class="filter-keyword"
          @keyup.enter="emitSearch"
        />
      </el-form-item>
      <el-form-item class="filter-actions">
        <el-button type="primary" @click="emitSearch">查询</el-button>
        <el-button @click="emitReset">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { PERIOD_GRAIN_FILTER_OPTIONS } from '../utils/periodListFilter'

const props = defineProps({
  from: { type: String, default: '' },
  to: { type: String, default: '' },
  status: { type: String, default: '' },
  keyword: { type: String, default: '' },
  showPeriodGrain: { type: Boolean, default: false },
  periodGrain: { type: String, default: 'ALL' }
})

const emit = defineEmits(['search', 'reset', 'refresh'])

const localRange = ref(props.from && props.to ? [props.from, props.to] : null)
const localStatus = ref(props.status || '')
const localKeyword = ref(props.keyword || '')
const localPeriodGrain = ref(props.periodGrain || 'ALL')

watch(
  () => [props.from, props.to, props.status, props.keyword, props.periodGrain],
  () => {
    localRange.value = props.from && props.to ? [props.from, props.to] : null
    localStatus.value = props.status || ''
    localKeyword.value = props.keyword || ''
    localPeriodGrain.value = props.periodGrain || 'ALL'
  }
)

function buildPayload() {
  const from = localRange.value?.[0] || ''
  const to = localRange.value?.[1] || ''
  const payload = { from, to, status: localStatus.value || '', q: localKeyword.value?.trim() || '' }
  if (props.showPeriodGrain) {
    payload.periodGrain = localPeriodGrain.value || 'ALL'
  }
  return payload
}

function emitSearch() {
  emit('search', buildPayload())
}

function emitReset() {
  localRange.value = null
  localStatus.value = ''
  localKeyword.value = ''
  if (props.showPeriodGrain) {
    localPeriodGrain.value = 'ALL'
  }
  emit('reset')
  emit('search', buildPayload())
}
</script>

<style scoped>
.report-list-filters {
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 4px 0;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.filter-form :deep(.el-form-item__label) {
  font-size: 13px;
  color: var(--el-text-color-regular);
  padding-right: 8px;
}

.filter-period-grain {
  width: 120px;
}

.filter-date {
  width: 240px !important;
  max-width: 100%;
}

.filter-date :deep(.el-range-input) {
  font-size: 13px;
}

.filter-status {
  width: 108px;
}

.filter-keyword {
  width: 160px;
}

.filter-actions :deep(.el-form-item__content) {
  flex-wrap: nowrap;
}
</style>
