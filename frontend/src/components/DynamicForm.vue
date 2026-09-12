<template>
  <el-form
    ref="formRef"
    :model="model"
    :rules="rules"
    :label-width="labelPosition === 'top' ? undefined : labelWidth"
    :label-position="labelPosition"
    :disabled="readonly"
    :class="formClasses"
  >
    <el-form-item
      v-for="field in sortedFields"
      :key="field.key"
      :prop="field.key"
      class="dynamic-form-item"
    >
      <template #label>
        <div class="field-label-row">
          <span class="field-title">{{ displayLabel(field) }}</span>
          <span v-if="field.required" class="required-mark">*</span>
          <el-button
            v-if="hintPlacement === 'content' && !readonly && hasExample(field.key)"
            link
            type="primary"
            size="small"
            class="append-example-btn"
            @click.stop="appendExample(field.key)"
          >
            追加范例
          </el-button>
        </div>
      </template>

      <div class="field-content">
        <p v-if="hintPlacement === 'content' && fieldHint(field)" class="field-hint-line">
          {{ fieldHint(field) }}
        </p>

        <el-input
          v-if="field.type === 'text'"
          v-model="model[field.key]"
          :placeholder="fieldPlaceholder(field)"
        />
        <el-input
          v-else
          v-model="model[field.key]"
          type="textarea"
          :rows="field.rows || defaultTextareaRows"
          :autosize="textareaAutosize(field)"
          :placeholder="fieldPlaceholder(field)"
          :class="textareaSizeClass(field)"
        />

        <div v-if="hintPlacement !== 'content' && !readonly && hasExample(field.key)" class="field-actions">
          <el-button link type="primary" size="small" @click="appendExample(field.key)">
            追加范例
          </el-button>
        </div>
        <div v-if="hintPlacement !== 'content' && fieldHint(field)" class="field-hint field-hint--label">
          {{ fieldHint(field) }}
        </div>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { dailyFieldLabel } from '../utils/reportLabels'

const props = defineProps({
  formSchema: {
    type: Object,
    default: () => ({ fields: [] })
  },
  modelValue: {
    type: Object,
    default: () => ({})
  },
  readonly: {
    type: Boolean,
    default: false
  },
  exampleSnippets: {
    type: Object,
    default: () => ({})
  },
  hintPlacement: {
    type: String,
    default: 'label'
  },
  labelWidth: {
    type: String,
    default: '120px'
  },
  labelPosition: {
    type: String,
    default: 'right'
  },
  defaultTextareaRows: {
    type: Number,
    default: 5
  },
  useReportTextareaStyles: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const formRef = ref()
const model = ref({})

const formClasses = computed(() => ({
  'dynamic-form--stacked-hints': props.hintPlacement === 'content',
  'report-form-textarea': props.useReportTextareaStyles,
  'report-form-top-label': props.labelPosition === 'top'
}))

function displayLabel(field) {
  return dailyFieldLabel(field.key) || field.label || field.key
}

function fieldHint(field) {
  return field.hint || ''
}

function fieldPlaceholder(field) {
  if (field.placeholder) return field.placeholder
  return `请填写${displayLabel(field)}`
}

function textareaAutosize(field) {
  const min = field.rows || props.defaultTextareaRows
  return { minRows: min, maxRows: 28 }
}

function textareaSizeClass(field) {
  if (!props.useReportTextareaStyles) return ''
  if (field.key === 'completed') return 'report-form-textarea--large'
  return 'report-form-textarea--medium'
}

function hasExample(key) {
  const snippet = props.exampleSnippets?.[key]
  return snippet != null && String(snippet).trim() !== ''
}

function appendExample(key) {
  const snippet = props.exampleSnippets?.[key]
  if (!snippet) return
  const current = model.value[key] == null ? '' : String(model.value[key])
  const trimmed = current.trim()
  const separator = trimmed ? '\n\n' : ''
  model.value = { ...model.value, [key]: trimmed + separator + snippet }
}

const sortedFields = computed(() => {
  const fields = props.formSchema?.fields || []
  return [...fields].sort((a, b) => (a.order || 0) - (b.order || 0))
})

const rules = computed(() => {
  const result = {}
  for (const field of sortedFields.value) {
    if (field.required) {
      result[field.key] = [{ required: true, message: `请填写${displayLabel(field)}`, trigger: 'blur' }]
    }
  }
  return result
})

function snapshot(obj) {
  return JSON.stringify(obj || {})
}

watch(
  () => props.modelValue,
  (value) => {
    const next = { ...(value || {}) }
    if (snapshot(next) !== snapshot(model.value)) {
      model.value = next
    }
  },
  { immediate: true, deep: true }
)

watch(
  model,
  (value) => {
    const next = { ...value }
    if (snapshot(next) !== snapshot(props.modelValue)) {
      emit('update:modelValue', next)
    }
  },
  { deep: true }
)

async function validate() {
  if (!formRef.value) return false
  try {
    await formRef.value.validate()
    return true
  } catch {
    return false
  }
}

defineExpose({ validate })
</script>

<style scoped>
.field-label-row {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  max-width: 100%;
}

.field-title {
  font-weight: 600;
  font-size: 15px;
}

.required-mark {
  color: var(--el-color-danger);
  margin-left: 2px;
}

.field-content {
  width: 100%;
}

.field-hint-line {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.append-example-btn {
  flex-shrink: 0;
  padding: 0;
  height: auto;
  font-size: 13px;
  vertical-align: middle;
}

.field-hint--label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.field-actions {
  margin-top: 4px;
}
</style>
