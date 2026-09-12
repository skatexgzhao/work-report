<template>
  <el-card class="editor-panel report-form-textarea report-form-top-label">
    <template #header>
      <span>报告正文</span>
    </template>

    <p class="panel-hint">
      三章各一块编辑区；智能生成后行首【标签】与「关键词：」会加粗显示，便于核对。点击正文或「编辑文字」可改原文。
    </p>

    <el-form label-position="top" :disabled="readonly">
      <el-form-item v-for="field in sectionDefs" :key="field.key" class="period-v2-form-item">
        <template #label>
          <div class="label-block">
            <span class="label-title">
              {{ field.label }}
              <span v-if="field.required" class="label-required">（必填）</span>
            </span>
            <span class="label-hint">{{ field.hint }}</span>
          </div>
        </template>
        <PeriodV2SectionField
          v-model="sections[field.key]"
          :readonly="readonly"
          :min-rows="field.minRows"
          :placeholder="field.placeholder"
        />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { nextTick, reactive, watch } from 'vue'
import {
  PERIOD_V2_SECTION_DEFS,
  buildPeriodV2Payload,
  normalizePeriodV2Content
} from '../utils/periodContentV2'
import PeriodV2SectionField from './PeriodV2SectionField.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  readonly: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const sectionDefs = PERIOD_V2_SECTION_DEFS
const sections = reactive({
  achievements: '',
  issues: '',
  next_focus: ''
})

let syncing = false

function syncFromProps(value) {
  const normalized = normalizePeriodV2Content(value)
  const next = {
    achievements: normalized.sections.achievements,
    issues: normalized.sections.issues,
    next_focus: normalized.sections.next_focus
  }
  if (
    sections.achievements === next.achievements &&
    sections.issues === next.issues &&
    sections.next_focus === next.next_focus
  ) {
    return
  }
  sections.achievements = next.achievements
  sections.issues = next.issues
  sections.next_focus = next.next_focus
}

watch(
  () => props.modelValue,
  (v) => {
    if (syncing) return
    syncFromProps(v)
  },
  { immediate: true, deep: true }
)

function getContent() {
  return buildPeriodV2Payload(sections)
}

function emitContent() {
  syncing = true
  emit('update:modelValue', getContent())
  nextTick(() => {
    syncing = false
  })
}

watch(sections, () => emitContent(), { deep: true, flush: 'sync' })

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
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.label-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.label-required {
  font-weight: 600;
  color: var(--el-color-danger);
  font-size: 13px;
}

.label-hint {
  font-size: 12px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
}

.period-v2-form-item:last-child {
  margin-bottom: 0;
}

.editor-panel :deep(.el-form-item__content) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.editor-panel :deep(.el-card__body) {
  width: 100%;
  box-sizing: border-box;
}
</style>
