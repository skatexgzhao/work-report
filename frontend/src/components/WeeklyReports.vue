
<template>
  <div>
    <div class="header-actions">
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon> 提交周报
      </el-button>
      <el-button type="success" @click="showAISummaryDialog = true">
        <el-icon><MagicStick /></el-icon> AI 总结生成
      </el-button>
    </div>

    <el-table :data="weeklyReports" style="width: 100%" v-loading="loading">
      <el-table-column prop="week" label="周次" width="80" />
      <el-table-column prop="month" label="月份" width="80" />
      <el-table-column prop="year" label="年份" width="80" />
      <el-table-column prop="achievements" label="本周成就" show-overflow-tooltip />
      <el-table-column prop="summary" label="本周工作总结" show-overflow-tooltip />
      <el-table-column prop="created_at" label="提交时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" @click="viewReport(row)">查看详情</el-button>
          <el-button size="small" type="success" @click="generateSummaryForReport(row)" :loading="row.generatingSummary">
            <el-icon><MagicStick /></el-icon> AI总结
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Create Report Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      title="提交周报"
      width="600px"
    >
      <el-form :model="reportForm" :rules="rules" ref="reportFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="年份" prop="year">
              <el-input-number v-model="reportForm.year" :min="2020" :max="2030" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="月份" prop="month">
              <el-input-number v-model="reportForm.month" :min="1" :max="12" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="周次" prop="week">
              <el-input-number v-model="reportForm.week" :min="1" :max="5" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="本周成就" prop="achievements">
          <el-input 
            v-model="reportForm.achievements" 
            type="textarea" 
            :rows="4"
            placeholder="请描述本周的主要成就和工作内容"
          />
        </el-form-item>
        
        <el-form-item label="遇到挑战" prop="challenges">
          <el-input 
            v-model="reportForm.challenges" 
            type="textarea" 
            :rows="3"
            placeholder="请描述遇到的挑战和问题"
          />
        </el-form-item>
        
        <el-form-item label="下周计划" prop="next_week_plan">
          <el-input 
            v-model="reportForm.next_week_plan" 
            type="textarea" 
            :rows="3"
            placeholder="请描述下周的工作计划"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="submitReport" :loading="submitting">
          提交周报
        </el-button>
      </template>
    </el-dialog>

    <!-- Report Details Dialog -->
    <el-dialog
      v-model="showDetailsDialog"
      title="周报详情"
      width="600px"
    >
      <div v-if="selectedReport">
        <h4>基本信息</h4>
        <p><strong>时间:</strong> {{ selectedReport.year }}年 {{ selectedReport.month }}月 第{{ selectedReport.week }}周</p>
        
        <h4>本周成就</h4>
        <p>{{ selectedReport.achievements }}</p>
        
        <h4>遇到挑战</h4>
        <p>{{ selectedReport.challenges }}</p>
        
        <h4>下周计划</h4>
        <p>{{ selectedReport.next_week_plan }}</p>
        
        <h4>本周工作总结</h4>
        <p style="background: #f0f9ff; padding: 10px; border-radius: 4px;">
          {{ selectedReport.summary || selectedReport.highlights || '暂无总结内容' }}
        </p>
      </div>
    </el-dialog>

    <!-- AI 总结生成对话框 -->
    <el-dialog
      v-model="showAISummaryDialog"
      title="AI 周报总结生成"
      width="600px"
    >
      <el-form :model="aiSummaryForm" label-width="100px">
        <el-form-item label="工作内容">
          <el-input 
            v-model="aiSummaryForm.workContent" 
            type="textarea" 
            :rows="6"
            placeholder="请详细描述本周的工作内容、完成的任务、遇到的问题等..."
          />
        </el-form-item>
        
        <el-form-item label="时间范围">
          <el-input 
            v-model="aiSummaryForm.timeframe" 
            placeholder="例如：2024-01-W1"
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
          生成周报总结
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from '../api/client'
import { ElMessage } from 'element-plus'
import { Plus, MagicStick } from '@element-plus/icons-vue'

