<template>
  <div class="progress-monitoring">
    <div class="header">
      <h3>团队进度监控</h3>
      <div class="filter-controls">
        <el-select v-model="filter.department" placeholder="选择部门" clearable>
          <el-option label="技术部" value="技术部" />
          <el-option label="市场部" value="市场部" />
          <el-option label="产品部" value="产品部" />
          <el-option label="运营部" value="运营部" />
        </el-select>
        <el-button type="primary" @click="fetchLaggingUsers">查看滞后员工</el-button>
      </div>
    </div>

    <!-- 总体统计 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background-color: #409eff;">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalStats.totalEmployees }}</div>
              <div class="stat-label">总员工数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background-color: #67c23a;">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalStats.completedPlans }}</div>
              <div class="stat-label">已完成计划</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background-color: #e6a23c;">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalStats.inProgressPlans }}</div>
              <div class="stat-label">进行中计划</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background-color: #f56c6c;">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalStats.pendingPlans }}</div>
              <div class="stat-label">待开始计划</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 员工进度表格 -->
    <el-card class="progress-table">
      <template #header>
        <div class="table-header">
          <span>员工工作进度</span>
          <el-button type="primary" text @click="refreshData">刷新</el-button>
        </div>
      </template>
      
      <el-table :data="employeeProgress" style="width: 100%" v-loading="loading">
        <el-table-column prop="username" label="员工" />
        <el-table-column prop="department" label="部门" />
        
        <el-table-column label="年度计划" width="120">
          <template #default="{ row }">
            <div class="plan-stats">
              <span class="completed">{{ row.annual?.completed || 0 }}</span>
              <span class="separator">/</span>
              <span class="total">{{ row.annual?.total || 0 }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="月度计划" width="120">
          <template #default="{ row }">
            <div class="plan-stats">
              <span class="completed">{{ row.monthly?.completed || 0 }}</span>
              <span class="separator">/</span>
              <span class="total">{{ row.monthly?.total || 0 }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="周计划" width="120">
          <template #default="{ row }">
            <div class="plan-stats">
              <span class="completed">{{ row.weekly?.completed || 0 }}</span>
              <span class="separator">/</span>
              <span class="total">{{ row.weekly?.total || 0 }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="完成率" width="100">
          <template #default="{ row }">
            <el-progress 
              :percentage="calculateCompletionRate(row)" 
              :show-text="false"
              :color="getProgressColor(calculateCompletionRate(row))"
            />
            <span class="percentage">{{ calculateCompletionRate(row) }}%</span>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row)">{{ getStatusText(row) }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetails(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 滞后员工对话框 -->
    <el-dialog v-model="showLaggingDialog" title="滞后员工列表" width="800px">
      <el-table :data="laggingUsers" v-loading="loading">
        <el-table-column prop="username" label="员工" />
        <el-table-column prop="department" label="部门" />
        <el-table-column prop="pending_weekly" label="待处理周计划" />
        <el-table-column prop="pending_monthly" label="待处理月度计划" />
        <el-table-column prop="pending_annual" label="待处理年度计划" />
        <el-table-column label="总滞后数">
          <template #default="{ row }">
            {{ (row.pending_weekly || 0) + (row.pending_monthly || 0) + (row.pending_annual || 0) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Check, Clock, Warning } from '@element-plus/icons-vue'
import axios from '../api/client'
import { useAuthStore } from '../stores/auth'

export default {
  name: 'ProgressMonitoring',
  components: {
    User, Check, Clock, Warning
  },
  setup() {
    const authStore = useAuthStore()
    const employees = ref([])
    const employeeProgress = ref([])
    const laggingUsers = ref([])
    const loading = ref(false)
    const showLaggingDialog = ref(false)

    const filter = ref({
      department: ''
    })

    const totalStats = computed(() => {
      const stats = {
        totalEmployees: employees.value.length,
        completedPlans: 0,
        inProgressPlans: 0,
        pendingPlans: 0
      }

      employeeProgress.value.forEach(emp => {
        stats.completedPlans += (emp.annual?.completed || 0) + (emp.monthly?.completed || 0) + (emp.weekly?.completed || 0)
        stats.inProgressPlans += (emp.annual?.in_progress || 0) + (emp.monthly?.in_progress || 0) + (emp.weekly?.in_progress || 0)
        stats.pendingPlans += (emp.annual?.pending || 0) + (emp.monthly?.pending || 0) + (emp.weekly?.pending || 0)
      })

      return stats
    })

    const calculateCompletionRate = (employee) => {
      const total = (employee.annual?.total || 0) + (employee.monthly?.total || 0) + (employee.weekly?.total || 0)
      const completed = (employee.annual?.completed || 0) + (employee.monthly?.completed || 0) + (employee.weekly?.completed || 0)
      
      if (total === 0) return 0
      return Math.round((completed / total) * 100)
    }

    const getProgressColor = (percentage) => {
      if (percentage >= 80) return '#67c23a'
      if (percentage >= 60) return '#e6a23c'
      return '#f56c6c'
    }

    const getStatusType = (employee) => {
      const rate = calculateCompletionRate(employee)
      if (rate >= 80) return 'success'
      if (rate >= 60) return 'warning'
      return 'danger'
    }

    const getStatusText = (employee) => {
      const rate = calculateCompletionRate(employee)
      if (rate >= 80) return '优秀'
      if (rate >= 60) return '良好'
      return '需关注'
    }

    const fetchEmployees = async () => {
      try {
        const response = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        employees.value = response.data.filter(user => user.role === 'employee')
      } catch (error) {
        ElMessage.error('获取员工列表失败')
      }
    }

    const fetchEmployeeProgress = async () => {
      loading.value = true
      employeeProgress.value = []

      for (const employee of employees.value) {
        try {
          const response = await axios.get(`/api/users/progress/${employee.id}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          })
          employeeProgress.value.push({
            ...employee,
            ...response.data
          })
        } catch (error) {
          console.error(`获取员工 ${employee.username} 进度失败:`, error)
        }
      }
      loading.value = false
    }

    const fetchLaggingUsers = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/users/lagging', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        laggingUsers.value = response.data
        showLaggingDialog.value = true
      } catch (error) {
        ElMessage.error('获取滞后员工列表失败')
      } finally {
        loading.value = false
      }
    }

    const viewDetails = (employee) => {
      ElMessage.info(`查看 ${employee.username} 的详细进度`)
      // 这里可以跳转到员工详情页面或打开详细对话框
    }

    const refreshData = async () => {
      await fetchEmployees()
      await fetchEmployeeProgress()
      ElMessage.success('数据已刷新')
    }

    onMounted(() => {
      refreshData()
    })

    return {
      employees,
      employeeProgress,
      laggingUsers,
      loading,
      showLaggingDialog,
      filter,
      totalStats,
      calculateCompletionRate,
      getProgressColor,
      getStatusType,
      getStatusText,
      fetchLaggingUsers,
      viewDetails,
      refreshData
    }
  }
}
</script>

<style scoped>
.progress-monitoring {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h3 {
  margin: 0;
  color: #333;
}

.filter-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon .el-icon {
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.progress-table {
  margin-top: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plan-stats {
  display: flex;
  align-items: center;
  gap: 4px;
}

.plan-stats .completed {
  color: #67c23a;
  font-weight: bold;
}

.plan-stats .total {
  color: #666;
}

.plan-stats .separator {
  color: #ccc;
}

.percentage {
  font-size: 12px;
  color: #666;
  margin-left: 8px;
}
</style>

