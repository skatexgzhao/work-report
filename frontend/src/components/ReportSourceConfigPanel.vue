<template>
  <el-card class="source-config-panel">
    <template #header>
      <span>素材设置</span>
    </template>

    <el-skeleton v-if="loading" :rows="3" animated />

    <template v-else>
      <el-form label-width="100px" size="small">
        <el-form-item v-if="isDepartmentScope" label="汇总维度">
          <el-radio-group v-model="form.scopeMode" :disabled="readonly" @change="onScopeModeChange">
            <el-radio label="team">按小组</el-radio>
            <el-radio label="member">按成员</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="isTeamScope && !readonly" label="说明">
          <p class="team-source-hint">
            默认汇总组内成员对应周期的个人报告；也可单选改为成员日报等（与产品素材层级表一致）。
          </p>
        </el-form-item>

        <el-form-item label="参考素材">
          <el-radio-group v-model="selectedSourceType" :disabled="readonly">
            <el-radio v-for="opt in visibleSourceOptions" :key="opt.value" :label="opt.value">
              {{ opt.label }}
              <el-tag v-if="opt.isDefault" size="small" type="info" style="margin-left: 4px">默认</el-tag>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="showMemberPicker">
          <el-form-item :label="memberScopeLabel">
            <el-radio-group v-model="form.includeAllMembers" :disabled="readonly">
              <el-radio :label="true">{{ allMembersLabel }}</el-radio>
              <el-radio :label="false">{{ pickMembersLabel }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="!form.includeAllMembers" label="指定成员">
            <el-select
              v-model="form.referenceUserIds"
              multiple
              placeholder="选择成员"
              style="width: 100%"
              :disabled="readonly"
            >
              <el-option v-for="member in members" :key="member.id" :label="member.username" :value="member.id" />
            </el-select>
          </el-form-item>
        </template>

        <el-form-item v-if="showTeamPicker" label="参考小组">
          <el-select
            v-model="form.referenceTeamIds"
            multiple
            placeholder="选择小组"
            style="width: 100%"
            :disabled="readonly"
          >
            <el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id" />
          </el-select>
        </el-form-item>

        <SubmissionStatusCollapse
          v-if="displayedSubmissionStatus"
          :status-data="displayedSubmissionStatus"
          class="source-config-submission"
        />
      </el-form>

      <div v-if="!readonly" class="source-config-actions" :class="{ 'source-config-actions--pending': dirty }">
        <p v-if="dirty" class="source-config-actions__hint">已修改素材范围，应用后左侧参考素材与提交情况会同步刷新。</p>
        <el-button
          type="primary"
          size="default"
          :loading="saving"
          :disabled="!dirty"
          class="source-config-actions__btn"
          @click="applyConfig"
        >
          应用设置
        </el-button>
      </div>
      <p v-else-if="!loading" class="source-config-actions__readonly-hint">已锁定，素材设置不可修改。</p>
    </template>
  </el-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import v1Client from '../api/v1/client'
import { sourceTypeLabel } from '../utils/reportLabels'
import SubmissionStatusCollapse from './SubmissionStatusCollapse.vue'

const props = defineProps({
  reportId: { type: [Number, String], default: null },
  reportType: { type: String, required: true },
  scope: { type: String, default: 'personal' },
  /** 小组报告编辑页传入，用于加载本小组成员 */
  teamId: { type: [Number, String], default: null },
  modelValue: { type: Object, default: () => ({}) },
  readonly: { type: Boolean, default: false },
  mode: { type: String, default: 'edit' },
  /** 成员/小组提交情况（与部门报告一致，展示在素材设置内） */
  submissionStatus: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'applied', 'preview'])

const loading = ref(true)
const saving = ref(false)
const defaultTypes = ref([])
const teamAllowedTypes = ref([])
const memberAllowedTypes = ref([])
const teams = ref([])
const members = ref([])
const form = ref(emptyForm())
const baseline = ref('')

const isDepartmentScope = computed(() => props.scope === 'department')
const isTeamScope = computed(() => props.scope === 'team')
const showMemberPicker = computed(() => {
  if (isTeamScope.value) return true
  if (isDepartmentScope.value) return form.value.scopeMode === 'member'
  return false
})
const showTeamPicker = computed(() => isDepartmentScope.value && form.value.scopeMode === 'team')

const visibleSourceOptions = computed(() => {
  let types = defaultTypes.value
  if (isDepartmentScope.value) {
    types = form.value.scopeMode === 'team' ? teamAllowedTypes.value : memberAllowedTypes.value
  } else if (isTeamScope.value && memberAllowedTypes.value.length) {
    types = memberAllowedTypes.value
  }
  return types.map((value) => ({
    value,
    label: sourceTypeLabel(value),
    isDefault: defaultTypes.value.includes(value)
  }))
})

const dirty = computed(() => JSON.stringify(form.value) !== baseline.value)

const selectedSourceType = computed({
  get() {
    return form.value.sourceTypes[0] || visibleSourceOptions.value[0]?.value || ''
  },
  set(value) {
    form.value.sourceTypes = value ? [value] : []
  }
})

const memberScopeLabel = computed(() => (isTeamScope.value ? '小组成员范围' : '成员范围'))
const allMembersLabel = computed(() => (isTeamScope.value ? '本小组全部成员' : '全部成员'))
const pickMembersLabel = computed(() => (isTeamScope.value ? '指定本小组成员' : '指定成员'))

const displayedSubmissionStatus = computed(() => {
  const data = props.submissionStatus
  if (!data) return null

  if (isTeamScope.value && showMemberPicker.value) {
    if (form.value.includeAllMembers) return { ...data, rows: data.rows || [] }
    if (!form.value.referenceUserIds.length) return { ...data, rows: [] }
    const selected = new Set(form.value.referenceUserIds.map(Number))
    const rows = (data.rows || []).filter((row) => selected.has(Number(row.userId)))
    return { ...data, rows }
  }

  if (isDepartmentScope.value && form.value.scopeMode === 'member' && showMemberPicker.value) {
    if (form.value.includeAllMembers) return { ...data, rows: data.rows || [] }
    if (!form.value.referenceUserIds.length) return { ...data, rows: [] }
    const selected = new Set(form.value.referenceUserIds.map(Number))
    const rows = (data.rows || []).filter((row) => selected.has(Number(row.userId)))
    return { ...data, rows }
  }

  if (isDepartmentScope.value && form.value.scopeMode === 'team') {
    if (!form.value.referenceTeamIds.length) return { ...data, rows: data.rows || [] }
    const selected = new Set(form.value.referenceTeamIds.map(Number))
    const rows = data.rows.filter((row) => selected.has(Number(row.teamId)))
    return { ...data, rows }
  }

  return null
})

function emptyForm() {
  return {
    scopeMode: 'team',
    sourceTypes: [],
    referenceUserIds: [],
    referenceTeamIds: [],
    includeAllMembers: true
  }
}

function syncFromModel() {
  const val = props.modelValue || {}
  form.value = {
    scopeMode: val.scopeMode || 'team',
    sourceTypes: [...(val.sourceTypes || [])],
    referenceUserIds: (val.referenceUserIds || []).map(Number).filter((id) => !Number.isNaN(id)),
    referenceTeamIds: (val.referenceTeamIds || []).map(Number).filter((id) => !Number.isNaN(id)),
    includeAllMembers: val.includeAllMembers !== false
  }
  baseline.value = JSON.stringify(form.value)
}

async function loadPickerOptions({ defaultTeamSelection = false } = {}) {
  const needTeams = isDepartmentScope.value && form.value.scopeMode === 'team'
  if (needTeams) {
    const teamsRes = await v1Client.get('/teams')
    teams.value = teamsRes.data || []
    if (defaultTeamSelection && !form.value.referenceTeamIds.length && teams.value.length) {
      form.value.referenceTeamIds = teams.value.map((t) => t.id)
    }
  } else if (!isDepartmentScope.value) {
    teams.value = []
  }

  if (showMemberPicker.value) {
    if (isTeamScope.value && props.teamId) {
      const { data: team } = await v1Client.get(`/teams/${props.teamId}`)
      members.value = team.members || []
    } else if (isDepartmentScope.value && form.value.scopeMode === 'member') {
      const membersRes = await v1Client.get('/teams/members')
      members.value = membersRes.data || []
    } else {
      members.value = []
    }
  } else {
    members.value = []
  }
}

function onScopeModeChange(mode) {
  form.value.referenceUserIds = []
  form.value.referenceTeamIds = []
  form.value.includeAllMembers = true
  if (mode === 'team') {
    form.value.sourceTypes = teamAllowedTypes.value.length
      ? [teamAllowedTypes.value.find((t) => defaultTypes.value.includes(t)) || teamAllowedTypes.value[0]]
      : [...defaultTypes.value]
  } else {
    form.value.sourceTypes = memberAllowedTypes.value.length
      ? [memberAllowedTypes.value.find((t) => defaultTypes.value.includes(t)) || memberAllowedTypes.value[0]]
      : [...defaultTypes.value]
  }
  loadPickerOptions({ defaultTeamSelection: mode === 'team' }).catch(() => {})
}

watch(
  () => props.modelValue,
  () => syncFromModel(),
  { deep: true, immediate: true }
)

async function loadSourceOptions() {
  loading.value = true
  try {
    syncFromModel()
    const { data } = await v1Client.get('/period-reports/source-options', {
      params: { reportType: props.reportType }
    })
    defaultTypes.value = data.defaultSourceTypes
    teamAllowedTypes.value = data.teamSourceTypes || []
    memberAllowedTypes.value = data.memberSourceTypes || []
    if (!form.value.sourceTypes.length) {
      form.value.sourceTypes = [...data.defaultSourceTypes]
    }
    if (isDepartmentScope.value && !props.modelValue?.scopeMode) {
      form.value.scopeMode = data.defaultScopeMode || 'team'
    }
    const hasSavedTeams = (props.modelValue?.referenceTeamIds || []).length > 0
    await loadPickerOptions({
      defaultTeamSelection: isDepartmentScope.value && form.value.scopeMode === 'team' && !hasSavedTeams
    })
    baseline.value = JSON.stringify(form.value)
    emit('update:modelValue', buildPayload())
    schedulePreview()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '加载素材选项失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.reportType, props.scope, props.teamId],
  () => {
    loadSourceOptions()
  },
  { immediate: true }
)

let previewTimer = null
function schedulePreview() {
  if (props.mode === 'create' || !props.reportId || props.readonly) return
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    if (form.value.sourceTypes.length) {
      emit('preview', buildPayload())
    }
  }, 280)
}

