
<template>
  <div class="dashboard">
    <el-container>
      <el-header>
        <div class="header-content">
          <h2>员工工作台 - 引导式工作计划</h2>
          <div class="user-info">
            <span>欢迎, {{ user?.username }}</span>
            <el-button type="danger" size="small" @click="handleLogout">退出</el-button>
          </div>
        </div>
      </el-header>
      
      <el-main>
        <!-- 引导式工作流程 -->
        <div v-if="showGuidedWorkflow" class="guided-workflow">
          <div class="workflow-header">
            <h2>工作计划设定</h2>
            <p class="subtitle">请按照以下步骤完成您的工作计划设定</p>
          </div>
          
          <div class="workflow-steps">
            <el-steps :active="workflowStep" align-center>
              <el-step title="年度重点任务" description="设定年度工作目标" />
              <el-step title="月度计划确认" description="确认自动生成的月度计划" />
              <el-step title="工作计划完成" description="开始执行工作计划" />
            </el-steps>
          </div>

          <!-- 步骤1: 年度重点任务设定 -->
          <div v-if="workflowStep === 0" class="step-panel">
            <h3>第一步：设定年度重点工作任务</h3>
            <p class="step-description">请详细描述您本年度的主要工作目标和重点任务，系统将根据您的输入自动生成12个月的详细工作计划。</p>
            
            <el-form :model="annualPlanForm" :rules="annualRules" ref="annualFormRef" label-width="120px">
              <el-form-item label="年度目标" prop="title">
                <el-input 
                  v-model="annualPlanForm.title" 
                  placeholder="请输入年度工作目标标题，如：提升产品用户体验"
                  size="large"
                />
              </el-form-item>
              
              <el-form-item label="详细描述" prop="description">
                <el-input 
                  v-model="annualPlanForm.description" 
                  type="textarea" 
                  :rows="4"
                  placeholder="请详细描述您的年度工作目标，包括期望达成的成果、关键指标等..."
                />
              </el-form-item>
              
              <el-form-item label="关键指标" prop="objectives">
                <el-input 
                  v-model="annualPlanForm.objectives" 
                  type="textarea" 
                  :rows="3"
                  placeholder="请输入可量化的关键指标，如：用户满意度提升20%，产品功能完成度达到95%等..."
                />
              </el-form-item>
              
              <el-form-item label="工作重点">
                <el-input 
                  v-model="annualPlanForm.keyFocus" 
                  type="textarea" 
                  :rows="3"
                  placeholder="请列出本年度的工作重点和优先级..."
                />
              </el-form-item>
            </el-form>
            
            <div class="step-actions">
              <el-button type="primary" size="large" @click="generateMonthlyPlans" :loading="generatingMonthly">
                <el-icon><MagicStick /></el-icon>
                生成月度工作计划
              </el-button>
              <el-button @click="showGuidedWorkflow = false">取消</el-button>
            </div>
          </div>

          <!-- 步骤2: 月度计划确认 -->
          <div v-if="workflowStep === 1" class="step-panel">
            <h3>第二步：确认月度工作计划</h3>
            <p class="step-description">系统已根据您的年度目标自动生成12个月的工作计划，请仔细检查并确认。</p>
            
            <div class="monthly-plans-grid">
              <el-card 
                v-for="(plan, index) in generatedMonthlyPlans" 
                :key="index" 
                class="monthly-plan-card"
                :class="{ 'current-month': isCurrentMonth(plan.month) }"
              >
                <template #header>
                  <div class="plan-header">
                    <span class="month-title">{{ getMonthName(plan.month) }}</span>
                    <el-tag v-if="isCurrentMonth(plan.month)" type="success">当前月份</el-tag>
                  </div>
                </template>
                
                <div class="plan-content">
                  <h4>{{ plan.title }}</h4>
                  <p class="plan-description">{{ plan.description }}</p>
                  
                  <div class="plan-objectives">
                    <strong>关键任务：</strong>
                    <ul>
                      <li v-for="(task, taskIndex) in plan.tasks" :key="taskIndex">
                        {{ task }}
                      </li>
                    </ul>
                  </div>
                  
                  <div class="plan-metrics">
                    <strong>关键指标：</strong>
                    <p>{{ plan.keyMetrics }}</p>
                  </div>
                </div>
                
                <template #footer>
                  <el-button type="primary" size="small" @click="editMonthlyPlan(plan, index)">
                    编辑计划
                  </el-button>
                </template>
              </el-card>
            </div>
            
            <div class="step-actions">
              <el-button @click="workflowStep = 0">返回修改</el-button>
              <el-button type="primary" @click="confirmMonthlyPlans" :loading="confirmingMonthly">
                确认所有月度计划
              </el-button>
            </div>
          </div>

          <!-- 步骤3: 完成 -->
          <div v-if="workflowStep === 2" class="step-panel success-panel">
            <div class="success-content">
              <el-result icon="success" title="工作计划设定完成！">
                <template #extra>
                  <p class="success-message">您的年度和月度工作计划已成功创建，现在可以开始执行工作计划了。</p>
                  <div class="next-actions">
                    <el-button type="primary" @click="goToWeeklyPlans">
                      查看周计划
                    </el-button>
                    <el-button @click="showGuidedWorkflow = false; checkAnnualPlan();">
                      进入工作台
                    </el-button>
                  </div>
                </template>
              </el-result>
            </div>
          </div>
        </div>

        <!-- 常规工作台 -->
        <div v-else class="regular-dashboard">
          <div class="dashboard-header">
            <h3>年度工作计划管理</h3>
            <div class="header-actions">
              <el-button type="primary" @click="startNewAnnualPlan">
                <el-icon><Plus /></el-icon>
                新增年度计划
              </el-button>
            </div>
          </div>
          
          <!-- 年度计划列表 -->
          <div class="annual-plans-list">
            <el-row :gutter="20">
              <el-col :span="8" v-for="plan in existingAnnualPlans" :key="plan.id">
                <el-card class="annual-plan-card">
                  <template #header>
                    <div class="plan-header">
                      <h4>{{ plan.year }}年 - {{ plan.title }}</h4>
                      <el-tag :type="getStatusType(plan.status)">
                        {{ getStatusText(plan.status) }}
                      </el-tag>
                    </div>
                  </template>
                  
                  <div class="plan-content">
                    <p class="plan-description">{{ plan.description }}</p>
                    <div class="plan-objectives">
                      <strong>目标:</strong>
                      <p>{{ plan.objectives }}</p>
                    </div>
                  </div>
                  
                  <template #footer>
                    <div class="plan-actions">
                      <el-button size="small" @click="viewPlanDetails(plan)">查看详情</el-button>
                      <el-button size="small" type="warning" @click="regeneratePlan(plan)">重新生成</el-button>
                      <el-button size="small" type="danger" @click="deletePlan(plan)">删除</el-button>
                    </div>
                  </template>
                </el-card>
              </el-col>
            </el-row>
          </div>
          
          <el-tabs v-model="activeTab">
            <el-tab-pane label="工作概览" name="overview">
              <div class="overview-dashboard">
                <el-row :gutter="20">
                  <el-col :span="6">
                    <el-statistic title="年度计划" :value="annualPlansCount" />
                  </el-col>
                  <el-col :span="6">
                    <el-statistic title="月度计划" :value="monthlyPlansCount" />
                  </el-col>
                  <el-col :span="6">
                    <el-statistic title="周计划" :value="weeklyPlansCount" />
                  </el-col>
                  <el-col :span="6">
                    <el-statistic title="待提交周报" :value="pendingReportsCount" />
                  </el-col>
                </el-row>
                
                <el-divider />
                
                <!-- 删除报告生成流程 -->
                <div class="workflow-intro">
                  <h4>工作计划执行流程</h4>
                  <p>基于您的年度和月度计划，系统将自动帮助您管理周计划和生成工作报告。</p>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="周计划" name="weekly">
              <weekly-plans />
            </el-tab-pane>
            
            <el-tab-pane label="周报" name="weeklyReports">
              <weekly-reports />
            </el-tab-pane>
            
            <el-tab-pane label="月度计划" name="monthly">
              <monthly-plans />
            </el-tab-pane>
            
            <el-tab-pane label="年度计划" name="annual">
              <annual-plans />
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-main>
    </el-container>

    <!-- 编辑月度计划对话框 -->
    <el-dialog
      v-model="showEditMonthlyDialog"
      :title="`编辑${getMonthName(editingMonthlyPlan.month)}计划`"
      width="600px"
    >
      <el-form :model="editingMonthlyPlan" label-width="100px">
        <el-form-item label="月度主题">
          <el-input v-model="editingMonthlyPlan.title" />
        </el-form-item>
        
        <el-form-item label="工作描述">
          <el-input v-model="editingMonthlyPlan.description" type="textarea" :rows="3" />
        </el-form-item>
        
        <el-form-item label="关键任务">
          <el-input 
            v-model="editingMonthlyPlan.tasksText" 
            type="textarea" 
            :rows="4"
            placeholder="每行一个任务"
          />
        </el-form-item>
        
        <el-form-item label="关键指标">
          <el-input v-model="editingMonthlyPlan.keyMetrics" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showEditMonthlyDialog = false">取消</el-button>
        <el-button type="primary" @click="saveMonthlyPlanEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import AnnualPlans from '../components/AnnualPlans.vue'
