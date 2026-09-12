<template>
  <div class="report-generation-flow">
    <div class="header">
      <h2>报告生成流程</h2>
      <p class="subtitle">从周计划到年终总结的完整工作流程</p>
    </div>

    <!-- 流程步骤 -->
    <div class="flow-steps">
      <el-steps :active="activeStep" align-center>
        <el-step title="周计划" description="制定每周工作计划" />
        <el-step title="周报" description="提交每周工作总结" />
        <el-step title="月报" description="自动生成月度总结" />
        <el-step title="年报" description="自动生成年度总结" />
      </el-steps>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content">
      <!-- 步骤1: 周计划 -->
      <div v-if="activeStep === 0" class="step-panel">
        <h3>第一步：制定周计划</h3>
        <div class="plan-list">
          <el-card 
            v-for="plan in weeklyPlans" 
            :key="plan.id" 
            class="plan-card"
            :class="{ 'completed': plan.status === 'completed' }"
          >
            <div class="plan-header">
              <h4>{{ plan.title }}</h4>
              <el-tag :type="getStatusType(plan.status)">
                {{ getStatusText(plan.status) }}
              </el-tag>
            </div>
            <p class="plan-description">{{ plan.description }}</p>
            <div class="plan-objectives">
              <strong>目标：</strong>
              <pre>{{ plan.objectives }}</pre>
            </div>
            <div class="plan-meta">
              <span>{{ plan.year }}年{{ plan.month }}月 第{{ plan.week }}周</span>
            </div>
            <div class="plan-actions">
              <el-button 
                type="primary" 
                size="small" 
                @click="submitReportForPlan(plan)"
                :disabled="plan.status === 'completed'"
              >
                <el-icon><Document /></el-icon>
                提交周报
              </el-button>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 步骤2: 周报 -->
      <div v-if="activeStep === 1" class="step-panel">
        <h3>第二步：查看周报</h3>
        <el-table :data="weeklyReports" style="width: 100%">
          <el-table-column prop="week" label="周次" width="80" />
          <el-table-column prop="month" label="月份" width="80" />
          <el-table-column prop="year" label="年份" width="80" />
          <el-table-column prop="achievements" label="本周成就" show-overflow-tooltip />
          <el-table-column prop="highlights" label="工作亮点" show-overflow-tooltip />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" @click="viewWeeklyReport(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 步骤3: 月报 -->
      <div v-if="activeStep === 2" class="step-panel">
        <h3>第三步：生成月度总结</h3>
        <div class="monthly-controls">
          <el-select v-model="selectedMonth" placeholder="选择月份">
            <el-option v-for="month in months" :key="month.value" :label="month.label" :value="month.value" />
          </el-select>
          <el-select v-model="selectedYear" placeholder="选择年份">
            <el-option v-for="year in years" :key="year" :label="year" :value="year" />
          </el-select>
          <el-button type="primary" @click="generateMonthlyReport" :loading="generatingMonthly">
            生成月度报告
          </el-button>
        </div>

        <div v-if="monthlyReport" class="report-result">
          <el-card>
            <template #header>
              <span>{{ monthlyReport.year }}年{{ monthlyReport.month }}月工作总结</span>
            </template>
            <div class="report-content">
              <h4>月度总结</h4>
              <p>{{ monthlyReport.summary }}</p>
              <h4>工作亮点</h4>
              <p>{{ monthlyReport.highlights }}</p>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 步骤4: 年报 -->
      <div v-if="activeStep === 3" class="step-panel">
        <h3>第四步：生成年度总结</h3>
        <div class="annual-controls">
          <el-select v-model="selectedAnnualYear" placeholder="选择年份">
            <el-option v-for="year in years" :key="year" :label="year" :value="year" />
          </el-select>
          <el-button type="primary" @click="generateAnnualReport" :loading="generatingAnnual">
            生成年度报告
          </el-button>
        </div>

        <div v-if="annualReport" class="report-result">
          <el-card>
            <template #header>
              <span>{{ annualReport.year }}年度工作总结</span>
            </template>
            <div class="report-content">
              <h4>年度总结</h4>
              <p>{{ annualReport.summary }}</p>
              <h4>主要成就</h4>
              <p>{{ annualReport.achievements }}</p>
              <h4>挑战与改进</h4>
              <p>{{ annualReport.challenges }}</p>
              <h4>工作亮点</h4>
              <p>{{ annualReport.highlights }}</p>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 导航按钮 -->
    <div class="navigation">
      <el-button @click="prevStep" :disabled="activeStep === 0">上一步</el-button>
      <el-button type="primary" @click="nextStep" :disabled="activeStep === 3">下一步</el-button>
    </div>

    <!-- 周报详情对话框 -->
    <el-dialog v-model="showWeeklyReportDialog" title="周报详情" width="600px">
      <div v-if="selectedWeeklyReport">
        <h4>基本信息</h4>
        <p><strong>时间:</strong> {{ selectedWeeklyReport.year }}年 {{ selectedWeeklyReport.month }}月 第{{ selectedWeeklyReport.week }}周</p>
        
        <h4>本周成就</h4>
        <p>{{ selectedWeeklyReport.achievements }}</p>
        
        <h4>遇到挑战</h4>
        <p>{{ selectedWeeklyReport.challenges }}</p>
        
        <h4>下周计划</h4>
        <p>{{ selectedWeeklyReport.next_week_plan }}</p>
        
        <h4>AI生成的工作亮点</h4>
        <p style="background: #f0f9ff; padding: 10px; border-radius: 4px;">
          {{ selectedWeeklyReport.highlights }}
        </p>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '../api/client'
import { Document } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

export default {
  name: 'ReportGenerationFlow',
  components: {
    Document
  },
  setup() {
    const authStore = useAuthStore()
    const activeStep = ref(0)
    const weeklyPlans = ref([])
    const weeklyReports = ref([])
    const monthlyReport = ref(null)
    const annualReport = ref(null)
    const selectedWeeklyReport = ref(null)
    const showWeeklyReportDialog = ref(false)
    const generatingMonthly = ref(false)
    const generatingAnnual = ref(false)

    const selectedMonth = ref(new Date().getMonth() + 1)
    const selectedYear = ref(new Date().getFullYear())
    const selectedAnnualYear = ref(new Date().getFullYear())

    const years = ref([2023, 2024, 2025, 2026])
    const months = ref([
      { label: '一月', value: 1 }, { label: '二月', value: 2 }, { label: '三月', value: 3 },
      { label: '四月', value: 4 }, { label: '五月', value: 5 }, { label: '六月', value: 6 },
      { label: '七月', value: 7 }, { label: '八月', value: 8 }, { label: '九月', value: 9 },
      { label: '十月', value: 10 }, { label: '十一月', value: 11 }, { label: '十二月', value: 12 }
    ])

    const getStatusType = (status) => {
      const types = {
        'completed': 'success',
        'in_progress': 'warning',
        'pending': 'info'
      }
      return types[status] || 'info'
    }

    const getStatusText = (status) => {
      const texts = {
        'completed': '已完成',
        'in_progress': '进行中',
        'pending': '待开始'
      }
      return texts[status] || '未知'
    }

    const fetchWeeklyPlans = async () => {
      try {
        const response = await axios.get('/api/plans/weekly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        weeklyPlans.value = response.data
      } catch (error) {
        ElMessage.error('获取周计划失败')
      }
    }

    const fetchWeeklyReports = async () => {
      try {
        const response = await axios.get('/api/reports/weekly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        weeklyReports.value = response.data
      } catch (error) {
        ElMessage.error('获取周报失败')
      }
    }

    const submitReportForPlan = async (plan) => {
      try {
        const achievements = `基于周计划"${plan.title}"完成的工作：\n${plan.objectives || '无具体工作内容'}`
        const challenges = '本周工作中遇到的挑战和问题'
        const nextWeekPlan = '下周工作计划和安排'

        const response = await axios.post('/api/reports/weekly/from-plan', {
          planId: plan.id,
          week: plan.week,
          month: plan.month,
          year: plan.year,
          achievements: achievements,
          challenges: challenges,
          next_week_plan: nextWeekPlan
        }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })

        ElMessage.success('周报提交成功')
        ElMessage.info(`AI生成的工作亮点: ${response.data.highlights}`)
        
        // 刷新数据
        fetchWeeklyPlans()
        fetchWeeklyReports()
        
      } catch (error) {
        console.error('提交周报失败:', error)
        ElMessage.error('提交周报失败')
      }
    }

    const generateMonthlyReport = async () => {
      generatingMonthly.value = true
      try {
        const response = await axios.post('/api/reports/monthly/generate', {
          month: selectedMonth.value,
          year: selectedYear.value
        }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })

        monthlyReport.value = {
          ...response.data,
          month: selectedMonth.value,
          year: selectedYear.value
        }
        
        ElMessage.success('月度报告生成成功')
        
      } catch (error) {
        console.error('生成月度报告失败:', error)
        if (error.response?.data?.error) {
          ElMessage.error(`生成月度报告失败: ${error.response.data.error}`)
        } else {
          ElMessage.error('生成月度报告失败')
        }
      } finally {
        generatingMonthly.value = false
      }
    }

    const generateAnnualReport = async () => {
      generatingAnnual.value = true
      try {
        const response = await axios.post('/api/reports/annual/generate', {
          year: selectedAnnualYear.value
        }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })

        annualReport.value = {
          ...response.data,
          year: selectedAnnualYear.value
        }
        
        ElMessage.success('年度报告生成成功')
        
      } catch (error) {
        console.error('生成年度报告失败:', error)
        if (error.response?.data?.error) {
          ElMessage.error(`生成年度报告失败: ${error.response.data.error}`)
        } else {
          ElMessage.error('生成年度报告失败')
        }
      } finally {
        generatingAnnual.value = false
      }
    }

    const viewWeeklyReport = (report) => {
      selectedWeeklyReport.value = report
      showWeeklyReportDialog.value = true
    }

    const nextStep = () => {
      if (activeStep.value < 3) {
        activeStep.value++
        
        // 在切换到下一步时加载相应数据
        if (activeStep.value === 1) {
          fetchWeeklyReports()
        } else if (activeStep.value === 2) {
          // 可以预加载一些数据
        } else if (activeStep.value === 3) {
          // 可以预加载一些数据
        }
      }
    }

    const prevStep = () => {
      if (activeStep.value > 0) {
        activeStep.value--
      }
    }

    onMounted(() => {
      fetchWeeklyPlans()
    })

    return {
      activeStep,
      weeklyPlans,
      weeklyReports,
      monthlyReport,
      annualReport,
      selectedWeeklyReport,
      showWeeklyReportDialog,
      generatingMonthly,
      generatingAnnual,
      selectedMonth,
      selectedYear,
      selectedAnnualYear,
      years,
      months,
      getStatusType,
      getStatusText,
      submitReportForPlan,
      generateMonthlyReport,
      generateAnnualReport,
      viewWeeklyReport,
      nextStep,
      prevStep
    }
  }
}
</script>

