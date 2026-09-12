<template>
  <el-row :gutter="16" class="quick-links">
    <el-col
      v-for="item in visibleLinks"
      :key="item.path"
      :xs="24"
      :sm="12"
      :md="managerOrAdmin ? 6 : 12"
    >
      <el-card shadow="hover" class="link-card" @click="go(item.path)">
        <div class="link-icon" :class="item.tone">{{ item.icon }}</div>
        <div class="link-body">
          <div class="link-title">{{ item.title }}</div>
          <div class="link-desc">{{ item.desc }}</div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  managerOrAdmin: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()

const allLinks = [
  {
    path: '/app/daily',
    title: '我的日报',
    desc: '记录每日完成与计划',
    icon: '日',
    tone: 'green',
    roles: 'all'
  },
  {
    path: '/app/period',
    title: '我的周/月/季报',
    desc: '个人周期总结与提交',
    icon: '周',
    tone: 'blue',
    roles: 'all'
  },
  {
    path: '/app/team',
    title: '小组报告',
    desc: '汇总组员周期报告',
    icon: '组',
    tone: 'orange',
    roles: 'manager'
  },
  {
    path: '/app/department',
    title: '部门报告',
    desc: '汇总部门周期报告',
    icon: '部',
    tone: 'red',
    roles: 'manager'
  }
]

const visibleLinks = computed(() =>
  allLinks.filter((item) => item.roles === 'all' || props.managerOrAdmin)
)

function go(path) {
  router.push(path)
}
</script>

<style scoped>
.quick-links {
  margin: 0;
}

.link-card {
  cursor: pointer;
  margin-bottom: 16px;
  transition: transform 0.15s ease;
}

.link-card:hover {
  transform: translateY(-2px);
}

.link-card :deep(.el-card__body) {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
}

.link-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  color: #fff;
}

.link-icon.green {
  background: #67c23a;
}

.link-icon.blue {
  background: #409eff;
}

.link-icon.orange {
  background: #e6a23c;
}

.link-icon.red {
  background: #f56c6c;
}

.link-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.link-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.4;
}
</style>
