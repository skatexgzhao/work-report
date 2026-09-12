<template>
  <div class="weekly-plans">
    <div class="header">
      <h3>周工作计划</h3>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">创建周计划</el-button>
        <el-button type="success" @click="testButton">
          <el-icon><MagicStick /></el-icon> AI 周度建议
        </el-button>
        <el-button type="danger" @click="batchDelete" :disabled="selectedPlans.length === 0">
          <el-icon><Delete /></el-icon> 批量删除
        </el-button>
      </div>
    </div>

    <!-- 计划列表 -->
    <el-table 
      :data="plans" 
      style="width: 100%" 
      v-loading="loading"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="year" label="年份" width="100" />
      <el-table-column prop="month" label="月份" width="100" />
      <el-table-column prop="week" label="周数" width="100">
        <template #default="{ row }">
          第{{ row.week }}周
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" width="200" />
      <el-table-column prop="description" label="描述" width="300" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="submitWeeklyReport(row)">
            <el-icon><Document /></el-icon> 提交周报
          </el-button>
          <el-button size="small" type="success" @click="generateMonthlyReport(row)">
            <el-icon><MagicStick /></el-icon> 生成月报
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建周计划对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建周计划" width="600px">
      <el-alert
        v-if="isAIGenerated"
        title="这是AI生成的建议，您可以根据需要进行修改"
        type="info"
        show-icon
        closable
        style="margin-bottom: 20px;"
      />
      <el-form :model="newPlan" ref="planFormRef" label-width="100px">
        <el-form-item label="年份">
          <el-select v-model="newPlan.year" placeholder="选择年份">
            <el-option v-for="year in years" :key="year" :label="year" :value="year" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="月份">
          <el-select v-model="newPlan.month" placeholder="选择月份">
            <el-option v-for="month in months" :key="month.value" :label="month.label" :value="month.value" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="周数">
          <el-select v-model="newPlan.week" placeholder="选择周数">
            <el-option v-for="week in weeks" :key="week" :label="`第${week}周`" :value="week" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="标题">
          <el-input v-model="newPlan.title" placeholder="请输入计划标题" />
        </el-form-item>
        
        <el-form-item label="描述">
          <el-input v-model="newPlan.description" type="textarea" :rows="3" placeholder="请输入计划描述" />
        </el-form-item>
        
        <el-form-item label="目标">
          <el-input v-model="newPlan.objectives" type="textarea" :rows="4" placeholder="请输入具体目标和任务" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createPlan">创建</el-button>
        <el-button v-if="isAIGenerated" type="success" @click="regenerateAISuggestion">
          <el-icon><MagicStick /></el-icon> 重新生成AI建议
        </el-button>
      </template>
    </el-dialog>

    <!-- AI 建议对话框 -->
    <el-dialog v-model="showAISuggestionDialog" title="AI 周度建议" width="600px">
      <el-form :model="aiSuggestionForm" label-width="100px">
        <el-form-item label="月度计划">
          <el-select 
            v-model="aiSuggestionForm.monthlyPlanId" 
            placeholder="选择月度计划（可选）"
            clearable
            @change="onMonthlyPlanChange"
          >
            <el-option 
              v-for="plan in monthlyPlans" 
              :key="plan.id" 
              :label="`${plan.year}年${plan.month}月 - ${plan.title}`" 
              :value="plan.id" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="自定义目标">
          <el-input 
            v-model="aiSuggestionForm.customGoal" 
            type="textarea" 
            :rows="4"
            placeholder="请描述您的工作目标和期望达成的成果..."
          />
        </el-form-item>
        
        <el-form-item label="关键指标">
          <el-input 
            v-model="aiSuggestionForm.keyMetrics" 
            type="textarea" 
            :rows="3"
            placeholder="请列出可量化的关键指标"
          />
        </el-form-item>
        
        <el-form-item label="选择周数">
          <el-select v-model="aiSuggestionForm.selectedWeek" placeholder="选择周数">
            <el-option v-for="week in weeks" :key="week" :label="`第${week}周`" :value="week" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAISuggestionDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="generateAISuggestion" 
          :loading="generatingAISuggestion"
        >
          生成AI建议
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '../api/client'
import { useAuthStore } from '../stores/auth'
import { MagicStick, Delete, Document } from '@element-plus/icons-vue'

