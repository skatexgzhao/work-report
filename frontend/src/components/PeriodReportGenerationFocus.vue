<template>
  <el-card v-if="variant === 'card'" class="generation-focus-card">
    <template #header>
      <span>智能生成设置</span>
    </template>
    <TeamDeptWarningCollapse v-if="showTeamDeptWarning" />
    <p class="hint">生成前可填写本报告关注方向（选填），AI 会优先从左侧素材中查找相关内容；内容必须来自素材，不会编造。</p>
    <el-input
      v-model="localFocus"
      type="textarea"
      :autosize="{ minRows: 3, maxRows: 8 }"
      :disabled="readonly"
      placeholder="例如：授权中心本体建模、发版风险、测试环境稳定性"
      class="report-form-textarea--medium"
    />
    <div v-if="!readonly" class="actions">
      <el-button size="small" :loading="saving" @click="saveFocus()">保存关注方向</el-button>
    </div>
  </el-card>

  <div v-else class="generation-focus-compact" :class="{ 'generation-focus-compact--dirty': isDirty && !readonly }">
    <div class="generation-focus-compact__head">
      <span class="generation-focus-compact__title">生成前准备（选填）</span>
    </div>
    <TeamDeptWarningCollapse v-if="showTeamDeptWarning" />
    <p class="hint">
      填写后 AI 会优先从左侧素材中查找相关内容；内容必须来自素材，不会编造。
    </p>
    <el-input
      v-model="localFocus"
      type="textarea"
      :autosize="{ minRows: 2, maxRows: 4 }"
      :disabled="readonly"
      placeholder="例如：授权中心本体建模、发版风险、测试环境稳定性"
      class="report-form-textarea--medium"
    />
    <div v-if="!readonly" class="generation-focus-compact__footer">
      <span v-if="isDirty" class="generation-focus-compact__dirty-tip">关注方向已修改，保存后再智能生成更准</span>
      <el-button
        type="primary"
        :plain="!isDirty"
        :loading="saving"
        :disabled="!isDirty"
        class="generation-focus-compact__save-btn"
        @click="saveFocus()"
      >
        保存关注方向
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import v1Client from '../api/v1/client'
import TeamDeptWarningCollapse from './TeamDeptWarningCollapse.vue'

const props = defineProps({
  reportId: { type: [Number, String], required: true },
  modelValue: { type: String, default: '' },
  reportScope: { type: String, default: 'personal' },
  readonly: { type: Boolean, default: false },
  /** @type {'compact' | 'card'} */
  variant: { type: String, default: 'compact' }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const localFocus = ref(props.modelValue)
const saving = ref(false)

const showTeamDeptWarning = computed(() => props.reportScope === 'team' || props.reportScope === 'department')

const isDirty = computed(() => localFocus.value !== (props.modelValue ?? ''))

watch(
  () => props.modelValue,
  (v) => {
    localFocus.value = v
  }
)

async function saveFocus(options = {}) {
  const silent = options.silent === true
  saving.value = true
  try {
    const { data } = await v1Client.put(`/period-reports/${props.reportId}/generation-focus`, {
      generationFocus: localFocus.value
    })
    const saved = data.generation_focus ?? localFocus.value
    emit('update:modelValue', saved)
    emit('saved', data)
    if (!silent) {
      ElMessage.success('关注方向已保存')
    }
    return true
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '保存失败')
    return false
  } finally {
    saving.value = false
  }
}

/** 有未保存改动时保存；无改动直接成功 */
async function saveFocusIfNeeded(options = {}) {
  if (!isDirty.value) return true
  return saveFocus(options)
}

defineExpose({ isDirty, saveFocus, saveFocusIfNeeded })
</script>

<style scoped>
.hint {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.actions {
  margin-top: 8px;
}

.generation-focus-compact {
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
}

.generation-focus-compact__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.generation-focus-compact__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.generation-focus-compact--dirty {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
}

.generation-focus-compact__footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.generation-focus-compact--dirty .generation-focus-compact__footer {
  padding: 10px 12px;
  margin-top: 10px;
  border-top: none;
  border-radius: var(--el-border-radius-base);
  background: var(--el-color-primary-light-9);
}

.generation-focus-compact__dirty-tip {
  flex: 1;
  min-width: 180px;
  font-size: 13px;
  color: var(--el-color-primary);
}

.generation-focus-compact__save-btn {
  min-width: 128px;
  font-weight: 600;
}
</style>
