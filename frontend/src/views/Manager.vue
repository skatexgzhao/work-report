
<template>
  <el-container style="height: 100vh">
    <el-aside width="200px">
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical-demo"
        @select="handleMenuSelect"
      >
        <el-menu-item index="dashboard">
          <el-icon><House /></el-icon>
          <span>管理面板</span>
        </el-menu-item>
        
        <el-menu-item index="team-overview">
          <el-icon><User /></el-icon>
          <span>团队概览</span>
        </el-menu-item>
        
        <el-menu-item index="employee-management">
          <el-icon><UserFilled /></el-icon>
          <span>员工管理</span>
        </el-menu-item>
        
        <el-menu-item index="progress-monitoring">
          <el-icon><TrendCharts /></el-icon>
          <span>进度监控</span>
        </el-menu-item>
        

        
        <el-menu-item index="annual-summary">
          <el-icon><Document /></el-icon>
          <span>年度总结</span>
        </el-menu-item>
        
        <el-menu-item index="profile">
          <el-icon><Setting /></el-icon>
          <span>个人设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header>
        <div class="header-content">
          <h2>经理管理面板</h2>
          <div class="user-info">
            <span>欢迎，{{ userStore.user?.username }}（经理）</span>
            <el-button type="danger" size="small" @click="logout">退出登录</el-button>
          </div>
        </div>
      </el-header>
      
      <el-main>
        <component :is="currentComponent" />
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import TeamOverview from '../components/TeamOverview.vue'
import EmployeeManagement from '../components/EmployeeManagement.vue'
import ProgressMonitoring from '../components/ProgressMonitoring.vue'

import AnnualSummary from '../components/AnnualSummary.vue'
import { House, User, UserFilled, TrendCharts, MagicStick, Document, Setting } from '@element-plus/icons-vue'

export default {
  name: 'Manager',
    components: {
    TeamOverview,
    EmployeeManagement,
    ProgressMonitoring,
    AnnualSummary,
    House,
    User,
    UserFilled,
    TrendCharts,
    MagicStick,
    Document,
    Setting
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const activeMenu = ref('team-overview')
    
    const componentMap = {
      'team-overview': 'TeamOverview',
      'employee-management': 'EmployeeManagement',
      'progress-monitoring': 'ProgressMonitoring',
      'annual-summary': 'AnnualSummary'
    }
    
    const currentComponent = computed(() => {
      return componentMap[activeMenu.value] || 'TeamOverview'
    })
    
    const handleMenuSelect = (index) => {
      activeMenu.value = index
    }
    
    const logout = () => {
      authStore.logout()
      router.push('/login')
    }
    
    return {
      activeMenu,
      currentComponent,
      userStore: authStore,
      handleMenuSelect,
      logout
    }
  }
}
</script>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.el-aside {
  background-color: #f5f5f5;
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
</template>