export default {
  name: 'WeeklyPlans',
  components: {
    MagicStick,
    Delete
  },
  setup() {
    const authStore = useAuthStore()
    const plans = ref([])
    const monthlyPlans = ref([])
    const loading = ref(false)
    const loadingMonthlyPlans = ref(false)
    const showCreateDialog = ref(false)
    const showAISuggestionDialog = ref(false)
    const selectedPlans = ref([])
    const planFormRef = ref()
    const generatingAISuggestion = ref(false)
    const isAIGenerated = ref(false)

    const newPlan = ref({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      week: getCurrentWeek(),
      title: '',
      description: '',
      objectives: ''
    })

    const aiSuggestionForm = ref({
      monthlyPlanId: '',
      customGoal: '',
      keyMetrics: '',
      selectedWeek: getCurrentWeek()
    })

    const years = ref([2023, 2024, 2025, 2026])
    const months = ref([
      { label: '一月', value: 1 }, { label: '二月', value: 2 }, { label: '三月', value: 3 },
      { label: '四月', value: 4 }, { label: '五月', value: 5 }, { label: '六月', value: 6 },
      { label: '七月', value: 7 }, { label: '八月', value: 8 }, { label: '九月', value: 9 },
      { label: '十月', value: 10 }, { label: '十一月', value: 11 }, { label: '十二月', value: 12 }
    ])
    const weeks = ref([1, 2, 3, 4, 5])

    function getCurrentWeek() {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      const days = Math.floor((now - start) / (24 * 60 * 60 * 1000))
      return Math.ceil((days + start.getDay() + 1) / 7)
    }

    const testButton = () => {
      showAISuggestionDialog.value = true
    }

    const generateAISuggestion = async () => {
      if (!aiSuggestionForm.value.monthlyPlanId && !aiSuggestionForm.value.customGoal.trim()) {
        ElMessage.error('请选择月度计划或输入自定义目标')
        return
      }

      generatingAISuggestion.value = true
      try {
        // 模拟AI建议生成
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        let planTitle = 'AI生成的周工作计划'
        let planDescription = ''
        let planObjectives = ''
        
        // 如果选择了月度计划，基于月度计划生成详细内容
        if (aiSuggestionForm.value.monthlyPlanId) {
          const selectedPlan = monthlyPlans.value.find(plan => plan.id === aiSuggestionForm.value.monthlyPlanId)
          if (selectedPlan) {
            planTitle = `${selectedPlan.title} - 第${aiSuggestionForm.value.selectedWeek}周详细计划`
            planDescription = `基于月度计划"${selectedPlan.title}"的第${aiSuggestionForm.value.selectedWeek}周具体工作安排`
            
            // 生成2-3个具体工作内容
            const weeklyTasks = generateWeeklyTasks(selectedPlan, aiSuggestionForm.value.selectedWeek)
            planObjectives = weeklyTasks.join('\n\n')
          }
        } else {
          // 基于自定义目标生成详细内容
          planTitle = `第${aiSuggestionForm.value.selectedWeek}周详细工作计划`
          planDescription = `基于目标"${aiSuggestionForm.value.customGoal}"生成的详细周计划`
          
          // 为自定义目标生成具体工作内容
          const customTasks = generateCustomTasks(aiSuggestionForm.value.customGoal, aiSuggestionForm.value.keyMetrics)
          planObjectives = customTasks.join('\n\n')
        }
        
        newPlan.value = {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          week: aiSuggestionForm.value.selectedWeek,
          title: planTitle,
          description: planDescription,
          objectives: planObjectives
        }

        // 标记为AI生成，显示编辑提示
        isAIGenerated.value = true
        showAISuggestionDialog.value = false
        showCreateDialog.value = true
        ElMessage.success('AI周计划建议已生成，请查看并根据需要修改')

      } catch (error) {
        console.error('AI建议生成错误:', error)
        ElMessage.error('AI建议生成失败，请稍后重试')
      } finally {
        generatingAISuggestion.value = false
      }
    }

    const batchDelete = () => {
      if (selectedPlans.value.length === 0) {
        ElMessage.warning('请先选择要删除的计划')
        return
      }
      ElMessage.info(`批量删除 ${selectedPlans.value.length} 个计划`)
    }

    const handleSelectionChange = (selection) => {
      selectedPlans.value = selection
    }

    const createPlan = async () => {
      try {
        await axios.post('/api/plans/weekly', newPlan.value, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        ElMessage.success('周计划创建成功')
        showCreateDialog.value = false
        resetForm()
        fetchPlans()
      } catch (error) {
        ElMessage.error('创建失败')
      }
    }

    const resetForm = () => {
      newPlan.value = {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        week: getCurrentWeek(),
        title: '',
        description: '',
        objectives: ''
      }
      isAIGenerated.value = false
    }

    const regenerateAISuggestion = () => {
      // 重新打开AI建议对话框，保留之前的设置
      showCreateDialog.value = false
      showAISuggestionDialog.value = true
    }

    // 生成基于月度计划的周度具体工作内容
    const generateWeeklyTasks = (monthlyPlan, weekNumber) => {
      const tasks = []
      
      // 根据周数生成不同的工作重点
      if (weekNumber === 1) {
        tasks.push(
          `1. 月度计划启动与目标分解\n   - 明确本月工作目标和关键指标\n   - 制定详细的工作计划和时间安排\n   - 分配资源和确定责任人`,
          `2. 重点工作准备\n   - 收集相关资料和数据\n   - 准备必要的工具和文档\n   - 与相关团队沟通协调`,
          `3. 进度监控机制建立\n   - 设置关键节点检查点\n   - 建立定期汇报机制\n   - 制定风险应对预案`
        )
      } else if (weekNumber === 2) {
        tasks.push(
          `1. 核心任务执行\n   - 推进主要工作项目的实施\n   - 解决执行过程中的技术问题\n   - 确保工作质量和进度符合要求`,
          `2. 中期检查与调整\n   - 检查工作进度与计划对比\n   - 分析存在的问题和挑战\n   - 根据实际情况调整后续计划`,
          `3. 团队协作与沟通\n   - 组织团队工作会议\n   - 协调跨部门合作事项\n   - 及时汇报工作进展`
        )
      } else if (weekNumber === 3) {
        tasks.push(
          `1. 关键任务攻坚\n   - 集中精力解决重点难点问题\n   - 确保关键里程碑按时完成\n   - 优化工作流程提高效率`,
          `2. 质量检查与改进\n   - 对已完成工作进行质量评估\n   - 收集反馈并进行改进\n   - 准备阶段性成果展示`,
          `3. 资源协调与支持\n   - 确保所需资源及时到位\n   - 协调外部支持和配合\n   - 解决资源瓶颈问题`
        )
      } else {
        tasks.push(
          `1. 收尾与总结\n   - 完成本月所有收尾工作\n   - 整理工作成果和文档\n   - 准备月度工作总结报告`,
          `2. 成果评估与复盘\n   - 评估目标完成情况\n   - 分析成功经验和不足之处\n   - 制定改进措施`,
          `3. 下月计划准备\n   - 基于本月经验制定下月计划\n   - 提前准备下月工作资源\n   - 与相关方沟通下月工作安排`
        )
      }
      
      return tasks
    }

    // 生成基于自定义目标的周度具体工作内容
    const generateCustomTasks = (goal, keyMetrics) => {
      const tasks = []
      
      tasks.push(
        `1. 目标分析与计划制定\n   - 深入理解工作目标和要求\n   - 制定详细的执行计划和时间表\n   - 明确关键成功指标和验收标准`,
        `2. 核心任务执行\n   - 按照计划推进主要工作内容\n   - 解决执行过程中的技术难题\n   - 确保工作质量和进度符合预期`,
        `3. 进度监控与优化\n   - 定期检查工作进展情况\n   - 及时调整优化工作方法\n   - 确保最终达成预期目标`
      )
      
      if (keyMetrics) {
        tasks.push(`4. 关键指标达成\n   - ${keyMetrics.split(',').map(metric => `确保${metric.trim()}`).join('\n   - ')}`)
      }
      
      return tasks
    }

    const fetchPlans = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/plans/weekly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        plans.value = response.data
      } catch (error) {
        ElMessage.error('获取周计划失败')
      } finally {
        loading.value = false
      }
    }

    const fetchMonthlyPlans = async () => {
      loadingMonthlyPlans.value = true
      try {
        const response = await axios.get('/api/plans/monthly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        monthlyPlans.value = response.data
      } catch (error) {
        ElMessage.error('获取月度计划失败')
      } finally {
        loadingMonthlyPlans.value = false
      }
    }

    const onMonthlyPlanChange = (monthlyPlanId) => {
      if (monthlyPlanId) {
        const selectedPlan = monthlyPlans.value.find(plan => plan.id === monthlyPlanId)
        if (selectedPlan) {
          // 自动填充基于月度计划的信息
          aiSuggestionForm.value.customGoal = `基于月度计划"${selectedPlan.title}"的周度分解`
          aiSuggestionForm.value.keyMetrics = selectedPlan.objectives || ''
        }
      } else {
        // 清空自定义目标
        aiSuggestionForm.value.customGoal = ''
        aiSuggestionForm.value.keyMetrics = ''
      }
    }

    // 提交周报
    const submitWeeklyReport = async (plan) => {
      try {
        // 基于周计划自动生成周报内容
        const achievements = `基于周计划"${plan.title}"完成的工作：\n${plan.objectives || '无具体工作内容'}`;
        const challenges = '本周工作中遇到的挑战和问题';
        const nextWeekPlan = '下周工作计划和安排';

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
        });

        ElMessage.success('周报提交成功');
        ElMessage.info(`AI生成的工作亮点: ${response.data.highlights}`);
        
        // 刷新计划列表
        fetchPlans();
        
      } catch (error) {
        console.error('提交周报失败:', error);
        ElMessage.error('提交周报失败');
      }
    }

    // 生成月度报告
    const generateMonthlyReport = async (plan) => {
      try {
        const response = await axios.post('/api/reports/monthly/generate', {
          month: plan.month,
          year: plan.year
        }, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });

        ElMessage.success('月度报告生成成功');
        ElMessage.info(`月度总结: ${response.data.summary}`);
        
      } catch (error) {
        console.error('生成月度报告失败:', error);
        if (error.response?.data?.error) {
          ElMessage.error(`生成月度报告失败: ${error.response.data.error}`);
        } else {
          ElMessage.error('生成月度报告失败');
        }
      }
    }

    onMounted(() => {
      fetchPlans()
      fetchMonthlyPlans()
    })
    
    return {
      plans,
      monthlyPlans,
      loading,
      loadingMonthlyPlans,
      showCreateDialog,
      showAISuggestionDialog,
      selectedPlans,
      newPlan,
      aiSuggestionForm,
      planFormRef,
      years,
      months,
      weeks,
      generatingAISuggestion,
      isAIGenerated,
      testButton,
      batchDelete,
      handleSelectionChange,
      createPlan,
      generateAISuggestion,
      regenerateAISuggestion,
      onMonthlyPlanChange,
      generateWeeklyTasks,
      generateCustomTasks,
      submitWeeklyReport,
      generateMonthlyReport
    }
  }
}
</script>

<style scoped>
.weekly-plans {
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}
</style>