import MonthlyPlans from '../components/MonthlyPlans.vue'
import WeeklyPlans from '../components/WeeklyPlans.vue'
import WeeklyReports from '../components/WeeklyReports.vue'
import MonthlyReports from '../components/MonthlyReports.vue'
import AnnualSummary from '../components/AnnualSummary.vue'

import { MagicStick, Refresh, Delete, Plus } from '@element-plus/icons-vue'
import axios from '../api/client'

export default {
  name: 'EmployeeDashboard',
  components: {
    'annual-plans': AnnualPlans,
    'monthly-plans': MonthlyPlans,
    'weekly-plans': WeeklyPlans,
    'weekly-reports': WeeklyReports,
    'monthly-reports': MonthlyReports,
    'annual-summary': AnnualSummary,

    MagicStick
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const activeTab = ref('overview')
    const user = computed(() => authStore.user)
    
    // 引导式工作流程相关状态
    const hasAnnualPlan = ref(false)
    const showGuidedWorkflow = ref(false)
    const workflowStep = ref(0) // 0: 年度目标, 1: 月度确认, 2: 完成
    const generatingMonthly = ref(false)
    const confirmingMonthly = ref(false)
    const showEditMonthlyDialog = ref(false)
    const existingAnnualPlans = ref([])
    const selectedAnnualPlan = ref(null)
    
    // 年度计划表单
    const annualPlanForm = ref({
      year: new Date().getFullYear(),
      title: '',
      description: '',
      objectives: '',
      keyFocus: ''
    })
    
    const annualFormRef = ref()
    
    const annualRules = {
      title: [{ required: true, message: '请输入年度目标标题', trigger: 'blur' }],
      description: [{ required: true, message: '请输入年度目标详细描述', trigger: 'blur' }],
      objectives: [{ required: true, message: '请输入关键指标', trigger: 'blur' }]
    }
    
    // 生成的月度计划
    const generatedMonthlyPlans = ref([])
    const editingMonthlyPlan = ref({})
    const editingMonthlyIndex = ref(-1)
    
    // 统计数据
    const annualPlansCount = ref(0)
    const monthlyPlansCount = ref(0)
    const weeklyPlansCount = ref(0)
    const pendingReportsCount = ref(0)
    
    // 检查是否已有年度计划
    const checkAnnualPlan = async () => {
      try {
        const response = await axios.get('/api/plans/annual', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        hasAnnualPlan.value = response.data && response.data.length > 0
        existingAnnualPlans.value = response.data || []
        annualPlansCount.value = response.data.length
        console.log('检查到年度计划数量:', response.data.length)
      } catch (error) {
        console.error('检查年度计划失败:', error)
        hasAnnualPlan.value = false
        existingAnnualPlans.value = []
      }
    }
    

    
    // 开始新增年度计划
    const startNewAnnualPlan = () => {
      showGuidedWorkflow.value = true
      workflowStep.value = 0
      selectedAnnualPlan.value = null
      // 重置表单
      annualPlanForm.value = {
        year: new Date().getFullYear(),
        title: '',
        description: '',
        objectives: '',
        keyFocus: ''
      }
    }
    
    // 生成月度计划
    const generateMonthlyPlans = async () => {
      if (!annualFormRef.value) return
      
      await annualFormRef.value.validate(async (valid) => {
        if (valid) {
          generatingMonthly.value = true
          try {
            // 调用AI接口生成月度计划
            const response = await axios.post('/api/ai-suggestions/annual-breakdown', {
              goal: annualPlanForm.value.description,
              keyMetrics: annualPlanForm.value.objectives,
              keyFocus: annualPlanForm.value.keyFocus,
              year: annualPlanForm.value.year
            }, {
              headers: { Authorization: `Bearer ${authStore.token}` }
            })
            
            if (response.data && response.data.monthlyPlans) {
              generatedMonthlyPlans.value = response.data.monthlyPlans.map(plan => {
                // 从month字段解析年份和月份
                const [year, month] = plan.month.split('-').map(Number)
                
                // 将任务对象数组转换为字符串数组
                const taskStrings = plan.tasks ? plan.tasks.map(task => 
                  `${task.title} - ${task.description} (${task.priority}优先级, ${task.estimatedHours}小时)`
                ) : []
                
                return {
                  ...plan,
                  year: year,  // 添加年份字段
                  month: month,  // 添加月份字段（数字）
                  tasks: taskStrings,  // 存储为字符串数组用于显示
                  tasksText: taskStrings.join('\n'),
                  originalTasks: plan.tasks || [],  // 保持原始任务对象
                  keyMetrics: plan.keyMetrics ? plan.keyMetrics.join('，') : ''
                }
              })
              workflowStep.value = 1
              ElMessage.success('月度计划生成成功！')
            } else {
              // 如果AI服务不可用，使用默认模板
              generateDefaultMonthlyPlans()
              workflowStep.value = 1
              ElMessage.info('使用默认模板生成月度计划')
            }
          } catch (error) {
            console.error('AI调用详细错误:', error)
            console.error('错误状态:', error.response?.status)
            console.error('错误数据:', error.response?.data)
            console.error('错误消息:', error.message)
            console.error('错误代码:', error.code)
            
            let errorMessage = 'AI服务暂时不可用'
            if (error.response?.status === 401) {
              errorMessage = 'AI服务配置错误，请联系管理员'
            } else if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
              errorMessage = '网络连接失败，请检查网络连接'
            } else if (error.response?.status === 500) {
              errorMessage = '服务器内部错误，请联系管理员'
            }
            
            // 使用默认模板
            generateDefaultMonthlyPlans()
            workflowStep.value = 1
            ElMessage.warning(`${errorMessage}，已使用默认模板生成月度计划`)
          } finally {
            generatingMonthly.value = false
          }
        }
      })
    }
    
    // 生成智能默认月度计划模板
    const generateDefaultMonthlyPlans = () => {
      const currentYear = annualPlanForm.value.year
      const months = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
      ]
      
      // 根据年度目标智能生成季度重点
      const quarterlyFocus = [
        { quarter: '第一季度', focus: '规划启动', tasks: ['项目规划', '资源准备', '团队组建'] },
        { quarter: '第二季度', focus: '核心开发', tasks: ['功能开发', '测试验证', '问题修复'] },
        { quarter: '第三季度', focus: '优化完善', tasks: ['性能优化', '用户体验', '功能完善'] },
        { quarter: '第四季度', focus: '总结交付', tasks: ['项目总结', '成果交付', '经验沉淀'] }
      ]
      
      generatedMonthlyPlans.value = months.map((monthName, index) => {
        const month = index + 1
        const quarterIndex = Math.floor(index / 3)
        const quarter = quarterlyFocus[quarterIndex]
        const monthInQuarter = (index % 3) + 1
        
        // 根据季度和月份生成智能任务
        let specificTasks = []
        if (monthInQuarter === 1) {
          specificTasks = [
            `${quarter.tasks[0]} - 启动${quarter.focus}阶段工作 (high优先级, 48小时)`,
            `制定${monthName}详细计划 - 明确工作目标和时间节点 (high优先级, 32小时)`,
            `资源协调准备 - 确保${quarter.focus}所需资源到位 (medium优先级, 24小时)`
          ]
        } else if (monthInQuarter === 2) {
          specificTasks = [
            `${quarter.tasks[1]} - 推进${quarter.focus}核心工作 (high优先级, 64小时)`,
            `中期检查评估 - 检查工作进度和质量 (medium优先级, 24小时)`,
            `问题排查解决 - 及时发现和处理工作问题 (high优先级, 32小时)`
          ]
        } else {
          specificTasks = [
            `${quarter.tasks[2]} - 完成${quarter.focus}收尾工作 (high优先级, 56小时)`,
            `成果总结汇报 - 整理${monthName}工作成果 (medium优先级, 24小时)`,
            `下阶段规划 - 准备下一季度工作计划 (medium优先级, 16小时)`
          ]
        }
        
        // 添加通用任务
        const commonTasks = [
          `团队协作沟通 - 保持团队信息同步 (medium优先级, 16小时)`,
          `技能学习提升 - 持续学习专业知识 (low优先级, 8小时)`
        ]
        
        const allTasks = [...specificTasks, ...commonTasks]
        
        return {
          month: month,
          title: `${monthName}${quarter.focus}工作计划`,
          description: `基于年度目标"${annualPlanForm.value.title}"，在${quarter.quarter}的${monthName}重点开展${quarter.focus}工作`,
          tasks: allTasks,
          tasksText: allTasks.join('\n'),
          originalTasks: allTasks.map(task => {
            const parts = task.split(' - ')
            const priorityMatch = task.match(/\((.*?)优先级/)
            const hoursMatch = task.match(/(\d+)小时/)
            
            return {
              title: parts[0] || task,
              description: parts[1]?.split(' (')[0] || '任务描述',
              priority: priorityMatch ? priorityMatch[1].toLowerCase() : 'medium',
              estimatedHours: hoursMatch ? parseInt(hoursMatch[1]) : 40
            }
          }),
          keyMetrics: `完成${quarter.focus}阶段目标，达成${annualPlanForm.value.objectives}`,
          year: currentYear
        }
      })
    }
    
    // 编辑月度计划
    const editMonthlyPlan = (plan, index) => {
      editingMonthlyPlan.value = { ...plan }
      editingMonthlyIndex.value = index
      showEditMonthlyDialog.value = true
    }
    
    // 保存月度计划编辑
    const saveMonthlyPlanEdit = () => {
      if (editingMonthlyIndex.value >= 0) {
        // 更新任务数组
        const updatedTasks = editingMonthlyPlan.value.tasksText
          .split('\n')
          .filter(task => task.trim())
        
        editingMonthlyPlan.value.tasks = updatedTasks
        
        // 更新原始任务对象数组
        editingMonthlyPlan.value.originalTasks = updatedTasks.map(task => {
          const parts = task.split(' - ')
          const priorityMatch = task.match(/\((.*?)优先级/)
          const hoursMatch = task.match(/(\d+)小时/)
          
          return {
            title: parts[0] || task,
            description: parts[1]?.split(' (')[0] || '任务描述',
            priority: priorityMatch ? priorityMatch[1].toLowerCase() : 'medium',
            estimatedHours: hoursMatch ? parseInt(hoursMatch[1]) : 40
          }
        })
        
        generatedMonthlyPlans.value[editingMonthlyIndex.value] = { ...editingMonthlyPlan.value }
        showEditMonthlyDialog.value = false
        ElMessage.success('月度计划修改成功')
      }
    }
    
    // 确认所有月度计划
    const confirmMonthlyPlans = async () => {
      confirmingMonthly.value = true
      try {
        let annualPlanId
        
        if (selectedAnnualPlan.value) {
          // 使用现有年度计划
          annualPlanId = selectedAnnualPlan.value.id
        } else {
          // 1. 创建年度计划
          const annualResponse = await axios.post('/api/plans/annual', {
            year: annualPlanForm.value.year,
            title: annualPlanForm.value.title,
            description: annualPlanForm.value.description,
            objectives: annualPlanForm.value.objectives
          }, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          })
          annualPlanId = annualResponse.data.id
        }
        
        // 2. 创建所有月度计划
        let successCount = 0
        for (const monthlyPlan of generatedMonthlyPlans.value) {
          try {
            console.log(`创建${monthlyPlan.month}月计划:`, {
              year: monthlyPlan.year,
              month: monthlyPlan.month,
              title: monthlyPlan.title,
              description: monthlyPlan.description,
              objectives: monthlyPlan.keyMetrics,
              tasks: monthlyPlan.originalTasks
            })
            
            const response = await axios.post('/api/plans/monthly', {
              year: monthlyPlan.year,
              month: monthlyPlan.month,
              title: monthlyPlan.title,
              description: monthlyPlan.description || '基于年度目标的月度工作计划',
              objectives: monthlyPlan.keyMetrics,
              tasks: monthlyPlan.originalTasks || monthlyPlan.tasks || [],
              status: 'pending',
              annual_plan_id: annualPlanId  // 添加年度计划关联
            }, {
              headers: { Authorization: `Bearer ${authStore.token}` }
            })
            
            console.log(`创建${monthlyPlan.month}月计划成功:`, response.data)
            successCount++
          } catch (error) {
            console.error(`创建${monthlyPlan.month}月计划失败:`, error)
            console.error('错误详情:', error.response?.data)
          }
        }
        
        ElMessage.success(`成功创建年度计划和${successCount}个月度计划`)
        hasAnnualPlan.value = true
        workflowStep.value = 2
        
        // 刷新年度计划列表
        await checkAnnualPlan()
        
      } catch (error) {
        console.error('确认计划失败:', error)
        ElMessage.error('计划创建失败，请重试')
      } finally {
        confirmingMonthly.value = false
      }
    }
    
    // 工具函数
    const getMonthName = (month) => {
      const months = ['一月', '二月', '三月', '四月', '五月', '六月', 
                     '七月', '八月', '九月', '十月', '十一月', '十二月']
      return months[month - 1] || ''
    }
    
    const isCurrentMonth = (month) => {
      const currentMonth = new Date().getMonth() + 1
      return month === currentMonth
    }
    
    const goToWeeklyPlans = () => {
      activeTab.value = 'weekly'
    }
    
    const goToDashboard = () => {
      // 保持当前状态
    }
    
    // 状态类型和文本工具函数
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
    
    // 显示重新生成确认对话框
    const showRegenerateConfirm = async () => {
      try {
        await ElMessageBox.confirm(
          '重新生成年度计划将删除现有的年度计划和所有相关的月度计划，确定要继续吗？',
          '确认重新生成',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        // 删除所有年度和月度计划
        await deleteAllPlans()
        
        // 重置状态，显示引导式界面
        hasAnnualPlan.value = false
        workflowStep.value = 0
        ElMessage.success('已清除现有计划，请重新设定年度目标')
        
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('操作失败')
        }
      }
    }
    
    // 显示删除确认对话框
    const showDeleteConfirm = async () => {
      try {
        await ElMessageBox.confirm(
          '删除年度计划将同时删除所有相关的月度计划，此操作不可恢复，确定要删除吗？',
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'error',
          }
        )
        
        // 删除所有年度和月度计划
        await deleteAllPlans()
        
        // 重置状态，显示引导式界面
        hasAnnualPlan.value = false
        workflowStep.value = 0
        ElMessage.success('计划删除成功，请重新设定年度目标')
        
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败')
        }
      }
    }
    
    // 删除所有年度和月度计划
    const deleteAllPlans = async () => {
      try {
        // 获取所有年度计划
        const annualResponse = await axios.get('/api/plans/annual', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        // 删除所有年度计划
        for (const plan of annualResponse.data) {
          await axios.delete(`/api/plans/annual/${plan.id}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          })
        }
        
        // 获取所有月度计划
        const monthlyResponse = await axios.get('/api/plans/monthly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        // 删除所有月度计划
        for (const plan of monthlyResponse.data) {
          await axios.delete(`/api/plans/monthly/${plan.id}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          })
        }
        
      } catch (error) {
        console.error('删除计划失败:', error)
        throw new Error('删除计划失败')
      }
    }
    
    // 查看计划详情
    const viewPlanDetails = (plan) => {
      selectedAnnualPlan.value = plan
      activeTab.value = 'annual'
    }
    
    // 重新生成单个计划
    const regeneratePlan = async (plan) => {
      try {
        await ElMessageBox.confirm(
          `重新生成 ${plan.year}年计划将删除相关的月度计划，确定要继续吗？`,
          '确认重新生成',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        // 删除相关的月度计划
        const monthlyResponse = await axios.get('/api/plans/monthly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        const relatedMonthlyPlans = monthlyResponse.data.filter(
          monthlyPlan => monthlyPlan.year === plan.year
        )
        
        for (const monthlyPlan of relatedMonthlyPlans) {
          await axios.delete(`/api/plans/monthly/${monthlyPlan.id}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          })
        }
        
        // 开始重新生成流程
        selectedAnnualPlan.value = plan
        showGuidedWorkflow.value = true
        workflowStep.value = 0
        
        // 预填充表单
        annualPlanForm.value = {
          year: plan.year,
          title: plan.title,
          description: plan.description,
          objectives: plan.objectives,
          keyFocus: ''
        }
        
        ElMessage.success(`开始重新生成 ${plan.year}年计划`)
        
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('操作失败')
        }
      }
    }
    
    // 删除单个计划
    const deletePlan = async (plan) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除 ${plan.year}年计划 "${plan.title}" 吗？此操作将同时删除相关的月度计划。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'error',
          }
        )
        
        // 删除年度计划
        await axios.delete(`/api/plans/annual/${plan.id}`, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        // 删除相关的月度计划
        const monthlyResponse = await axios.get('/api/plans/monthly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        const relatedMonthlyPlans = monthlyResponse.data.filter(
          monthlyPlan => monthlyPlan.year === plan.year
        )
        
        for (const monthlyPlan of relatedMonthlyPlans) {
          await axios.delete(`/api/plans/monthly/${monthlyPlan.id}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
          })
        }
        
        // 刷新数据
        await checkAnnualPlan()
        ElMessage.success('计划删除成功')
        
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败')
        }
      }
    }
    
    const handleLogout = () => {
      authStore.logout()
      router.push('/login')
    }
    
    // 加载统计数据
    const loadStatistics = async () => {
      try {
        // 加载月度计划数量
        const monthlyResponse = await axios.get('/api/plans/monthly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        monthlyPlansCount.value = monthlyResponse.data.length
        
        // 加载周计划数量
        const weeklyResponse = await axios.get('/api/plans/weekly', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        weeklyPlansCount.value = weeklyResponse.data.length
        
        // 加载待提交周报数量（这里需要根据实际业务逻辑调整）
        pendingReportsCount.value = 0 // 暂时设为0
        
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    }
    
    onMounted(async () => {
      await checkAnnualPlan()
      if (hasAnnualPlan.value) {
        loadStatistics()
      }
    })
    
    return {
      activeTab,
      user,
      hasAnnualPlan,
      workflowStep,
      generatingMonthly,
      confirmingMonthly,
      showEditMonthlyDialog,
      annualPlanForm,
      annualFormRef,
      annualRules,
      generatedMonthlyPlans,
      editingMonthlyPlan,
      editingMonthlyIndex,
      annualPlansCount,
      monthlyPlansCount,
      weeklyPlansCount,
      pendingReportsCount,
      generateMonthlyPlans,
      editMonthlyPlan,
      saveMonthlyPlanEdit,
      confirmMonthlyPlans,
      getMonthName,
      isCurrentMonth,
      goToWeeklyPlans,
      goToDashboard,
      handleLogout,
      showRegenerateConfirm,
      showDeleteConfirm,
      getStatusType,
      getStatusText,

      startNewAnnualPlan,
      viewPlanDetails,
      regeneratePlan,
      deletePlan,
      showGuidedWorkflow,
      existingAnnualPlans,
      selectedAnnualPlan
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.el-main {
  padding: 20px;
}

/* 引导式工作流程样式 */
.guided-workflow {
  max-width: 1200px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 30px;
}

.workflow-header {
  text-align: center;
  margin-bottom: 40px;
}

.workflow-header h2 {
  color: #333;
  margin-bottom: 10px;
  font-size: 28px;
}

.workflow-header .subtitle {
  color: #666;
  font-size: 16px;
}

.workflow-steps {
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
  margin-bottom: 15px;
  font-size: 20px;
  border-left: 4px solid #409eff;
  padding-left: 12px;
}

.step-description {
  color: #666;
  margin-bottom: 25px;
  line-height: 1.6;
  font-size: 14px;
}

.step-actions {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.step-actions .el-button {
  margin: 0 10px;
  min-width: 120px;
}

/* 月度计划网格布局 */
.monthly-plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.monthly-plan-card {
  transition: all 0.3s ease;
  height: 100%;
}

.monthly-plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.monthly-plan-card.current-month {
  border: 2px solid #67c23a;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.month-title {
  font-weight: bold;
  color: #333;
  font-size: 16px;
}

.plan-content h4 {
  color: #333;
  margin: 0 0 10px 0;
  font-size: 14px;
}

.plan-description {
  color: #666;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 15px;
}

.plan-objectives,
.plan-metrics {
  margin-bottom: 15px;
}

.plan-objectives strong,
.plan-metrics strong {
  color: #333;
  font-size: 13px;
}

.plan-objectives ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.plan-objectives li {
  color: #555;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.plan-metrics p {
  color: #555;
  font-size: 12px;
  line-height: 1.4;
  margin: 8px 0 0 0;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
}

/* 成功面板 */
.success-panel {
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border: 1px solid #91d5ff;
}

.success-content {
  text-align: center;
}

.success-message {
  color: #666;
  margin-bottom: 20px;
  line-height: 1.6;
}

.next-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

/* 常规工作台样式 */
.regular-dashboard {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.dashboard-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* 年度计划选择样式 */
.annual-plan-selection {
  text-align: center;
}

.existing-plans, .create-new {
  margin-bottom: 30px;
}

.existing-plans h4, .create-new h4 {
  color: #333;
  margin-bottom: 15px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.plan-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.plan-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.plan-info h5 {
  margin: 0 0 8px 0;
  color: #333;
}

.plan-info p {
  color: #666;
  margin: 0 0 10px 0;
  font-size: 14px;
  line-height: 1.4;
}

.no-plans {
  padding: 40px;
  text-align: center;
  color: #999;
  background: #f8f9fa;
  border-radius: 8px;
}

/* 年度计划列表样式 */
.annual-plans-list {
  margin-top: 20px;
}

.annual-plan-card {
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.annual-plan-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plan-header h4 {
  margin: 0;
  color: #333;
}

.plan-content {
  min-height: 120px;
}

.plan-description {
  color: #666;
  margin-bottom: 15px;
  line-height: 1.4;
}

.plan-objectives {
  margin-top: 10px;
}

.plan-objectives strong {
  color: #333;
}

.plan-objectives p {
  color: #555;
  margin: 5px 0 0 0;
  font-size: 14px;
  line-height: 1.4;
}

.plan-actions {
  display: flex;
  justify-content: space-between;
  gap: 5px;
}

.overview-dashboard {
  padding: 20px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .guided-workflow {
    padding: 20px;
  }
  
  .monthly-plans-grid {
    grid-template-columns: 1fr;
  }
  
  .step-panel {
    padding: 20px;
  }
  
  .next-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .next-actions .el-button {
    width: 200px;
    margin: 5px 0;
  }
}

/* 表单样式增强 */
:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input__inner) {
  border-radius: 6px;
}

:deep(.el-textarea__inner) {
  border-radius: 6px;
  resize: vertical;
}

/* 统计卡片样式 */
:deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

:deep(.el-statistic__title) {
  font-size: 14px;
  color: #666;
}
</style>

