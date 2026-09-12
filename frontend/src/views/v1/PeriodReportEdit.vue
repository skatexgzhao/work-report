<template>
  <div class="period-edit">
    <div class="toolbar">
      <el-button @click="goBack">返回列表</el-button>
      <h3>{{ reportTitle }}</h3>
      <el-tag v-if="teamName" type="info">{{ teamName }}</el-tag>
      <el-tag v-if="report" :type="statusTagType">{{ statusLabel(report.status) }}</el-tag>
      <el-button @click="refreshPage">刷新</el-button>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated />
    <el-alert v-else-if="error" type="error" :title="error" show-icon />

    <template v-else>
      <ReportStatusBanner :report="report" :revising="revising" @revise="startRevise" />

      <ReportSourceConfigPanel
        v-if="report"
        :report-id="report.id"
        :report-type="report.report_type"
        :scope="reportScope"
        :team-id="report.team_id"
        v-model="sourceConfig"
        :readonly="isLocked"
        :submission-status="submissionStatus"
        @applied="onSourceConfigApplied"
        @preview="onSourceConfigPreview"
      />

      <PeriodReportGenerationFocus
        v-if="report && !isLocked"
        ref="generationFocusRef"
        v-model="generationFocus"
        :report-id="report.id"
        :report-scope="reportScope"
        variant="compact"
        style="margin-bottom: 16px"
      />

      <div v-if="!isLocked" class="period-layout">
        <DailyReportPrinciples
          class="principles-mobile"
          variant="strip"
          :headline="periodPrinciplesHeadline"
          :principles="periodPrinciples"
        />
        <div class="period-main">
          <el-row :gutter="16">
            <el-col :span="10">
              <ReportSourcePanel
                :source-data="sourceData"
                :loading="sourceLoading"
                :error="sourceError"
                :is-department="isDepartmentScope"
              />
            </el-col>
            <el-col :span="14">
              <PeriodReportEditorHost
                :key="editorInstanceKey"
                ref="periodEditorRef"
                v-model="content"
                :content-format="report?.content_format"
                :readonly="isLocked"
              />
            </el-col>
          </el-row>
        </div>
        <DailyReportPrinciples
          class="principles-desktop"
          variant="panel"
          :headline="periodPrinciplesHeadline"
          :principles="periodPrinciples"
        />
      </div>

      <template v-else>
        <el-row :gutter="16">
          <el-col :span="10">
            <ReportSourcePanel :source-data="sourceData" :loading="sourceLoading" :error="sourceError" />
          </el-col>
          <el-col :span="14">
            <PeriodReportEditorHost
              :key="editorInstanceKey"
              v-model="content"
              :content-format="report?.content_format"
              :readonly="true"
            />
          </el-col>
        </el-row>
      </template>

      <div class="actions">
        <p v-if="!isLocked" class="actions-hint">关注方向在上方「生成前准备」中填写（选填）</p>
        <div class="actions-buttons">
          <AIGenerateButton :loading="generating" :disabled="isLocked" @generate="generateAi" />
          <el-button type="primary" :loading="saving" :disabled="isLocked" @click="saveDraft">保存草稿</el-button>
          <el-button type="success" :loading="submitting" :disabled="isLocked" @click="submitReport">提交报告</el-button>
        </div>
      </div>

      <el-card v-if="report?.versions?.length" style="margin-top: 16px">
        <template #header>修改记录</template>
        <el-timeline>
          <el-timeline-item v-for="version in report.versions" :key="version.id" :timestamp="version.created_at">
            第 {{ version.version }} 版 · {{ versionTypeLabel(version.version_type) }}
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import v1Client from '../../api/v1/client'
import ReportSourcePanel from '../../components/ReportSourcePanel.vue'
import PeriodReportEditorHost from '../../components/PeriodReportEditorHost.vue'
import { parsePeriodContent } from '../../utils/parsePeriodContent'
import { persistPeriodDraft } from '../../utils/persistPeriodDraft'
import PeriodReportGenerationFocus from '../../components/PeriodReportGenerationFocus.vue'
import DailyReportPrinciples from '../../components/DailyReportPrinciples.vue'
import { PERIOD_PRINCIPLES_HEADLINE, periodPrinciplesForScope } from '../../utils/periodWritingGuide'
import AIGenerateButton from '../../components/AIGenerateButton.vue'
import ReportStatusBanner from '../../components/ReportStatusBanner.vue'
import ReportSourceConfigPanel from '../../components/ReportSourceConfigPanel.vue'
import { reportTypeLabel, statusLabel, versionTypeLabel } from '../../utils/reportLabels'
import { notifyPeriodSave, notifyPeriodSubmit, notifySourceConfigUpdate } from '../../utils/actionFeedback'
import { sourceConfigPreviewParams } from '../../utils/sourceConfigPreview'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const sourceLoading = ref(true)
const saving = ref(false)
const submitting = ref(false)
const generating = ref(false)
const revising = ref(false)
const error = ref('')
const sourceError = ref('')
const report = ref(null)
const sourceData = ref(null)
const sourceConfig = ref({})
const content = ref({})
const generationFocus = ref('')
const generationFocusRef = ref(null)
const periodEditorRef = ref(null)
const submissionStatus = ref(null)
const teamName = ref('')

