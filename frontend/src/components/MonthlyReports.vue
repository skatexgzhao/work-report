<template>
  <div class="monthly-reports">
    <div class="header">
      <h3>月度工作总结</h3>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon> 提交月报
        </el-button>
        <el-button type="success" @click="showAISummaryDialog = true">
          <el-icon><MagicStick /></el-icon> AI 月度总结
        </el-button>
      </div>
    </div>

    <!-- 月度报告列表 -->
    <el-table :data="monthlyReports" style="width: 100%" v-loading="loading">
      <el-table-column prop="year" label="年份" width="100" />
      <el-table-column prop="month" label="月份" width="100">
        <template #default="{ row }">
          {{ getMonthName(row.month) }}
        </template>
      </el-table-column>
      <el-table-column prop="summary" label="总结摘要" width="300">
        <template #default="{ row }">
          <div class="text-content" :title="row.summary">
            {{ row.summary && row.summary.length > 50 ? row.summary.substring(0, 50) + '...' : row.summary }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="提交时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button size="small" @click="viewReport(row)">查看详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建月报对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="提交月度工作总结"
      width="700px"
    >
      <el-form :model="reportForm" :rules="rules" ref="reportFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年份" prop="year">
              <el-select v-model="reportForm.year" placeholder="选择年份">
                <el-option v-for="year in years" :key="year" :label="year" :value="year" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="月份" prop="month">
              <el-select v-model="reportForm.month" placeholder="选择月份">
                <el-option v-for="month in months" :key="month.value" :label="month.label" :value="month.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="月度总结" prop="summary">
          <el-input 
            v-model="reportForm.summary" 
            type="textarea" 
            :rows="6"
            placeholder="请详细描述本月的主要工作成果、亮点、遇到的问题和下月计划..."
          />
        </el-form-item>
        
        <el-form-item label="工作亮点" prop="highlights">
          <el-input 
            v-model="reportForm.highlights" 
            type="textarea" 
            :rows="3"
            placeholder="请列出本月的工作亮点和突出表现..."
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="submitReport" :loading="submitting">
          提交月报
        </el-button>
      </template>
    </el-dialog>

    <!-- AI 月度总结对话框 -->
    <el-dialog
      v-model="showAISummaryDialog"
      title="AI 月度总结生成"
      width="700px"
    >
      <el-form :model="aiSummaryForm" label-width="120px">
        <el-form-item label="月度工作内容">
          <el-input 
            v-model="aiSummaryForm.workContent" 
            type="textarea" 
            :rows="8"
            placeholder="请详细描述本月的工作内容、完成的任务、取得的成果、遇到的问题等..."
          />
        </el-form-item>
        
        <el-form-item label="时间范围">
          <el-input 
            v-model="aiSummaryForm.timeframe" 
            placeholder="例如：2024年1月"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAISummaryDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="generateAISummary" 
          :loading="generatingSummary"
        >
          <el-icon><MagicStick /></el-icon>
          生成月度总结
        </el-button>
      </template>
    </el-dialog>

    <!-- 月报详情对话框 -->
    <el-dialog
      v-model="showDetailsDialog"
      :title="selectedReport ? `${selectedReport.year}年${selectedReport.month}月工作总结` : ''"
      width="800px"
    >
      <div v-if="selectedReport" class="report-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="年份">{{ selectedReport.year }}</el-descriptions-item>
          <el-descriptions-item label="月份">{{ getMonthName(selectedReport.month) }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDate(selectedReport.created_at) }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider>月度总结</el-divider>
        <div class="summary-content">{{ selectedReport.summary }}</div>
        
        <el-divider>工作亮点</el-divider>
        <div class="highlights-content">{{ selectedReport.highlights }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from '../api/client'
import { ElMessage } from 'element-plus'
import { Plus, MagicStick } from '@element-plus/icons-vue'

export default {
  name: 'MonthlyReports',
  components: {
    Plus,
    MagicStick
  },
  setup() {
    const monthlyReports = ref([])
    const loading = ref(false)
    const showCreateDialog = ref(false)
    const showAISummaryDialog = ref(false)
    const showDetailsDialog = ref(false)
    const selectedReport = ref(null)
    const submitting = ref(false)
    const generatingSummary = ref(false)
    
    const reportForm = ref({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      summary: '',
      highlights: ''
    })
    
    const aiSummaryForm = ref({
      workContent: '',
      timeframe: `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`
    })
    
    const reportFormRef = ref()
    
    const years = ref([2023, 2024, 2025, 2026])
    const months = ref([
      { label: '一月', value: 1 }, { label: '二月', value: 2 }, { label: '三月', value: 3 },
      { label: '四月', value: 4 }, { label: '五月', value: 5 }, { label: '六月', value: 6 },
      { label: '七月', value: 7 }, { label: '八月', value: 8 }, { label: '九月', value: 9 },
      { label: '十月', value: 10 }, { label: '十一月', value: 11 }, { label: '十二月', value: 12 }
    ])
    
    const rules = {
      year: [{ required: true, message: '请选择年份', trigger: 'change' }],
      month: [{ required: true, message: '请选择月份', trigger: 'change' }],
      summary: [{ required: true, message: '请填写月度总结', trigger: 'blur' }]
    }
    
    const fetchMonthlyReports = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/reports/monthly', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        monthlyReports.value = response.data
      } catch (error) {
        ElMessage.error('获取月度报告失败')
      } finally {
        loading.value = false
      }
    }
    
    const submitReport = async () => {
      if (!reportFormRef.value) return
      
      await reportFormRef.value.validate(async (valid) => {
        if (valid) {
          submitting.value = true
          try {
            await axios.post('/api/reports/monthly', reportForm.value, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            
            ElMessage.success('月度报告提交成功')
            showCreateDialog.value = false
            resetForm()
            fetchMonthlyReports()
          } catch (error) {
            ElMessage.error('提交失败')
          } finally {
            submitting.value = false
          }
        }
      })
    }
    
    const generateAISummary = async () => {
      if (!aiSummaryForm.value.workContent.trim()) {
        ElMessage.error('请输入工作内容')
        return
      }

      generatingSummary.value = true
      try {
        const response = await axios.post('/api/ai-suggestions/summary-generation', {
          type: 'monthly',
          content: aiSummaryForm.value.workContent,
          timeframe: aiSummaryForm.value.timeframe
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })

        // 将AI生成的总结应用到表单
        const summary = response.data
        reportForm.value.summary = summary.summary || ''
        reportForm.value.highlights = summary.highlights?.join('\n') || ''

        showAISummaryDialog.value = false
        showCreateDialog.value = true
        ElMessage.success('AI月度总结已生成，请查看并完善')

      } catch (error) {
        console.error('AI总结生成错误:', error)
        if (error.response) {
          ElMessage.error(`AI总结生成失败: ${error.response.data.error || '服务器错误'}`)
        } else if (error.request) {
          ElMessage.error('网络连接失败，请检查网络连接')
        } else {
          ElMessage.error('AI总结生成失败，请稍后重试')
        }
      } finally {
        generatingSummary.value = false
      }
    }
    
    const viewReport = (report) => {
      selectedReport.value = report
      showDetailsDialog.value = true
    }
    
    const getMonthName = (month) => {
      const monthObj = months.value.find(m => m.value === month)
      return monthObj ? monthObj.label : ''
    }
    
    const formatDate = (date) => {
      return new Date(date).toLocaleString('zh-CN')
    }
    
    const resetForm = () => {
      reportForm.value = {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        summary: '',
        highlights: ''
      }
    }
    
    onMounted(() => {
      fetchMonthlyReports()
    })
    
    return {
      monthlyReports,
      loading,
      showCreateDialog,
      showAISummaryDialog,
      showDetailsDialog,
      selectedReport,
      submitting,
      generatingSummary,
      reportForm,
      aiSummaryForm,
      reportFormRef,
      years,
      months,
      rules,
      submitReport,
      generateAISummary,
      viewReport,
      getMonthName,
      formatDate
    }
  }
}
</script>

<style scoped>
.monthly-reports {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.text-content {
  word-break: break-word;
  line-height: 1.4;
  max-height: 3.2em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.report-detail .summary-content,
.report-detail .highlights-content {
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}
</style>

