<template>
  <div class="app-home">
    <section class="hero">
      <h1 class="hero-title">从日报到周/月/季总结，一条线写完</h1>
      <p class="hero-subtitle">每天记一点，写周期报告时有素材；需要时可以 AI 帮你起稿。</p>
      <p class="hero-user">
        你好，{{ user?.username || '用户' }}
        <template v-if="user?.department"> · {{ user.department }}</template>
      </p>
    </section>

    <el-card class="section-card">
      <template #header>
        <span>使用地图：报告怎么一层层汇总</span>
      </template>
      <HomeReportMap />
    </el-card>

    <el-card class="section-card">
      <template #header>
        <span>按您的角色看怎么用</span>
      </template>
      <HomeRoleGuide :default-tab="guideDefaultTab" />
    </el-card>

    <el-card class="section-card">
      <template #header>
        <span>常用入口</span>
      </template>
      <HomeQuickLinks :manager-or-admin="isManagerOrAdmin" />
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import HomeReportMap from '../../components/home/HomeReportMap.vue'
import HomeRoleGuide from '../../components/home/HomeRoleGuide.vue'
import HomeQuickLinks from '../../components/home/HomeQuickLinks.vue'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const isManagerOrAdmin = computed(() => ['manager', 'admin'].includes(user.value?.role))

/** 普通使用者默认对应 Tab；部门负责人角色与 admin 默认部门负责人 Tab */
const guideDefaultTab = computed(() =>
  user.value?.role === 'employee' ? 'employee' : 'manager'
)
</script>

<style scoped>
.app-home {
  max-width: 1040px;
  margin: 0 auto;
}

.hero {
  margin-bottom: 20px;
  padding: 8px 4px 4px;
}

.hero-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  line-height: 1.35;
}

.hero-subtitle {
  margin: 0 0 12px;
  font-size: 15px;
  color: #606266;
  line-height: 1.6;
}

.hero-user {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.section-card {
  margin-bottom: 16px;
}

.section-card :deep(.el-card__header) {
  font-weight: 600;
  color: #303133;
}
</style>