watch(
  () =>
    JSON.stringify({
      sourceTypes: form.value.sourceTypes,
      includeAllMembers: form.value.includeAllMembers,
      referenceUserIds: form.value.referenceUserIds,
      referenceTeamIds: form.value.referenceTeamIds,
      scopeMode: form.value.scopeMode
    }),
  () => schedulePreview()
)

function buildPayload() {
  const payload = {
    sourceTypes: form.value.sourceTypes,
    referenceUserIds: [],
    referenceTeamIds: [],
    includeAllMembers: form.value.includeAllMembers
  }
  if (isDepartmentScope.value) {
    payload.scopeMode = form.value.scopeMode
    if (form.value.scopeMode === 'team') {
      payload.referenceTeamIds = form.value.referenceTeamIds
    } else {
      payload.referenceUserIds = form.value.includeAllMembers ? [] : form.value.referenceUserIds
    }
  } else if (props.scope === 'team') {
    payload.referenceUserIds = form.value.includeAllMembers ? [] : form.value.referenceUserIds
  }
  return payload
}

async function applyConfig() {
  if (!form.value.sourceTypes.length) {
    ElMessage.warning('请至少选择一种参考素材')
    return
  }
  if (showTeamPicker.value && !form.value.referenceTeamIds.length) {
    ElMessage.warning('请至少选择一个小组')
    return
  }
  if (showMemberPicker.value && !form.value.includeAllMembers && !form.value.referenceUserIds.length) {
    ElMessage.warning('请至少选择一名成员')
    return
  }

  const payload = buildPayload()
  if (props.mode === 'create') {
    emit('update:modelValue', payload)
    baseline.value = JSON.stringify(form.value)
    emit('applied', { sourceConfig: payload, mode: 'create' })
    return
  }

  if (!props.reportId) return

  saving.value = true
  try {
    const { data } = await v1Client.put(`/period-reports/${props.reportId}/source-config`, {
      sourceConfig: payload
    })
    baseline.value = JSON.stringify(form.value)
    emit('update:modelValue', data.report.source_config)
    emit('applied', data)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '更新素材设置失败')
  } finally {
    saving.value = false
  }
}

defineExpose({ buildPayload, applyConfig, dirty })
</script>

<style scoped>
.source-config-panel {
  margin-bottom: 16px;
}

.source-config-actions {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.source-config-actions--pending {
  padding: 12px 14px;
  margin-top: 12px;
  border-top: none;
  border-radius: var(--el-border-radius-base);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
}

.source-config-actions__hint {
  margin: 0;
  flex: 1;
  min-width: 200px;
  font-size: 13px;
  color: var(--el-color-primary);
  line-height: 1.5;
}

.source-config-actions__btn {
  min-width: 120px;
  font-weight: 600;
}

.source-config-actions__readonly-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.team-source-hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.source-config-submission {
  margin: 8px 0 4px;
}

.source-config-submission :deep(.submission-status-collapse) {
  margin-bottom: 0;
}
</style>
