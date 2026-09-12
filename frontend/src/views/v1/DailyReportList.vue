<template>
  <div class="daily-list">
    <div class="toolbar">
      <h3>我的日报</h3>
      <el-space>
        <el-button @click="loadReports">刷新</el-button>
        <el-button type="primary" @click="openDateDialog">写今日日报</el-button>
      </el-space>
    </div>

    <ReportListFilters
      :from="filters.from"
      :to="filters.to"
      :status="filters.status"
      :keyword="filters.q"
      @search="onSearch"
      @reset="onReset"
    />

    <el-dialog v-model="dateDialogVisible" title="选择日报日期" width="400px">
      <p class="date-hint">默认今天，也可选择其他日期补填</p>
      <el-date-picker
        v-model="selectedDate"
        type="date"
        placeholder="选择日期"
        value-format="YYYY-MM-DD"
        :disabled-date="disableFutureDate"
        style="width: 100%"
      />
      <template #footer>
        <el-button @click="dateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDate">确定</el-button>
      </template>
    </el-dialog>

    <el-skeleton v-if="loading" :rows="5" animated />

    <el-alert v-else-if="error" type="error" :title="error" show-icon />

    <el-empty v-else-if="reports.length === 0" description="暂无日报，点击上方按钮填写（默认今天，也可补填其他日期）" />

    <el-table v-else :data="reports" stripe>
      <el-table-column prop="report_date" label="日期" width="140" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'SUBMITTED' ? 'success' : 'info'">
            {{ row.status === 'SUBMITTED' ? '已提交' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="今日工作">
        <template #default="{ row }">
          {{ preview(row.content_json?.completed) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openReport(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <ReportListPagination
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="total"
      @change="loadReports"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import v1Client from '../../api/v1/client'
import ReportListFilters from '../../components/ReportListFilters.vue'
import ReportListPagination from '../../components/ReportListPagination.vue'
import { DEFAULT_PAGE_SIZE, parseListResponse } from '../../utils/listPage'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const reports = ref([])
const dateDialogVisible = ref(false)
const selectedDate = ref('')
const filters = ref({ from: '', to: '', status: '', q: '' })
const page = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const total = ref(0)

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function preview(text) {
  if (!text) return '—'
  return text.length > 40 ? `${text.slice(0, 40)}...` : text
}

function buildParams() {
  const p = {}
  if (filters.value.from) p.from = filters.value.from
  if (filters.value.to) p.to = filters.value.to
  if (filters.value.status) p.status = filters.value.status
  if (filters.value.q) p.q = filters.value.q
  return p
}

async function loadReports() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await v1Client.get('/daily-reports', {
      params: { ...buildParams(), page: page.value, pageSize: pageSize.value }
    })
    const parsed = parseListResponse(data)
    reports.value = parsed.items
    total.value = parsed.total
    page.value = parsed.page
    pageSize.value = parsed.pageSize
  } catch (err) {
    error.value = err.response?.data?.message || '加载日报列表失败'
  } finally {
    loading.value = false
  }
}

function onSearch(payload) {
  filters.value = { ...payload }
  page.value = 1
  loadReports()
}

function onReset() {
  filters.value = { from: '', to: '', status: '', q: '' }
  page.value = 1
  loadReports()
}

function openReport(row) {
  router.push(`/app/daily/${row.report_date}`)
}

function disableFutureDate(date) {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date.getTime() > today.getTime()
}

function openDateDialog() {
  selectedDate.value = todayString()
  dateDialogVisible.value = true
}

function confirmDate() {
  if (!selectedDate.value) {
    ElMessage.warning('请选择日期')
    return
  }
  dateDialogVisible.value = false
  goToReport(selectedDate.value)
}

function goToReport(date) {
  const existing = reports.value.find((item) => item.report_date === date)
  if (existing) {
    router.push(`/app/daily/${date}`)
    return
  }
  router.push(`/app/daily/${date}?new=1`)
}

onMounted(loadReports)
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.toolbar h3 {
  margin: 0;
}

.date-hint {
  margin: 0 0 12px;
  color: #909399;
  font-size: 14px;
}
</style>
