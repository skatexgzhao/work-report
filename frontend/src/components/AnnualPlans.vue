
<template>
  <div>
    <div class="header-actions">
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon> 创建年度计划
      </el-button>
      <el-button type="success" @click="showAISuggestionDialog = true">
        <el-icon><MagicStick /></el-icon> AI 智能建议
      </el-button>
      <el-button type="danger" @click="batchDelete" :disabled="selectedPlans.length === 0">
        <el-icon><Delete /></el-icon> 批量删除
      </el-button>
    </div>

    <el-table 
      :data="annualPlans" 
      style="width: 100%" 
      v-loading="loading"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="year" label="年份" width="100" />
      <el-table-column prop="title" label="计划标题" width="200" />
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
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
    <el-table-column type="selection" width="55" />
    <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button size="small" @click="editPlan(row)">编辑</el-button>
          <el-button 
            size="small" 
            :type="row.status === 'completed' ? 'warning' : 'success'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 'completed' ? '标记未完成' : '标记完成' }}
          </el-button>
          <el-button size="small" type="danger" @click="deletePlan(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingPlan ? '编辑年度计划' : '创建年度计划'"
      width="500px"
    >
      <el-form :model="planForm" :rules="rules" ref="planFormRef" label-width="100px">
        <el-form-item label="年份" prop="year">
          <el-input-number v-model="planForm.year" :min="2020" :max="2030" />
        </el-form-item>
        <el-form-item label="计划标题" prop="title">
          <el-input v-model="planForm.title" placeholder="请输入计划标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="planForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入计划描述"
          />
        </el-form-item>
        <el-form-item label="目标" prop="objectives">
          <el-input 
            v-model="planForm.objectives" 
            type="textarea" 
            :rows="4"
            placeholder="请输入年度目标"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="submitPlan" :loading="submitting">
          {{ editingPlan ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- AI 建议对话框 -->
    <el-dialog
      v-model="showAISuggestionDialog"
      title="AI 年度计划建议"
      width="600px"
    >
      <el-alert
        v-if="aiSuggestionError"
        :title="aiSuggestionError"
        type="warning"
        show-icon
        closable
        style="margin-bottom: 20px;"
      />
      <el-form :model="aiSuggestionForm" label-width="100px">
        <el-form-item label="工作目标">
          <el-input 
            v-model="aiSuggestionForm.goal" 
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
          生成AI建议
        </el-button>
      </template>
    </el-dialog>

    <!-- AI 建议确认对话框 -->
    <el-dialog
      v-model="showAIConfirmDialog"
      title="AI 建议确认"
      width="800px"
    >
      <div v-if="aiSuggestionResult" class="ai-confirm-content">
        <h4>年度计划建议</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="计划标题">
            {{ aiSuggestionResult.annualPlan.title }}
          </el-descriptions-item>
          <el-descriptions-item label="年度目标">
            {{ aiSuggestionResult.annualPlan.objective }}
          </el-descriptions-item>
          <el-descriptions-item label="战略措施">
            <ul>
              <li v-for="strategy in aiSuggestionResult.annualPlan.strategies" :key="strategy">
                {{ strategy }}
              </li>
            </ul>
          </el-descriptions-item>
          <el-descriptions-item label="预期成果">
            <ul>
              <li v-for="outcome in aiSuggestionResult.annualPlan.expectedOutcomes" :key="outcome">
                {{ outcome }}
              </li>
            </ul>
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px;">月度计划概览</h4>
        <el-table :data="aiSuggestionResult.monthlyPlans" height="300">
          <el-table-column prop="month" label="月份" width="100" />
          <el-table-column prop="title" label="月度主题" width="200" />
          <el-table-column prop="tasks" label="任务数量">
            <template #default="{ row }">
              {{ row.tasks?.length || 0 }} 个任务
            </template>
          </el-table-column>
          <el-table-column prop="keyMetrics" label="关键指标">
            <template #default="{ row }">
              {{ row.keyMetrics?.join('，') || '' }}
            </template>
          </el-table-column>
        </el-table>
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
import axios from '../api/client'
import { ElMessage } from 'element-plus'
import { Plus, MagicStick, Delete } from '@element-plus/icons-vue'

export default {
  name: 'AnnualPlans',
  components: {
    Plus,
    MagicStick,
    Delete
  },
  setup() {
    const annualPlans = ref([])
    const loading = ref(false)
    const showCreateDialog = ref(false)
    const showAISuggestionDialog = ref(false)
    const showAIConfirmDialog = ref(false)
    const editingPlan = ref(null)
    const submitting = ref(false)
    const generatingAISuggestion = ref(false)
    const selectedPlans = ref([])
    const aiSuggestionResult = ref(null)
    const aiSuggestionError = ref('')
    
    const planForm = ref({
      year: new Date().getFullYear(),
      title: '',
      description: '',
      objectives: ''
    })

    const aiSuggestionForm = ref({
      goal: '',
      keyMetrics: '',
      timeframe: [new Date().getFullYear() + '-01', new Date().getFullYear() + '-12']
    })
    
    const planFormRef = ref()
    
    const rules = {
      year: [{ required: true, message: '请选择年份', trigger: 'blur' }],
      title: [{ required: true, message: '请输入计划标题', trigger: 'blur' }]
    }
    
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
    
    const submitPlan = async () => {
      if (!planFormRef.value) return
      
      await planFormRef.value.validate(async (valid) => {
        if (valid) {
          submitting.value = true
          try {
            const url = editingPlan.value 
              ? `/api/plans/annual/${editingPlan.value.id}`
              : '/api/plans/annual'
            
            const method = editingPlan.value ? 'put' : 'post'
            
            await axios({
              method,
              url,
              data: planForm.value,
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            
            ElMessage.success(editingPlan.value ? '更新成功' : '创建成功')
            showCreateDialog.value = false
            resetForm()
            fetchAnnualPlans()
          } catch (error) {
            ElMessage.error('操作失败')
          } finally {
            submitting.value = false
          }
        }
      })
    }
    
    const editPlan = (plan) => {
      editingPlan.value = plan
      planForm.value = {
        year: plan.year,
        title: plan.title,
        description: plan.description,
        objectives: plan.objectives
      }
      showCreateDialog.value = true
    }
    
    const toggleStatus = async (plan) => {
      const newStatus = plan.status === 'completed' ? 'pending' : 'completed'
      try {
        await axios.put(
          `/api/plans/annual/${plan.id}/status`,
          { status: newStatus },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        )
        ElMessage.success('状态更新成功')
        fetchAnnualPlans()
      } catch (error) {
        ElMessage.error('状态更新失败')
      }
    }

    const deletePlan = async (plan) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除年度计划 "${plan.title}" 吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        await axios.delete(`/api/plans/annual/${plan.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        
        ElMessage.success('删除成功')
        fetchAnnualPlans()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败')
        }
      }
    }

    const batchDelete = async () => {
      try {
        await ElMessageBox.confirm(
          `确定要删除选中的 ${selectedPlans.value.length} 个年度计划吗？此操作不可恢复。`,
          '确认批量删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        const deletePromises = selectedPlans.value.map(plan => 
          axios.delete(`/api/plans/annual/${plan.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
        )
        
        await Promise.all(deletePromises)
        ElMessage.success(`成功删除 ${selectedPlans.value.length} 个年度计划`)
        selectedPlans.value = []
        fetchAnnualPlans()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('批量删除失败')
        }
      }
    }

    const handleSelectionChange = (selection) => {
      selectedPlans.value = selection
    }
    
    const resetForm = () => {
      editingPlan.value = null
      planForm.value = {
        year: new Date().getFullYear(),
        title: '',
        description: '',
        objectives: ''
      }
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

    const createMonthlyPlansFromAnnual = async (monthlyPlans) => {
      try {
        let successCount = 0
        let errorCount = 0
        
        for (const monthPlan of monthlyPlans) {
          try {
            const [year, month] = monthPlan.month.split('-')
            
            // 构建任务描述
            const tasksDescription = monthPlan.tasks?.map(task => 
              `${task.title}（${task.priority}优先级，预计${task.estimatedHours}小时）`
            ).join('；') || ''
            
            // 构建指标描述
            const metricsDescription = monthPlan.keyMetrics?.join('；') || ''
            
            await axios.post('/api/plans/monthly', {
              year: parseInt(year),
              month: parseInt(month),
              title: monthPlan.title || `${month}月工作计划`,
              description: tasksDescription || '暂无具体任务描述',
              objectives: metricsDescription || '暂无关键指标',
              status: 'pending'
            }, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            
            successCount++
            
            // 添加小延迟避免请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 100))
            
          } catch (error) {
            console.error(`创建 ${monthPlan.month} 月度计划失败:`, error)
            errorCount++
          }
        }
        
        if (successCount > 0) {
          ElMessage.success(`成功创建 ${successCount} 个月度计划`)
        }
        if (errorCount > 0) {
          ElMessage.warning(`${errorCount} 个月度计划创建失败，请手动检查`)
        }
        
      } catch (error) {
        console.error('创建月度计划总体失败:', error)
        ElMessage.error('月度计划创建失败，请手动创建')
      }
    }

    const generateAISuggestion = async () => {
      if (!aiSuggestionForm.value.goal.trim()) {
        ElMessage.error('请输入工作目标')
        return
      }

      generatingAISuggestion.value = true
      aiSuggestionError.value = ''
      try {
        const response = await axios.post('/api/ai-suggestions/annual-breakdown', {
          goal: aiSuggestionForm.value.goal,
          keyMetrics: aiSuggestionForm.value.keyMetrics,
          year: new Date().getFullYear()
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })

        // 检查是否有AI错误信息
        if (response.data.aiError) {
          aiSuggestionError.value = response.data.aiError
          ElMessage.warning('AI服务暂时不可用，已使用默认计划模板')
        }

        // 保存AI建议结果
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
      const aiPlan = aiSuggestionResult.value
        
      // 生成年度计划描述
      const strategies = aiPlan.annualPlan.strategies?.join('；') || ''
      const outcomes = aiPlan.annualPlan.expectedOutcomes?.join('；') || ''
      
      planForm.value = {
        year: new Date().getFullYear(),
        title: aiPlan.annualPlan.title,
        description: aiPlan.annualPlan.objective,
        objectives: `战略措施：${strategies}\n预期成果：${outcomes}`
      }

      // 自动创建月度计划
      await createMonthlyPlansFromAnnual(aiPlan.monthlyPlans)

      showAIConfirmDialog.value = false
      showCreateDialog.value = true
      ElMessage.success('AI年度计划建议已确认，并自动创建了12个月度计划')
    }

    const regenerateAISuggestion = async () => {
      showAIConfirmDialog.value = false
      showAISuggestionDialog.value = true
      // 保留原有的目标和关键指标，用户可以修改
    }
    
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('zh-CN')
    }
    
    onMounted(() => {
      fetchAnnualPlans()
    })
    
    return {
      annualPlans,
      selectedPlans,
      loading,
      showCreateDialog,
      showAISuggestionDialog,
      showAIConfirmDialog,
      editingPlan,
      submitting,
      generatingAISuggestion,
      aiSuggestionError,
      planForm,
      aiSuggestionForm,
      aiSuggestionResult,
      planFormRef,
      rules,
      submitPlan,
      editPlan,
      toggleStatus,
      deletePlan,
      batchDelete,
      handleSelectionChange,
      generateAISuggestion,
      confirmAISuggestion,
      regenerateAISuggestion,
      getStatusType,
      getStatusText,
      formatDate
    }
  }
}
</script>

<style scoped>
.header-actions {
  margin-bottom: 20px;
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

.ai-confirm-content ul {
  margin: 0;
  padding-left: 20px;
}

.ai-confirm-content li {
  margin-bottom: 5px;
  line-height: 1.4;
}
</style>

