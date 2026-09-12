
<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI 智能计划分解</span>
        </div>
      </template>
      
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="计划类型" prop="planType">
          <el-select v-model="form.planType" placeholder="请选择计划类型">
            <el-option label="年度计划" value="annual" />
            <el-option label="自定义目标" value="custom" />
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="form.planType === 'annual'" label="选择年度计划" prop="selectedPlan">
          <el-select 
            v-model="form.selectedPlan" 
            placeholder="请选择年度计划"
            filterable
            :loading="loadingPlans"
          >
            <el-option
              v-for="plan in annualPlans"
              :key="plan.id"
              :label="`${plan.year}年 - ${plan.title}`"
              :value="plan.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item v-else label="工作目标" prop="customGoal">
          <el-input 
            v-model="form.customGoal" 
            type="textarea" 
            :rows="4"
            placeholder="请详细描述您的工作目标和期望达成的成果..."
          />
        </el-form-item>
        
        <el-form-item label="关键指标" prop="keyMetrics">
          <el-input 
            v-model="form.keyMetrics" 
            type="textarea" 
            :rows="3"
            placeholder="请列出可量化的关键指标（如：销售额增长20%，客户满意度达到90%等）"
          />
        </el-form-item>
        
        <el-form-item label="时间范围" prop="timeframe">
          <el-date-picker
            v-model="form.timeframe"
            type="monthrange"
            range-separator="至"
            start-placeholder="开始月份"
            end-placeholder="结束月份"
            format="YYYY年MM月"
            value-format="YYYY-MM"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            @click="generateMonthlyPlan" 
            :loading="generating"
            size="large"
          >
            <el-icon><MagicStick /></el-icon>
            一键生成分解计划
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 生成的月度计划建议 -->
    <el-card v-if="generatedPlan" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>AI 生成的月度计划建议</span>
          <el-button 
            type="success" 
            @click="saveGeneratedPlan"
            :loading="saving"
            size="small"
          >
            <el-icon><Check /></el-icon>
            保存到月度计划
          </el-button>
        </div>
      </template>
      
      <div v-for="(monthPlan, index) in generatedPlan.monthlyPlans" :key="index" class="month-plan">
        <h4>{{ monthPlan.month }} 月计划</h4>
        <p><strong>主要目标:</strong> {{ monthPlan.mainObjective }}</p>
        
        <el-divider>具体任务</el-divider>
        <el-timeline>
          <el-timeline-item
            v-for="(task, taskIndex) in monthPlan.tasks"
            :key="taskIndex"
            :type="getTaskType(task.priority)"
            :timestamp="`第${task.week}周`"
          >
            <h5>{{ task.title }}</h5>
            <p>{{ task.description }}</p>
            <el-tag size="small" :type="getPriorityType(task.priority)">
              {{ getPriorityText(task.priority) }}
            </el-tag>
            <el-tag size="small" style="margin-left: 8px;">
              预计完成: {{ task.estimatedHours }}小时
            </el-tag>
          </el-timeline-item>
        </el-timeline>
        
        <el-divider>关键指标</el-divider>
        <el-row :gutter="10">
          <el-col :span="8" v-for="metric in monthPlan.metrics" :key="metric.name">
            <el-statistic :title="metric.name" :value="metric.target" />
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from '../api/client'
import { ElMessage } from 'element-plus'
import { MagicStick, Check } from '@element-plus/icons-vue'

