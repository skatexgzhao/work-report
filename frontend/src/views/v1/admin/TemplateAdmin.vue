<template>
  <div>
    <div class="toolbar">
      <h3>报告模板管理</h3>
      <p class="page-hint">用于配置日报、周报等表单字段和智能生成规则。</p>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-alert v-else-if="error" type="error" :title="error" show-icon />

    <el-table v-else :data="templates" stripe @row-click="selectTemplate">
      <el-table-column prop="name" label="模板名称" />
      <el-table-column label="适用类型" width="180">
        <template #default="{ row }">{{ reportTypeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ row.status === 'ACTIVE' ? '使用中' : '已停用' }}</template>
      </el-table-column>
      <el-table-column prop="current_version" label="当前版本" width="100" />
    </el-table>

    <el-drawer v-model="drawerVisible" :title="selected?.name || '模板详情'" size="50%">
      <template v-if="selected">
        <el-form label-position="top" class="report-form-textarea report-form-top-label">
          <el-form-item label="输出报告样例（Markdown，用于推导 JSON 结构）">
            <el-input
              v-model="editForm.sampleMarkdown"
              type="textarea"
              :autosize="{ minRows: 10, maxRows: 32 }"
              class="report-form-textarea--large"
              placeholder="粘贴期望的报告样例，点击「从样例推导 schema」"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="warning" :loading="deriving" @click="deriveFromSample">从样例推导 schema</el-button>
          </el-form-item>
          <el-alert v-if="variableHints.length" type="info" :closable="false" style="margin-bottom: 12px">
            <template #title>可用变量</template>
            <ul class="var-hints">
              <li v-for="(v, i) in variableHints" :key="i">
                <code>{{ formatVar(v.name) }}</code> — {{ v.description }}
              </li>
            </ul>
          </el-alert>
          <el-form-item label="智能生成说明（给系统看的写作要求）">
            <el-input
              v-model="editForm.promptTemplate"
              type="textarea"
              :autosize="{ minRows: 8, maxRows: 32 }"
              class="report-form-textarea--large"
            />
          </el-form-item>
          <el-form-item label="输出格式要求（JSON 结构）">
            <el-input
              v-model="editForm.outputSchemaText"
              type="textarea"
              :autosize="{ minRows: 10, maxRows: 32 }"
              class="report-form-textarea--large"
            />
          </el-form-item>
          <el-form-item label="表单字段配置（JSON 结构）">
            <el-input
              v-model="editForm.formSchemaText"
              type="textarea"
              :autosize="{ minRows: 8, maxRows: 32 }"
              class="report-form-textarea--medium"
            />
          </el-form-item>
          <el-button type="primary" :loading="saving" @click="saveVersion">保存为新版本</el-button>
        </el-form>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import v1Client from '../../../api/v1/client'
import { reportTypeLabel } from '../../../utils/reportLabels'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const templates = ref([])
const selected = ref(null)
const drawerVisible = ref(false)
const deriving = ref(false)
const variableHints = ref([])
const editForm = ref({
  sampleMarkdown: '',
  promptTemplate: '',
  outputSchemaText: '{}',
  formSchemaText: '{}'
})

function formatVar(name) {
  return `{{${name}}}`
}

async function loadTemplates() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await v1Client.get('/templates')
    templates.value = data
  } catch (err) {
    error.value = err.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function selectTemplate(row) {
  try {
    const { data } = await v1Client.get(`/templates/${row.id}`)
    selected.value = data
    const current = data.versions?.[0]
    editForm.value = {
      sampleMarkdown: '',
      promptTemplate: current?.prompt_template || '',
      outputSchemaText: JSON.stringify(current?.output_schema || {}, null, 2),
      formSchemaText: JSON.stringify(current?.form_schema || {}, null, 2)
    }
    variableHints.value = []
    drawerVisible.value = true
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '加载模板详情失败')
  }
}

async function deriveFromSample() {
  if (!editForm.value.sampleMarkdown?.trim()) {
    ElMessage.warning('请先粘贴输出报告样例')
    return
  }
  deriving.value = true
  try {
    const { data } = await v1Client.post('/templates/derive-from-sample', {
      sampleMarkdown: editForm.value.sampleMarkdown,
      reportType: selected.value?.type
    })
    editForm.value.outputSchemaText = JSON.stringify(data.outputSchema || {}, null, 2)
    if (data.promptAppendix) {
      editForm.value.promptTemplate = `${editForm.value.promptTemplate}\n\n${data.promptAppendix}`.trim()
    }
    variableHints.value = data.variableHints || []
    ElMessage.success('已从样例推导 output_schema，请核对后保存')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '推导失败，请检查 AI 配置')
  } finally {
    deriving.value = false
  }
}

async function saveVersion() {
  saving.value = true
  try {
    const outputSchema = JSON.parse(editForm.value.outputSchemaText)
    const formSchema = JSON.parse(editForm.value.formSchemaText)
    await v1Client.post(`/templates/${selected.value.id}/versions`, {
      promptTemplate: editForm.value.promptTemplate,
      outputSchema,
      formSchema
    })
    ElMessage.success('新版本已保存')
    drawerVisible.value = false
    await loadTemplates()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadTemplates)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
}

.toolbar h3 {
  margin: 0 0 8px;
}

.page-hint {
  margin: 0;
  color: #909399;
  font-size: 13px;
}

.var-hints {
  margin: 8px 0 0;
  padding-left: 1.2em;
  font-size: 13px;
}
</style>
