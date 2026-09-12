
<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>团队总人数</span>
            </div>
          </template>
          <div class="stat-number">{{ teamStats.totalEmployees }}</div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>本周已提交周报</span>
            </div>
          </template>
          <div class="stat-number">{{ teamStats.submittedReports }}</div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>进度滞后员工</span>
            </div>
          </template>
          <div class="stat-number lagging">{{ teamStats.laggingEmployees }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>团队计划完成率</span>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="8" v-for="type in ['annual', 'monthly', 'weekly']" :key="type">
          <div class="progress-item">
            <h4>{{ getTypeLabel(type) }}</h4>
            <el-progress 
              type="circle" 
              :percentage="getCompletionRate(type)" 
              :status="getProgressStatus(type)"
            />
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>进度滞后员工提醒</span>
        </div>
      </template>
      <el-table :data="laggingEmployees" style="width: 100%" v-loading="loading">
        <el-table-column prop="username" label="员工姓名" />
        <el-table-column prop="department" label="部门" />
        <el-table-column label="滞后项目">
          <template #default="{ row }">
            <el-tag 
              v-for="item in getLaggingItems(row)" 
              :key="item"
              size="small"
              type="warning"
              style="margin-right: 5px"
            >
              {{ item }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="warning" @click="remindEmployee(row)">
              发送提醒
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from '../api/client'
import { ElMessage } from 'element-plus'

export default {
  name: 'TeamOverview',
  setup() {
    const teamStats = ref({
      totalEmployees: 0,
      submittedReports: 0,
      laggingEmployees: 0
    })
    
    const laggingEmployees = ref([])
    const loading = ref(false)
    const teamProgress = ref({
      annual: { total: 0, completed: 0 },
      monthly: { total: 0, completed: 0 },
      weekly: { total: 0, completed: 0 }
    })
    
    const fetchTeamOverview = async () => {
      loading.value = true
      try {
        // Fetch team statistics
        const usersResponse = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        
        teamStats.value.totalEmployees = usersResponse.data.filter(u => u.role === 'employee').length
        
        // Fetch lagging employees
        const laggingResponse = await axios.get('/api/users/lagging', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        
        laggingEmployees.value = laggingResponse.data
        teamStats.value.laggingEmployees = laggingResponse.data.length
        
        // Calculate team progress
        let totalAnnual = 0, completedAnnual = 0
        let totalMonthly = 0, completedMonthly = 0
        let totalWeekly = 0, completedWeekly = 0
        
        for (const user of usersResponse.data.filter(u => u.role === 'employee')) {
          const progressResponse = await axios.get(`/api/users/progress/${user.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
          
          const progress = progressResponse.data
          totalAnnual += parseInt(progress.annual.total || 0)
          completedAnnual += parseInt(progress.annual.completed || 0)
          totalMonthly += parseInt(progress.monthly.total || 0)
          completedMonthly += parseInt(progress.monthly.completed || 0)
          totalWeekly += parseInt(progress.weekly.total || 0)
          completedWeekly += parseInt(progress.weekly.completed || 0)
        }
        
        teamProgress.value = {
          annual: { total: totalAnnual, completed: completedAnnual },
          monthly: { total: totalMonthly, completed: completedMonthly },
          weekly: { total: totalWeekly, completed: completedWeekly }
        }
        
      } catch (error) {
        ElMessage.error('获取团队概览失败')
      } finally {
        loading.value = false
      }
    }
    
    const getTypeLabel = (type) => {
      const labels = {
        annual: '年度计划',
        monthly: '月度计划',
        weekly: '周计划'
      }
      return labels[type] || type
    }
    
    const getCompletionRate = (type) => {
      const progress = teamProgress.value[type]
      if (progress.total === 0) return 0
      return Math.round((progress.completed / progress.total) * 100)
    }
    
    const getProgressStatus = (type) => {
      const rate = getCompletionRate(type)
      if (rate >= 80) return 'success'
      if (rate >= 50) return 'warning'
      return 'exception'
    }
    
    const getLaggingItems = (employee) => {
      const items = []
      if (employee.pending_annual > 0) items.push('年度计划')
      if (employee.pending_monthly > 0) items.push('月度计划')
      if (employee.pending_weekly > 0) items.push('周计划')
      return items
    }
    
    const remindEmployee = async (employee) => {
      try {
        // In a real app, this would send a notification
        ElMessage.success(`已发送提醒给 ${employee.username}`)
      } catch (error) {
        ElMessage.error('发送提醒失败')
      }
    }
    
    onMounted(() => {
      fetchTeamOverview()
    })
    
    return {
      teamStats,
      laggingEmployees,
      loading,
      teamProgress,
      getTypeLabel,
      getCompletionRate,
      getProgressStatus,
      getLaggingItems,
      remindEmployee
    }
  }
}
</script>

<style scoped>
.stat-number {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
  text-align: center;
}

.stat-number.lagging {
  color: #f56c6c;
}

.progress-item {
  text-align: center;
  padding: 20px;
}

.progress-item h4 {
  margin-bottom: 15px;
  color: #333;
}
</style>

