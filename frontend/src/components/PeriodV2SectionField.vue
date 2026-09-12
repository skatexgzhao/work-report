<template>
  <div class="period-v2-section-field period-v2-section-field--uniform">
    <div class="period-v2-section-field__surface">
      <div
        v-if="showRendered"
        class="period-v2-rendered"
        :class="{ 'period-v2-rendered--readonly': readonly }"
        v-html="highlightedHtml"
        @click="onRenderedClick"
      />
      <el-input
        v-if="showTextarea"
        :model-value="modelValue"
        type="textarea"
        :rows="minRows"
        resize="vertical"
        class="period-v2-textarea report-form-textarea--large"
        :placeholder="placeholder"
        @update:model-value="emit('update:modelValue', $event)"
        @blur="onTextareaBlur"
      />
    </div>
    <div v-if="!readonly && canToggleView" class="period-v2-section-field__tools">
      <el-button v-if="!editing" link type="primary" @click="editing = true">编辑文字</el-button>
      <el-button v-else link type="primary" @click="finishEdit">预览（关键词加粗）</el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { highlightPeriodV2TextToHtml, periodV2TextHasHighlightMarkers } from '../utils/periodV2Highlight'

const props = defineProps({
  modelValue: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  minRows: { type: Number, default: 8 },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const editing = ref(false)

const hasMarkers = computed(() => periodV2TextHasHighlightMarkers(props.modelValue))
const canToggleView = computed(() => hasMarkers.value && String(props.modelValue || '').trim())

const highlightedHtml = computed(() => highlightPeriodV2TextToHtml(props.modelValue))

const showRendered = computed(() => {
  if (props.readonly) return true
  if (canToggleView.value && !editing.value) return true
  return false
})

const showTextarea = computed(() => {
  if (props.readonly) return false
  if (!canToggleView.value) return true
  return editing.value
})

watch(
  () => props.modelValue,
  (v, old) => {
    if (!old?.trim() && v?.trim() && hasMarkers.value) {
      editing.value = false
    }
  }
)

function onRenderedClick() {
  if (!props.readonly && canToggleView.value) {
    editing.value = true
  }
}

function onTextareaBlur() {
  if (canToggleView.value) {
    editing.value = false
  }
}

function finishEdit() {
  editing.value = false
}
</script>

<style scoped>
.period-v2-section-field {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.period-v2-section-field__surface {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.period-v2-section-field__surface :deep(.el-textarea) {
  width: 100%;
  display: block;
}

.period-v2-section-field__surface :deep(.el-textarea__inner) {
  width: 100%;
  box-sizing: border-box;
}

.period-v2-section-field__tools {
  margin-top: 6px;
}

.period-v2-rendered {
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  white-space: pre-wrap;
  word-break: break-word;
  cursor: text;
}

.period-v2-rendered--readonly {
  cursor: default;
  background: var(--el-fill-color-light);
}

.period-v2-rendered :deep(.period-v2-kw) {
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
