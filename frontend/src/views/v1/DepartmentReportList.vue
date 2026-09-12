<template>
  <div>
    <div class="toolbar">
      <h3>部门周期报告</h3>
      <el-space wrap>
        <el-select v-model="createReportType" style="width: 140px">
          <el-option v-for="opt in createTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button @click="loadReports">刷新</el-button>
        <el-button type="primary" @click="openCreate">创建部门报告</el-button>
      </el-space>
    </div>

    <ReportListFilters
      show-period-grain
      :period-grain="periodFilter"
      :from="filters.from"
      :to="filters.to"
      :status="filters.status"
      :keyword="filters.q"
      @search="onSearch"
      @reset="onReset"
    />

    <el-skeleton v-if="loading" :rows="5" animated />
    <el-alert v-else-if="error" type="error" :title="error" show-icon />
    <el-empty v-else-if="reports.length === 0" description="暂无部门报告" />
    <el-table v-else :data="reports" stripe>
      <el-table-column label="报告类型" width="120">
        <template #default="{ row }">{{ reportTypeLabel(row.report_type) }}</template>
      </el-table-column>
      <el-table-column label="时间范围" min-width="180">
        <template #default="{ row }">{{ row.start_date }} 至 {{ row.end_date }}</template>
      </el-table-column>
      <el-table-column label="报告生成者" width="120" prop="created_by_username" show-overflow-tooltip />
      <el-table-column label="最后编辑时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.last_edited_at) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
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

    <PeriodReportCreateDialog
      v-model="createVisible"
      :report-type="createReportType"
      scope="department"
      @created="onCreated"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import v1Client from '../../api/v1/client'
import PeriodReportCreateDialog from '../../components/PeriodReportCreateDialog.vue'
import ReportListFilters from '../../components/ReportListFilters.vue'
import ReportListPagination from '../../components/ReportListPagination.vue'
import { DEFAULT_PAGE_SIZE, parseListResponse } from '../../utils/listPage'
import { reportTypeLabel, statusLabel } from '../../utils/reportLabels'
import { formatDateTime } from '../../utils/formatDateTime'
import {
  createTypeOptions as grainCreateOptions,
  listReportTypeForGrain,
  defaultCreateTypeForGrain
} from '../../utils/periodListFilter'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const reports = ref([])
const periodFilter = ref('ALL')
const createReportType = ref('DEPARTMENT_WEEKLY')
const createVisible = ref(false)
const filters = ref({ from: '', to: '', status: '', q: '' })
const page = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const total = ref(0)

const createTypeOptions = computed(() => grainCreateOptions('department'))

function statusTagType(status) {
  if (status === 'SUBMITTED') return 'success'
  if (status === 'REVISING') return 'warning'
  return 'info'
}

async function loadReports() {
  loading.value = true
  error.value = ''
  try {
    const params = { scope: 'department' }
    const rt = listReportTypeForGrain('department', periodFilter.value)
    if (rt) params.reportType = rt
    if (filters.value.from) params.from = filters.value.from
    if (filters.value.to) params.to = filters.value.to
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.q) params.q = filters.value.q
    params.page = page.value
    params.pageSize = pageSize.value
    const { data } = await v1Client.get('/period-reports', { params })
    const parsed = parseListResponse(data)
    reports.value = parsed.items
    total.value = parsed.total
    page.value = parsed.page
    pageSize.value = parsed.pageSize
  } catch (err) {
    error.value = err.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  if (createReportType.value === 'DEPARTMENT_WEEKLY') {
    createWeekly()
    return
  }
  createVisible.value = true
}

async function createWeekly() {
  try {
    const { data } = await v1Client.post('/period-reports', { reportType: createReportType.value })
    ElMessage.success('创建成功')
    router.push(`/app/department/${data.id}`)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '创建失败')
  }
}

function onCreated(report) {
  ElMessage.success('创建成功')
  router.push(`/app/department/${report.id}`)
}

function openReport(row) {
  router.push(`/app/department/${row.id}`)
}

function applyPeriodGrain(grain) {
  if (!grain) return
  periodFilter.value = grain
  createReportType.value = defaultCreateTypeForGrain('department', grain)
}

function onSearch(payload) {
  filters.value = { from: payload.from, to: payload.to, status: payload.status, q: payload.q }
  if (payload.periodGrain) applyPeriodGrain(payload.periodGrain)
  page.value = 1
  loadReports()
}

function onReset() {
  filters.value = { from: '', to: '', status: '', q: '' }
  applyPeriodGrain('ALL')
  page.value = 1
  loadReports()
}

onMounted(loadReports)
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.toolbar h3 {
  margin: 0;
  flex-shrink: 0;
}
</style>
