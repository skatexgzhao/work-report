<template>
  <el-card class="editor-panel report-form-textarea report-form-top-label">
    <template #header>
      <span>报告正文</span>
    </template>

    <p class="panel-hint">请根据实际情况填写，列表类内容建议每行一条，方便阅读。</p>

    <el-form label-position="top" class="report-form-textarea report-form-top-label" :disabled="readonly">
      <el-form-item v-for="field in listFieldDefs" :key="field.key">
        <template #label>
          <div class="label-block">
            <span class="label-title">
              {{ field.label }}
              <span v-if="field.required" class="label-required">（必填）</span>
            </span>
            <span class="label-hint">{{ field.hint }}</span>
          </div>
        </template>
        <el-input
          v-if="field.key === 'summary'"
          v-model="localContent.summary"
          type="textarea"
          :autosize="{ minRows: 5, maxRows: 28 }"
          class="report-form-textarea--medium"
          :placeholder="field.placeholder"
        />
        <el-input
          v-else
          v-model="listFieldTexts[field.key]"
          type="textarea"
          :autosize="{ minRows: field.key === 'completed' ? 8 : 6, maxRows: 28 }"
          :class="field.key === 'completed' ? 'report-form-textarea--large' : 'report-form-textarea--medium'"
          :placeholder="field.placeholder"
        />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { nextTick, reactive, ref, watch } from 'vue'
import { PERIOD_FIELD_DEFS } from '../utils/reportLabels'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  readonly: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const listFieldDefs = PERIOD_FIELD_DEFS

function defaultContent() {
  return {
    summary: '',
    completed: [],
    key_results: [],
    problems: [],
    next_plan: [],
    risks: []
  }
}

function linesToArray(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function arrayToLines(value) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function snapshot(obj) {
  return JSON.stringify(obj || {})
}

const localContent = ref(defaultContent())
const listFieldTexts = reactive({
  completed: '',
  key_results: '',
  problems: '',
  next_plan: '',
  risks: ''
})

function syncFromProps(value) {
  const next = { ...defaultContent(), ...(value || {}) }
  localContent.value = next
  listFieldTexts.completed = arrayToLines(next.completed)
  listFieldTexts.key_results = arrayToLines(next.key_results)
  listFieldTexts.problems = arrayToLines(next.problems)
  listFieldTexts.next_plan = arrayToLines(next.next_plan)
  listFieldTexts.risks = arrayToLines(next.risks)
}

function buildPayload() {
  return {
    summary: localContent.value.summary || '',
    completed: linesToArray(listFieldTexts.completed),
    key_results: linesToArray(listFieldTexts.key_results),
    problems: linesToArray(listFieldTexts.problems),
    next_plan: linesToArray(listFieldTexts.next_plan),
    risks: linesToArray(listFieldTexts.risks)
  }
}

let syncing = false

watch(
  () => props.modelValue,
  (value) => {
    if (syncing) return
    if (snapshot(value) === snapshot(buildPayload())) return
    syncFromProps(value)
  },
  { immediate: true, deep: true }
)

function getContent() {
  return buildPayload()
}

function emitPayload() {
  const payload = buildPayload()
  if (snapshot(payload) === snapshot(props.modelValue)) return payload
  syncing = true
  emit('update:modelValue', payload)
  nextTick(() => {
    syncing = false
  })
  return payload
}

watch([localContent, listFieldTexts], () => emitPayload(), { deep: true, flush: 'sync' })

function flush() {
  syncing = true
  const payload = getContent()
  emit('update:modelValue', payload)
  syncing = false
  return payload
}

defineExpose({ getContent, flush })
</script>

<style scoped>
.panel-hint {
  margin: 0 0 16px;
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
}

.label-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.label-required {
  color: var(--el-color-danger);
  font-size: 13px;
}

.label-hint {
  font-size: 12px;
  font-weight: normal;
  color: #909399;
}

:deep(.el-form-item__label) {
  padding-bottom: 4px;
  line-height: 1.4;
}
</style>
