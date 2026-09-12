<template>
  <el-dialog v-model="visible" :title="dialogTitle" width="560px" @closed="reset">
    <ReportSourceConfigPanel
      v-if="visible"
      mode="create"
      :report-type="reportType"
      :scope="scope"
      v-model="sourceConfig"
    />

    <el-form-item v-if="showTeamPicker" label="选择小组" label-width="100px" style="margin-top: 12px">
      <el-select v-model="selectedTeamId" placeholder="请选择小组" style="width: 100%">
        <el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id" />
      </el-select>
    </el-form-item>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="confirm">创建报告</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import v1Client from '../api/v1/client'
import ReportSourceConfigPanel from './ReportSourceConfigPanel.vue'
import { reportTypeLabel } from '../utils/reportLabels'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  reportType: { type: String, required: true },
  scope: { type: String, default: 'personal' }
})

const emit = defineEmits(['update:modelValue', 'created'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const submitting = ref(false)
const sourceConfig = ref({})
const selectedTeamId = ref(null)
const teams = ref([])

const showTeamPicker = computed(() => props.scope === 'team' || props.reportType.startsWith('TEAM_'))
const dialogTitle = computed(() => `新建${reportTypeLabel(props.reportType)}`)

watch(
  () => [props.modelValue, props.reportType],
  async ([open]) => {
    if (!open) return
    sourceConfig.value = {}
    if (showTeamPicker.value) {
      const { data } = await v1Client.get('/teams')
      teams.value = data
      selectedTeamId.value = data[0]?.id || null
    }
  },
  { immediate: true }
)

function reset() {
  submitting.value = false
}

async function confirm() {
  if (!sourceConfig.value.sourceTypes?.length) {
    ElMessage.warning('请至少选择一种参考素材')
    return
  }
  if (showTeamPicker.value && !selectedTeamId.value) {
    ElMessage.warning('请选择小组')
    return
  }

  submitting.value = true
  try {
    const payload = {
      reportType: props.reportType,
      sourceConfig: sourceConfig.value
    }
    if (showTeamPicker.value) {
      payload.teamId = selectedTeamId.value
    }

    const { data } = await v1Client.post('/period-reports', payload)
    emit('created', data)
    visible.value = false
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>