const periodPrinciplesHeadline = PERIOD_PRINCIPLES_HEADLINE
const periodPrinciples = computed(() => periodPrinciplesForScope(reportScope.value))

const editorInstanceKey = computed(
  () => `${report.value?.id ?? 'new'}-${report.value?.current_version_id ?? 'none'}`
)

const isLocked = computed(() => report.value?.status === 'SUBMITTED')
const isDepartmentScope = computed(() => report.value?.report_type?.startsWith('DEPARTMENT_'))
const isTeamScope = computed(() => !!report.value?.team_id)
const showSubmissionStatus = computed(() => isTeamScope.value || isDepartmentScope.value)

const reportScope = computed(() => {
  if (isDepartmentScope.value) return 'department'
  if (isTeamScope.value) return 'team'
  return 'personal'
})

const statusTagType = computed(() => {
  if (report.value?.status === 'SUBMITTED') return 'success'
  if (report.value?.status === 'REVISING') return 'warning'
  return 'info'
})

const reportTitle = computed(() => {
  if (!report.value) return '周期报告'
  return `${reportTypeLabel(report.value.report_type)}（${report.value.start_date} 至 ${report.value.end_date}）`
})

function goBack() {
  if (isTeamScope.value) {
    router.push('/app/team')
    return
  }
  if (isDepartmentScope.value) {
    router.push('/app/department')
    return
  }
  router.push('/app/period')
}

async function loadReport() {
  const { data } = await v1Client.get(`/period-reports/${route.params.id}`)
  report.value = data
  sourceConfig.value = { ...(data.source_config || {}) }
  generationFocus.value = data.generation_focus || ''
  content.value = parsePeriodContent(data.currentVersion?.content_json)
  teamName.value = ''
  if (data.team_id) {
    try {
      const teamRes = await v1Client.get(`/teams/${data.team_id}`)
      teamName.value = teamRes.data.name || ''
    } catch {
      teamName.value = ''
    }
  }
}

async function loadSubmissionStatus(previewPayload = null) {
  if (!showSubmissionStatus.value) {
    submissionStatus.value = null
    return
  }
  const params = previewPayload ? sourceConfigPreviewParams(previewPayload) : {}
  const { data } = await v1Client.get(`/period-reports/${route.params.id}/member-status`, { params })
  submissionStatus.value = data
}

async function refreshPage() {
  await Promise.all([loadReport(), loadSource(), loadSubmissionStatus()])
  ElMessage.success('已刷新')
}

async function loadSource(previewPayload = null) {
  sourceLoading.value = true
  sourceError.value = ''
  try {
    const params = previewPayload ? sourceConfigPreviewParams(previewPayload) : {}
    const { data } = await v1Client.get(`/period-reports/${route.params.id}/source-data`, { params })
    sourceData.value = data
  } catch (err) {
    sourceError.value = err.response?.data?.message || '加载参考素材失败'
  } finally {
    sourceLoading.value = false
  }
}

