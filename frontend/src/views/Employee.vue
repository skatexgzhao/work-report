
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
          <span>工作台</span>
        </el-menu-item>
        
        <el-sub-menu index="plans">
          <template #title>
            <el-icon><Calendar /></el-icon>
            <span>计划管理</span>
          </template>
          <el-menu-item index="annual-plans">年度计划</el-menu-item>
          <el-menu-item index="monthly-plans">月度计划</el-menu-item>
          <el-menu-item index="weekly-plans">周计划</el-menu-item>
        </el-sub-menu>
        
        <el-menu-item index="weekly-reports">
          <el-icon><Document /></el-icon>
          <span>周报管理</span>
        </el-menu-item>
        

        
        <el-menu-item index="profile">
          <el-icon><User /></el-icon>
          <span>个人设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header>
        <div class="header-content">
          <h2>员工工作台</h2>
          <div class="user-info">
            <span>欢迎，{{ userStore.user?.username }}</span>
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
import EmployeeDashboard from './EmployeeDashboard.vue'
import AnnualPlans from '../components/AnnualPlans.vue'
import MonthlyPlans from '../components/MonthlyPlans.vue'
import WeeklyPlans from '../components/WeeklyPlans.vue'
import WeeklyReports from '../components/WeeklyReports.vue'

import { House, Calendar, Document, MagicStick, User } from '@element-plus/icons-vue'

export default {
  name: 'Employee',
  components: {
    EmployeeDashboard,
    AnnualPlans,
    MonthlyPlans,
    WeeklyPlans,
    WeeklyReports,
    House,
    Calendar,
    Document,
    MagicStick,
    User
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const activeMenu = ref('dashboard')
    
    const componentMap = {
      'dashboard': 'EmployeeDashboard',
      'annual-plans': 'AnnualPlans',
      'monthly-plans': 'MonthlyPlans',
      'weekly-plans': 'WeeklyPlans',
      'weekly-reports': 'WeeklyReports'
    }
    
    const currentComponent = computed(() => {
      return componentMap[activeMenu.value] || 'AnnualPlans'
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