<style scoped>
.report-generation-flow {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h2 {
  color: #333;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 16px;
}

.flow-steps {
  margin-bottom: 40px;
}

.step-panel {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.step-panel h3 {
  color: #333;
  margin-bottom: 20px;
  border-left: 4px solid #409eff;
  padding-left: 10px;
}

.plan-list {
  display: grid;
  gap: 16px;
}

.plan-card {
  transition: all 0.3s ease;
}

.plan-card.completed {
  border-left: 4px solid #67c23a;
}

.plan-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.plan-header h4 {
  margin: 0;
  color: #333;
  flex: 1;
  margin-right: 10px;
}

.plan-description {
  color: #666;
  margin-bottom: 10px;
  line-height: 1.5;
}

.plan-objectives {
  margin-bottom: 10px;
}

.plan-objectives pre {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 5px 0 0 0;
  color: #555;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
}

.plan-meta {
  color: #999;
  font-size: 12px;
  margin-bottom: 10px;
}

.plan-actions {
  text-align: right;
}

.monthly-controls,
.annual-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}

.report-result {
  margin-top: 20px;
}

.report-content h4 {
  color: #333;
  margin: 20px 0 10px 0;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}

.report-content p {
  line-height: 1.6;
  color: #555;
  margin: 0;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
}

.navigation {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.navigation .el-button {
  margin: 0 10px;
}
</style>

