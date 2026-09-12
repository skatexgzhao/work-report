<template>
  <el-button type="warning" :loading="loading" :disabled="disabled" @click="$emit('generate')">
    {{ loading ? '正在生成…' : '智能生成报告' }}
  </el-button>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

defineEmits(['generate'])
</script>
