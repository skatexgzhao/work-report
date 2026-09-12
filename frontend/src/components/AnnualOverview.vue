<template>
  <div class="annual-overview">
    <div class="header">
      <h3>年度工作计划概览</h3>
      <el-button type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon> 刷新数据
      </el-button>
    </div>

    <div class="overview-content">
      <!-- 年度计划列表 -->
      <div class="plan-list">
        <h4>年度计划列表</h4>
        <el-table :data="annualPlans" style="width: 100%" v-loading="loading">
          <el-table-column prop="year" label="年份" width="100" />
          <el-table-column prop="title" label="计划标题" width="200" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button size="small" @click="viewAnnualPlan(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 季度进度概览 -->
      <div class="quarter-overview" v-if="selectedPlan">
        <h4>{{ selectedPlan.year }}年 {{ selectedPlan.title }}</h4>
        <div class="quarters">
          <div v-for="quarter in quarters" :key="quarter.number" class="quarter-card">
            <div class="quarter-header">
              <h5>{{ quarter.name }}</h5>
              <el-tag :type="getQuarterStatus(quarter.number)">
                {{ getQuarterStatusText(quarter.number) }}
              </el-tag>
            </div>
            <div class="quarter-content">
              <div v-for="month in quarter.months" :key="month" class="month-item">
                <span class="month-name">{{ month }}月</span>
                <el-progress 
                  :percentage="getMonthProgress(month)" 
                  :status="getProgressStatus(getMonthProgress(month))"
                  :show-text="false"
                  style="flex: 1; margin: 0 10px;"
                />
                <span class="progress-text">{{ getMonthProgress(month) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 年度计划详情对话框 -->
    <el-dialog
      v-model="showPlanDetail"
      :title="selectedPlan ? `${selectedPlan.year}年 ${selectedPlan.title}` : ''"
      width="90%"
      top="5vh"
    >
      <div v-if="selectedPlan" class="plan-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="年份">{{ selectedPlan.year }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedPlan.status)">
              {{ getStatusText(selectedPlan.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(selectedPlan.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(selectedPlan.updated_at) }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>计划描述</el-divider>
        <div class="description">{{ selectedPlan.description }}</div>

        <el-divider>详细工作计划</el-divider>
        <div class="detailed-plan">
          <pre>{{ selectedPlan.objectives }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from '../api/client'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

export default {
  name: 'AnnualOverview',
  components: {
    Refresh
  },
  setup() {
    const annualPlans = ref([])
    const loading = ref(false)
    const selectedPlan = ref(null)
    const showPlanDetail = ref(false)

    const quarters = ref([
      { number: 1, name: '第一季度 (1月-3月)', months: [1, 2, 3] },
      { number: 2, name: '第二季度 (4月-6月)', months: [4, 5, 6] },
      { number: 3, name: '第三季度 (7月-9月)', months: [7, 8, 9] },
      { number: 4, name: '第四季度 (10月-12月)', months: [10, 11, 12] }
    ])

    const fetchAnnualPlans = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/plans/annual', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        annualPlans.value = response.data
      } catch (error) {
        ElMessage.error('获取年度计划失败')
      } finally {
        loading.value = false
      }
    }

    const viewAnnualPlan = (plan) => {
      selectedPlan.value = plan
      showPlanDetail.value = true
    }

    const refreshData = () => {
      fetchAnnualPlans()
    }

    const getStatusType = (status) => {
      const types = {
        pending: 'info',
        in_progress: 'warning',
        completed: 'success'
      }
      return types[status] || 'info'
    }

    const getStatusText = (status) => {
      const texts = {
        pending: '待开始',
        in_progress: '进行中',
        completed: '已完成'
      }
      return texts[status] || status
    }

    const getQuarterStatus = (quarter) => {
      // 简化逻辑：根据当前月份判断季度状态
      const currentMonth = new Date().getMonth() + 1
      const currentQuarter = Math.ceil(currentMonth / 3)
      
      if (quarter < currentQuarter) return 'success'
      if (quarter === currentQuarter) return 'warning'
      return 'info'
    }

    const getQuarterStatusText = (quarter) => {
      const currentMonth = new Date().getMonth() + 1
      const currentQuarter = Math.ceil(currentMonth / 3)
      
      if (quarter < currentQuarter) return '已完成'
      if (quarter === currentQuarter) return '进行中'
      return '待开始'
    }

    const getMonthProgress = (month) => {
      // 简化逻辑：根据当前月份计算进度
      const currentMonth = new Date().getMonth() + 1
      if (month < currentMonth) return 100
      if (month === currentMonth) return 50
      return 0
    }

    const getProgressStatus = (percentage) => {
      if (percentage === 100) return 'success'
      if (percentage >= 50) return 'warning'
      return 'exception'
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleString('zh-CN')
    }

    onMounted(() => {
      fetchAnnualPlans()
    })

    return {
      annualPlans,
      loading,
      selectedPlan,
      showPlanDetail,
      quarters,
      fetchAnnualPlans,
      viewAnnualPlan,
      refreshData,
      getStatusType,
      getStatusText,
      getQuarterStatus,
      getQuarterStatusText,
      getMonthProgress,
      getProgressStatus,
      formatDate
    }
  }
}
</script>

<style scoped>
.annual-overview {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.overview-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
}

.plan-list, .quarter-overview {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.quarters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.quarter-card {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 15px;
  background: #fafafa;
}

.quarter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.quarter-header h5 {
  margin: 0;
  color: #333;
}

.month-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.month-name {
  width: 40px;
  font-size: 14px;
  color: #666;
}

.progress-text {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: #999;
}

.plan-detail .description {
  line-height: 1.6;
  color: #333;
}

.detailed-plan {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.detailed-plan pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Microsoft YaHei', sans-serif;
  line-height: 1.5;
  color: #333;
}
</style>

