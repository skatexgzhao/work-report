
<template>
  <div class="dashboard">
    <el-container>
      <el-header>
        <div class="header-content">
          <h2>部门经理工作台</h2>
          <div class="user-info">
            <span>欢迎, {{ user?.username }} (部门经理)</span>
            <el-button type="danger" size="small" @click="handleLogout">退出</el-button>
          </div>
        </div>
      </el-header>
      
      <el-main>
        <el-tabs v-model="activeTab">
          <el-tab-pane label="团队概览" name="overview">
            <team-overview />
          </el-tab-pane>
          
          <el-tab-pane label="员工管理" name="employees">
            <employee-management />
          </el-tab-pane>
          
          <el-tab-pane label="进度监控" name="progress">
            <progress-monitoring />
          </el-tab-pane>
          
          <el-tab-pane label="年度总结" name="summary">
            <annual-summary />
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import TeamOverview from '../components/TeamOverview.vue'
import EmployeeManagement from '../components/EmployeeManagement.vue'
import ProgressMonitoring from '../components/ProgressMonitoring.vue'
import AnnualSummary from '../components/AnnualSummary.vue'

export default {
  name: 'ManagerDashboard',
  components: {
    TeamOverview,
    EmployeeManagement,
    ProgressMonitoring,
    AnnualSummary
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const activeTab = ref('overview')
    const user = computed(() => authStore.user)
    
    const handleLogout = () => {
      authStore.logout()
      router.push('/login')
    }
    
    return {
      activeTab,
      user,
      handleLogout
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
</style>