export default {
  name: 'AISuggestions',
  components: {
    MagicStick,
    Check
  },
  setup() {
    const form = ref({
      planType: 'annual',
      selectedPlan: '',
      customGoal: '',
      keyMetrics: '',
      timeframe: []
    })
    
    const formRef = ref()
    const annualPlans = ref([])
    const loadingPlans = ref(false)
    const generating = ref(false)
    const saving = ref(false)
    const generatedPlan = ref(null)
    
    const rules = {
      planType: [{ required: true, message: '请选择计划类型', trigger: 'change' }],
      selectedPlan: [{ required: true, message: '请选择年度计划', trigger: 'change' }],
      customGoal: [{ required: true, message: '请填写工作目标', trigger: 'blur' }],
      keyMetrics: [{ required: true, message: '请填写关键指标', trigger: 'blur' }],
      timeframe: [{ required: true, message: '请选择时间范围', trigger: 'change' }]
    }
    
    const fetchAnnualPlans = async () => {
      loadingPlans.value = true
      try {
        const response = await axios.get('/api/plans/annual', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        annualPlans.value = response.data
      } catch (error) {
        ElMessage.error('获取年度计划失败')
      } finally {
        loadingPlans.value = false
      }
    }
    
    const generateMonthlyPlan = async () => {
      if (!formRef.value) return
      
      await formRef.value.validate(async (valid) => {
        if (valid) {
          generating.value = true
          try {
            let prompt = ''
            
            if (form.value.planType === 'annual') {
              const selectedPlan = annualPlans.value.find(p => p.id === form.value.selectedPlan)
              prompt = `请将以下年度工作计划分解为月度计划：
年度目标：${selectedPlan.title}
详细描述：${selectedPlan.description}
年度目标：${selectedPlan.objectives}
关键指标：${form.value.keyMetrics}
时间范围：${form.value.timeframe[0]} 至 ${form.value.timeframe[1]}`
            } else {
              prompt = `请将以下工作目标分解为月度计划：
工作目标：${form.value.customGoal}
关键指标：${form.value.keyMetrics}
时间范围：${form.value.timeframe[0]} 至 ${form.value.timeframe[1]}`
            }
            
            const response = await axios.post('/api/ai-suggestions/monthly-breakdown', {
              prompt,
              timeframe: form.value.timeframe
            }, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            
            generatedPlan.value = response.data
            ElMessage.success('月度计划生成成功！')
            
          } catch (error) {
            ElMessage.error('生成失败，请稍后重试')
          } finally {
            generating.value = false
          }
        }
      })
    }
    
    const saveGeneratedPlan = async () => {
      if (!generatedPlan.value) return
      
      saving.value = true
      try {
        for (const monthPlan of generatedPlan.value.monthlyPlans) {
          await axios.post('/api/plans/monthly', {
            year: parseInt(monthPlan.month.split('-')[0]),
            month: parseInt(monthPlan.month.split('-')[1]),
            title: monthPlan.mainObjective,
            description: monthPlan.tasks.map(t => t.title).join('；'),
            objectives: JSON.stringify(monthPlan.metrics),
            status: 'pending'
          }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
        }
        
        ElMessage.success('月度计划保存成功！')
        generatedPlan.value = null
        formRef.value.resetFields()
        
      } catch (error) {
        ElMessage.error('保存失败，请稍后重试')
      } finally {
        saving.value = false
      }
    }
    
    const getTaskType = (priority) => {
      const types = {
        high: 'danger',
        medium: 'warning',
        low: 'info'
      }
      return types[priority] || 'info'
    }
    
    const getPriorityType = (priority) => {
      const types = {
        high: 'danger',
        medium: 'warning',
        low: 'success'
      }
      return types[priority] || 'success'
    }
    
    const getPriorityText = (priority) => {
      const texts = {
        high: '高优先级',
        medium: '中优先级',
        low: '低优先级'
      }
      return texts[priority] || priority
    }
    
    onMounted(() => {
      fetchAnnualPlans()
    })
    
    return {
      form,
      formRef,
      annualPlans,
      loadingPlans,
      generating,
      saving,
      generatedPlan,
      rules,
      generateMonthlyPlan,
      saveGeneratedPlan,
      getTaskType,
      getPriorityType,
      getPriorityText
    }
  }
}
</script>

<style scoped>
.month-plan {
  margin-bottom: 30px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.month-plan h4 {
  color: #409eff;
  margin-bottom: 15px;
}

.month-plan h5 {
  margin: 5px 0;
  color: #333;
}

.el-statistic {
  text-align: center;
}
</style>

