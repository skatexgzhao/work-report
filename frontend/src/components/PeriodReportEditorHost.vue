<template>
  <PeriodReportEditorV2
    v-if="useV2"
    ref="innerRef"
    :model-value="modelValue"
    :readonly="readonly"
    @update:model-value="onInnerUpdate"
  />
  <ReportEditorPanel
    v-else
    ref="innerRef"
    :model-value="modelValue"
    :readonly="readonly"
    @update:model-value="onInnerUpdate"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import PeriodReportEditorV2 from './PeriodReportEditorV2.vue'
import ReportEditorPanel from './ReportEditorPanel.vue'
import { CONTENT_FORMAT_V2 } from '../utils/periodContentV2'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  readonly: { type: Boolean, default: false },
  contentFormat: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const innerRef = ref(null)

const useV2 = computed(
  () =>
    props.contentFormat === CONTENT_FORMAT_V2 || props.modelValue?.content_format === CONTENT_FORMAT_V2
)

function onInnerUpdate(value) {
  emit('update:modelValue', value)
}

function flush() {
  const payload = innerRef.value?.flush?.() ?? innerRef.value?.getContent?.()
  if (payload) {
    emit('update:modelValue', payload)
    return payload
  }
  return props.modelValue
}

function getContent() {
  return innerRef.value?.getContent?.() ?? props.modelValue
}

defineExpose({ flush, getContent })
</script>
