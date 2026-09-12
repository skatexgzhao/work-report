<template>
  <div class="monthly-plans">
    <div class="header">
      <h3>月度工作计划</h3>
      <div class="header-actions">
        <!-- 年度计划筛选 -->
        <el-select 
          v-model="selectedAnnualPlan" 
          placeholder="选择年度计划" 
          style="width: 200px; margin-right: 10px;"
          @change="filterMonthlyPlans"
        >
          <el-option label="全部年度计划" value="" />
          <el-option 
            v-for="plan in annualPlans" 
            :key="plan.id" 
            :label="`${plan.year}年 - ${plan.title}`" 
            :value="plan.id" 
          />
        </el-select>
        
        <el-button type="primary" @click="showCreateDialog = true">创建月度计划</el-button>
        <el-button type="success" @click="showAISuggestionDialog = true">
          <el-icon><MagicStick /></el-icon> AI 月度建议
        </el-button>
        <el-button type="danger" @click="batchDelete" :disabled="selectedPlans.length === 0">
          <el-icon><Delete /></el-icon> 批量删除
        </el-button>
      </div>
    </div>

    <!-- 创建月度计划对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建月度计划" width="600px">
      <el-form :model="newPlan" :rules="rules" ref="planFormRef" label-width="100px">
        <el-form-item label="年份" prop="year">
          <el-select v-model="newPlan.year" placeholder="选择年份">
            <el-option v-for="year in years" :key="year" :label="year" :value="year" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="月份" prop="month">
          <el-select v-model="newPlan.month" placeholder="选择月份">
            <el-option v-for="month in months" :key="month.value" :label="month.label" :value="month.value" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="标题" prop="title">
          <el-input v-model="newPlan.title" placeholder="请输入计划标题" />
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input v-model="newPlan.description" type="textarea" :rows="3" placeholder="请输入计划描述" />
        </el-form-item>
        
        <el-form-item label="目标" prop="objectives">
          <el-input v-model="newPlan.objectives" type="textarea" :rows="4" placeholder="请输入具体目标和指标" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createPlan" :loading="loading">创建</el-button>
      </template>
    </el-dialog>

    <!-- 计划列表 -->
    <el-table 
      :data="filteredPlans" 
      style="width: 100%" 
      v-loading="loading"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="year" label="年份" width="100" />
      <el-table-column prop="month" label="月份" width="100">
        <template #default="{ row }">
          {{ getMonthName(row.month) }}
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" width="200" />
      <el-table-column prop="description" label="描述" width="300">
        <template #default="{ row }">
          <div class="text-content" :title="row.description">
            {{ row.description && row.description.length > 50 ? row.description.substring(0, 50) + '...' : row.description }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="objectives" label="目标摘要" width="300">
        <template #default="{ row }">
          <div class="text-content" :title="row.objectives">
            {{ row.objectives && row.objectives.length > 80 ? row.objectives.substring(0, 80) + '...' : row.objectives }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <el-button size="small" @click="viewPlan(row)">查看</el-button>
          <el-button size="small" type="primary" @click="updateStatus(row)">更新状态</el-button>
          <el-button size="small" type="success" @click="generateWeeklyPlans(row)">生成周计划</el-button>
          <el-button size="small" type="danger" @click="deletePlan(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 计划详情对话框 -->
    <el-dialog v-model="showDetailDialog" :title="currentPlan?.title" width="700px">
      <div v-if="currentPlan">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="年份">{{ currentPlan.year }}</el-descriptions-item>
          <el-descriptions-item label="月份">{{ getMonthName(currentPlan.month) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentPlan.status)">{{ getStatusText(currentPlan.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(currentPlan.created_at) }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider>计划描述</el-divider>
        <p>{{ currentPlan.description }}</p>
        
        <el-divider>具体目标</el-divider>
        <p>{{ currentPlan.objectives }}</p>
      </div>
    </el-dialog>

    <!-- 更新状态对话框 -->
    <el-dialog v-model="showStatusDialog" title="更新计划状态" width="400px">
      <el-form :model="statusForm">
        <el-form-item label="状态">
          <el-select v-model="statusForm.status" placeholder="选择状态">
            <el-option label="待开始" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmStatusUpdate">确认</el-button>
      </template>
    </el-dialog>

    <!-- AI 月度建议对话框 -->
    <el-dialog
      v-model="showAISuggestionDialog"
      title="AI 月度计划建议"
      width="700px"
    >
      <el-form :model="aiSuggestionForm" label-width="120px">
        <el-form-item label="基于年度计划">
          <el-select 
            v-model="aiSuggestionForm.annualPlanId" 
            placeholder="选择年度计划（可选）"
            :loading="loadingAnnualPlans"
            clearable
          >
            <el-option
              v-for="plan in annualPlans"
              :key="plan.id"
              :label="`${plan.year}年 - ${plan.title}`"
              :value="plan.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="或自定义目标">
          <el-input 
            v-model="aiSuggestionForm.customGoal" 
            type="textarea" 
            :rows="4"
            placeholder="请详细描述您的工作目标和期望达成的成果..."
          />
        </el-form-item>
        
        <el-form-item label="关键指标">
          <el-input 
            v-model="aiSuggestionForm.keyMetrics" 
            type="textarea" 
            :rows="3"
            placeholder="请列出可量化的关键指标（如：销售额增长20%，客户满意度达到90%等）"
          />
        </el-form-item>
        
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="aiSuggestionForm.timeframe"
            type="monthrange"
            range-separator="至"
            start-placeholder="开始月份"
            end-placeholder="结束月份"
            format="YYYY年MM月"
            value-format="YYYY-MM"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAISuggestionDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="generateAISuggestion" 
          :loading="generatingAISuggestion"
        >
          <el-icon><MagicStick /></el-icon>
          生成月度计划建议
        </el-button>
      </template>
    </el-dialog>

    <!-- AI 月度建议确认对话框 -->
    <el-dialog
      v-model="showAIConfirmDialog"
      title="AI 月度建议确认"
      width="800px"
    >
      <div v-if="aiSuggestionResult" class="ai-confirm-content">
        <h4>月度计划建议概览</h4>
        <el-table :data="aiSuggestionResult.monthlyPlans" height="400">
          <el-table-column prop="month" label="月份" width="100" />
          <el-table-column prop="mainObjective" label="月度目标" width="200" />
          <el-table-column prop="tasks" label="任务数量">
            <template #default="{ row }">
              {{ row.tasks?.length || 0 }} 个任务
            </template>
          </el-table-column>
          <el-table-column prop="metrics" label="关键指标">
            <template #default="{ row }">
              {{ row.metrics?.map(m => m.target).join('，') || '' }}
            </template>
          </el-table-column>
        </el-table>

        <h4 style="margin-top: 20px;">第一个月详细任务</h4>
        <div v-if="aiSuggestionResult.monthlyPlans[0]">
          <el-table :data="aiSuggestionResult.monthlyPlans[0].tasks" height="200">
            <el-table-column prop="week" label="周次" width="80" />
            <el-table-column prop="title" label="任务标题" width="200" />
            <el-table-column prop="description" label="任务描述" />
            <el-table-column prop="priority" label="优先级" width="100">
              <template #default="{ row }">
                <el-tag :type="getPriorityType(row.priority)">
                  {{ getPriorityText(row.priority) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="regenerateAISuggestion">重新生成</el-button>
        <el-button type="primary" @click="confirmAISuggestion">确认使用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '../api/client'
import { useAuthStore } from '../stores/auth'
import { MagicStick, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

export default {
  name: 'MonthlyPlans',
  components: {
    MagicStick,
    Delete
  },
  setup() {
    const authStore = useAuthStore()
    const plans = ref([])
    const filteredPlans = ref([])
    const annualPlans = ref([])
    const loading = ref(false)
    const loadingAnnualPlans = ref(false)
    const selectedPlans = ref([])
    const selectedAnnualPlan = ref('')
    const showCreateDialog = ref(false)
    const showAISuggestionDialog = ref(false)
    const showAIConfirmDialog = ref(false)
    const showDetailDialog = ref(false)
    const showStatusDialog = ref(false)
    const currentPlan = ref(null)
    const planFormRef = ref()
    const generatingAISuggestion = ref(false)
    const aiSuggestionResult = ref(null)

    const newPlan = ref({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      title: '',
      description: '',
      objectives: ''
    })

    const aiSuggestionForm = ref({
      annualPlanId: '',
      customGoal: '',
      keyMetrics: '',
      timeframe: [
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      ]
    })

    const statusForm = ref({
      status: ''
    })

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
      title: [{ required: true, message: '请输入标题', trigger: 'blur' }]
    }

    const getMonthName = (month) => {
      const monthObj = months.value.find(m => m.value === month)
      return monthObj ? monthObj.label : ''
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

    const getPriorityType = (priority) => {
      const types = {
        high: 'danger',
        medium: 'warning',
        low: 'success'
      }
      return types[priority] || 'info'
    }

    const getPriorityText = (priority) => {
      const texts = {
        high: '高优先级',
        medium: '中优先级',
        low: '低优先级'
      }
      return texts[priority] || priority
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('zh-CN')
    }

    const fetchPlans = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/plans/monthly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        plans.value = response.data
        filterMonthlyPlans() // 初始筛选
      } catch (error) {
        ElMessage.error('获取月度计划失败')
      } finally {
        loading.value = false
      }
    }
    
    // 根据年度计划筛选月度计划
    const filterMonthlyPlans = () => {
      if (!selectedAnnualPlan.value) {
        filteredPlans.value = plans.value
      } else {
        // 根据年度计划ID筛选月度计划
        filteredPlans.value = plans.value.filter(plan => plan.annual_plan_id === selectedAnnualPlan.value)
      }
    }

    const fetchAnnualPlans = async () => {
      loadingAnnualPlans.value = true
      try {
        const response = await axios.get('/api/plans/annual', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        annualPlans.value = response.data
      } catch (error) {
        ElMessage.error('获取年度计划失败')
      } finally {
        loadingAnnualPlans.value = false
      }
    }

    const createPlan = async () => {
      if (!planFormRef.value) return

      await planFormRef.value.validate(async (valid) => {
        if (valid) {
          loading.value = true
          try {
            await axios.post('/api/plans/monthly', newPlan.value, {
              headers: { Authorization: `Bearer ${authStore.token}` }
            })
            ElMessage.success('月度计划创建成功')
            showCreateDialog.value = false
            resetForm()
            fetchPlans()
          } catch (error) {
            ElMessage.error('创建月度计划失败')
          } finally {
            loading.value = false
          }
        }
      })
    }

    const viewPlan = (plan) => {
      currentPlan.value = plan
      showDetailDialog.value = true
    }

    const updateStatus = (plan) => {
      currentPlan.value = plan
      statusForm.value.status = plan.status
      showStatusDialog.value = true
    }

    const confirmStatusUpdate = async () => {
      try {
        await axios.put(`/api/plans/monthly/${currentPlan.value.id}/status`, 
          { status: statusForm.value.status },
          { headers: { Authorization: `Bearer ${authStore.token}` } }
        )
        ElMessage.success('状态更新成功')
        showStatusDialog.value = false
        fetchPlans()
      } catch (error) {
        ElMessage.error('状态更新失败')
      }
    }

    const deletePlan = async (plan) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除月度计划 "${plan.title}" 吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        await axios.delete(`/api/plans/monthly/${plan.id}`, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        ElMessage.success('删除成功')
        fetchPlans()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败')
        }
      }
    }

    const batchDelete = async () => {
      try {
        await ElMessageBox.confirm(
          `确定要删除选中的 ${selectedPlans.value.length} 个月度计划吗？此操作不可恢复。`,
          '确认批量删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        const deletePromises = selectedPlans.value.map(plan => 
          axios.delete(`/api/plans/monthly/${plan.id}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          })
        )
        
        await Promise.all(deletePromises)
        ElMessage.success(`成功删除 ${selectedPlans.value.length} 个月度计划`)
        selectedPlans.value = []
        fetchPlans()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('批量删除失败')
        }
      }
    }

    const handleSelectionChange = (selection) => {
      selectedPlans.value = selection
    }

    const generateWeeklyPlans = async (monthlyPlan) => {
      try {
        // 调用AI生成周计划
        const response = await axios.post('/api/ai-suggestions/monthly-breakdown', {
          prompt: `请将以下月度计划分解为周计划：
月度目标：${monthlyPlan.title}
详细描述：${monthlyPlan.description}
月度目标：${monthlyPlan.objectives}
时间范围：${monthlyPlan.year}年${monthlyPlan.month}月`
        }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })

        // 创建周计划
        const monthlyPlanData = response.data.monthlyPlans[0]
        if (monthlyPlanData && monthlyPlanData.tasks) {
          for (const task of monthlyPlanData.tasks) {
            await axios.post('/api/plans/weekly', {
              year: monthlyPlan.year,
              month: monthlyPlan.month,
              week: task.week,
              title: task.title,
              description: task.description,
              objectives: `优先级：${task.priority}，预计工时：${task.estimatedHours}小时`,
              status: 'pending'
            }, {
              headers: { Authorization: `Bearer ${authStore.token}` }
            })
          }
          ElMessage.success(`成功为${monthlyPlan.year}年${monthlyPlan.month}月生成了${monthlyPlanData.tasks.length}个周计划`)
        } else {
          ElMessage.warning('未能生成有效的周计划')
        }
      } catch (error) {
        console.error('生成周计划失败:', error)
        ElMessage.error('生成周计划失败，请稍后重试')
      }
    }

    const generateAISuggestion = async () => {
      if (!aiSuggestionForm.value.annualPlanId && !aiSuggestionForm.value.customGoal.trim()) {
        ElMessage.error('请选择年度计划或填写自定义目标')
        return
      }

      generatingAISuggestion.value = true
      try {
        let prompt = ''
        
        if (aiSuggestionForm.value.annualPlanId) {
          const selectedPlan = annualPlans.value.find(p => p.id === aiSuggestionForm.value.annualPlanId)
          prompt = `请将以下年度工作计划分解为月度计划：
年度目标：${selectedPlan.title}
详细描述：${selectedPlan.description}
年度目标：${selectedPlan.objectives}
关键指标：${aiSuggestionForm.value.keyMetrics}
时间范围：${aiSuggestionForm.value.timeframe[0]} 至 ${aiSuggestionForm.value.timeframe[1]}`
        } else {
          prompt = `请将以下工作目标分解为月度计划：
工作目标：${aiSuggestionForm.value.customGoal}
关键指标：${aiSuggestionForm.value.keyMetrics}
时间范围：${aiSuggestionForm.value.timeframe[0]} 至 ${aiSuggestionForm.value.timeframe[1]}`
        }
        
        const response = await axios.post('/api/ai-suggestions/monthly-breakdown', {
          prompt,
          timeframe: aiSuggestionForm.value.timeframe
        }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })

        // 保存AI建议结果并显示确认对话框
        aiSuggestionResult.value = response.data
        showAISuggestionDialog.value = false
        showAIConfirmDialog.value = true

      } catch (error) {
        console.error('AI建议生成错误:', error)
        if (error.response) {
          ElMessage.error(`AI建议生成失败: ${error.response.data.error || '服务器错误'}`)
        } else if (error.request) {
          ElMessage.error('网络连接失败，请检查网络连接')
        } else {
          ElMessage.error('AI建议生成失败，请稍后重试')
        }
      } finally {
        generatingAISuggestion.value = false
      }
    }

    const confirmAISuggestion = async () => {
      // 使用第一个月的计划填充表单
      const firstMonthPlan = aiSuggestionResult.value.monthlyPlans[0]
      const monthParts = firstMonthPlan.month.split('-')
      
      newPlan.value = {
        year: parseInt(monthParts[0]),
        month: parseInt(monthParts[1]),
        title: firstMonthPlan.mainObjective,
        description: firstMonthPlan.tasks.map(t => t.title).join('；'),
        objectives: JSON.stringify(firstMonthPlan.metrics)
      }

      showAIConfirmDialog.value = false
      showCreateDialog.value = true
      ElMessage.success('AI月度计划建议已确认，请查看并完善')
    }

    const regenerateAISuggestion = async () => {
      showAIConfirmDialog.value = false
      showAISuggestionDialog.value = true
    }

    const resetForm = () => {
      newPlan.value = {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        title: '',
        description: '',
        objectives: ''
      }
    }

    onMounted(() => {
      fetchPlans()
      fetchAnnualPlans()
    })

    return {
      plans,
      annualPlans,
      selectedPlans,
      loading,
      loadingAnnualPlans,
      showCreateDialog,
      showAISuggestionDialog,
      showAIConfirmDialog,
      showDetailDialog,
      showStatusDialog,
      currentPlan,
      newPlan,
      aiSuggestionForm,
      aiSuggestionResult,
      statusForm,
      years,
      months,
      rules,
      planFormRef,
      selectedAnnualPlan,
      filteredPlans,
      getMonthName,
      getStatusType,
      getStatusText,
      getPriorityType,
      getPriorityText,
      formatDate,
      createPlan,
      viewPlan,
      updateStatus,
      confirmStatusUpdate,
      deletePlan,
      batchDelete,
      handleSelectionChange,
      generateAISuggestion,
      confirmAISuggestion,
      regenerateAISuggestion,
      generateWeeklyPlans,
      filterMonthlyPlans
    }
  }
}
</script>

<style scoped>
.monthly-plans {
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

.ai-confirm-content {
  max-height: 600px;
  overflow-y: auto;
}

.ai-confirm-content h4 {
  margin: 15px 0 10px 0;
  color: #333;
}
</style>

