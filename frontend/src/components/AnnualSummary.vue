<template>
  <div class="annual-summary">
    <div class="header">
      <h3>年度工作总结</h3>
      <div class="controls">
        <el-select v-model="selectedYear" placeholder="选择年份" @change="fetchAnnualData">
          <el-option v-for="year in years" :key="year" :label="year" :value="year" />
        </el-select>
        <el-button type="primary" @click="generateAnnualReport" :loading="generating">
          生成年度报告
        </el-button>
        <el-button type="success" @click="showAISummaryDialog = true">
          <el-icon><MagicStick /></el-icon> AI 年度总结
        </el-button>
      </div>
    </div>

    <!-- 年度统计概览 -->
    <el-row :gutter="20" class="stats-overview">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-icon annual">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ summaryStats.annualPlans || 0 }}</div>
              <div class="stat-label">年度计划</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-icon monthly">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ summaryStats.monthlyPlans || 0 }}</div>
              <div class="stat-label">月度计划</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-icon weekly">
              <el-icon><List /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ summaryStats.weeklyPlans || 0 }}</div>
              <div class="stat-label">周计划</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-icon reports">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ summaryStats.weeklyReports || 0 }}</div>
              <div class="stat-label">周报</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 完成率图表 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>计划完成率</span>
          </template>
          <div class="chart-container">
            <div class="completion-chart">
              <div class="chart-item" v-for="item in completionData" :key="item.type">
                <div class="chart-label">{{ item.label }}</div>
                <div class="chart-bar">
                  <div 
                    class="chart-fill" 
                    :style="{ width: item.percentage + '%', backgroundColor: item.color }"
                  ></div>
                </div>
                <div class="chart-percentage">{{ item.percentage }}%</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>状态分布</span>
          </template>
          <div class="chart-container">
            <div class="status-chart">
              <div class="status-item" v-for="item in statusData" :key="item.status">
                <div class="status-indicator" :style="{ backgroundColor: item.color }"></div>
                <div class="status-label">{{ item.label }}</div>
                <div class="status-count">{{ item.count }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 月度趋势 -->
    <el-card class="monthly-trend">
      <template #header>
        <span>月度工作趋势</span>
      </template>
      <div class="trend-container">
        <div class="trend-chart">
          <div 
            v-for="(month, index) in monthlyTrend" 
            :key="index"
            class="trend-bar"
            :style="{ height: month.height + 'px' }"
            :title="`${month.label}: ${month.value}个计划`"
          >
            <div class="trend-value">{{ month.value }}</div>
          </div>
        </div>
        <div class="trend-labels">
          <div v-for="month in monthlyTrend" :key="month.label" class="trend-label">
            {{ month.label }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 年度报告 -->
    <el-card v-if="annualReport" class="annual-report">
      <template #header>
        <span>{{ selectedYear }}年度工作总结报告</span>
        <el-button type="primary" text @click="downloadReport">下载报告</el-button>
      </template>
      
      <div class="report-content">
        <div class="report-section">
          <h4>年度总结</h4>
          <p>{{ annualReport.summary }}</p>
        </div>
        
        <div class="report-section">
          <h4>主要成就</h4>
          <div class="achievements">
            <p>{{ annualReport.achievements }}</p>
          </div>
        </div>
        
        <div class="report-section">
          <h4>挑战与改进</h4>
          <div class="challenges">
            <p>{{ annualReport.challenges }}</p>
          </div>
        </div>
        
        <div class="report-section">
          <h4>工作亮点</h4>
          <div class="highlights">
            <p>{{ annualReport.highlights }}</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- AI 年度总结对话框 -->
    <el-dialog
      v-model="showAISummaryDialog"
      title="AI 年度总结生成"
      width="800px"
    >
      <el-form :model="aiSummaryForm" label-width="120px">
        <el-form-item label="年度工作内容">
          <el-input 
            v-model="aiSummaryForm.workContent" 
            type="textarea" 
            :rows="10"
            placeholder="请详细描述全年的工作内容、主要项目、取得的成果、遇到的挑战、个人成长等..."
          />
        </el-form-item>
        
        <el-form-item label="时间范围">
          <el-input 
            v-model="aiSummaryForm.timeframe" 
            placeholder="例如：2024年度"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAISummaryDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="generateAISummary" 
          :loading="generatingAISummary"
        >
          <el-icon><MagicStick /></el-icon>
          生成年度总结
        </el-button>
      </template>
    </el-dialog>

    <!-- 无数据提示 -->
    <el-empty 
      v-if="!annualReport && !loading" 
      description="暂无年度报告数据"
      :image-size="200"
    >
      <el-button type="primary" @click="generateAnnualReport">生成年度报告</el-button>
    </el-empty>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Calendar, Document, List, ChatDotRound, MagicStick } from '@element-plus/icons-vue'
import axios from '../api/client'
import { useAuthStore } from '../stores/auth'

export default {
  name: 'AnnualSummary',
  components: {
    Calendar, Document, List, ChatDotRound
  },
  setup() {
    const authStore = useAuthStore()
    const selectedYear = ref(new Date().getFullYear())
    const annualReport = ref(null)
    const generating = ref(false)
    const loading = ref(false)
    const summaryData = ref({})
    const showAISummaryDialog = ref(false)
    const generatingAISummary = ref(false)
    
    const aiSummaryForm = ref({
      workContent: '',
      timeframe: `${new Date().getFullYear()}年度`
    })

    const years = ref([2023, 2024, 2025, 2026])

    const summaryStats = computed(() => {
      return {
        annualPlans: summaryData.value.annualPlans?.length || 0,
        monthlyPlans: summaryData.value.monthlyPlans?.length || 0,
        weeklyPlans: summaryData.value.weeklyPlans?.length || 0,
        weeklyReports: summaryData.value.weeklyReports?.length || 0
      }
    })

    const completionData = computed(() => {
      const annualCompleted = summaryData.value.annualPlans?.filter(p => p.status === 'completed').length || 0
      const annualTotal = summaryData.value.annualPlans?.length || 1
      
      const monthlyCompleted = summaryData.value.monthlyPlans?.filter(p => p.status === 'completed').length || 0
      const monthlyTotal = summaryData.value.monthlyPlans?.length || 1
      
      const weeklyCompleted = summaryData.value.weeklyPlans?.filter(p => p.status === 'completed').length || 0
      const weeklyTotal = summaryData.value.weeklyPlans?.length || 1

      return [
        { type: 'annual', label: '年度计划', percentage: Math.round((annualCompleted / annualTotal) * 100), color: '#409eff' },
        { type: 'monthly', label: '月度计划', percentage: Math.round((monthlyCompleted / monthlyTotal) * 100), color: '#67c23a' },
        { type: 'weekly', label: '周计划', percentage: Math.round((weeklyCompleted / weeklyTotal) * 100), color: '#e6a23c' }
      ]
    })

    const statusData = computed(() => {
      const allPlans = [
        ...(summaryData.value.annualPlans || []),
        ...(summaryData.value.monthlyPlans || []),
        ...(summaryData.value.weeklyPlans || [])
      ]
      
      const statusCount = {
        completed: allPlans.filter(p => p.status === 'completed').length,
        in_progress: allPlans.filter(p => p.status === 'in_progress').length,
        pending: allPlans.filter(p => p.status === 'pending').length
      }

      return [
        { status: 'completed', label: '已完成', count: statusCount.completed, color: '#67c23a' },
        { status: 'in_progress', label: '进行中', count: statusCount.in_progress, color: '#e6a23c' },
        { status: 'pending', label: '待开始', count: statusCount.pending, color: '#f56c6c' }
      ]
    })

    const monthlyTrend = computed(() => {
      const monthlyData = Array(12).fill(0)
      
      // 统计月度计划数量
      if (summaryData.value.monthlyPlans) {
        summaryData.value.monthlyPlans.forEach(plan => {
          if (plan.month >= 1 && plan.month <= 12) {
            monthlyData[plan.month - 1]++
          }
        })
      }
      
      // 统计周计划数量
      if (summaryData.value.weeklyPlans) {
        summaryData.value.weeklyPlans.forEach(plan => {
          if (plan.month >= 1 && plan.month <= 12) {
            monthlyData[plan.month - 1]++
          }
        })
      }

      const maxValue = Math.max(...monthlyData, 1)
      
      return monthlyData.map((value, index) => ({
        label: `${index + 1}月`,
        value: value,
        height: (value / maxValue) * 100
      }))
    })

    const fetchAnnualData = async () => {
      loading.value = true
      try {
        // 获取年度计划
        const annualResponse = await axios.get('/api/plans/annual', {
          headers: { Authorization: `Bearer ${authStore.token}` },
          params: { year: selectedYear.value }
        })
        
        // 获取月度计划
        const monthlyResponse = await axios.get('/api/plans/monthly', {
          headers: { Authorization: `Bearer ${authStore.token}` },
          params: { year: selectedYear.value }
        })
        
        // 获取周计划
        const weeklyResponse = await axios.get('/api/plans/weekly', {
          headers: { Authorization: `Bearer ${authStore.token}` },
          params: { year: selectedYear.value }
        })
        
        // 获取周报
        const reportsResponse = await axios.get('/api/reports/weekly', {
          headers: { Authorization: `Bearer ${authStore.token}` },
          params: { year: selectedYear.value }
        })

        summaryData.value = {
          annualPlans: annualResponse.data,
          monthlyPlans: monthlyResponse.data,
          weeklyPlans: weeklyResponse.data,
          weeklyReports: reportsResponse.data
        }
      } catch (error) {
        ElMessage.error('获取年度数据失败')
      } finally {
        loading.value = false
      }
    }

    const generateAnnualReport = async () => {
      generating.value = true
      try {
        const response = await axios.post('/api/reports/annual/generate', {
          year: selectedYear.value
        }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        annualReport.value = response.data
        ElMessage.success('年度报告生成成功')
      } catch (error) {
        ElMessage.error('生成年度报告失败')
      } finally {
        generating.value = false
      }
    }

    const generateAISummary = async () => {
      if (!aiSummaryForm.value.workContent.trim()) {
        ElMessage.error('请输入年度工作内容')
        return
      }

      generatingAISummary.value = true
      try {
        const response = await axios.post('/api/ai-suggestions/summary-generation', {
          type: 'annual',
          content: aiSummaryForm.value.workContent,
          timeframe: aiSummaryForm.value.timeframe
        }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })

        // 将AI生成的总结应用到年度报告
        annualReport.value = response.data
        showAISummaryDialog.value = false
        ElMessage.success('AI年度总结已生成')

      } catch (error) {
        console.error('AI年度总结生成错误:', error)
        if (error.response) {
          ElMessage.error(`AI总结生成失败: ${error.response.data.error || '服务器错误'}`)
        } else if (error.request) {
          ElMessage.error('网络连接失败，请检查网络连接')
        } else {
          ElMessage.error('AI总结生成失败，请稍后重试')
        }
      } finally {
        generatingAISummary.value = false
      }
    }

    const downloadReport = () => {
      ElMessage.info('下载功能开发中...')
      // 这里可以实现PDF或Word文档的下载功能
    }

    onMounted(() => {
      fetchAnnualData()
    })

    return {
      selectedYear,
      annualReport,
      generating,
      loading,
      showAISummaryDialog,
      generatingAISummary,
      years,
      summaryStats,
      completionData,
      statusData,
      monthlyTrend,
      aiSummaryForm,
      fetchAnnualData,
      generateAnnualReport,
      generateAISummary,
      downloadReport
    }
  }
}
</script>

<style scoped>
.annual-summary {
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

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stats-overview {
  margin-bottom: 20px;
}

.stat-item {
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

.stat-icon.annual { background-color: #409eff; }
.stat-icon.monthly { background-color: #67c23a; }
.stat-icon.weekly { background-color: #e6a23c; }
.stat-icon.reports { background-color: #f56c6c; }

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

.charts-row {
  margin-bottom: 20px;
}

.chart-container {
  padding: 20px;
}

.completion-chart {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.chart-label {
  width: 80px;
  font-size: 14px;
  color: #666;
}

.chart-bar {
  flex: 1;
  height: 20px;
  background-color: #f5f5f5;
  border-radius: 10px;
  overflow: hidden;
}

.chart-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.chart-percentage {
  width: 40px;
  text-align: right;
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.status-chart {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-label {
  flex: 1;
  font-size: 14px;
  color: #666;
}

.status-count {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.monthly-trend {
  margin-bottom: 20px;
}

.trend-container {
  padding: 20px;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 200px;
  margin-bottom: 10px;
}

.trend-bar {
  flex: 1;
  background: linear-gradient(to top, #409eff, #67c23a);
  border-radius: 4px 4px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 5px;
  min-height: 30px;
  transition: height 0.3s ease;
  position: relative;
}

.trend-value {
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.trend-labels {
  display: flex;
  gap: 8px;
}

.trend-label {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #666;
}

.annual-report {
  margin-top: 20px;
}

.report-content {
  padding: 20px;
}

.report-section {
  margin-bottom: 30px;
}

.report-section h4 {
  color: #333;
  margin-bottom: 10px;
  border-left: 4px solid #409eff;
  padding-left: 10px;
}

.report-section p {
  line-height: 1.6;
  color: #666;
  margin: 0;
}

.achievements, .challenges, .highlights {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border-left: 4px solid #67c23a;
}
</style>

