<template>
  <div class="daily-edit">
    <div class="toolbar">
      <el-button @click="$router.push('/app/daily')">返回列表</el-button>
      <h3>{{ reportDate }} 日报</h3>
      <el-tag v-if="report" :type="statusTagType">{{ statusLabel(report.status) }}</el-tag>
      <el-button @click="refreshPage">刷新</el-button>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-alert v-else-if="error" type="error" :title="error" show-icon />

    <template v-else>
      <ReportStatusBanner
        v-if="report"
        :report="reportBanner"
        :revising="revising"
        @revise="startRevise"
      />

      <div v-if="!isLocked" class="daily-layout">
        <DailyReportPrinciples
          class="principles-mobile"
          variant="strip"
          :headline="principlesHeadline"
          :principles="principles"
        />

        <div class="daily-form-column">
          <DynamicForm
            ref="formRef"
            v-model="content"
            :form-schema="formSchema"
            :readonly="isLocked"
            :example-snippets="dailyExampleAppend"
            hint-placement="content"
            label-position="top"
            use-report-textarea-styles
          />
        </div>

        <DailyReportPrinciples
          class="principles-desktop"
          variant="panel"
          :headline="principlesHeadline"
          :principles="principles"
        />
      </div>

      <DynamicForm
        v-else
        ref="formRef"
        v-model="content"
        :form-schema="formSchema"
        :readonly="true"
        hint-placement="content"
        label-position="top"
        use-report-textarea-styles
      />

      <div class="actions">
        <el-button type="primary" :loading="saving" :disabled="isLocked" @click="saveDraft">保存草稿</el-button>
        <el-button type="success" :loading="submitting" :disabled="isLocked" @click="submitReport">提交</el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import DynamicForm from '../../components/DynamicForm.vue'
import DailyReportPrinciples from '../../components/DailyReportPrinciples.vue'
import ReportStatusBanner from '../../components/ReportStatusBanner.vue'
import v1Client from '../../api/v1/client'
import { statusLabel } from '../../utils/reportLabels'
import { notifyDailySave, notifyDailySubmit } from '../../utils/actionFeedback'
import {
  DAILY_PRINCIPLES_HEADLINE,
  DAILY_PRINCIPLES,
  DAILY_EXAMPLE_APPEND,
  enrichDailyFormSchema
} from '../../utils/dailyWritingGuide'

const principlesHeadline = DAILY_PRINCIPLES_HEADLINE
const principles = DAILY_PRINCIPLES
const dailyExampleAppend = DAILY_EXAMPLE_APPEND

const route = useRoute()
const router = useRouter()

const reportDate = computed(() => route.params.date)
const loading = ref(true)
const saving = ref(false)
const submitting = ref(false)
const revising = ref(false)
const error = ref('')
const report = ref(null)
const formSchema = ref({ fields: [] })
const content = ref({})
const formRef = ref()

const isLocked = computed(() => report.value?.status === 'SUBMITTED')
const isEditable = computed(() => !report.value || report.value.status === 'DRAFT' || report.value.status === 'REVISING')

const statusTagType = computed(() => {
  if (report.value?.status === 'SUBMITTED') return 'success'
  if (report.value?.status === 'REVISING') return 'warning'
  return 'info'
})

const reportBanner = computed(() => {
  if (!report.value) return null
  return {
    status: report.value.status,
    currentVersion: report.value.status === 'SUBMITTED' ? { version: 1, version_type: 'SUBMITTED' } : null
  }
})

async function loadTemplate() {
  const { data } = await v1Client.get('/daily-reports/template')
  formSchema.value = enrichDailyFormSchema(data.formSchema)
}

async function refreshPage() {
  loading.value = true
  error.value = ''
  try {
    await loadTemplate()
    await loadReport()
    ElMessage.success('已刷新')
  } catch (err) {
    error.value = err.response?.data?.message || '加载日报失败'
  } finally {
    loading.value = false
  }
}

async function loadReport() {
  const { data } = await v1Client.get('/daily-reports', {
    params: { from: reportDate.value, to: reportDate.value, page: 1, pageSize: 5 }
  })
  const rows = data.items ?? data
  if (rows.length > 0) {
    report.value = rows[0]
    content.value = { ...(report.value.content_json || {}) }
    return
  }

  if (route.query.new === '1') {
    report.value = null
    content.value = {}
    return
  }

  error.value = '该日期暂无日报'
}

async function reloadReportByDate() {
  const { data } = await v1Client.get('/daily-reports', {
    params: { from: reportDate.value, to: reportDate.value, page: 1, pageSize: 5 }
  })
  const rows = data.items ?? data
  if (rows.length > 0) {
    report.value = rows[0]
    content.value = { ...(report.value.content_json || {}) }
    return true
  }
  return false
}

async function startRevise() {
  await ElMessageBox.confirm('发起修改后可以重新编辑并提交，确定吗？', '发起修改', { type: 'warning' })
  revising.value = true
  try {
    const { data } = await v1Client.post(`/daily-reports/${report.value.id}/revise`)
    report.value = data
    ElMessage.success('已进入修改模式，可以重新编辑')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '发起修改失败')
  } finally {
    revising.value = false
  }
}

/** Persist current form to server (create or update). Used by save and submit. */
async function persistDailyDraft() {
  if (!isEditable.value) {
    return { ok: false, message: '当前状态不可编辑' }
  }

  const valid = await formRef.value?.validate()
  if (!valid) return { ok: false }

  try {
    if (report.value?.id) {
      const { data } = await v1Client.put(`/daily-reports/${report.value.id}`, { content: content.value })
      report.value = data
    } else {
      const { data } = await v1Client.post('/daily-reports', {
        reportDate: reportDate.value,
        content: content.value
      })
      report.value = data
      router.replace(`/app/daily/${reportDate.value}`)
    }
    return { ok: true }
  } catch (err) {
    const code = err.response?.data?.code
    if (code === 'REPORT_EXISTS') {
      const loaded = await reloadReportByDate()
      if (loaded && isEditable.value) {
        const { data } = await v1Client.put(`/daily-reports/${report.value.id}`, { content: content.value })
        report.value = data
        router.replace(`/app/daily/${reportDate.value}`)
        return { ok: true }
      }
    }
    if (code === 'REPORT_LOCKED') {
      await reloadReportByDate()
    }
    return { ok: false, message: err.response?.data?.message || '保存失败' }
  }
}

async function saveDraft() {
  saving.value = true
  try {
    const result = await persistDailyDraft()
    if (!result.ok) {
      if (result.message) {
        ElMessage.warning(result.message)
      }
      return
    }
    notifyDailySave(report.value)
  } finally {
    saving.value = false
  }
}

async function submitReport() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  await ElMessageBox.confirm(
    '提交后内容会作为周报素材使用，不必写得完美，事实准确即可。提交后如需修改可发起「修改」流程。确认提交吗？',
    '提交日报',
    { type: 'warning' }
  )

  submitting.value = true
  try {
    const saved = await persistDailyDraft()
    if (!saved.ok) {
      if (saved.message) ElMessage.error(saved.message)
      return
    }
    const { data } = await v1Client.post(`/daily-reports/${report.value.id}/submit`)
    report.value = data
    notifyDailySubmit(report.value)
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
    await loadTemplate()
    await loadReport()
  } catch (err) {
    error.value = err.response?.data?.message || '加载日报失败'
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
}

.actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
}

.daily-layout {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.daily-form-column {
  min-width: 0;
}

.principles-desktop {
  display: none;
}

@media (min-width: 1200px) {
  .daily-layout {
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

  .daily-form-column {
    flex: 1;
  }
}
</style>
