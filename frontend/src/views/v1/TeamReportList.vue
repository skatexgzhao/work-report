<template>
  <div>
    <div class="toolbar">
      <h3>小组周期报告</h3>
      <el-space wrap>
        <el-select v-model="teamId" style="width: 160px" placeholder="选择小组" @change="onTeamChange">
          <el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id" />
        </el-select>
        <el-select v-model="createReportType" style="width: 140px" placeholder="新建类型">
          <el-option v-for="opt in createTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button :disabled="!teamId" @click="loadReports">刷新</el-button>
        <el-button type="primary" :disabled="!teamId" @click="openCreate">新建小组报告</el-button>
      </el-space>
    </div>

    <ReportListFilters
      v-if="teamId"
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
    <el-empty v-else-if="!teamId" description="请先选择小组" />
    <el-empty v-else-if="reports.length === 0" description="该小组还没有报告" />
    <el-table v-else :data="reports" stripe>
      <el-table-column label="小组名称" width="140" prop="team_name" show-overflow-tooltip />
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
      <el-table-column label="状态" width="100">
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
      v-if="teamId"
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="total"
      @change="loadReports"
    />

    <PeriodReportCreateDialog
      v-model="createVisible"
      :report-type="createReportType"
      scope="team"
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
const loading = ref(false)
const error = ref('')
const teams = ref([])
const teamId = ref(null)
const reports = ref([])
const periodFilter = ref('ALL')
const createReportType = ref('TEAM_WEEKLY')
const createVisible = ref(false)
const filters = ref({ from: '', to: '', status: '', q: '' })
const page = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const total = ref(0)

const createTypeOptions = computed(() => grainCreateOptions('team'))

function statusTagType(status) {
  if (status === 'SUBMITTED') return 'success'
  if (status === 'REVISING') return 'warning'
  return 'info'
}

async function loadTeams() {
  const { data } = await v1Client.get('/teams')
  teams.value = data
  teamId.value = data[0]?.id || null
}

async function loadReports() {
  if (!teamId.value) return
  loading.value = true
  error.value = ''
  try {
    const params = { scope: 'team', teamId: teamId.value }
    const rt = listReportTypeForGrain('team', periodFilter.value)
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
  if (createReportType.value === 'TEAM_WEEKLY') {
    createWeekly()
    return
  }
  createVisible.value = true
}

async function createWeekly() {
  try {
    const { data } = await v1Client.post('/period-reports', {
      reportType: createReportType.value,
      teamId: teamId.value
    })
    ElMessage.success('小组报告已创建')
    router.push(`/app/team/${data.id}`)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '创建失败')
  }
}

function onCreated(report) {
  ElMessage.success('小组报告已创建')
  router.push(`/app/team/${report.id}`)
}

function openReport(row) {
  router.push(`/app/team/${row.id}`)
}

function applyPeriodGrain(grain) {
  if (!grain) return
  periodFilter.value = grain
  createReportType.value = defaultCreateTypeForGrain('team', grain)
}

function onTeamChange() {
  page.value = 1
  loadReports()
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

onMounted(async () => {
  try {
    await loadTeams()
    await loadReports()
  } catch (err) {
    error.value = err.response?.data?.message || '加载失败'
  }
})
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