export default {
  name: 'WeeklyReports',
  components: {
    Plus,
    MagicStick
  },
  setup() {
    const weeklyReports = ref([])
    const loading = ref(false)
    const showCreateDialog = ref(false)
    const showDetailsDialog = ref(false)
    const showAISummaryDialog = ref(false)
    const selectedReport = ref(null)
    const submitting = ref(false)
    const generatingSummary = ref(false)
    
    const reportForm = ref({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      week: Math.ceil(new Date().getDate() / 7),
      achievements: '',
      challenges: '',
      next_week_plan: ''
    })

    const aiSummaryForm = ref({
      workContent: '',
      timeframe: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-W${Math.ceil(new Date().getDate() / 7)}`
    })
    
    const reportFormRef = ref()
    
    const rules = {
      year: [{ required: true, message: '请选择年份', trigger: 'blur' }],
      month: [{ required: true, message: '请选择月份', trigger: 'blur' }],
      week: [{ required: true, message: '请选择周次', trigger: 'blur' }],
      achievements: [{ required: true, message: '请填写本周成就', trigger: 'blur' }],
      challenges: [{ required: true, message: '请填写遇到的挑战', trigger: 'blur' }],
      next_week_plan: [{ required: true, message: '请填写下周计划', trigger: 'blur' }]
    }
    
    const fetchWeeklyReports = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/reports/weekly', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        weeklyReports.value = response.data
      } catch (error) {
        ElMessage.error('获取周报失败')
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
            const response = await axios.post('/api/reports/weekly', reportForm.value, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            
            ElMessage.success('周报提交成功')
            ElMessage.info(`AI生成的工作亮点: ${response.data.highlights}`)
            
            showCreateDialog.value = false
            resetForm()
            fetchWeeklyReports()
          } catch (error) {
            ElMessage.error('提交失败')
          } finally {
            submitting.value = false
          }
        }
      })
    }
    
    const viewReport = (report) => {
      selectedReport.value = report
      showDetailsDialog.value = true
    }
    
    const resetForm = () => {
      reportForm.value = {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        week: Math.ceil(new Date().getDate() / 7),
        achievements: '',
        challenges: '',
        next_week_plan: ''
      }
    }
    
    const formatDate = (date) => {
      return new Date(date).toLocaleString('zh-CN')
    }

    const generateAISummary = async () => {
      if (!aiSummaryForm.value.workContent.trim()) {
        ElMessage.error('请输入工作内容')
        return
      }

      generatingSummary.value = true
      try {
        const response = await axios.post('/api/ai-suggestions/weekly-report-summary', {
          achievements: aiSummaryForm.value.workContent,
          challenges: '',
          next_week_plan: ''
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })

        // 显示AI生成的400字总结
        const summary = response.data.summary
        ElMessage.success('AI总结生成成功')
        ElMessage.info({
          message: `AI总结（约400字）：\n\n${summary}`,
          duration: 15000, // 15秒
          showClose: true
        })

        showAISummaryDialog.value = false

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

    // 为已有周报生成AI总结
    const generateSummaryForReport = async (report) => {
      // 设置加载状态
      report.generatingSummary = true
      
      try {
        const response = await axios.post('/api/ai-suggestions/weekly-report-summary', {
          achievements: report.achievements,
          challenges: report.challenges,
          next_week_plan: report.next_week_plan
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })

        // 更新周报的总结字段
        const summary = response.data.summary
        await axios.put(`/api/reports/weekly/${report.id}`, {
          summary: summary
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })

        // 更新本地数据
        report.summary = summary
        ElMessage.success('AI总结生成并保存成功')
        
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
        report.generatingSummary = false
      }
    }
    
    onMounted(() => {
      fetchWeeklyReports()
    })
    
    return {
      weeklyReports,
      loading,
      showCreateDialog,
      showDetailsDialog,
      showAISummaryDialog,
      selectedReport,
      submitting,
      generatingSummary,
      reportForm,
      aiSummaryForm,
      reportFormRef,
      rules,
      submitReport,
      viewReport,
      generateAISummary,
      generateSummaryForReport,
      formatDate
    }
  }
}
</script>

<style scoped>
.header-actions {
  margin-bottom: 20px;
}

h4 {
  margin: 15px 0 8px 0;
  color: #333;
}

p {
  margin: 5px 0;
  line-height: 1.6;
}
</style>