function onSourceConfigPreview(payload) {
  loadSource(payload)
  loadSubmissionStatus(payload)
}

function onSourceConfigApplied(result) {
  if (result.sourceData) {
    sourceData.value = result.sourceData
  } else {
    loadSource()
  }
  if (result.report) {
    report.value = result.report
    sourceConfig.value = { ...(result.report.source_config || {}) }
  }
  loadSubmissionStatus()
  notifySourceConfigUpdate(result)
}

async function startRevise() {
  await ElMessageBox.confirm('发起修改后会基于当前版本创建新草稿，确定吗？', '发起修改', { type: 'warning' })
  revising.value = true
  try {
    const { data } = await v1Client.post(`/period-reports/${route.params.id}/revise`)
    report.value = data.report
    sourceConfig.value = { ...(data.report.source_config || {}) }
    content.value = parsePeriodContent(data.report.currentVersion?.content_json)
    ElMessage.success(`已进入修改模式（第 ${data.version.version} 版）`)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '发起修改失败')
  } finally {
    revising.value = false
  }
}

async function saveDraft() {
  saving.value = true
  try {
    const result = await persistPeriodDraft(
      route.params.id,
      periodEditorRef,
      content,
      report
    )
    if (!result.ok) {
      const fn = result.code === 'EMPTY' ? ElMessage.warning : ElMessage.error
      fn(result.message)
      return
    }
    notifyPeriodSave(result.data)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function generateAi() {
  if (generationFocusRef.value) {
    const ok = await generationFocusRef.value.saveFocusIfNeeded({ silent: true })
    if (!ok) return
  }
  generating.value = true
  try {
    const { data } = await v1Client.post(`/period-reports/${route.params.id}/generate`)
    report.value = data.report
    content.value = parsePeriodContent(
      data.version?.content_json || data.report?.currentVersion?.content_json
    )
    await nextTick()
    ElMessage.success('已根据素材自动生成内容，请核对后再提交')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '智能生成失败，请检查 AI 配置或稍后重试')
  } finally {
    generating.value = false
  }
}

async function submitReport() {
  await ElMessageBox.confirm('提交后将锁定内容，如需修改可发起「修改」流程。确定提交吗？', '提交报告', { type: 'warning' })
  submitting.value = true
  try {
    const result = await persistPeriodDraft(
      route.params.id,
      periodEditorRef,
      content,
      report
    )
    if (!result.ok) {
      const fn = result.code === 'EMPTY' ? ElMessage.warning : ElMessage.error
      fn(result.message)
      return
    }
    const { data } = await v1Client.post(`/period-reports/${route.params.id}/submit`)
    report.value = data.report
    notifyPeriodSubmit(data)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    await loadReport()
    const preview = { ...(report.value?.source_config || {}) }
    await Promise.all([loadSource(preview), loadSubmissionStatus(preview)])
  } catch (err) {
    error.value = err.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar h3 {
  margin: 0;
  flex: 1;
  font-size: 16px;
}

.actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.actions-hint {
  margin: 0;
  flex: 1 1 100%;
  min-width: 200px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.actions-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;
}

.period-layout {
  display: flex;
  flex-direction: column;
}

.period-main {
  min-width: 0;
  width: 100%;
}

.period-main :deep(.el-row) {
  width: 100%;
}

.period-main :deep(.el-col) {
  min-width: 0;
  max-width: 100%;
}

.principles-desktop {
  display: none;
}

@media (min-width: 1200px) {
  .period-layout {
    flex-direction: row;
    align-items: flex-start;
    gap: 20px;
  }

  .principles-mobile {
    display: none;
  }

  .principles-desktop {
    display: block;
    flex: 0 0 280px;
    position: sticky;
    top: 16px;
  }

  .period-main {
    flex: 1;
  }
}
</style>
