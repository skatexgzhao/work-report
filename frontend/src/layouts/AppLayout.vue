<template>
  <el-container class="app-layout">
    <el-header class="app-header">
      <div class="header-left">
        <h2>部门周期报告</h2>
        <el-menu mode="horizontal" :ellipsis="false" router :default-active="activePath">
          <el-menu-item index="/app">首页</el-menu-item>
          <el-sub-menu index="my-reports">
            <template #title>我的报告</template>
            <el-menu-item index="/app/daily">我的日报</el-menu-item>
            <el-menu-item index="/app/period">我的周/月/季报</el-menu-item>
          </el-sub-menu>
          <el-menu-item v-if="isManagerOrAdmin" index="/app/team">小组报告</el-menu-item>
          <el-menu-item v-if="isManagerOrAdmin" index="/app/department">部门报告</el-menu-item>
          <el-sub-menu v-if="isManagerOrAdmin" index="admin">
            <template #title>管理</template>
            <el-menu-item v-if="isAdmin" index="/app/admin/users">用户与角色</el-menu-item>
            <el-menu-item v-if="isAdmin" index="/app/admin/templates">模板管理</el-menu-item>
            <el-menu-item v-if="isAdmin" index="/app/admin/ai-config">智能写作配置</el-menu-item>
            <el-menu-item index="/app/admin/teams">小组管理</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </div>
      <div class="header-right">
        <span>{{ user?.username }}（{{ roleLabel }}）</span>
        <el-button type="danger" size="small" @click="logout">退出</el-button>
      </div>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const user = computed(() => authStore.user)
const isAdmin = computed(() => user.value?.role === 'admin')
const isManagerOrAdmin = computed(() => ['manager', 'admin'].includes(user.value?.role))

const activePath = computed(() => {
  if (route.path.startsWith('/app/daily')) return '/app/daily'
  if (route.path.startsWith('/app/period')) return '/app/period'
  if (route.path.startsWith('/app/department')) return '/app/department'
  if (route.path.startsWith('/app/team')) return '/app/team'
  if (route.path.startsWith('/app/admin/users')) return '/app/admin/users'
  if (route.path.startsWith('/app/admin/teams')) return '/app/admin/teams'
  if (route.path.startsWith('/app/admin/templates')) return '/app/admin/templates'
  if (route.path.startsWith('/app/admin/ai-config')) return '/app/admin/ai-config'
  return route.path
})

const roleLabel = computed(() => {
  const role = user.value?.role
  if (role === 'admin') return '管理员'
  if (role === 'manager') return '管理者'
  return '员工'
})

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
